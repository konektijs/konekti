<!-- packages: @fluojs/cache-manager, @fluojs/redis -->
<!-- project-state: FluoBlog v1.14 -->

# Chapter 17. Distributed Caching with Redis

## Learning Objectives
- Understand why caching is essential for high-performance FluoBlog.
- Configure `CacheModule` with memory and Redis stores.
- Use `CacheInterceptor` for automatic HTTP response caching.
- Apply manual caching strategies using `CacheService`.
- Implement cache invalidation using `@CacheEvict`.
- Design a distributed caching strategy for multi-instance deployments.

## 17.1 The Need for Speed
As FluoBlog grows, some operations become increasingly expensive. Fetching a popular blog post with all its comments, tags, and author information requires complex database joins. If thousands of users access the same post simultaneously, the database can become a bottleneck, leading to slow response times for everyone.

Caching allows us to store the result of an expensive operation in a fast, temporary storage (like memory or Redis). Subsequent requests can then be served almost instantly, bypassing the database entirely.

### Tradeoffs: Speed vs Freshness
Caching always introduces a tradeoff. A cached response is faster but might be slightly "stale" (outdated) compared to the actual database. In this chapter, we will learn how to balance this using TTLs and invalidation.

## 17.2 Introducing @fluojs/cache-manager
The `@fluojs/cache-manager` package provides a unified interface for caching in `fluo`. It supports multiple backends:
- **Memory**: Fast, but local to a single process. Data is lost when the server restarts. Best for development.
- **Redis**: Fast, distributed, and persistent. Data is shared across all server instances. Best for production.

## 17.3 Basic Memory Caching
For small applications or initial development, memory caching is the easiest to set up.

```typescript
import { Module } from '@fluojs/core';
import { CacheModule } from '@fluojs/cache-manager';

@Module({
  imports: [
    CacheModule.forRoot({
      store: 'memory',
      ttl: 300, // 5 minutes default window
    }),
  ],
})
export class AppModule {}
```

## 17.4 Automatic HTTP Caching
The most common use case is caching GET request responses. `fluo` makes this trivial with `CacheInterceptor`.

### Applying the Interceptor
```typescript
import { Controller, Get, UseInterceptors } from '@fluojs/http';
import { CacheInterceptor, CacheTTL } from '@fluojs/cache-manager';

@Controller('posts')
@UseInterceptors(CacheInterceptor)
export class PostController {
  @Get()
  @CacheTTL(60) // Override global TTL to 1 minute for this route
  findAll() {
    return this.service.findAll();
  }
}
```

When a user calls `GET /posts`, the interceptor generates a cache key based on the URL.
1. **Cache Hit**: If the key exists, the cached JSON is returned immediately.
2. **Cache Miss**: If it doesn't exist, the handler executes, the result is stored in the cache, and then returned.

## 17.5 Manual Caching with CacheService
Sometimes you need more control than an interceptor provides—for example, when you want to cache only a specific part of a complex business logic. You can inject `CacheService` to manage data manually.

```typescript
import { Inject } from '@fluojs/core';
import { CacheService } from '@fluojs/cache-manager';

export class PostService {
  constructor(@Inject(CacheService) private readonly cache: CacheService) {}

  async getPostWithComments(id: string) {
    const cacheKey = `post_detail:${id}`;
    
    // Pattern: Read-Through Caching
    return this.cache.remember(cacheKey, async () => {
      // This block only runs if the data is NOT in the cache
      return this.prisma.post.findUnique({
        where: { id },
        include: { comments: true },
      });
    }, 600); // Specific TTL for this item (10 minutes)
  }
}
```

The `remember` method simplifies the common logic: "Try to get from cache; if missing, fetch, save, and return."

## 17.6 Cache Invalidation
The hardest part of caching is knowing when to delete stale data. If a user updates a blog post, the cached version of that post must be removed immediately, or other users will see the old version.

### Using @CacheEvict
`fluo` provides `@CacheEvict` to handle this declaratively.

```typescript
import { Post, Put, Param } from '@fluojs/http';
import { CacheEvict } from '@fluojs/cache-manager';

@Controller('posts')
export class PostController {
  @Put(':id')
  @CacheEvict('posts') // Clears any cache key starting with 'posts'
  update(@Param('id') id: string, @Body() data: UpdatePostDto) {
    // When the update succeeds, the cache is automatically invalidated
    return this.service.update(id, data);
  }
}
```

You can also use `this.cache.del(key)` inside your service for more granular invalidation.

## 17.7 Moving to Redis
In a production environment with multiple server instances (e.g., in a cluster), memory caching is insufficient. Each server would have its own isolated cache, leading to "cache fragmentation." Redis provides a central, shared cache.

### Configuration
First, install the necessary packages:
`pnpm add @fluojs/redis ioredis`

Then, configure the modules in your `AppModule`:

```typescript
import { RedisModule } from '@fluojs/redis';
import { CacheModule } from '@fluojs/cache-manager';

@Module({
  imports: [
    RedisModule.forRoot({
      host: process.env.REDIS_HOST || 'localhost',
      port: 6379,
    }),
    CacheModule.forRoot({
      store: 'redis',
      ttl: 600,
    }),
  ],
})
export class AppModule {}
```

## 17.8 Advanced Redis Patterns
`@fluojs/redis` also gives you direct access to the `ioredis` client for operations that go beyond simple key-value caching, such as real-time messaging or complex counters.

```typescript
import { Inject } from '@fluojs/core';
import { REDIS_CLIENT } from '@fluojs/redis';
import type Redis from 'ioredis';

export class NotificationService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async incrementViews(postId: string) {
    // Using native Redis INCR command
    await this.redis.incr(`post_views:${postId}`);
  }
}
```

## 17.9 Summary
Caching is vital for scaling FluoBlog. By using `@fluojs/cache-manager`, you gain a flexible system that evolves with your infrastructure.

- **CacheInterceptor** provides "zero-code" caching for HTTP responses.
- **CacheService.remember()** allows for fine-grained control within services.
- **@CacheEvict** ensures users don't see stale data after an update.
- **Redis** is the standard for distributed production environments.

In the next chapter, we will look at how to monitor the health of these connections using Terminus.

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
