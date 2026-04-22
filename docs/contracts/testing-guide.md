# Testing Requirements

<p><strong><kbd>English</kbd></strong> <a href="./testing-guide.ko.md"><kbd>한국어</kbd></a></p>

## Test Types

| Test type | Required surface | Repo-grounded tools and patterns |
| --- | --- | --- |
| Unit | Pure provider logic, helpers, and failure branches with no network or external process dependency. | Use Vitest directly. `@fluojs/testing/mock` exposes `createMock(...)` and `createDeepMock(...)` for explicit doubles. |
| Integration | Real module graph compilation, provider overrides, and DI visibility checks inside one application slice. | Use `createTestingModule({ rootModule })`, then `overrideProvider(...)`, `overrideGuard(...)`, `overrideInterceptor(...)`, or `overrideProviders(...)` before `.compile()`. |
| E2E-style HTTP | Request dispatch, guards, interceptors, DTO validation, and response writing through the real HTTP stack. | Use `createTestApp({ rootModule })` from `@fluojs/testing`. The repository example at `examples/ops-metrics-terminus/src/app.test.ts` dispatches `/health`, `/ready`, `/metrics`, and application routes this way. |
| Platform conformance | Framework-facing platform packages and portability-sensitive adapters. | Use `@fluojs/testing/platform-conformance`, `@fluojs/testing/http-adapter-portability`, `@fluojs/testing/web-runtime-adapter-portability`, or `@fluojs/testing/fetch-style-websocket-conformance` when the change affects runtime or adapter contracts. |

## Commands

| Command | Use |
| --- | --- |
| `pnpm test` | Run the workspace Vitest suite from the repository root. |
| `pnpm vitest run --project packages` | Run package tests in the split project layout used by release readiness checks. |
| `pnpm vitest run --project apps` | Run app-project tests in the split project layout used by release readiness checks. |
| `pnpm vitest run --project examples` | Run example application tests in the split project layout used by release readiness checks. |
| `pnpm vitest run --project tooling` | Run tooling tests in the split project layout used by release readiness checks. |
| `pnpm verify` | Run the repository verification chain: build, typecheck, lint, then test. |
| `pnpm verify:platform-consistency-governance` | Verify governed docs and contract consistency when testing or release requirements change. |
| `pnpm verify:release-readiness` | Run the canonical release gate, including `pnpm build`, `pnpm typecheck`, split Vitest projects, `pnpm --dir packages/cli sandbox:matrix`, and governance checks. |

## Coverage Requirements

- The repository does not define a single global line-coverage percentage in `package.json` or governance tooling. Coverage is enforced by contract surface, not by one numeric threshold.
- Every behavior change MUST add or update tests in the affected package, example, or tooling project. The nearest existing `*.test.ts` files are the primary placement target.
- Module wiring changes MUST keep integration coverage through `createTestingModule(...)` so provider registration, overrides, and DI resolution remain exercised.
- Request-facing HTTP changes MUST keep request-level coverage through `createTestApp(...)` or equivalent dispatch tests that execute the real request pipeline.
- Platform and adapter changes MUST keep conformance or portability coverage through the `@fluojs/testing` harness subpaths when the change affects runtime portability.
- Release-governed testing changes MUST stay green under the split Vitest project model used by `pnpm verify:release-readiness`. Do not treat a local `pnpm test` pass as a replacement for those split project runs.
