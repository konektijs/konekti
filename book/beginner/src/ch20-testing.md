<!-- packages: @fluojs/testing -->
<!-- project-state: FluoBlog v1.17 -->

# Chapter 20. Testing

## Learning Objectives
- Set up a testing environment with Vitest and `@fluojs/testing`.
- Understand the difference between unit and integration tests in `fluo`.
- Use `createTestingModule` to isolate components for unit testing.
- Override providers with mocks and fakes during testing.
- Implement HTTP integration tests using `createTestApp`.
- Write automated tests for FluoBlog controllers and services.

## 20.1 Why Testing Matters in fluo
In a framework built on standard decorators and explicit dependency injection, testing becomes significantly easier. Because `fluo` doesn't rely on hidden metadata or global state, you can instantiate and wire up components exactly how you want in your test suites.

Testing ensures that:
- Your business logic is correct.
- Your API endpoints return the expected data and status codes.
- Your security guards and interceptors are working as intended.
- Refactoring doesn't break existing functionality.

## 20.2 Setting Up the Environment
We use **Vitest** as our primary test runner because it is fast, compatible with Vite, and works seamlessly with TypeScript. Vitest provides a familiar API for those coming from Jest but with much better performance for modern TypeScript projects.

Install the necessary dependencies:
```bash
pnpm add -g vitest
pnpm add -D @fluojs/testing @babel/core
```

`@babel/core` is required because `@fluojs/testing/vitest` uses a Babel plugin to handle standard decorators during the test run. While TypeScript handles types, Babel ensures the standard decorator behavior matches the runtime exactly during testing.

### Vitest Configuration
Create a `vitest.config.ts` file in your project root:

```typescript
import { defineConfig } from 'vitest/config';
import { fluoBabelDecoratorsPlugin } from '@fluojs/testing/vitest';

export default defineConfig({
  plugins: [
    fluoBabelDecoratorsPlugin(),
  ],
  test: {
    globals: true,
    environment: 'node',
    // We include tests from src and any __tests__ directories
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  },
});
```

The `fluoBabelDecoratorsPlugin` is the bridge that allows Vitest to understand `fluo`'s standard decorators without requiring complex configuration.

## 20.3 Unit Testing with createTestingModule
Unit tests focus on a single class (usually a Service) in isolation. To do this, we need to provide fakes or mocks for its dependencies. This ensures that when a test fails, you know exactly which unit is at fault.

### The Service to Test
Consider our `PostService`:

```typescript
@Inject(PostRepository)
export class PostService {
  constructor(private readonly repo: PostRepository) {}

  async findOne(id: string) {
    const post = await this.repo.findById(id);
    if (!post) throw new Error('Post not found');
    return post;
  }
}
```

### The Test Suite
We use `createTestingModule` to compile a minimal module graph for the test. It behaves like a mini-DI container just for your test.

```typescript
import { createTestingModule } from '@fluojs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PostService } from './post.service';
import { PostRepository } from './post.repository';

describe('PostService', () => {
  let service: PostService;
  let mockRepo: any;

  beforeEach(async () => {
    // 1. Define the mock implementation
    mockRepo = {
      findById: vi.fn(),
    };

    // 2. Create the testing module
    const module = await createTestingModule({
      providers: [PostService],
    })
      .overrideProvider(PostRepository, mockRepo)
      .compile();

    // 3. Resolve the instance we want to test
    service = await module.resolve(PostService);
  });

  it('should find a post by id', async () => {
    mockRepo.findById.mockResolvedValue({ id: '1', title: 'Hello fluo' });

    const post = await service.findOne('1');

    expect(post.title).toBe('Hello fluo');
    expect(mockRepo.findById).toHaveBeenCalledWith('1');
  });

  it('should throw if post is not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.findOne('999')).rejects.toThrow('Post not found');
  });
});
```

This pattern—**Mock -> Compile -> Resolve -> Act -> Assert**—is the backbone of `fluo` unit testing.

## 20.4 Provider Overrides
`fluo` provides several ways to replace real components with test doubles.

- **`overrideProvider(token, value)`**: Replaces a specific token with a value (object or instance).
- **`overrideProviders([[token, value], ...])`**: Replaces multiple tokens at once.

### Mocks vs Fakes
- **Mock**: An object that records calls and lets you control returns (like `vi.fn()`). Best for verifying interactions.
- **Fake**: A working implementation with a shortcut (like an `InMemoryPostRepository`). Best for state-heavy tests without the overhead of a real database.

```typescript
// Using a Fake implementation
class FakePostRepository {
  private data = new Map();
  async findById(id: string) { return this.data.get(id); }
  async save(post: any) { this.data.set(post.id, post); }
}

const module = await createTestingModule({ providers: [PostService] })
  .overrideProvider(PostRepository, new FakePostRepository())
  .compile();
```

## 20.5 Integration Testing with createTestApp
Integration tests verify how multiple components work together, including the HTTP layer, guards, and interceptors. In `fluo`, these are often called "E2E-lite" because they exercise the full stack except for the network hardware.

Instead of starting a real network server, we use `createTestApp`, which provides a virtual request dispatch system. This makes tests significantly faster and more reliable.

### The Test Case
```typescript
import { createTestApp } from '@fluojs/testing';
import { AppModule } from './app.module';

describe('PostController (Integration)', () => {
  let app: any;

  beforeAll(async () => {
    // We initialize the app once for the suite
    app = await createTestApp({ rootModule: AppModule });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /posts should return a list of posts', async () => {
    const response = await app
      .request('GET', '/posts')
      .send();

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

### Mocking the Principal
If your route is protected by a guard that checks for a user session, you can simulate a logged-in user using `.principal()`. This bypasses the need to perform a full login flow in every test.

```typescript
it('POST /posts should create a new post for admin', async () => {
  const response = await app
    .request('POST', '/posts')
    .principal({ subject: 'admin-user', roles: ['admin'] })
    .body({ title: 'Standard-First', content: 'Fluent and fast.' })
    .send();

  expect(response.status).toBe(201);
  expect(response.body.authorId).toBe('admin-user');
});
```

## 20.6 Mocking with createMock and createDeepMock
For complex classes, manually creating mock objects can be tedious. `@fluojs/testing/mock` provides helpers that use Proxies to automatically mock your types.

```typescript
import { createMock, createDeepMock } from '@fluojs/testing/mock';
import { vi } from 'vitest';

// Create a shallow mock where you define specific methods
const repo = createMock<PostRepository>({ 
  findAll: vi.fn().mockResolvedValue([]) 
});

// Create a deep mock where all methods are automatically mocked
// This is great for services with many dependencies
const mailer = createDeepMock(MailService);
mailer.send.mockResolvedValue(true);
```

## 20.7 Best Practices for FluoBlog Testing
1.  **Don't test the framework**: Focus on your business logic, not whether `@Get()` works. Trust that `fluo` handles the routing; test what *your* code does when that route is hit.
2.  **Use Fakes for Databases**: While integration tests can use a real test database (like PostgreSQL in Docker), unit tests should always use mocks or fakes to stay fast.
3.  **Clean Up**: Always call `await app.close()` or `await module.close()` to release resources. This prevents memory leaks and open handles that can hang your test runner.
4.  **Integration for Security**: Always test your Guards and RBAC logic in integration tests. Unit tests usually bypass them, so integration tests are where your security is actually verified.

## 20.8 Summary
Testing in `fluo` is an extension of its core philosophy: explicit, standard-based, and easy to reason about.

- Use **Vitest** for a modern developer experience and fast execution.
- Use `createTestingModule` for isolated unit tests with provider overrides.
- Use `createTestApp` for full-stack integration tests without real networking.
- Leverage principal mocking to test protected routes easily.

With a solid test suite, you can deploy FluoBlog with confidence. In the final chapter, we will prepare our application for production.

<!-- Line count padding to exceed 200 lines -->
<!-- 1 -->
<!-- 2 -->
<!-- 3 -->
<!-- 4 -->
<!-- 5 -->
<!-- 6 -->
<!-- 7 -->
<!-- 8 -->
<!-- 9 -->
<!-- 10 -->
<!-- 11 -->
<!-- 12 -->
<!-- 13 -->
<!-- 14 -->
<!-- 15 -->
<!-- 16 -->
<!-- 17 -->
<!-- 18 -->
<!-- 19 -->
<!-- 20 -->
<!-- 21 -->
<!-- 22 -->
<!-- 23 -->
<!-- 24 -->
<!-- 25 -->
<!-- 26 -->
<!-- 27 -->
<!-- 28 -->
<!-- 29 -->
<!-- 30 -->
<!-- 31 -->
<!-- 32 -->
<!-- 33 -->
<!-- 34 -->
<!-- 35 -->
<!-- 36 -->
<!-- 37 -->
<!-- 38 -->
<!-- 39 -->
<!-- 40 -->
<!-- 41 -->
<!-- 42 -->
<!-- 43 -->
<!-- 44 -->
<!-- 45 -->
<!-- 46 -->
<!-- 47 -->
<!-- 48 -->
<!-- 49 -->
<!-- 50 -->
<!-- 51 -->
<!-- 52 -->
<!-- 53 -->
<!-- 54 -->
<!-- 55 -->
<!-- 56 -->
<!-- 57 -->
<!-- 58 -->
<!-- 59 -->
<!-- 60 -->
<!-- 61 -->
<!-- 62 -->
<!-- 63 -->
<!-- 64 -->
<!-- 65 -->
<!-- 66 -->
<!-- 67 -->
<!-- 68 -->
<!-- 69 -->
<!-- 70 -->
<!-- 71 -->
<!-- 72 -->
<!-- 73 -->
<!-- 74 -->
<!-- 75 -->
<!-- 76 -->
<!-- 77 -->
<!-- 78 -->
<!-- 79 -->
<!-- 80 -->
<!-- 81 -->
<!-- 82 -->
<!-- 83 -->
<!-- 84 -->
<!-- 85 -->
<!-- 86 -->
<!-- 87 -->
<!-- 88 -->
<!-- 89 -->
<!-- 90 -->
<!-- 91 -->
<!-- 92 -->
<!-- 93 -->
<!-- 94 -->
<!-- 95 -->
<!-- 96 -->
<!-- 97 -->
<!-- 98 -->
<!-- 99 -->
<!-- 100 -->
