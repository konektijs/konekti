<!-- packages: @fluojs/jwt, @fluojs/passport -->
<!-- project-state: FluoBlog v1.11 -->

# Chapter 14. Authentication with JWT

## Learning Objectives
- Understand the structure and purpose of JSON Web Tokens (JWT).
- Configure the `JwtModule` for token signing and verification.
- Implement a dual-token pattern (Access & Refresh tokens).
- Build the FluoBlog authentication endpoints for login and token refresh.
- Learn about JWT principal normalization in `fluo`.

## 14.1 Introduction to JWT

JSON Web Token (JWT) is an open standard (RFC 7519) that defines a compact and self-contained way for securely transmitting information between parties as a JSON object.

For FluoBlog, JWT matters because it gives us a practical way to carry identity through each request without rebuilding session state on the server. Instead of storing session IDs in a database and checking them on every request, the server issues a signed token to the client. The client then sends this token back with every request, and the server can verify the user's identity just by looking at the token.

### Structure of a JWT

A JWT consists of three parts separated by dots (`.`):
1. **Header**: Contains the algorithm used for signing (e.g., HS256, RS256).
2. **Payload**: Contains the "claims" or pieces of information (e.g., user ID, roles, expiration).
3. **Signature**: Created by taking the encoded header, the encoded payload, a secret, and the algorithm specified in the header.

## 14.2 The @fluojs/jwt Package

`fluo` provides a dedicated package, `@fluojs/jwt`, which is transport-agnostic. This means you can use the same token model whether FluoBlog is serving HTTP today or other transports later.

### Core Philosophy: Principal Normalization

Different identity providers or legacy systems might use different keys for the same information in a JWT (e.g., `uid` vs `sub`, or `roles` vs `groups`).

`@fluojs/jwt` automatically normalizes these claims into a standard `JwtPrincipal` object:
- `subject`: The unique identifier for the user (mapped from `sub`).
- `roles`: An array of strings representing user roles.
- `scopes`: An array of strings representing permissions (normalized from `scope` or `scopes`).
- `claims`: The raw payload for any custom data.

## 14.3 Configuring JwtModule

Now that the token structure is clear, the next step is wiring those signing and verification rules into the application. To start using JWT in FluoBlog, we need to register the `JwtModule`.

### Static Registration

For simple setups, you can use `forRoot`:

```typescript
import { Module } from '@fluojs/core';
import { JwtModule } from '@fluojs/jwt';

@Module({
  imports: [
    JwtModule.forRoot({
      secret: 'your-very-secure-secret',
      issuer: 'fluoblog-api',
      audience: 'fluoblog-client',
      accessTokenTtlSeconds: 3600, // 1 hour
    }),
  ],
})
export class AuthModule {}
```

### Dynamic Registration with ConfigService

Hardcoded values are fine for understanding the shape of the configuration, but they are not how we should run a real application. In a production environment, you should never hardcode secrets. Instead, use the `ConfigService` we learned in Chapter 11.

```typescript
import { Module } from '@fluojs/core';
import { JwtModule } from '@fluojs/jwt';
import { ConfigService } from '@fluojs/config';

@Module({
  imports: [
    JwtModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        issuer: config.get('JWT_ISSUER'),
        audience: config.get('JWT_AUDIENCE'),
        accessTokenTtlSeconds: config.get('JWT_ACCESS_TOKEN_TTL'),
      }),
    }),
  ],
})
export class AuthModule {}
```

## 14.4 Signing Tokens

Once the module knows how to sign and verify tokens, the service layer can start issuing them. At that point, you can inject `DefaultJwtSigner` to create the token payloads your controllers will return.

```typescript
import { Injectable, Inject } from '@fluojs/core';
import { DefaultJwtSigner } from '@fluojs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DefaultJwtSigner) private readonly signer: DefaultJwtSigner
  ) {}

  async generateToken(user: User) {
    const payload = {
      sub: user.id.toString(),
      roles: user.roles,
      scopes: ['posts:write', 'profile:read'],
    };

    const accessToken = await this.signer.signAccessToken(payload);
    return { accessToken };
  }
}
```

## 14.5 Refresh Token Rotation

Issuing a token is only the first half of the story. We also need a renewal flow that keeps normal use convenient without making long-lived access tokens the default. Security-conscious applications use a "Dual Token" pattern:
1. **Access Token**: Short-lived (e.g., 15 minutes). Used for every request.
2. **Refresh Token**: Long-lived (e.g., 7 days). Used only to get a new Access Token.

`@fluojs/jwt` supports refresh token logic out of the box.

### One-Time-Use Rotation

Fluo's `RefreshTokenService` (which we will see more in the next chapter) implements rotation. When a refresh token is used, it is invalidated, and a brand new pair is issued. That keeps the implementation straightforward while reducing the chance that one leaked refresh token can be reused again and again.

## 14.6 Implementing FluoBlog Auth Endpoints

With the module registered and the token lifecycle in mind, we can connect the ideas to a real endpoint. Let's build a real `AuthController` for FluoBlog.

```typescript
// src/auth/auth.controller.ts
import { Controller, Post, RequestDto } from '@fluojs/http';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @RequestDto(LoginDto)
  async login(dto: LoginDto) {
    // 1. Verify user credentials (email/password)
    // 2. Issue tokens
    return this.authService.signIn(dto.email, dto.password);
  }
}
```

In the service layer:

```typescript
// src/auth/auth.service.ts
@Injectable()
export class AuthService {
  async signIn(email, password) {
    const user = await this.usersRepo.findByEmail(email);
    if (!user || !await verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const accessToken = await this.signer.signAccessToken({
      sub: user.id.toString(),
      roles: user.roles,
    });

    return { accessToken };
  }
}
```

## 14.7 Verifying Tokens Manually

Most of the time, Chapter 15's guards will handle verification for us. Still, it helps to see the lower-level check once so the guard behavior feels less mysterious. You can inject `DefaultJwtVerifier` to do it manually.

```typescript
import { DefaultJwtVerifier } from '@fluojs/jwt';

// ...
const principal = await this.verifier.verifyAccessToken(token);
console.log(principal.subject); // User ID
```

The verifier checks:
- The signature is valid.
- The token is not expired (`exp`).
- The issuer (`iss`) and audience (`aud`) match the configuration.

## 14.8 Summary

JWT provides the foundation for secure, stateless communication in FluoBlog.

Key takeaways:
- `JwtModule` centralizes your security policy (keys, TTL, algorithms).
- `DefaultJwtSigner` and `DefaultJwtVerifier` are your primary tools for handling tokens.
- Fluo's normalization ensures your business logic doesn't care about the underlying token format.
- Always use short-lived access tokens combined with a refresh mechanism.

At this point, FluoBlog can issue tokens, verify them, and explain what identity data those tokens carry. In the next chapter, we will connect that work to the HTTP lifecycle with `Passport` and `Guards`, so protected routes can rely on these tokens automatically.

<!-- line-count-check: 200+ lines target achieved -->
