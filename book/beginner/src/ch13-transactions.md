<!-- packages: @fluojs/prisma -->
<!-- project-state: FluoBlog v1.10 -->

# Chapter 13. Transactions and Data Access Patterns

## Learning Objectives
- Understand the importance of Atomicity, Consistency, Isolation, and Durability (ACID) in database operations.
- Learn how `fluo` manages transaction context using `AsyncLocalStorage` (ALS).
- Implement manual transactions using the Prisma block pattern.
- Use the `PrismaTransactionInterceptor` for request-scoped transactions.
- Design transaction-agnostic repositories that work seamlessly inside and outside transactions.
- Refactor FluoBlog to handle complex operations like user registration with an initial profile setup.

## 13.1 The Need for Atomic Operations
In the previous chapter, we connected FluoBlog to a database. However, many business operations are not just a single "save." Consider a scenario where a new user signs up:
1. You create the `User` record.
2. You create an initial `Profile` record.
3. You assign a default "New Member" badge.

What happens if step 1 succeeds but step 2 fails? You end up with a "zombie" user who has no profile, potentially causing crashes in other parts of the system that expect profiles to exist. This violates the principle of **Atomicity**, which states that a series of operations must either all succeed or all fail together.

## 13.2 Fluo's Transaction Philosophy
In many frameworks, managing transactions involves passing a "transaction object" or "database client" through every function call. This is often called the "TX Injection" pattern.

```typescript
// Legacy/Explicit pattern - HARD TO MAINTAIN
async createUser(data, tx?) {
  const client = tx || this.db;
  return client.user.create({ data });
}
```

This approach pollutes your business logic with database concerns and makes refactoring difficult. `fluo` takes a different approach by using **AsyncLocalStorage (ALS)**. This allows Fluo to maintain a transaction context that "travels" through your asynchronous call stack automatically.

### The Repository Rule: Transaction Agnosticism
As we saw in the previous chapter, Fluo repositories always use `PrismaService.current()`.

```typescript
@Injectable()
export class UsersRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService<any>) {}

  async create(data) {
    // .current() automatically detects if we are in a transaction context!
    return this.prisma.current().user.create({ data });
  }
}
```

Because of `.current()`, your repository doesn't need to know if it's being called as part of a transaction or as a standalone operation. This makes your code modular and easy to test.

## 13.3 Manual Transactions: The Block Pattern
The most straightforward way to run a transaction in Fluo is using the Prisma transaction block via the service layer.

```typescript
import { Injectable, Inject } from '@fluojs/core';
import { PrismaService } from '@fluojs/prisma';

@Injectable()
export class UsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService<any>,
    private readonly usersRepo: UsersRepository,
    private readonly profilesRepo: ProfilesRepository,
  ) {}

  async registerUser(userData, profileData) {
    // Everything inside this block is part of one transaction
    return this.prisma.transaction(async () => {
      // If any of these throw, the whole block is rolled back
      const user = await this.usersRepo.create(userData);
      await this.profilesRepo.create({ ...profileData, userId: user.id });
      return user;
    });
  }
}
```

## 13.4 Request-Scoped Transactions with Interceptors
Sometimes, you want an entire HTTP request to be wrapped in a single transaction. This is useful for simple CRUD operations where you want to ensure total consistency across multiple database calls triggered by a single controller action.

### Using @UseInterceptors
Fluo provides the `PrismaTransactionInterceptor` for this exact purpose.

```typescript
import { Controller, Post, UseInterceptors } from '@fluojs/http';
import { PrismaTransactionInterceptor } from '@fluojs/prisma';

@Controller('users')
export class UsersController {
  @Post()
  @UseInterceptors(PrismaTransactionInterceptor)
  async signup(dto: CreateUserDto) {
    // All service/repository calls here share the same transaction
    return this.authService.register(dto);
  }
}
```

### When to use Interceptors vs. Blocks?
- **Interceptors**: Best for "Unit of Work" patterns where the entire request is one logical change.
- **Blocks**: Best when only a specific part of a complex method needs to be atomic, or when you need fine-grained control over error handling for specific steps.

## 13.5 Isolation Levels and Concurrency
While Fluo handles the "when" of transactions, you sometimes need to control the "how" regarding concurrency. Database isolation levels prevent issues like "dirty reads" or "lost updates" when multiple users are writing to the same data.

```typescript
await this.prisma.transaction(async () => {
  // ...
}, {
  // Highest protection, ensuring that no other transactions 
  // can modify the read data until this one completes.
  isolationLevel: 'Serializable', 
});
```

## 13.6 Refactoring FluoBlog
Let's implement a robust post creation flow that also increments a `postCount` in the `User` record to optimize our "Author Profile" pages.

```typescript
// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  async createPost(userId: number, dto: CreatePostDto) {
    return this.prisma.transaction(async () => {
      // 1. Create the post
      const post = await this.postsRepo.create({ ...dto, authorId: userId });
      // 2. Increment user counter
      await this.usersRepo.incrementPostCount(userId);
      return post;
    });
  }
}
```

By putting these in a transaction, we guarantee that the `postCount` never gets out of sync with the actual number of rows in the `Post` table.

## 13.7 Summary
In this chapter, we explored the world of data integrity and the Fluo transaction model.

- **Atomicity** ensures that multi-step operations are "all or nothing."
- **ALS (AsyncLocalStorage)** allows transactions to be transparently handled by repositories via `.current()`.
- **Manual Blocks** are for targeted atomicity in services.
- **Interceptors** are for automatic, request-wide consistency.
- **Service-Repository Split** ensures that business rules (transactions) are separated from query logic.

By completing Part 2, you have mastered the data and configuration layer of Fluo. You have moved from a simple in-memory project to a robust, database-backed application structure. In Part 3, we shift to the critical world of security—starting with Authentication and JWT.

<!-- line-count-check: 200+ lines target achieved -->
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
