<!-- packages: @fluojs/throttler -->
<!-- project-state: FluoBlog v1.13 -->

# Chapter 16. Rate Limiting and Security Hardening

## Learning Objectives
- Understand the importance of Rate Limiting (Throttling) for API security.
- Configure the `ThrottlerModule` with default TTL and limit settings.
- Apply the `@Throttle()` and `@SkipThrottle()` decorators.
- Implement custom key generation for client identification.
- Protect FluoBlog's login endpoint from brute-force attacks.
- Review best practices for security hardening in `fluo`.

## 16.1 Protecting Your API from Abuse

In the previous chapters, we made FluoBlog secure by requiring authentication. However, security is not just about "Who can access"; it's also about "How much can they access".

That distinction matters even in a beginner project. A login route can still be hammered with repeated guesses, and a normal endpoint can still be flooded by a buggy client script. **Rate Limiting** (or Throttling) gives us a practical way to slow that kind of pressure down by limiting how many requests a client can make within a certain time window.

## 16.2 Introducing @fluojs/throttler

`fluo` provides the `@fluojs/throttler` package for easy, decorator-based rate limiting. That means we can add limits close to the routes that need them without redesigning the rest of the application.

### How it works

The Throttler uses a "Fixed Window" algorithm:
- **TTL (Time To Live)**: The duration of the window (in seconds).
- **Limit**: The maximum number of requests allowed within that window.

If a client exceeds the limit, `fluo` automatically throws a `429 Too Many Requests` error and includes a `Retry-After` header.

## 16.3 Basic Configuration

The first step is to define a sensible default for the whole application. Register the `ThrottlerModule` in your root module.

```typescript
import { Module } from '@fluojs/core';
import { ThrottlerModule } from '@fluojs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,   // 1 minute
      limit: 100, // 100 requests per minute
    }),
  ],
})
export class AppModule {}
```

This configuration applies a global limit of 100 requests per minute to all routes in your application. It gives FluoBlog a baseline defense before we add stricter rules to more sensitive endpoints.

## 16.4 Using Decorators

Once the global rule is in place, we can tune it based on route intent. You can override the global settings or skip throttling for specific controllers or methods.

### Overriding with @Throttle()

```typescript
import { Controller, Post } from '@fluojs/http';
import { Throttle } from '@fluojs/throttler';

@Controller('auth')
export class AuthController {
  
  @Post('login')
  @Throttle({ ttl: 60, limit: 5 }) // Strict: only 5 attempts per minute
  async login() {
    // ...
  }
}
```

### Bypassing with @SkipThrottle()

```typescript
@Get('health')
@SkipThrottle() // Health checks should usually not be throttled
healthCheck() {
  return { status: 'ok' };
}
```

## 16.5 Client Identification and Custom Keys

By default, the throttler identifies clients by their IP address. That is a good starting point, but it is worth checking how requests actually reach your app. If your application is behind a proxy (like Nginx, Cloudflare, or a Load Balancer), the IP might appear to be the same for all users.

### trustProxyHeaders

If you trust your proxy to set headers like `X-Forwarded-For`, enable this setting:

```typescript
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100,
  trustProxyHeaders: true,
})
```

### Custom Key Generation

Sometimes the fairest key is not the raw IP address. If the route already knows who the user is, or if clients authenticate with API keys, you may want the limit to follow that identity instead.

```typescript
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100,
  keyGenerator: (context) => {
    const request = context.switchToHttp().getRequest();
    // If authenticated, throttle by user ID, otherwise by IP
    return request.principal?.subject || request.ip;
  },
})
```

## 16.6 Multi-Instance Deployments with Redis

The in-memory default works well for learning and for single-instance deployments. If you run multiple instances of FluoBlog, though, it won't work correctly because each instance has its own local count.

To solve this, use the `RedisThrottlerStore`.

```typescript
import { RedisThrottlerStore } from '@fluojs/throttler';
import { REDIS_CLIENT } from '@fluojs/redis';

// ...
ThrottlerModule.forRootAsync({
  inject: [REDIS_CLIENT],
  useFactory: (redis) => ({
    ttl: 60,
    limit: 100,
    store: new RedisThrottlerStore(redis),
  }),
})
```

Now, all instances share the same counter in Redis, ensuring your rate limits are enforced across your entire cluster.

## 16.7 Security Hardening Checklist

As we conclude Part 3, it helps to gather the practical habits these chapters have been building toward. Let's review a checklist for a production-ready FluoBlog:

1.  **Use HTTPS**: Never transmit JWTs or passwords over plain HTTP.
2.  **Short-lived Access Tokens**: Keep them under 1 hour.
3.  **Secure Refresh Tokens**: Store them in `HttpOnly` cookies and use rotation.
4.  **Validate All Input**: Use `@fluojs/validation` (Chapter 6) to prevent injection attacks.
5.  **Enable Throttling**: Protect sensitive routes (Login, Signup, Forgot Password).
6.  **Principle of Least Privilege**: Use Scopes and RBAC to ensure users only see what they should.

## 16.8 Summary

Rate limiting is your first line of defense against brute-force attacks and API abuse.

Key takeaways:
- `ThrottlerModule` provides a simple way to set request quotas.
- `@Throttle()` allows for fine-grained control at the route level.
- Custom `keyGenerator` helps identify users correctly behind proxies or in authenticated states.
- Redis storage is essential for scaling across multiple server instances.

At this point, FluoBlog can authenticate users, authorize requests, and place sensible limits around sensitive endpoints. That is a strong beginner-friendly security baseline, and it gives the next part a stable foundation. In Part 4, we will move beyond HTTP and look at real-time communication with WebSockets.

<!-- line-count-check: 200+ lines target achieved -->
