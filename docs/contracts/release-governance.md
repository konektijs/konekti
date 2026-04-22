# Versioning & Release Rules

<p><strong><kbd>English</kbd></strong> <a href="./release-governance.ko.md"><kbd>한국어</kbd></a></p>

## Stability Tiers

| Tier | Version window | Release rule | Contract level |
| --- | --- | --- | --- |
| Experimental | `0.x` | Public APIs may change in a minor release. Prerelease versions must publish under a non-`latest` dist-tag. | No stable upgrade guarantee. |
| Preview | `0.x` or prerelease builds | Packages are intended for public use, but breaking changes still follow the `0.x` minor-bump rule and require migration notes in `CHANGELOG.md`. | Documented behavior should stay aligned with tests and release notes. |
| Official | `1.0+` | Stable releases publish under `latest`. Breaking changes require a major version bump. | Public API, documented behavior, and release process are treated as stable contracts. |

## Semver Rules

- All public `@fluojs/*` packages follow Semantic Versioning.
- `major` is required for breaking changes in `1.0+`.
- `minor` is used for backward-compatible feature work, and it is also the required bump for breaking changes during `0.x`.
- `patch` is limited to backward-compatible fixes, security fixes, and documentation or tooling updates that preserve documented behavior.
- Prerelease versions are versions with a hyphen suffix. They must publish under a non-`latest` dist-tag such as `next`, `beta`, or `rc`.
- Stable versions without a prerelease suffix must publish under the `latest` dist-tag.
- Intended public package manifests must use `workspace:^` for internal `@fluojs/*` dependencies across dependency, optional dependency, peer dependency, and dev dependency fields.

## Breaking Change Rules

- Treat API shape changes, documented behavior changes, configuration shape changes, bootstrap-order changes, adapter-contract changes, and public package removals as breaking when existing consumer code or configuration must change to keep working.
- In `0.x`, a breaking change may ship only in a minor release, and the release must include a migration note in `CHANGELOG.md`.
- In `1.0+`, a breaking change must ship in a major release.
- Do not classify a change as patch or minor when it changes documented guarantees for lifecycle ordering, shutdown behavior, adapter behavior, readiness behavior, or public CLI and starter contracts.
- Update implementation, tests, and governed docs together when a breaking rule changes.

## Graduation Requirements

A package is ready for `1.0` and the Official tier only when all of the following stay true:

1. The package is an existing workspace package under `packages/*`, remains public, and keeps `publishConfig.access` set to `public`.
2. The package appears in both `docs/reference/package-surface.md` and the `## intended publish surface` list in this document.
3. Public exports satisfy the repository TSDoc baseline, and contract-governing docs keep English and Korean parity.
4. Release verification passes the canonical repository commands: `pnpm build`, `pnpm typecheck`, `pnpm vitest run --project packages`, `pnpm vitest run --project apps`, `pnpm vitest run --project examples`, `pnpm vitest run --project tooling`, `pnpm --dir packages/cli sandbox:matrix`, `pnpm verify:platform-consistency-governance`, and `pnpm verify:release-readiness`.
5. `CHANGELOG.md` keeps the `## [Unreleased]` section, and every `0.x` breaking release includes migration notes before a stable `1.0+` contract is declared.

## intended publish surface

- `@fluojs/cache-manager`
- `@fluojs/cli`
- `@fluojs/config`
- `@fluojs/core`
- `@fluojs/cqrs`
- `@fluojs/cron`
- `@fluojs/email`
- `@fluojs/discord`
- `@fluojs/di`
- `@fluojs/drizzle`
- `@fluojs/event-bus`
- `@fluojs/graphql`
- `@fluojs/http`
- `@fluojs/jwt`
- `@fluojs/metrics`
- `@fluojs/microservices`
- `@fluojs/mongoose`
- `@fluojs/notifications`
- `@fluojs/openapi`
- `@fluojs/passport`
- `@fluojs/platform-bun`
- `@fluojs/platform-cloudflare-workers`
- `@fluojs/platform-deno`
- `@fluojs/platform-express`
- `@fluojs/platform-fastify`
- `@fluojs/platform-nodejs`
- `@fluojs/prisma`
- `@fluojs/queue`
- `@fluojs/redis`
- `@fluojs/runtime`
- `@fluojs/serialization`
- `@fluojs/slack`
- `@fluojs/socket.io`
- `@fluojs/studio`
- `@fluojs/terminus`
- `@fluojs/testing`
- `@fluojs/throttler`
- `@fluojs/validation`
- `@fluojs/websockets`

## Enforcement

Run these commands when versioning rules, release-governing docs, or intended publish surface packages change:

```bash
pnpm build
pnpm typecheck
pnpm vitest run --project packages
pnpm vitest run --project apps
pnpm vitest run --project examples
pnpm vitest run --project tooling
pnpm --dir packages/cli sandbox:matrix
pnpm verify:public-export-tsdoc
pnpm verify:platform-consistency-governance
pnpm verify:release-readiness
pnpm generate:release-readiness-drafts
pnpm verify:release-readiness --target-package @fluojs/cli --target-version 0.1.0 --dist-tag latest
```

- `pnpm verify:platform-consistency-governance` checks heading parity and governed documentation consistency.
- `pnpm verify:release-readiness` reuses the canonical build, typecheck, split Vitest, sandbox, package-surface sync, and publish-safety checks.
- `pnpm verify:public-export-tsdoc` enforces the public export documentation baseline used by governed packages.
- `pnpm generate:release-readiness-drafts` refreshes draft release-readiness summary artifacts and the draft release block in `CHANGELOG.md` when maintainers prepare notes.
- `pnpm verify:release-readiness --target-package ... --target-version ... --dist-tag ...` is the single-package publish preflight used by `.github/workflows/release-single-package.yml`.
