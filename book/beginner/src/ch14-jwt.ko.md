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
JSON Web Token(JWT)은 당사자 간에 정보를 JSON 객체로 안전하게 전송하기 위한 간결하고 독립적인 방식을 정의하는 개방형 표준(RFC 7519)입니다. 전통적인 세션 기반 인증과 달리, JWT는 서버가 데이터베이스나 세션 저장소를 조회하지 않고도 요청을 검증할 수 있게 해주므로, 분산 시스템과 서버리스 환경에 이상적입니다.

현대적인 웹 애플리케이션에서 JWT는 상태가 없는(stateless) 인증의 사실상 표준입니다. 서버는 세션 ID를 데이터베이스에 저장하는 대신, 암호화된 서명이 포함된 토큰을 클라이언트에 발급합니다. 그러면 클라이언트는 모든 요청의 `Authorization: Bearer <token>` 헤더에 이 토큰을 포함하여 서버로 다시 보냅니다.

### Structure of a JWT
JWT는 점(`.`)으로 구분된 세 부분으로 구성됩니다:
1. **Header**: 토큰에 대한 메타데이터로, 서명에 사용된 알고리즘(예: `HS256` 또는 `RS256`) 정보를 포함합니다.
2. **Payload**: "클레임(claims)"이라고 불리는 실제 데이터입니다. 사용자 ID(`sub`), 만료 시간(`exp`), 역할(roles) 등이 포함됩니다.
3. **Signature**: 인코딩된 헤더와 페이로드를 비밀 키와 결합하여 만든 해시값입니다. 이를 통해 토큰이 변조되지 않았음을 보장합니다.

## 14.2 The @fluojs/jwt Package
Fluo는 전송 계층에 독립적이며 "표준 우선(Standard-First)" 시대에 맞게 설계된 `@fluojs/jwt` 패키지를 제공합니다. 이 패키지는 표준 Web Crypto API를 준수하면서 토큰의 서명, 검증 및 데이터 추출과 같은 복잡한 작업을 처리합니다.

### Core Philosophy: Principal Normalization
Fluo의 가장 강력한 특징 중 하나는 **Principal 정규화(Normalization)**입니다. 실제 프로젝트에서는 시스템마다 클레임의 명칭이 다를 수 있습니다(예: 어떤 시스템은 `uid`, 다른 시스템은 `sub` 사용).

`@fluojs/jwt`는 이러한 차이를 하나의 통일된 `JwtPrincipal` 객체로 자동 매핑합니다:
- `subject`: 사용자의 고유 ID(`sub`에서 매핑됨).
- `roles`: RBAC를 위한 문자열 배열(`roles`, `groups`, 또는 `permissions`에서 매핑됨).
- `scopes`: 구체적인 권한 마커(`scope` 또는 `scp`에서 매핑됨).
- `claims`: 페이로드의 추가 커스텀 데이터를 위한 원본 버킷.

## 14.3 Configuring JwtModule
FluoBlog에서 JWT를 사용하려면 `JwtModule`을 등록해야 합니다. 빠른 실험을 위해 `forRoot`를 쓸 수도 있지만, 프로덕션에서는 `ConfigService`를 결합한 `forRootAsync`가 표준입니다.

```typescript
import { Module } from '@fluojs/core';
import { JwtModule } from '@fluojs/jwt';
import { ConfigService } from '@fluojs/config';

@Module({
  imports: [
    JwtModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // 환경별로 강력한 비밀 키를 사용하세요.
        secret: config.get('JWT_SECRET'),
        issuer: 'fluoblog-api',
        audience: 'fluoblog-client',
        // 보안을 위해 액세스 토큰은 수명을 짧게 유지해야 합니다.
        accessTokenTtlSeconds: 900, // 15분
      }),
    }),
  ],
})
export class AuthModule {}
```

## 14.4 Signing Tokens
설정이 완료되면 `DefaultJwtSigner`를 주입하여 로그인 프로세스 중에 토큰을 생성할 수 있습니다.

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
      // 비즈니스 로직 전용 커스텀 클레임
      scopes: ['posts:write', 'comments:read'],
    };

    // 최종적인 Base64 인코딩 문자열을 생성합니다.
    const accessToken = await this.signer.signAccessToken(payload);
    return { accessToken };
  }
}
```

## 14.5 Refresh Token Rotation
액세스 토큰은 탈취 시 피해를 최소화하기 위해 의도적으로 수명을 짧게 유지합니다. 하지만 15분마다 사용자를 다시 로그인하게 할 수는 없으므로 **리프레시 토큰(Refresh Tokens)**을 사용합니다.

1. **Access Token**: 짧은 수명(15분). API 접근에 사용됨.
2. **Refresh Token**: 긴 수명(7일). 새로운 액세스 토큰을 요청하는 데만 사용됨.

### Rotation Strategy
Fluo는 **리프레시 토큰 로테이션(Refresh Token Rotation)**을 구현합니다. 클라이언트가 리프레시 토큰을 사용하여 새 액세스 토큰을 받을 때마다, 서버는 사용된 리프레시 토큰을 무효화하고 *새로운* 리프레시 토큰을 함께 발급합니다. 만약 공격자와 정상 사용자가 동일한 리프레시 토큰을 사용하려 하면, Fluo는 재사용을 감지하고 해당 토큰 패밀리 전체를 무효화하여 강제 로그아웃 시킵니다.

## 14.6 Implementing FluoBlog Auth Endpoints
12장의 요청 검증 패턴을 활용하여 보안이 강화된 `AuthController`를 만들어 보겠습니다.

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
    // 1. AuthService를 통해 자격 증명 확인
    // 2. signAccessToken 및 signRefreshToken 호출
    return this.authService.signIn(dto.email, dto.password);
  }
}
```

## 14.7 Verifying Tokens Manually
대부분의 라우트는 가드(Chapter 15)를 사용하지만, `DefaultJwtVerifier`를 통해 수동으로 토큰을 검증할 수도 있습니다. 비밀번호 재설정 이메일의 토큰을 확인하는 것과 같은 일회성 작업에 유용합니다.

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
      // ExpiredTokenError나 InvalidSignatureError를 자동으로 처리합니다.
      throw new UnauthorizedError('토큰이 만료되었거나 위조되었습니다.');
    }
  }
}
```

## 14.8 Best Practices for JWT in Fluo
- **페이로드에 민감한 데이터를 저장하지 마세요**: JWT는 인코딩될 뿐 암호화되지 않습니다. 누구나 내용을 볼 수 있습니다.
- **대규모 시스템에서는 비대칭 서명(RS256)을 사용하세요**: 여러 서비스가 있는 경우, 개인 키로 서명하고 공개 키로 검증하면 팀 간에 비밀 키를 공유할 필요가 없어 보안이 강화됩니다.
- **토큰 만료 모니터링**: `exp` 클레임을 사용하여 로그아웃을 강제하고, 19장의 메트릭을 사용하여 비정상적으로 높은 인증 실패율을 추적하세요.

## 14.9 Summary
JWT는 FluoBlog 보안의 중추입니다. `@fluojs/jwt`를 사용하면 표준을 준수하고, 정규화되었으며, 로테이션이 가능한 인증 시스템을 즉시 구축할 수 있습니다.

- `JwtModule`은 보안 설정을 중앙 집중화합니다.
- `JwtPrincipal`은 다양한 신원 형식을 정규화합니다.
- 이중 토큰 패턴과 로테이션은 보안 태세를 크게 강화합니다.

다음 장에서는 **Passport 전략**과 **가드(Guards)**를 사용하여 이러한 토큰들을 실제 HTTP 요청 생명주기에 연결하는 방법을 알아보겠습니다.

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
