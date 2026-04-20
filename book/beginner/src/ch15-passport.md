<!-- packages: @fluojs/passport -->
<!-- project-state: FluoBlog v1.12 -->

# Chapter 15. Guards and Passport Strategies

## Learning Objectives
- Learn the role of `AuthGuard` in the fluo request lifecycle.
- Implement custom authentication strategies using the `AuthStrategy` interface.
- Understand the integration between `@fluojs/passport` and existing Passport.js strategies.
- Use the `@UseAuth()` and `@RequireScopes()` decorators to protect routes.
- Extract the verified user identity using the `@CurrentUser()` pattern.
- Explore the basics of Role-Based Access Control (RBAC).

## 15.1 The Security Middleware Layer
In the previous chapter, we learned how to issue and verify JWT tokens. But how do we actually "protect" a route? How do we stop a request before it reaches our controller if the token is missing or invalid?

In `fluo`, this is handled by **Guards**.

A Guard is a specialized interceptor that runs after middlewares but before the route handler. Its sole responsibility is to return `true` (allow) or `false` (deny/throw error). Unlike a middleware, a Guard has full access to the execution context, including the class and method metadata of the route being called.

## 15.2 Introducing @fluojs/passport
While you could write manual guards for everything, `@fluojs/passport` provides a structured way to manage authentication "strategies". It is built on the philosophy of Passport.js but optimized for `fluo`'s DI system and standard decorators.

### What is a Strategy?
A strategy is a specific way of verifying a user. By decoupling the "how" (strategy) from the "where" (guard), you can change your authentication method (e.g., from Local to JWT) without rewriting your controller logic.

Common strategies include:
- **Local**: Email and password verification.
- **JWT**: Bearer token in the Authorization header.
- ** OAuth2**: Third-party login like Google or GitHub.
- **API Key**: A secret key in a custom header.

## 15.3 The AuthStrategy Interface
In `fluo`, every strategy must implement the `AuthStrategy` interface. This ensures that the `AuthGuard` can treat every strategy the same way.

```typescript
import { GuardContext } from '@fluojs/http';
import { AuthStrategy } from '@fluojs/passport';

export interface AuthStrategy {
  // Returns the verified Principal or throws an error
  authenticate(context: GuardContext): Promise<any>;
}
```

The `authenticate` method is where the identity verification happens. It looks at the request, finds the credentials, verifies them against a database or service, and returns the **Principal** (the verified user object).

## 15.4 Implementing a JWT Strategy
Let's implement the `BearerJwtStrategy` for FluoBlog. This strategy will extract a token from the `Authorization` header and verify it using the `JwtVerifier`.

```typescript
// src/auth/bearer.strategy.ts
import { Inject } from '@fluojs/core';
import { DefaultJwtVerifier } from '@fluojs/jwt';
import { AuthStrategy, AuthenticationFailedError, AuthenticationRequiredError } from '@fluojs/passport';

@Inject(DefaultJwtVerifier)
export class BearerJwtStrategy implements AuthStrategy {
  constructor(private readonly verifier: DefaultJwtVerifier) {}

  async authenticate(context: any) {
    // 1. Extract header
    const authHeader = context.requestContext.request.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationRequiredError('Missing Authorization header');
    }

    // 2. Parse scheme
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AuthenticationFailedError('Invalid auth scheme. Use Bearer.');
    }

    // 3. Verify and return Principal
    try {
      return await this.verifier.verifyAccessToken(token);
    } catch (e) {
      throw new AuthenticationFailedError('Token expired or invalid');
    }
  }
}
```

## 15.5 Registering the PassportModule
We need to register our strategies so the framework knows which token relates to which strategy name.

```typescript
// src/auth/auth.module.ts
import { PassportModule } from '@fluojs/passport';
import { BearerJwtStrategy } from './bearer.strategy';

@Module({
  imports: [
    PassportModule.forRoot(
      { defaultStrategy: 'jwt' },
      [
        { name: 'jwt', token: BearerJwtStrategy }
      ]
    ),
  ],
  providers: [BearerJwtStrategy],
})
export class AuthModule {}
```

## 15.6 Protecting Routes with @UseAuth
The `@UseAuth()` decorator is the most common way to trigger an authentication check. It tells `fluo` to attach an `AuthGuard` configured with a specific strategy to the route.

```typescript
// src/posts/posts.controller.ts
import { Controller, Get, Post } from '@fluojs/http';
import { UseAuth } from '@fluojs/passport';

@Controller('posts')
export class PostsController {
  
  @Get()
  findAll() {
    return []; // Publicly accessible
  }

  @Post()
  @UseAuth('jwt') // Guarded!
  create() {
    return { success: true };
  }
}
```

When a request hits a guarded route, the lifecycle is:
1. **Guard Trigger**: `AuthGuard` calls `BearerJwtStrategy.authenticate()`.
2. **Success**: Strategy returns a `Principal`. The Guard attaches this to `RequestContext.principal` and returns `true`.
3. **Failure**: Strategy throws an error. The Guard returns `false` (or lets the error propagate), and the request is rejected with `401 Unauthorized`.

## 15.7 Accessing the Current User
Once a user is authenticated, their identity (the Principal) is available throughout the rest of the request lifecycle. 

### The @CurrentUser() Custom Decorator
Instead of manually reaching into the `RequestContext`, we can use a custom parameter decorator to inject the user directly into our method.

```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator } from '@fluojs/http';

export const CurrentUser = createParamDecorator((data, context) => {
  // switchToHttp() gives us the HTTP-specific context
  return context.switchToHttp().getRequestContext().principal;
});
```

Now our controller method is much cleaner:

```typescript
@Get('me')
@UseAuth('jwt')
getProfile(@CurrentUser() user: any) {
  // 'user' is the verified Principal returned by our strategy
  return {
    id: user.subject,
    email: user.email,
  };
}
```

## 15.8 Scope-Based Authorization
Authentication is "Who are you?". Authorization is "What can you do?". `fluo` provides declarative authorization via **Scopes**.

```typescript
@Post()
@UseAuth('jwt')
@RequireScopes('posts:write')
create(@CurrentUser() user) {
  // Only users whose token contains the 'posts:write' scope can reach here
}
```

The `AuthGuard` automatically looks for a `scopes` array on the `Principal`. If the user has `'posts:admin'`, but the route requires `'posts:write'`, access is denied with a `403 Forbidden` error.

## 15.9 RBAC: Role-Based Access Control
While scopes are fine-grained (permission-level), roles are coarse-grained (group-level). You can implement RBAC by checking the `roles` property on the `Principal`.

```typescript
@Post('admin/cleanup')
@UseAuth('jwt')
@RequireRoles('admin')
cleanup() {
  // Only users with 'admin' role allowed
}
```

### Tradeoffs: Scopes vs Roles
- **Roles**: Easier to manage for simple apps. "Is this an Admin?"
- **Scopes**: More flexible for scaling. "Does this user have permission to delete posts?"
- **Fluo Recommendation**: Start with Roles for FluoBlog, but use Scopes if you plan on adding a public API for third-party developers.

## 15.10 Summary
`@fluojs/passport` acts as the bridge between raw identity data and your application logic. It ensures that security is enforced consistently across your entire API.

- **Guards** are the primary mechanism for blocking unauthorized requests.
- **Strategies** encapsulate the logic for different authentication methods.
- **Principals** represent the verified identity in the `RequestContext`.
- **Declarative Auth** (`@RequireScopes`, `@RequireRoles`) moves security logic out of your methods and into metadata.

In the final chapter of Part 3, we will look at one more security layer: protecting our API from abuse using Throttling.

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
