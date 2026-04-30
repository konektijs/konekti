# HTTP runtime benchmark

Runs a small HTTP throughput/latency comparison between the local fluo worktree packages and NestJS v11 across three targets:

- `Nest+Fastify`
- `fluo+Fastify`
- `fluo+Bun`

## Scenarios

- `baseline`: a single no-param baseline route used to measure the adapter/framework response floor.
- `di-chain-dto-deterministic-1`: one DTO-bound path route through Controller → Service → Repository.
- `di-chain-dto-deterministic-20`: the same DTO-bound DI path across a deterministic 20-route cycle.
- `di-chain-direct-param-deterministic-1`: one direct path-param route through Controller → Service → Repository.
- `di-chain-direct-param-deterministic-20`: the same direct-param DI path across a deterministic 20-route cycle.
- `query-deterministic-1`: one query-focused route that reads repeated query parameters.
- `json-body-deterministic-1`: one JSON body route that exercises request body materialization.
- `query-dto-deterministic-1`: one query-heavy DTO route with six bound query fields.
- `body-dto-deterministic-1`: one body-heavy DTO route with six bound body fields.

## Run

```bash
pnpm --dir tooling/benchmarks/http-comparison --ignore-workspace install --frozen-lockfile
pnpm --dir tooling/benchmarks/http-comparison --ignore-workspace bench
```

This benchmark has its own lockfile and is intentionally excluded from the root pnpm workspace. The fluo dependencies are linked to `../../../packages/*`, so build the local packages before measuring if you want benchmark results to include unpublished worktree changes.

The runner starts an isolated server set for each scenario, so 1-route and 20-route scenarios register different app shapes instead of merely sending different request paths through the same route table. It warms every target for each scenario, then measures with `autocannon` at 100 connections for 40 seconds. Measurement order rotates by scenario to avoid always giving one framework the same position. Multi-route scenarios use a deterministic path cycle so every target sees the same request sequence.

For quick directional runs, override the defaults with environment variables:

```bash
BENCH_WARMUP_SEC=3 BENCH_MEASURE_SEC=10 pnpm --dir tooling/benchmarks/http-comparison --ignore-workspace bench
```

By default, the runner rebuilds the linked local fluo packages before measuring so uncommitted source changes are reflected in `dist/`. Set `BENCH_BUILD_LOCAL_FLUO_PACKAGES=0` to skip that rebuild when you have already built the packages.

To collect a repeat-average for specific scenarios, set `BENCH_RUNS` and a comma-separated `BENCH_SCENARIOS` list:

```bash
BENCH_RUNS=5 BENCH_SCENARIOS=query-deterministic-1,json-body-deterministic-1 pnpm --dir tooling/benchmarks/http-comparison --ignore-workspace bench
```

The `fluo+Bun` target requires the `bun` CLI because `@fluojs/platform-bun` uses `globalThis.Bun.serve()` at listen time.

## Correctness gates

Each warm-up and measured run validates the expected response body and fails on:

- connection errors
- timeouts
- non-2xx responses
- body mismatches

The report prints those counters with throughput and latency metrics.

## Scope and caveats

- This measures the linked local worktree package builds, not the released npm beta surface.
- fluo uses TC39 standard decorators without `emitDecoratorMetadata`; NestJS uses legacy decorators with `emitDecoratorMetadata` through `nestjs/tsconfig.json`.
- `fluo+Bun` is a runtime comparison, not a same-adapter comparison. Treat it as “same fluo app graph on Bun’s native server” versus the Node.js adapter targets.
- The suite covers routing plus DTO binding on path, query, and body inputs. It does not measure validation plugins, serialization plugins, guards, pipes, database access, or production middleware.
