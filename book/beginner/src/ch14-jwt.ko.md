<!-- packages: @fluojs/jwt, @fluojs/passport -->
<!-- project-state: FluoBlog v1.11 -->

# Chapter 14. Authentication with JWT

## Learning Objectives
- JSON Web Token(JWT)의 구조와 목적을 이해합니다.
- 토큰 서명 및 검증을 위한 `JwtModule`을 설정합니다.
- 이중 토큰 패턴(액세스 및 리프레시 토큰)을 구현합니다.
- FluoBlog의 로그인 및 토큰 갱신 엔드포인트를 구축합니다.
- `fluo`에서의 JWT principal 정규화에 대해 배웁니다.

## 14.1 Introduction to JWT

JSON Web Token(JWT)은 당사자 간에 정보를 JSON 객체로 안전하게 전송하기 위한 간결하고 독립적인 방식을 정의하는 개방형 표준(RFC 7519)입니다.

FluoBlog에서는 이 표준이 왜 중요한지부터 이해하면 뒤의 설정이 더 자연스럽습니다. JWT를 사용하면 서버가 세션 상태를 계속 조회하지 않아도 요청마다 사용자 신원을 전달할 수 있습니다. 세션 ID를 데이터베이스에 저장하고 모든 요청마다 확인하는 대신, 서버는 클라이언트에 서명된 토큰을 발급합니다. 그러면 클라이언트는 모든 요청과 함께 이 토큰을 다시 보내고, 서버는 토큰을 확인하는 것만으로 사용자의 신원을 검증할 수 있습니다.

### Structure of a JWT

JWT는 점(`.`)으로 구분된 세 부분으로 구성됩니다:
1. **Header**: 서명에 사용된 알고리즘(예: HS256, RS256)을 포함합니다.
2. **Payload**: "클레임(claims)" 또는 정보 조각(예: 사용자 ID, 역할, 만료 시간)을 포함합니다.
3. **Signature**: 인코딩된 헤더, 인코딩된 페이로드, 비밀 키 및 헤더에 지정된 알고리즘을 사용하여 생성됩니다.

## 14.2 The @fluojs/jwt Package

`fluo`는 전용 패키지인 `@fluojs/jwt`를 제공하며, 이는 전송 계층에 독립적(transport-agnostic)입니다. 즉, FluoBlog에서 HTTP를 먼저 다루더라도 같은 토큰 모델을 WebSockets나 RPC 호출에도 이어서 사용할 수 있습니다.

### Core Philosophy: Principal Normalization

서로 다른 ID 제공자나 레거시 시스템은 JWT에서 동일한 정보에 대해 서로 다른 키를 사용할 수 있습니다(예: `uid` vs `sub`, 또는 `roles` vs `groups`).

`@fluojs/jwt`는 이러한 클레임들을 표준 `JwtPrincipal` 객체로 자동 정규화합니다:
- `subject`: 사용자의 고유 식별자(`sub`에서 매핑됨).
- `roles`: 사용자 역할을 나타내는 문자열 배열.
- `scopes`: 권한을 나타내는 문자열 배열(`scope` 또는 `scopes`에서 정규화됨).
- `claims`: 모든 사용자 정의 데이터를 위한 원본 페이로드.

## 14.3 Configuring JwtModule

토큰의 모양과 역할을 이해했다면, 이제 그 규칙을 애플리케이션 설정으로 옮겨야 합니다. FluoBlog에서 JWT를 사용하기 시작하려면 `JwtModule`을 등록해야 합니다.

### Static Registration

단순한 설정의 경우 `forRoot`를 사용할 수 있습니다:

```typescript
import { Module } from '@fluojs/core';
import { JwtModule } from '@fluojs/jwt';

@Module({
  imports: [
    JwtModule.forRoot({
      secret: 'your-very-secure-secret',
      issuer: 'fluoblog-api',
      audience: 'fluoblog-client',
      accessTokenTtlSeconds: 3600, // 1시간
    }),
  ],
})
export class AuthModule {}
```

### Dynamic Registration with ConfigService

하드코딩된 예시는 설정의 형태를 빠르게 보여 주지만, 실제 운영 방식으로 이어지면 안 됩니다. 프로덕션 환경에서는 비밀 키를 절대 하드코딩해서는 안 됩니다. 대신 Chapter 11에서 배운 `ConfigService`를 사용하세요.

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

모듈이 서명과 검증 규칙을 알게 되면, 이제 서비스 계층에서 실제 토큰을 발급할 수 있습니다. 이때 `DefaultJwtSigner`를 주입하면 컨트롤러가 반환할 토큰을 만들 수 있습니다.

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

토큰을 발급하는 것만으로 인증 흐름이 끝나지는 않습니다. 사용자는 다시 로그인하지 않고 세션을 이어 가야 하고, 동시에 액세스 토큰은 너무 오래 살아 있지 않아야 합니다. 그래서 보안에 민감한 애플리케이션은 "이중 토큰(Dual Token)" 패턴을 사용합니다:
1. **Access Token**: 수명이 짧음(예: 15분). 모든 요청에 사용됨.
2. **Refresh Token**: 수명이 김(예: 7일). 새로운 액세스 토큰을 얻는 데만 사용됨.

`@fluojs/jwt`는 리프레시 토큰 로직을 기본적으로 지원합니다.

### One-Time-Use Rotation

Fluo의 `RefreshTokenService`(다음 장에서 더 자세히 살펴보겠습니다)는 로테이션을 구현합니다. 리프레시 토큰이 사용되면 해당 토큰은 무효화되고 완전히 새로운 쌍이 발급됩니다. 이렇게 하면 구현은 단순하게 유지하면서도 노출된 리프레시 토큰이 계속 재사용되는 상황을 줄일 수 있습니다.

## 14.6 Implementing FluoBlog Auth Endpoints

이제 설정과 토큰 수명 주기를 실제 엔드포인트 흐름으로 연결해 보겠습니다. FluoBlog를 위한 실제 `AuthController`를 만들어 보겠습니다.

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
    // 1. 사용자 자격 증명 확인 (이메일/비밀번호)
    // 2. 토큰 발급
    return this.authService.signIn(dto.email, dto.password);
  }
}
```

서비스 계층:

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

실제 애플리케이션에서는 보통 Chapter 15의 가드가 이 검증을 대신 처리합니다. 그래도 한 번 직접 확인해 보면 다음 장에서 가드가 무엇을 대신해 주는지 더 분명해집니다. `DefaultJwtVerifier`를 주입하여 수동으로 검증할 수도 있습니다.

```typescript
import { DefaultJwtVerifier } from '@fluojs/jwt';

// ...
const principal = await this.verifier.verifyAccessToken(token);
console.log(principal.subject); // 사용자 ID
```

검증기(verifier)는 다음을 확인합니다:
- 서명이 유효한지.
- 토큰이 만료되지 않았는지(`exp`).
- 발행자(`iss`)와 대상자(`aud`)가 설정과 일치하는지.

## 14.8 Summary

JWT는 FluoBlog에서 안전하고 상태가 없는 통신을 위한 기반을 제공합니다.

주요 요약:
- `JwtModule`은 보안 정책(키, TTL, 알고리즘)을 중앙 집중화합니다.
- `DefaultJwtSigner`와 `DefaultJwtVerifier`는 토큰 처리를 위한 주요 도구입니다.
- Fluo의 정규화는 비즈니스 로직이 기본 토큰 형식에 신경 쓰지 않도록 보장합니다.
- 항상 짧은 수명의 액세스 토큰을 리프레시 메커니즘과 결합하여 사용하세요.

이제 FluoBlog는 토큰을 발급하고, 검증하고, 그 안의 신원 정보를 일정한 형태로 다룰 준비를 마쳤습니다. 다음 장에서는 `Passport`와 `Guards`를 사용하여 이러한 토큰을 HTTP 생명주기와 자연스럽게 연결하는 방법을 살펴보겠습니다.

<!-- line-count-check: 200+ lines target achieved -->
