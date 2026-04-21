#!/usr/bin/env bash

set -u
set -o pipefail

usage() {
  cat <<'EOF'
Usage: bash scripts/verify-prose.sh [file1] [file2] ...

Compare each tracked markdown file's working-tree contents against git HEAD
and fail when any prose transformation invariant is violated.

Checks per file:
  - code fence delimiter count is unchanged and even
  - heading count is unchanged
  - path:packages/ count is unchanged
  - <!-- comment count is unchanged
  - total line count after <= before

The script creates .sisyphus/evidence/ before printing results.
EOF
}

if [ "$#" -eq 0 ]; then
  usage
  exit 1
fi

repo_root=$(GIT_MASTER=1 git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$repo_root" ]; then
  echo "verify-prose: failed to resolve git repository root." >&2
  exit 1
fi

mkdir -p "$repo_root/.sisyphus/evidence"

count_code_fences() {
  grep -Ec '^```' "$1" || true
}

count_headings() {
  grep -Ec '^#{1,6} ' "$1" || true
}

count_path_packages() {
  awk '{ total += gsub(/path:packages\//, "&") } END { print total + 0 }' "$1"
}

count_comments() {
  awk '{ total += gsub(/<!--/, "&") } END { print total + 0 }' "$1"
}

count_lines() {
  awk 'END { print NR + 0 }' "$1"
}

relative_path() {
  case "$1" in
    "$repo_root"/*)
      printf '%s\n' "${1#"$repo_root"/}"
      ;;
    *)
      printf '%s\n' "$1"
      ;;
  esac
}

pass_count=0
fail_count=0
tmp_before_files=''

cleanup() {
  for file in $tmp_before_files; do
    [ -n "$file" ] && rm -f "$file"
  done
}

trap cleanup EXIT

for input_path in "$@"; do
  file_path=$(relative_path "$input_path")
  absolute_path="$repo_root/$file_path"

  echo "FILE $file_path"

  if [ ! -f "$absolute_path" ]; then
    echo "  FAIL missing working-tree file"
    fail_count=$((fail_count + 1))
    continue
  fi

  case "$file_path" in
    *.md) ;;
    *)
      echo "  FAIL not a markdown file"
      fail_count=$((fail_count + 1))
      continue
      ;;
  esac

  if ! GIT_MASTER=1 git ls-files --error-unmatch -- "$file_path" >/dev/null 2>&1; then
    echo "  FAIL file is untracked"
    fail_count=$((fail_count + 1))
    continue
  fi

  if ! GIT_MASTER=1 git cat-file -e "HEAD:$file_path" 2>/dev/null; then
    echo "  FAIL file does not exist in HEAD"
    fail_count=$((fail_count + 1))
    continue
  fi

  before_file=$(mktemp)
  tmp_before_files="$tmp_before_files $before_file"

  if ! GIT_MASTER=1 git show "HEAD:$file_path" >"$before_file" 2>/dev/null; then
    echo "  FAIL failed to read HEAD version"
    fail_count=$((fail_count + 1))
    continue
  fi

  before_code_fences=$(count_code_fences "$before_file")
  after_code_fences=$(count_code_fences "$absolute_path")
  before_headings=$(count_headings "$before_file")
  after_headings=$(count_headings "$absolute_path")
  before_path_packages=$(count_path_packages "$before_file")
  after_path_packages=$(count_path_packages "$absolute_path")
  before_comments=$(count_comments "$before_file")
  after_comments=$(count_comments "$absolute_path")
  before_lines=$(count_lines "$before_file")
  after_lines=$(count_lines "$absolute_path")

  file_failed=0

  if [ "$before_code_fences" -eq "$after_code_fences" ] && [ $((after_code_fences % 2)) -eq 0 ]; then
    echo "  code-fence PASS before=$before_code_fences after=$after_code_fences"
  else
    echo "  code-fence FAIL before=$before_code_fences after=$after_code_fences (count must stay unchanged and even)"
    file_failed=1
  fi

  if [ "$before_headings" -eq "$after_headings" ]; then
    echo "  heading PASS before=$before_headings after=$after_headings"
  else
    echo "  heading FAIL before=$before_headings after=$after_headings"
    file_failed=1
  fi

  if [ "$before_path_packages" -eq "$after_path_packages" ]; then
    echo "  path:packages PASS before=$before_path_packages after=$after_path_packages"
  else
    echo "  path:packages FAIL before=$before_path_packages after=$after_path_packages"
    file_failed=1
  fi

  if [ "$before_comments" -eq "$after_comments" ]; then
    echo "  comment PASS before=$before_comments after=$after_comments"
  else
    echo "  comment FAIL before=$before_comments after=$after_comments"
    file_failed=1
  fi

  if [ "$after_lines" -le "$before_lines" ]; then
    echo "  line-count PASS before=$before_lines after=$after_lines"
  else
    echo "  line-count FAIL before=$before_lines after=$after_lines"
    file_failed=1
  fi

  if [ "$file_failed" -eq 0 ]; then
    echo "  RESULT PASS"
    pass_count=$((pass_count + 1))
  else
    echo "  RESULT FAIL"
    fail_count=$((fail_count + 1))
  fi

  echo
done

echo "SUMMARY pass=$pass_count fail=$fail_count total=$((pass_count + fail_count))"

if [ "$fail_count" -ne 0 ]; then
  exit 1
fi
