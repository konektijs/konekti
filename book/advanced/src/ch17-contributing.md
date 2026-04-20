<!-- packages: fluo-repo -->
<!-- project-state: advanced -->
# Chapter 17. fluo Contributing Guide

Congratulations on reaching the final chapter of the fluo series. By getting here, you have demonstrated a mastery of standard decorator complexity, dependency injection, and advanced runtime architecture. As an advanced fluo developer, the logical next step is to help shape the framework itself.

Contributing to fluo is about more than just writing code; it is about participating in a culture of rigorous behavioral contracts, explicit design, and platform-agnostic reliability. This guide deep-dives into the fluo repository structure, the contribution workflow, and the governance model that keeps the ecosystem stable.

## Repository Structure and Philosophy

The fluo repository is a high-performance monorepo managed with `pnpm`. Our philosophy centers on **Behavioral Contracts**, meaning every change is evaluated not just for its functionality, but for its impact on the framework's predictability across different runtimes (Node.js, Bun, Workers).

### Workspace Organization

- `packages/`: Contains the modular components of the framework.
- `docs/`: Centralized documentation, including operational policies.
- `examples/`: Canonical application setups used for verification.
- `.github/`: Workflow definitions and issue/PR templates.

Every package in the `packages/` directory is treated as a self-contained unit with its own test suite and documentation, yet all adhere to the global repository policies. For instance, `packages/di` maintains its own container logic while strictly following the TC39 decorator path defined in `docs/operations/behavioral-contract-policy.md`.

## Issue and Label Workflow

We use a highly structured issue ingestion process to ensure that maintainer time is focused on impactful work. This discipline prevents "scope creep" and ensures that every change has a clear rationale and verification path.

### Issue Templates

Blank issues are disabled in the fluo repository. Every issue must follow one of our templates:
- **Bug Report**: Requires a minimal reproduction (stackblitz or repository).
- **Feature Request**: Requires a detailed "Why" and a proposed "How".
- **Documentation Issue**: For fixing gaps or errors in our guides.
- **DX/Maintainability**: For internal improvements that help developers.

Questions should be directed to **GitHub Discussions**, not the issue tracker. This separation keeps the tracker actionable while encouraging community conversation.

### Labeling System

Issues are automatically labeled based on the template used. Key labels include:
- `bug`: A confirmed regression or unexpected behavior.
- `enhancement`: A new feature or improvement.
- `type:maintainability`: Internal cleanup or tooling improvements.
- `priority:p0` to `p2`: The severity of the issue.

As stated in `CONTRIBUTING.md:121-126`, we prioritize bug reports with clear reproductions to maintain the stability of the core runtime.

## Review Culture

Reviewing a Pull Request in fluo is a rigorous process. We don't just "LGTM"—we verify. Our review culture is built on the principle that code is secondary to the behavioral guarantee it provides.

### Verification Gate

Every PR must pass the `pnpm verify` command as specified in `CONTRIBUTING.md:31-45`. This command is the final guardian of our repository health, executing:
- **Linting and Formatting**: Ensuring a consistent codebase via Biome-based checks (see `biome.json`).
- **Unit and Integration Tests**: Running Vitest across the entire workspace, including `examples/` projects.
- **Type Checking**: Running strict `tsc` on all workspace packages to prevent regressions.
- **Build Verification**: Ensuring all packages can be correctly bundled for distribution.

### Behavioral Contract Review

As an advanced contributor, your reviews should focus on whether a change preserves existing contracts. Does an optimization in `@fluojs/di` break the scoping rules in `@fluojs/platform-cloudflare-workers`? Does a new decorator in `@fluojs/core` adhere to the TC39 standard?

We often use a "Dual-Host" testing strategy where the same framework logic is tested in both Node.js and web-standard mock environments. Your reviews should ensure that changes to the dispatcher or runtime shell maintain this isomorphism.

### Documentation First

If a PR adds a public API, it **must** include inline documentation (JSDoc) and updates to the relevant Markdown files in `docs/` or `packages/*/README.md`. As defined in our **Public Export TSDoc Baseline**, a feature is not complete until it is documented.

## Release Process and Governance

fluo follows a supervised release model to maintain high stability.

### Package Tiers

Packages are categorized into three tiers:
- **Official**: Production-ready, follows strict semver.
- **Preview**: Ready for early adopters, subject to change.
- **Experimental**: Incubation phase, may be removed or drastically changed.

### SEMVER and Migration Notes

Even in 0.x versions, we treat breaking changes with care. Every breaking change must include detailed migration notes in the package's `CHANGELOG.md`. Maintainers use `pnpm generate:release-readiness-drafts` to ensure these notes are accurate and complete before the publishing step.

### Release Operations

Release operations are managed via GitHub Actions. We use a **"supervised-auto"** model (`CONTRIBUTING.md:73-80`). A maintainer triggers the `.github/workflows/release-single-package.yml` workflow after confirming `pnpm verify:release-readiness` passes. This handles verification, npm publishing via OIDC, and git tag creation in a hardened, isolated environment.

## Governance and RFC Workflow

While small fixes can be PRed directly, significant architectural changes must go through our RFC (Request for Comments) process.

### The RFC Path

1. **GitHub Discussions**: Start a thread in the "Ideas" or "RFC" category to gauge community interest and initial feasibility.
2. **Formal Proposal**: For complex changes, write a Markdown proposal (see `packages/graphql/field-resolver-rfc.md` for an example) and open a PR to the `docs/proposals` directory.
3. **Review and Consensus**: Core maintainers and the community review the RFC. Approval is required before implementation begins.

### Behavioral Contract Policy

All contributors must adhere to the `docs/operations/behavioral-contract-policy.md`. This policy ensures that fluo remains a "Standard-First" framework by forbidding the use of non-standard TypeScript features that deviate from the JavaScript language path. This is why you see `experimentalDecorators: false` in every `tsconfig.json` in the monorepo.

## Local Development Workflow

To set up the fluo repository locally:

```bash
# Clone the repository
git clone https://github.com/fluojs/fluo.git
cd fluo

# Install dependencies (Node 20+ required)
pnpm install

# Run the full verification suite
pnpm verify
```

Maintainers are encouraged to use **git worktrees** for isolated issue work. Our standard worktree path is `.worktrees/`. This allows you to work on multiple PRs or bug fixes simultaneously while keeping the `main` branch clean. For example, using `git worktree add -b feat/new-adapter .worktrees/new-adapter origin/main` lets you build and test a new platform adapter without disturbing your current development environment.

### Sandbox and Example Verification

When working on `@fluojs/cli` or core runtime packages, use the special sandbox scripts found in `packages/cli/README.md:81-91`. These scripts allow you to:
- **sandbox:create**: Generate a new starter app to test the scaffolding logic.
- **sandbox:matrix**: Run smoke tests against different starter templates (TCP, Web, Mixed).
- **sandbox:verify**: Execute a full internal verification within the generated app.

Similarly, every example in `examples/` is a first-class citizen; they participate in the monorepo's type checking and test runs (`pnpm test`). If you modify the DI container, you must ensure that every example in `examples/` still passes its integration tests.

## Final Words

The strength of fluo lies in its community. By contributing to the framework, you help build a future where TypeScript backends are explicit, standard-compliant, and platform-agnostic. We look forward to your first PR!

---
<!-- lines: 130 -->
