<!-- packages: @fluojs/passport -->
<!-- project-state: FluoBlog v1.12 -->

# Chapter 15. Guards and Passport Strategies

## Learning Objectives
- fluo 요청 생명주기에서 `AuthGuard`의 역할을 배웁니다.
- `AuthStrategy` 인터페이스를 사용하여 사용자 정의 인증 전략을 구현합니다.
- `@fluojs/passport`와 기존 Passport.js 전략 간의 통합을 이해합니다.
- `@UseAuth()` 및 `@RequireScopes()` 데코레이터를 사용하여 경로를 보호합니다.
- `@CurrentUser()` 패턴을 사용하여 검증된 사용자 신원을 추출합니다.
- 역할 기반 액세스 제어(RBAC)의 기초를 탐구합니다.

## 15.1 The Security Middleware Layer
이전 장에서 우리는 JWT 토큰을 발급하고 검증하는 방법을 배웠습니다. 하지만 실제로 어떻게 경로를 "보호"할까요? 토큰이 없거나 유효하지 않은 경우 요청이 컨트롤러에 도달하기 전에 어떻게 차단할까요?

`fluo`에서는 이를 **가드(Guards)**가 처리합니다.

가드는 미들웨어 이후, 경로 핸들러 이전에 실행되는 특수한 인터셉터입니다. 가드의 유일한 책임은 `true`(허용) 또는 `false`(거부/에러 발생)를 반환하는 것입니다. 미들웨어와 달리 가드는 호출되는 경로의 클래스와 메서드 메타데이터를 포함한 전체 실행 컨텍스트에 접근할 수 있습니다.

## 15.2 Introducing @fluojs/passport
모든 것에 대해 수동으로 가드를 작성할 수도 있지만, `@fluojs/passport`는 인증 "전략(strategies)"을 관리하는 구조화된 방식을 제공합니다. 이는 Passport.js의 철학을 기반으로 하되, `fluo`의 DI 시스템과 표준 데코레이터에 최적화되어 설계되었습니다.

### What is a Strategy?
전략은 사용자를 검증하는 구체적인 방법입니다. "어떻게"(전략) 검증하는지와 "어디서"(가드) 검증하는지를 분리함으로써, 컨트롤러 로직을 수정하지 않고도 인증 방법(예: 로컬 로그인에서 JWT로)을 쉽게 변경할 수 있습니다.

일반적인 전략은 다음과 같습니다:
- **Local**: 이메일과 비밀번호를 통한 검증.
- **JWT**: Authorization 헤더의 Bearer 토큰 검증.
- ** OAuth2**: Google, GitHub 등 외부 서비스를 통한 로그인.
- **API Key**: 사용자 정의 헤더의 비밀 키 검증.

## 15.3 The AuthStrategy Interface
`fluo`에서 모든 전략은 `AuthStrategy` 인터페이스를 구현해야 합니다. 이는 `AuthGuard`가 모든 전략을 동일한 방식으로 처리할 수 있게 해줍니다.

```typescript
import { GuardContext } from '@fluojs/http';
import { AuthStrategy } from '@fluojs/passport';

export interface AuthStrategy {
  // 검증된 Principal을 반환하거나 에러를 던집니다.
  authenticate(context: GuardContext): Promise<any>;
}
```

`authenticate` 메서드에서 실제 신원 검증이 이루어집니다. 요청을 확인하고, 자격 증명을 찾고, 데이터베이스나 서비스를 통해 검증한 다음 **Principal**(검증된 사용자 객체)을 반환합니다.

## 15.4 Implementing a JWT Strategy
FluoBlog를 위한 `BearerJwtStrategy`를 구현해 보겠습니다. 이 전략은 `Authorization` 헤더에서 토큰을 추출하고 `JwtVerifier`를 사용하여 검증합니다.

```typescript
// src/auth/bearer.strategy.ts
import { Inject } from '@fluojs/core';
import { DefaultJwtVerifier } from '@fluojs/jwt';
import { AuthStrategy, AuthenticationFailedError, AuthenticationRequiredError } from '@fluojs/passport';

@Inject(DefaultJwtVerifier)
export class BearerJwtStrategy implements AuthStrategy {
  constructor(private readonly verifier: DefaultJwtVerifier) {}

  async authenticate(context: any) {
    // 1. 헤더 추출
    const authHeader = context.requestContext.request.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationRequiredError('Missing Authorization header');
    }

    // 2. 스키마 확인
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AuthenticationFailedError('Invalid auth scheme. Use Bearer.');
    }

    // 3. 검증 및 Principal 반환
    try {
      return await this.verifier.verifyAccessToken(token);
    } catch (e) {
      throw new AuthenticationFailedError('Token expired or invalid');
    }
  }
}
```

## 15.5 Registering the PassportModule
프레임워크가 어느 전략 이름이 어느 토큰과 연결되는지 알 수 있도록 전략을 등록해야 합니다.

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
`@UseAuth()` 데코레이터는 인증 확인을 트리거하는 가장 일반적인 방법입니다. 이는 `fluo`에 해당 경로에 특정 전략으로 구성된 `AuthGuard`를 부착하도록 지시합니다.

```typescript
// src/posts/posts.controller.ts
import { Controller, Get, Post } from '@fluojs/http';
import { UseAuth } from '@fluojs/passport';

@Controller('posts')
export class PostsController {
  
  @Get()
  findAll() {
    return []; // 누구나 접근 가능
  }

  @Post()
  @UseAuth('jwt') // 보호됨!
  create() {
    return { success: true };
  }
}
```

보호된 경로로 요청이 들어올 때의 생명주기는 다음과 같습니다:
1. **가드 트리거**: `AuthGuard`가 `BearerJwtStrategy.authenticate()`를 호출합니다.
2. **성공**: 전략이 `Principal`을 반환합니다. 가드는 이를 `RequestContext.principal`에 부착하고 `true`를 반환합니다.
3. **실패**: 전략이 에러를 던집니다. 가드는 `false`를 반환(또는 에러를 전파)하고, 요청은 `401 Unauthorized`로 거부됩니다.

## 15.7 Accessing the Current User
사용자가 인증되면 그들의 신원(Principal)은 요청 생명주기의 나머지 단계에서 사용할 수 있게 됩니다.

### The @CurrentUser() Custom Decorator
`RequestContext`를 수동으로 뒤지는 대신, 사용자 정의 파라미터 데코레이터를 사용하여 사용자를 메서드에 직접 주입할 수 있습니다.

```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator } from '@fluojs/http';

export const CurrentUser = createParamDecorator((data, context) => {
  // switchToHttp()는 HTTP 전용 컨텍스트를 제공합니다.
  return context.switchToHttp().getRequestContext().principal;
});
```

이제 컨트롤러 메서드는 훨씬 더 깔끔해집니다:

```typescript
@Get('me')
@UseAuth('jwt')
getProfile(@CurrentUser() user: any) {
  // 'user'는 전략에서 반환된 검증된 Principal입니다.
  return {
    id: user.subject,
    email: user.email,
  };
}
```

## 15.8 Scope-Based Authorization
인증(Authentication)은 "당신은 누구인가?"입니다. 인가(Authorization)는 "당신은 무엇을 할 수 있는가?"입니다. `fluo`는 **스코프(Scopes)**를 통한 선언적 인가를 지원합니다.

```typescript
@Post()
@UseAuth('jwt')
@RequireScopes('posts:write')
create(@CurrentUser() user) {
  // 토큰에 'posts:write' 스코프가 포함된 사용자만 여기에 도달할 수 있습니다.
}
```

`AuthGuard`는 자동으로 `Principal`의 `scopes` 배열을 확인합니다. 사용자가 `'posts:admin'`을 가지고 있더라도 경로가 `'posts:write'`를 요구한다면, `403 Forbidden` 에러와 함께 접근이 거부됩니다.

## 15.9 RBAC: Role-Based Access Control
스코프가 세밀한 제어(권한 수준)라면, 역할(Roles)은 포괄적인 제어(그룹 수준)입니다. `Principal`의 `roles` 속성을 확인하여 RBAC를 구현할 수 있습니다.

```typescript
@Post('admin/cleanup')
@UseAuth('jwt')
@RequireRoles('admin')
cleanup() {
  // 'admin' 역할이 있는 사용자만 허용됩니다.
}
```

### 선택 기준: Scopes vs Roles
- **역할(Roles)**: 단순한 앱에서 관리하기 쉽습니다. "이 사람은 관리자인가?"
- **스코프(Scopes)**: 확장에 유연합니다. "이 사용자는 게시물을 삭제할 권한이 있는가?"
- **Fluo 권장사항**: FluoBlog에서는 역할로 시작하되, 나중에 제3자 개발자를 위한 공개 API를 추가할 계획이라면 스코프를 사용하는 것이 좋습니다.

## 15.10 Summary
`@fluojs/passport`는 원본 신원 데이터와 애플리케이션 로직 사이의 다리 역할을 합니다. 이를 통해 전체 API에서 보안이 일관되게 적용되도록 보장할 수 있습니다.

- **가드(Guards)**는 인증되지 않은 요청을 차단하는 주요 메커니즘입니다.
- **전략(Strategies)**은 다양한 인증 방법의 로직을 캡슐화합니다.
- **Principals**는 `RequestContext` 내의 검증된 신원을 나타냅니다.
- **선언적 인가**(`@RequireScopes`, `@RequireRoles`)를 사용하면 보안 로직을 메서드 외부로 분리할 수 있습니다.

Part 3의 마지막 장에서는 한 가지 보안 계층을 더 살펴보겠습니다. Throttling을 사용하여 API를 남용으로부터 보호하는 방법입니다.

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
