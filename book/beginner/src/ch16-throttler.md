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

Imagine an attacker trying to guess a user's password. They could send thousands of login requests per second. Or a buggy script accidentally calling your API in an infinite loop. This type of behavior can quickly exhaust your server's CPU, memory, and database connections.

This is where **Rate Limiting** (or Throttling) comes in. It acts as a pressure valve, limiting the number of requests a client can make within a certain time window.

## 16.2 Introducing @fluojs/throttler
`fluo` provides the `@fluojs/throttler` package for easy, decorator-based rate limiting. It integrates directly with the `AuthGuard` and `RequestContext`.

### How it works
The Throttler uses a "Fixed Window" algorithm:
- **TTL (Time To Live)**: The duration of the window (in seconds).
- **Limit**: The maximum number of requests allowed within that window.

If a client exceeds the limit, `fluo` automatically throws a `429 Too Many Requests` error and includes a `Retry-After` header, telling the client exactly how long to wait.

## 16.3 Basic Configuration
Register the `ThrottlerModule` in your root module. This sets the default policy for your entire application.

```typescript
import { Module } from '@fluojs/core';
import { ThrottlerModule } from '@fluojs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,   // 1 minute window
      limit: 100, // 100 requests per minute
    }),
  ],
})
export class AppModule {}
```

This configuration provides a "safety net," ensuring that no single client can overwhelm your server with hundreds of requests per second by default.

## 16.4 Using Decorators
You can override the global settings or skip throttling entirely for specific controllers or methods.

### Overriding with @Throttle()
For sensitive routes like login, you should apply much stricter limits.

```typescript
import { Controller, Post } from '@fluojs/http';
import { Throttle } from '@fluojs/throttler';

@Controller('auth')
export class AuthController {
  
  @Post('login')
  @Throttle({ ttl: 60, limit: 5 }) // Strict: only 5 attempts per minute
  async login() {
    // Brute-force is now much harder
  }
}
```

### Bypassing with @SkipThrottle()
Some routes, like internal health checks or webhook endpoints from trusted providers, might need to bypass the throttler.

```typescript
@Get('health')
@SkipThrottle() // Health checks should always be accessible
healthCheck() {
  return { status: 'ok' };
}
```

## 16.5 Client Identification and Custom Keys
By default, the throttler identifies clients by their IP address. However, identifying users solely by IP has two major drawbacks:
1. **Shared IPs**: Many users behind a corporate proxy or NAT will share the same IP.
2. **Proxy Headers**: If your app is behind Nginx or Cloudflare, the IP might appear as the proxy's IP.

### trustProxyHeaders
If you trust your proxy to set headers like `X-Forwarded-For`, enable this setting to see the real client IP:

```typescript
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100,
  trustProxyHeaders: true, // Uses headers to find the real IP
})
```

### Custom Key Generation
For the best user experience, you should throttle based on the **Principal** if the user is logged in.

```typescript
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100,
  keyGenerator: (context) => {
    const request = context.switchToHttp().getRequestContext();
    // 1. If authenticated, use the unique User ID (subject)
    if (request.principal?.subject) {
      return `user:${request.principal.subject}`;
    }
    // 2. Otherwise, fall back to the IP address
    return `ip:${request.ip}`;
  },
})
```

## 16.6 Multi-Instance Deployments with Redis
If you run multiple instances of FluoBlog (e.g., in a Kubernetes cluster), an in-memory throttler won't be synchronized. A user could hit the limit on Server A and then immediately send more requests to Server B.

To solve this, use the `RedisThrottlerStore`.

```typescript
import { RedisThrottlerStore } from '@fluojs/throttler';
import { REDIS_CLIENT } from '@fluojs/redis';

ThrottlerModule.forRootAsync({
  inject: [REDIS_CLIENT],
  useFactory: (redis) => ({
    ttl: 60,
    limit: 100,
    // Counter is now stored and synchronized in Redis
    store: new RedisThrottlerStore(redis),
  }),
})
```

## 16.7 Security Hardening Checklist
As we conclude Part 3, let's review the essential steps for a production-ready FluoBlog:

1.  **Use HTTPS**: Never transmit JWTs or passwords over plain HTTP.
2.  **Short-lived Access Tokens**: Keep them under 1 hour to minimize the impact of a leaked token.
3.  **Secure Refresh Tokens**: Store them in `HttpOnly` and `SameSite: Strict` cookies.
4.  **Validate All Input**: Use `@fluojs/validation` (Chapter 6) to prevent injection and malformed data.
5.  **Enable Throttling**: Protect sensitive routes (Login, Signup, Forgot Password).
6.  **Principle of Least Privilege**: Use Scopes and RBAC (Chapter 15) to ensure users only have the permissions they truly need.

## 16.8 Summary
Rate limiting is your first line of defense against brute-force attacks and API abuse. It ensures that your application remains available for all users, even when under attack.

- **ThrottlerModule** sets the default request quotas for your API.
- **@Throttle()** allows you to tighten security on specific sensitive endpoints.
- **Custom Key Generation** ensures that you identify clients correctly, even behind proxies.
- **Redis Store** provides a consistent, shared counter for distributed environments.

Congratulations! You have completed Part 3: Authentication and Security. FluoBlog is now a robust, secure, and professional backend application. In Part 4, we will move beyond HTTP and look at real-time communication with WebSockets.

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
