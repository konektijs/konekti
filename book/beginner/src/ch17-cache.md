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
By this point, FluoBlog already has real data, authentication, and traffic-sensitive endpoints. That makes performance the next practical concern. Fetching a popular blog post with all its comments, tags, and author information requires complex database joins, and if thousands of users access the same post at the same time, the database can become a bottleneck.

Caching solves that problem by storing the result of an expensive operation in a fast, temporary store such as memory or Redis. Then the next request can reuse that result instead of repeating the same work.

## 17.2 Introducing @fluojs/cache-manager
The `@fluojs/cache-manager` package gives `fluo` one consistent interface for this job, which lets you start simple and move to a distributed setup later without changing the chapter's core ideas. It supports multiple backends:
- **Memory**: Fast, but local to a single process. Data is lost when the server restarts.
- **Redis**: Fast, distributed, and persistent. Ideal for production clusters.

## 17.3 Basic Memory Caching
The easiest place to start is memory caching. It fits development work and small deployments where one process handles the application.

```typescript
import { Module } from '@fluojs/core';
import { CacheModule } from '@fluojs/cache-manager';

@Module({
  imports: [
    CacheModule.forRoot({
      store: 'memory',
      ttl: 300, // 5 minutes default
    }),
  ],
})
export class AppModule {}
```

## 17.4 Automatic HTTP Caching
Once caching is enabled, the first practical win is usually repeated GET traffic. `fluo` handles that case directly with `CacheInterceptor`.

### Applying the Interceptor
```typescript
import { Controller, Get, UseInterceptors } from '@fluojs/http';
import { CacheInterceptor, CacheTTL } from '@fluojs/cache-manager';

@Controller('posts')
@UseInterceptors(CacheInterceptor)
export class PostController {
  @Get()
  @CacheTTL(60) // Override global TTL to 1 minute
  findAll() {
    return this.service.findAll();
  }
}
```

When a user calls `GET /posts`, the interceptor first checks whether the response is already cached. If it is, the cached value is returned immediately. If not, the handler runs, the result is stored, and that stored value serves the next request.

## 17.5 Manual Caching with CacheService
Not every useful cache fits the shape of an HTTP response. When you need to cache a service-level query or control the key directly, inject `CacheService` and manage it yourself.

```typescript
import { Inject } from '@fluojs/core';
import { CacheService } from '@fluojs/cache-manager';

export class PostService {
  constructor(@Inject(CacheService) private readonly cache: CacheService) {}

  async getPostWithComments(id: string) {
    const cacheKey = `post_detail:${id}`;
    
    return this.cache.remember(cacheKey, async () => {
      // Fetch from DB if not in cache
      return this.prisma.post.findUnique({
        where: { id },
        include: { comments: true },
      });
    }, 600);
  }
}
```

The `remember` method captures the common cache workflow in one place: read the key, compute the value if it is missing, store it, then return it. That keeps the expensive query close to the cache rule instead of scattering the logic across the service.

## 17.6 Cache Invalidation
Faster reads only help if the cached data stays trustworthy. As soon as a user updates a blog post, the old cached version has to disappear or readers will keep seeing stale content.

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
    return this.service.update(id, data);
  }
}
```

## 17.7 Moving to Redis
Memory caching is a good starting point, but it stops being enough once FluoBlog runs on multiple server instances. Each server would keep its own local cache, which leads to cache fragmentation and inconsistent results across instances.

Redis fixes that by giving every instance access to the same shared cache.

### Configuration
First, install the necessary packages:
`pnpm add @fluojs/redis ioredis`

Then, configure the modules:

```typescript
import { RedisModule } from '@fluojs/redis';
import { CacheModule } from '@fluojs/cache-manager';

@Module({
  imports: [
    RedisModule.forRoot({
      host: 'localhost',
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
Caching is the main reason Redis appears in this part, but it is not the only reason to keep the client around. `@fluojs/redis` also gives you direct access to the `ioredis` client for advanced operations like Pub/Sub or complex data types.

```typescript
import { Inject } from '@fluojs/core';
import { REDIS_CLIENT } from '@fluojs/redis';
import type Redis from 'ioredis';

export class NotificationService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async publish(channel: string, message: string) {
    await this.redis.publish(channel, message);
  }
}
```

## 17.9 Summary
Caching is one of the clearest ways to make FluoBlog feel faster without changing the feature set. With `@fluojs/cache-manager`, you can begin with simple response caching, add manual rules where they matter, and move to Redis when the deployment grows beyond one process.

- Use `CacheInterceptor` for easy GET response caching.
- Use `CacheService.remember()` for manual logic.
- Use `@CacheEvict` to keep your data fresh.
- Always use Redis in production for consistency across instances.

In the next chapter, we will use Terminus to check whether the database, Redis, and the application itself are actually healthy enough to serve traffic.
