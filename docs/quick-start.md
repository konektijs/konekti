# quick start

This guide matches the current Phase 5 onboarding contract for the implementation repo.

## repo-verified path

The default public recommendation remains `Prisma + PostgreSQL`.

```sh
pnpm --filter create-konekti exec create-konekti
```

This is the monorepo-local smoke path verified in this repository today.

Prompt flow:

1. `Project name`
2. `ORM`
3. `Database`
4. `Package manager`
5. tier note before install starts
6. `Target directory`

## generated workspace commands

Run these from the generated project root:

```sh
pnpm dev
pnpm typecheck
pnpm build
pnpm test
```

The scaffold now emits the same workspace layout for `pnpm`, `npm`, and `yarn`, with command wrappers that stay package-manager aware.

## first generated app shape

The starter app includes:

- `apps/<project>/src/app.ts` with JWT + passport wiring
- `apps/<project>/src/node-http-adapter.ts` with request-signal support
- `apps/<project>/src/examples/user.repo.ts` with preset-aware ORM access
- `apps/<project>/src/app.test.ts` proving the runtime path works end-to-end

## first generator command

Run the repo generator from the project root:

```sh
pnpm exec konekti g repo User
```

On a generated single-app workspace, the CLI infers the selected preset and writes files into `apps/<project>/src` by default.
