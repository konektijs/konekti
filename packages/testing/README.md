# @konekti/testing

The official module construction and provider override baseline for testing Konekti applications.

## What this package does

`@konekti/testing` provides a minimal, focused API for building isolated test environments within the Konekti module graph. You hand it a root module, override whichever providers you want to replace with fakes or spies, compile the graph, and then resolve tokens to get the instances you want to assert against.

It does **not** participate in the production runtime — the testing module exists only in test environments. It is intentionally a baseline: a stable foundation to build on, not a complete fixture library. Advanced helpers (fake request/response builder, auth fixtures, ORM integration fixtures) are out of scope for now and are expected to be added separately.

## Installation

```bash
npm install --save-dev @konekti/testing
```

## Quick Start

### Basic test setup

```typescript
import { createTestingModule } from '@konekti/testing';
import { AppModule } from '../src/app.module';
import { UserService } from '../src/user/user.service';
import { USER_REPOSITORY } from '../src/user/tokens';

describe('UserService', () => {
  it('creates a user', async () => {
    const fakeRepo = {
      create: jest.fn().mockResolvedValue({ id: '1', name: 'Alice' }),
      findById: jest.fn(),
    };

    const module = await createTestingModule({ rootModule: AppModule })
      .overrideProvider(USER_REPOSITORY, fakeRepo)
      .compile();

    const service = module.resolve(UserService);

    const result = await service.createUser({ name: 'Alice' });

    expect(fakeRepo.create).toHaveBeenCalledWith({ name: 'Alice' });
    expect(result.name).toBe('Alice');
  });
});
```

### Overriding multiple providers

```typescript
const module = await createTestingModule({ rootModule: AppModule })
  .overrideProvider(USER_REPOSITORY, fakeUserRepo)
  .overrideProvider(EMAIL_SERVICE, fakeEmailService)
  .overrideProvider(CONFIG_TOKEN, { dbUrl: 'sqlite::memory:' })
  .compile();
```

### Resolving tokens directly

```typescript
// Resolve by class reference
const service = module.resolve(UserService);

// Resolve by DI token (symbol or string)
const config = module.resolve(CONFIG_TOKEN);
```

## Key API

### `createTestingModule(options)`

Entry point. Returns a builder object.

```typescript
interface TestingModuleOptions {
  rootModule: ModuleDefinition;
}

createTestingModule(options: TestingModuleOptions): TestingModuleBuilder
```

### `TestingModuleBuilder`

Fluent builder returned by `createTestingModule`.

| Method | Description |
|---|---|
| `.overrideProvider(token, implementation)` | Replace a DI token's provider with `implementation` before the graph is compiled. Chainable. |
| `.compile()` | Compile the module graph with all overrides applied. Returns a `Promise<TestingModule>`. |

### `TestingModule`

The compiled test container.

| Method | Description |
|---|---|
| `.resolve(token)` | Resolve a provider from the compiled module graph. Accepts class constructors or DI tokens. |

## Architecture

```
createTestingModule({ rootModule })
    │
    ▼
TestingModuleBuilder
    │  .overrideProvider(token, impl)  ← stacks overrides
    │  .overrideProvider(token, impl)
    │
    ▼
.compile()
    │  builds module graph from rootModule
    │  applies all provider overrides
    ▼
TestingModule
    │
    ▼
.resolve(token)  → instance from graph
```

Overrides are applied **after** the module graph is constructed, replacing the real providers with the fakes you supplied. The rest of the graph remains intact, so only the tokens you explicitly override are substituted.

## File Reading Order (for contributors)

The package is intentionally small. You can read the entire implementation in one sitting:

1. `src/types.ts` — `TestingModuleOptions`, `TestingModuleBuilder`, and `TestingModule` interfaces; the public contract
2. `src/module.ts` — `createTestingModule()` implementation; how the builder pattern and `.compile()` work
3. `src/index.ts` — public surface; what is exported and what is not
4. `src/module.test.ts` — the test suite; shows the intended usage patterns and edge cases

## Related packages

| Package | Relationship |
|---|---|
| `@konekti/di` | The DI container that `TestingModule` wraps and `.resolve()` delegates into |
| `@konekti/runtime` | Module graph construction logic that `compile()` builds on |
| `@konekti/core` | Lifecycle interfaces; `TestingModule` does not trigger lifecycle hooks in test mode |
| `@konekti/prisma` | Typical override target — replace `PRISMA_CLIENT` with a fake to avoid real DB connections |
| `@konekti/jwt` | Typical override target — replace the JWT verifier to test auth flows without real tokens |

## One-liner mental model

> `@konekti/testing` = build the real module graph, swap out only what you fake, resolve what you want to assert against — no magic, no separate test framework.
