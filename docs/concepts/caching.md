# Caching

<p><strong><kbd>English</kbd></strong> <a href="./caching.ko.md"><kbd>한국어</kbd></a></p>

Performance is a first-class citizen in fluo. The caching system provides a unified interface for **transparent HTTP response caching** and **programmatic application-level caching**, supporting in-memory and distributed Redis backends.

## Why Caching in fluo?

- **Transparent Performance**: Improve response times for expensive `GET` requests with a single interceptor.
- **Identity-Aware Caching**: Automatically isolate cached responses by authenticated user (`principal.subject`) to prevent cross-user data leakage.
- **Smart Invalidation**: Use `@CacheEvict()` to clear specific keys automatically when data changes (POST/PUT/DELETE), keeping your cache fresh without manual boilerplate.
- **The "Remember" Pattern**: A built-in `cache.remember()` API that simplifies the "fetch-if-missing, then cache" workflow into a single line.

## Responsibility Split

- **`@fluojs/cache-manager` (The Facade)**: Defines the `CacheService` for manual operations and the `CacheInterceptor` for HTTP. It manages the pluggable store architecture.
- **`@fluojs/http` (The Hook)**: Provides the lifecycle hooks required for the interceptor to read from and write to the cache during request processing.
- **`@fluojs/redis` (The Distributed Store)**: An optional package that allows your cache to persist across multiple application instances via Redis. Keep `CacheModule` on the default Redis path, or point it at a named registration with `redis.clientName` when cache traffic should use a dedicated connection.

## Typical Workflows

### 1. Transparent HTTP Caching
For high-traffic endpoints like product catalogs or public profiles, you can enable caching with zero impact on business logic.

```typescript
@Get('/')
@UseInterceptors(CacheInterceptor)
@CacheTTL(600) // Cache for 10 minutes
async getProducts() {
  return this.service.findAll(); // Only executes on cache miss
}
```

### 2. Manual Application Caching
For complex computations or external API calls, use the `CacheService` directly within your services.

```typescript
async getExchangeRates() {
  return this.cache.remember('rates:usd', async () => {
    return this.externalApi.fetchRates();
  }, 3600); // Cache for 1 hour
}
```

### 3. Identity-Bound Keys
fluo's default key strategy is security-first. If a `RequestContext.principal` is present, the cache key automatically includes the user's subject:
- **Default Key**: `route_path + query_params (if enabled) + principal_subject`
- **Result**: User A and User B will never see each other's cached responses, even for the same URL.

## Core Boundaries

- **Lazy Expiry**: To maximize performance, TTL (Time-To-Live) expiry is enforced at the time of access rather than via background timers in the memory store.
- **Cluster Safety**: For multi-instance deployments, you **must** use the Redis store. The memory store is local to each process and does not synchronize.
- **GET-Only by Default**: The `CacheInterceptor` only caches `GET` requests to ensure safe, idempotent behavior.

## Module Registration

The `CacheModule` should be registered at the root level of your application to enable the global provider and interceptor support.

```typescript
// Memory store registration (default)
@Module({
  imports: [
    CacheModule.forRoot({
      isGlobal: true,
      ttl: 300,
    }),
  ],
})
export class AppModule {}

// Redis store registration
@Module({
  imports: [
    CacheModule.forRoot({
      store: 'redis',
      redis: { clientName: 'cache' },
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

## Cache Eviction

Keeping the cache synchronized with your data is handled via the `@CacheEvict()` decorator. This ensures that specific keys are purged when a state-changing operation succeeds.

```typescript
@Inject(CacheService)
export class ProductsService {
  constructor(private readonly cache: CacheService) {}

  @Post('/')
  @CacheEvict('products:list')
  async createProduct(data: any) {
    return this.service.create(data);
  }

  @Delete('/:id')
  async removeProduct(id: string) {
    await this.service.delete(id);
    await this.cache.del(`products:${id}`); // Manual eviction
  }
}
```

## Troubleshooting

- **Missing `CacheInterceptor`**: Ensure `@UseInterceptors(CacheInterceptor)` is applied to the controller or method. Global registration in `CacheModule` only enables the service, not the interceptor behavior for all routes.
- **Redis Connection Failures**: Verify the Redis client registration matches the `clientName` provided in the `CacheModule` options.
- **In-Memory Drift**: If you see different values on different request attempts in a multi-container environment, you are likely using the memory store instead of Redis.

## Next Steps

- **Implementation Details**: Deep dive into the [Cache Manager Package](../../packages/cache-manager/README.md).
- **Scalability**: Configure distributed caching with the [Redis Package](../../packages/redis/README.md).
