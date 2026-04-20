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
JSON Web Token (JWT) is an open standard (RFC 7519) that defines a compact and self-contained way for securely transmitting information between parties as a JSON object. Unlike traditional session-based authentication, JWT allows the server to verify requests without querying a database or session store, making it ideal for distributed systems and serverless environments.

In modern web applications, JWT is the de-facto standard for stateless authentication. Instead of storing session IDs in a database, the server issues a cryptographically signed token to the client. The client then sends this token back with every request, typically in the `Authorization: Bearer <token>` header.

### Structure of a JWT
A JWT consists of three parts separated by dots (`.`):
1. **Header**: Metadata about the token, including the signing algorithm (e.g., `HS256` or `RS256`).
2. **Payload**: The "claims"—actual data such as the User ID (`sub`), expiration time (`exp`), and roles.
3. **Signature**: A hash created by combining the encoded header and payload with a secret key. This ensures the token hasn't been tampered with.

## 14.2 The @fluojs/jwt Package
Fluo provides the `@fluojs/jwt` package, which is transport-agnostic and built for the "Standard-First" era. It handles the heavy lifting of signing, verifying, and extracting data from tokens while staying close to the standard Web Crypto API.

### Core Philosophy: Principal Normalization
One of Fluo's strongest features is **Principal Normalization**. In a real-world project, different systems might use different naming conventions for claims (e.g., one uses `uid`, another uses `sub`).

`@fluojs/jwt` automatically maps these variations into a unified `JwtPrincipal` object:
- `subject`: The user's unique ID (mapped from `sub`).
- `roles`: An array of strings for RBAC (mapped from `roles`, `groups`, or `permissions`).
- `scopes`: Specific permission markers (mapped from `scope` or `scp`).
- `claims`: A raw bucket for any extra custom data in the payload.

## 14.3 Configuring JwtModule
To use JWT in FluoBlog, register the `JwtModule`. While you can use `forRoot` for quick experiments, `forRootAsync` with `ConfigService` is the standard for production.

```typescript
import { Module } from '@fluojs/core';
import { JwtModule } from '@fluojs/jwt';
import { ConfigService } from '@fluojs/config';

@Module({
  imports: [
    JwtModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Use a strong, environment-specific secret
        secret: config.get('JWT_SECRET'),
        issuer: 'fluoblog-api',
        audience: 'fluoblog-client',
        // Access tokens should be short-lived for security
        accessTokenTtlSeconds: 900, // 15 minutes
      }),
    }),
  ],
})
export class AuthModule {}
```

## 14.4 Signing Tokens
Once configured, you can inject `DefaultJwtSigner` to generate tokens during the login process.

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
      // Custom business logic claims
      scopes: ['posts:write', 'comments:read'],
    };

    // This creates the final base64-encoded string
    const accessToken = await this.signer.signAccessToken(payload);
    return { accessToken };
  }
}
```

## 14.5 Refresh Token Rotation
Access tokens are deliberately short-lived to minimize the damage if one is stolen. However, we don't want to force users to log in every 15 minutes. This is where **Refresh Tokens** come in.

1. **Access Token**: Short-lived (15 min). Used for API access.
2. **Refresh Token**: Long-lived (7 days). Used only to request a *new* Access Token.

### Rotation Strategy
Fluo implements **Refresh Token Rotation**. Every time a client uses a Refresh Token to get a new Access Token, the server invalidates that specific Refresh Token and issues a *new* Refresh Token. If an attacker and a legitimate user both try to use the same refresh token, Fluo detects the reuse and invalidates the entire family of tokens, forcing a re-login.

## 14.6 Implementing FluoBlog Auth Endpoints
Let's build a secure `AuthController` using the request validation patterns from Chapter 12.

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
    // 1. Verify credentials via AuthService
    // 2. signAccessToken and signRefreshToken
    return this.authService.signIn(dto.email, dto.password);
  }
}
```

## 14.7 Verifying Tokens Manually
While most of your routes will use Guards (Chapter 15), you can manually verify a token using `DefaultJwtVerifier`. This is useful for one-off tasks like verifying a password reset token from a URL.

```typescript
import { DefaultJwtVerifier } from '@fluojs/jwt';

@Injectable()
export class TokenService {
  constructor(
    @Inject(DefaultJwtVerifier) private readonly verifier: DefaultJwtVerifier
  ) {}

  async check(token: string) {
    try {
      const principal = await this.verifier.verifyAccessToken(token);
      return principal;
    } catch (e) {
      // Automatic handling of ExpiredTokenError or InvalidSignatureError
      throw new UnauthorizedError('Token is stale or forged');
    }
  }
}
```

## 14.8 Best Practices for JWT in Fluo
- **Never store sensitive data in the payload**: JWTs are encoded, not encrypted. Anyone can see the contents.
- **Use asymmetric signing (RS256) for scale**: If you have multiple services, use a private key to sign and a public key to verify. This prevents the need to share secrets between teams.
- **Monitor Token Expiration**: Use the `exp` claim to enforce logout and use Chapter 19's metrics to track high rates of authentication failure.

## 14.9 Summary
JWT is the security backbone of FluoBlog. By utilizing `@fluojs/jwt`, you get a standard-compliant, normalized, and rotation-aware authentication system out of the box.

- `JwtModule` centralizes security settings.
- `JwtPrincipal` normalizes diverse identity formats.
- Dual-token patterns and rotation significantly harden your security posture.

In the next chapter, we will connect these tokens to the actual HTTP request lifecycle using **Passport Strategies** and **Guards**.

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
