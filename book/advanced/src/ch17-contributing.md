<!-- packages: fluo-repo -->
<!-- project-state: advanced -->
# Chapter 17. fluo Contributing Guide

Congratulations on reaching the final chapter of the fluo series. If you are here, it means you have mastered the intricacies of standard decorators, dependency injection, and advanced runtime architectures. The logical next step for an advanced fluo developer is to help shape the framework itself.

Contributing to fluo is not just about writing code—it is about participating in a culture of strict behavioral contracts, explicit design, and platform-agnostic reliability. This guide provides a deep dive into the fluo repository structure, our contribution workflows, and the governance model that keeps the ecosystem stable.

## Repository Structure and Philosophy

The fluo repository is a high-performance monorepo managed with `pnpm`. Our philosophy is centered on **Behavioral Contracts**. This means that every change is evaluated not just by its functionality, but by its impact on the framework's predictability across different runtimes (Node.js, Bun, Workers).

### Workspace Organization

The directory structure is designed to minimize cross-package leakage while sharing essential build and linting logic:

- `packages/`: Contains the modular components of the framework.
- `docs/`: Centralized documentation, including operational policies and architectural decision records (ADRs).
- `examples/`: Canonical application setups for verification across various platforms.
- `.github/`: Workflow definitions, issue/PR templates, and automated labeling configurations.

Every package in the `packages/` directory is treated as an independent unit with its own test suite and documentation, but they all adhere to the global repository policies. For instance, `packages/di` maintains its own container logic while strictly following the TC39 decorator path defined in `docs/operations/behavioral-contract-policy.md`. This isolation is enforced by `pnpm-workspace.yaml` and custom visibility checks in our CI suite to prevent accidental coupling.

## Issue and Label Workflow

We use a highly structured issue intake process to ensure that the maintainers' time is focused on impactful work. This discipline prevents "scope creep" and ensures that every change has a clear rationale and verification path.

### Issue Templates

Blank issues are disabled in the fluo repository. All issues must follow one of these templates defined in `.github/ISSUE_TEMPLATE/`:
- **Bug Report**: Requires a minimal reproduction (StackBlitz, repository, or a failing test case in the fluo core).
- **Feature Request**: Requires a detailed "Why" (problem statement) and "How" (architectural sketch).
- **Documentation Issue**: For fixing gaps, translation errors, or technical inaccuracies in the guides.
- **DX/Maintainability**: For internal improvements like CI optimization or refactoring that doesn't change public API.

Questions should be routed to **GitHub Discussions** rather than the issue tracker. This separation keeps the tracker actionable while encouraging community-led support.

### Labeling System

Issues are automatically labeled based on the template used and the files modified. Key labels include:
- `bug`: Confirmed regression or unexpected behavior violating a behavioral contract.
- `enhancement`: A new feature or improvement that expands the framework's capabilities.
- `type:maintainability`: Internal cleanup, dependency updates, or tool improvement.
- `priority:p0` to `p2`: Criticality and urgency of the issue.

As stated in `CONTRIBUTING.md:121-126`, we prioritize bug reports with clear reproductions to maintain the stability of the core runtime. A `p0` bug that breaks the DI container in Cloudflare Workers will always take precedence over an `enhancement` for a new database adapter.

## Review Culture

Reviewing a Pull Request in fluo is a rigorous process. We don't just "LGTM"—we verify. Our review culture is built on the principle that code is secondary to the behavioral guarantee it provides.

### Verification Gate

Every PR must pass the `pnpm verify` command, which is the final guardian of our repository health, executing:
- **Linting and Formatting**: Ensuring a consistent codebase via Biome-based checks (see `biome.json`).
- **Unit and Integration Tests**: Running Vitest across the entire workspace, including `examples/` projects which serve as real-world smoke tests.
- **Type Checking**: Running strict `tsc` across all workspace packages to prevent type-level regressions.
- **Build Verification**: Ensuring all packages can be correctly bundled for distribution across ESM and CJS targets.

### Behavioral Contract Review

As an advanced contributor, your reviews should focus on whether the change preserves existing contracts. Does an optimization in `@fluojs/di` break the scoping rules in `@fluojs/platform-cloudflare-workers`? Does a new decorator in `@fluojs/core` maintain compliance with the TC39 standard?

We often use a "Dual-Host" testing strategy where the same framework logic is tested in both Node.js and web-standard mock environments. Your reviews should ensure that changes to the dispatcher or runtime shell maintain this isomorphism. For example, check if `globalThis` is used correctly instead of `process` when building platform-agnostic utilities.

### Documentation First

If a PR adds a public API, it **must** include inline documentation (JSDoc) and an update to the relevant markdown files in the `docs/` or `packages/*/README.md`. A feature is not complete until it is documented. We use `@internal` tags to hide implementation details while ensuring every exported symbol has a clear `@example` block for users.

## Release Process and Governance

fluo follows a supervised release model to maintain high stability and predictable versioning.

### Package Tiers

Packages are categorized into three tiers to communicate stability to users:
- **Official**: Production-ready, follows strict semver, and receives immediate security patches.
- **Preview**: Ready for early adopters, subject to breaking changes with notice.
- **Experimental**: Incubation phase, may be removed or drastically changed without a formal migration path.

### SEMVER and Migration Notes

Even for 0.x versions, we still treat breaking changes with extreme care. Any breaking change requires a detailed migration note in the `CHANGELOG.md` of the affected package. Maintainers use `pnpm generate:release-readiness-drafts` to ensure these notes are accurate and complete. This tool scans commit messages tagged with `feat!:` or `fix!:` to automatically populate the "Breaking Changes" section.

### Release Operations

Release operations are managed via GitHub Actions. We use a "supervised-auto" model where a maintainer triggers the release workflow after ensuring `pnpm verify:release-readiness` passes. This handles:
1. **Provenance Verification**: Ensuring the build originates from the main branch and a trusted CI runner.
2. **NPM Publishing**: Using OIDC (OpenID Connect) for passwordless, secure publishing.
3. **Git Tagging**: Creating and pushing signed tags for every released version.
4. **Release Notes**: Automatically creating GitHub Releases with the generated changelog content.

## Governance and RFC Workflow

While small fixes can be PRed directly, significant architectural changes must go through the RFC (Request for Comments) process.

### The RFC Path

The RFC process ensures that the community and core maintainers have a chance to debate the "Why" before we commit to the "How":

1. **GitHub Discussions**: Start a thread in the "Ideas" or "RFC" category to gauge community interest and initial feasibility.
2. **Formal Proposal**: For complex changes, write a Markdown proposal (following the example in `packages/graphql/field-resolver-rfc.md`) and open a PR to the `docs/proposals` directory.
3. **Review and Consensus**: The core maintainers and the community review the RFC. Approval (a "Final Comment Period" or FCP) is required before implementation begins.

### Behavioral Contract Policy

All contributors must adhere to the `docs/operations/behavioral-contract-policy.md`. This policy ensures that fluo remains the "Standard-First" framework by forbidding the use of non-standard TypeScript features that deviate from the JavaScript language path. This is why you see `experimentalDecorators: false` and `emitDecoratorMetadata: false` in every `tsconfig.json` in the monorepo. We prioritize standard compatibility over syntactic sugar.

## Local Development Workflow

To set up the fluo repository locally:

```bash
# Clone the repository
git clone https://github.com/fluojs/fluo.git
cd fluo

# Install dependencies
pnpm install

# Run verification
pnpm verify
```

Maintainers are encouraged to use **git worktrees** for isolated issue work. Our standard worktree path is `.worktrees/`. This allows you to work on multiple PRs or bug fixes simultaneously while keeping the `main` branch clean. For example, using `git worktree add -b feat/new-adapter .worktrees/new-adapter origin/main` lets you build and test a new platform adapter without disturbing your current development environment.

### Sandbox and Example Verification

When working on `@fluojs/cli` or core runtime packages, use the special sandbox scripts found in `packages/cli/README.md:81-91`. These scripts allow you to:
- **sandbox:create**: Generate a new starter app to test the scaffolding logic.
- **sandbox:matrix**: Run smoke tests against different starter templates (TCP, Web, Mixed).
- **sandbox:verify**: Execute a full internal verification within the generated app.

Similarly, every example in `examples/` is a first-class citizen; they participate in the monorepo's type checking and test runs (`pnpm test`). If you modify the DI container, you must ensure that every example in `examples/` still passes its integration tests. We recommend running `pnpm test:examples` specifically after core changes.

## Final Words

The strength of fluo lies in its community. By contributing to the framework, you help build a future where TypeScript backends are explicit, standard-compliant, and platform-agnostic. We look forward to your first PR, whether it's a small typo fix or a massive architectural enhancement. Join us in shaping the next generation of TypeScript development!


## Community and Mentorship

Fluo is a community-driven project that thrives on shared knowledge and mentorship. We believe that every contributor has something to offer, and we are committed to helping you grow as a developer within our ecosystem. If you are new to monorepos or standard decorators, don't be intimidated; our maintainers are here to guide you through the process.

Beyond code, we value contributions in the form of architectural discussions, documentation improvements, and community support. By participating in these areas, you help create a more inclusive and robust framework for everyone. We encourage you to share your experiences, ask questions, and collaborate with others.

### Becoming a Maintainer

For those who demonstrate sustained commitment and a deep understanding of the Fluo behavioral contracts, we offer a path to maintainership. This involves taking on more responsibility in issue triage, PR reviews, and architectural decision-making. Maintainership is not just a title; it is a commitment to the long-term health and stability of the project.

We believe in a "Service-First" leadership model, where maintainers are servants of the community. This means prioritizing the needs of users and contributors, and working to create a welcoming and productive environment for all. If you are interested in this path, we encourage you to start by consistently contributing high-quality work and engaging positively with the community.

### Staying Connected

To stay up-to-date with the latest developments in Fluo, we recommend following our official blog, joining our community discussions, and subscribing to our release notifications. These channels provide a wealth of information on upcoming features, architectural changes, and community events.

We also host regular office hours and community meetings where you can interact directly with the core maintainers and other contributors. These sessions are a great way to get feedback on your ideas, learn more about the project's internals, and build relationships with other members of the community.

## Final Words

The strength of fluo lies in its community. By contributing to the framework, you help build a future where TypeScript backends are explicit, standard-compliant, and platform-agnostic. We look forward to your first PR, whether it's a small typo fix or a massive architectural enhancement. Join us in shaping the next generation of TypeScript development!

We value every contribution you make. Beyond technical code, we welcome documentation improvements, community support, and design feedback. Fluo is more than just code; it's a gathering of people who aspire to a better engineering culture. Thank you for joining us on this journey. Your ideas and passion are what make fluo more complete.

Finally, we hope this guidebook series has served as an excellent compass for your fluo journey. Having completed all the advanced chapters, you are now a true master of fluo. Now, unleash your creativity and showcase your amazing projects to the world. We are always ready to support and cheer you on. Good luck!

---
<!-- lines: 242 -->

