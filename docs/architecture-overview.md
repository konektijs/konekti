# architecture overview

`konekti` keeps the public surface intentionally narrow and layers runtime behavior behind stable decorators and official packages.

## public package families

- `@konekti/core`
- `@konekti/config`
- `@konekti/http`
- `@konekti/jwt`
- `@konekti/passport`
- `@konekti/prisma`
- `@konekti/drizzle`
- `@konekti/testing`
- `@konekti/cli`
- `create-konekti`

Internal-only workspace packages remain under `@konekti-internal/*` and should not leak into public app-facing guidance unless the current runtime contract still requires them.

## request execution path

The generated app and runtime tests follow this flow:

`bootstrapApplication -> handler mapping -> dispatcher -> middleware -> guard -> interceptor -> controller`

Concrete evidence lives in:

- `packages/http/src/dispatcher.ts`
- `packages/http/src/dispatcher.test.ts`
- `packages/module/src/application.test.ts`
- `packages/prisma/src/vertical-slice.test.ts`

## data and auth stance

- repository generation stays ORM-native and preset-aware
- JWT token-core behavior belongs to `@konekti/jwt`
- strategy registry and auth metadata belong to `@konekti/passport`
- request-scoped transactions remain opt-in integration behavior, not a default service rule

## examples

- `docs/phase-3-reference-slice.md` captures the current reference slice baseline
- `apps/<project>/src/examples/user.repo.ts` is the generated repository example in scaffolded workspaces
