import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(packageRoot, '..', '..', '..');

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('runtime matrix docs contract', () => {
  it('keeps package-surface as the canonical runtime matrix source', () => {
    expect(read('docs/reference/package-surface.md')).toContain('## canonical runtime package matrix');
    expect(read('docs/reference/package-surface.ko.md')).toContain('## canonical runtime package matrix');
  });

  it('keeps task and hub docs pointed at the canonical matrix', () => {
    expect(read('docs/reference/package-chooser.md')).toContain('./package-surface.md#canonical-runtime-package-matrix');
    expect(read('docs/reference/package-chooser.ko.md')).toContain(
      './package-surface.ko.md#canonical-runtime-package-matrix',
    );
    expect(read('docs/README.md')).toContain('reference/package-surface.md');
    expect(read('docs/README.ko.md')).toContain('reference/package-surface.ko.md');
    expect(read('README.md')).toContain('docs/reference/package-surface.md');
    expect(read('README.ko.md')).toContain('docs/reference/package-surface.ko.md');
    expect(read('packages/cli/README.md')).toContain('../../docs/reference/package-surface.md');
    expect(read('packages/cli/README.ko.md')).toContain('../../docs/reference/package-surface.ko.md');
  });

  it('keeps toolchain docs delegating runtime matrix ownership', () => {
    expect(read('docs/reference/toolchain-contract-matrix.md')).toContain('./package-surface.md');
    expect(read('docs/reference/toolchain-contract-matrix.ko.md')).toContain('./package-surface.ko.md');
  });
});
