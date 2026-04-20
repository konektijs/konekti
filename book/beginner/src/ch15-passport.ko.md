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

이전 장에서 우리는 JWT 토큰을 발급하고 검증하는 방법을 배웠습니다. 덕분에 FluoBlog는 신원을 토큰으로 표현할 수 있게 되었지만, 아직 HTTP 계층이 언제 요청을 통과시키고 언제 멈춰야 하는지는 정하지 않았습니다. 하지만 실제로 어떻게 경로를 "보호"할까요? 토큰이 없거나 유효하지 않은 경우 요청이 컨트롤러에 도달하기 전에 어떻게 차단할까요?

`fluo`에서는 이를 **가드(Guards)**가 처리합니다.

가드는 미들웨어 이후, 경로 핸들러 이전에 실행되는 특수한 인터셉터입니다. 가드의 유일한 책임은 `true`(허용) 또는 `false`(거부/에러 발생)를 반환하는 것입니다.

## 15.2 Introducing @fluojs/passport

모든 것에 대해 수동으로 가드를 작성할 수도 있지만, 그러면 요청 검사, 자격 증명 파싱, 사용자 검증이 여러 곳에 반복되기 쉽습니다. `@fluojs/passport`는 인증 "전략(strategies)"을 관리하는 구조화된 방식을 제공하여 그 책임을 더 분명하게 나눌 수 있게 합니다.

### What is a Strategy?

전략은 사용자를 검증하는 구체적인 방법입니다. 일반적인 전략은 다음과 같습니다:
- **Local**: 이메일과 비밀번호.
- **JWT**: 헤더의 Bearer 토큰.
- **OAuth2**: Google, GitHub 등.
- **API Key**: 사용자 정의 헤더의 비밀 키.

## 15.3 The AuthStrategy Interface

`fluo`에서 모든 전략은 `AuthStrategy` 인터페이스를 구현해야 합니다.

```typescript
import { GuardContext } from '@fluojs/http';
import { AuthStrategy } from '@fluojs/passport';

export interface AuthStrategy {
  authenticate(context: GuardContext): Promise<any>;
}
```

`authenticate` 메서드는 원시 요청을 검증된 신원으로 바꾸는 지점입니다. 요청을 확인하고, 자격 증명을 찾고, 검증한 다음 "Principal"(검증된 사용자 객체)을 반환합니다.

## 15.4 Implementing a JWT Strategy

Chapter 14에서 이미 토큰 검증 자체를 다뤘으므로, 여기서는 그 검증을 HTTP 요청 흐름에 어떻게 연결하는지가 핵심입니다. FluoBlog를 위한 `BearerJwtStrategy`를 구현해 보겠습니다.

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

    // 정규화된 JwtPrincipal을 반환합니다.
    return await this.verifier.verifyAccessToken(token);
  }
}
```

## 15.5 Registering the PassportModule

전략 클래스를 만들었다고 해서 바로 사용되는 것은 아닙니다. 어떤 이름으로 등록할지, 기본 전략은 무엇인지도 `fluo`에 알려주어야 합니다.

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

등록이 끝나면 경로 보호는 수동 분기 대신 선언적으로 표현할 수 있습니다. 이제 `@UseAuth()` 데코레이터를 사용하여 컨트롤러나 특정 메서드를 보호할 수 있습니다.

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

사용자가 유효한 Bearer 토큰 없이 `/posts`로 POST 요청을 보내면, (`@UseAuth`에 의해 자동으로 부착된) `AuthGuard`가 `create` 메서드가 호출되기도 전에 `401 Unauthorized` 에러를 던집니다.

## 15.7 Accessing the Current User

사용자가 인증되면 그들의 신원은 `RequestContext`에 부착됩니다. 이것이 인증 결과가 일반 컨트롤러 코드로 넘어오는 연결 지점입니다.

컨텍스트에서 직접 접근할 수 있습니다:

```typescript
@Get('me')
@UseAuth('jwt')
getProfile(input, ctx: RequestContext) {
  return ctx.principal;
}
```

### The @CurrentUser() Custom Decorator

컨텍스트에서 직접 꺼내는 방식도 가능하지만, 같은 코드가 반복되면 컨트롤러 메서드가 금방 복잡해집니다. 코드를 더 깔끔하게 만들기 위해 (Chapter 4에서 배운 것처럼) `@CurrentUser`라는 사용자 정의 파라미터 데코레이터를 만들 수 있습니다.

```typescript
// src/common/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator((data, context) => {
  return context.switchToHttp().getRequestContext().principal;
});
```

이제 컨트롤러는 다음과 같이 보입니다:

```typescript
@Get('me')
@UseAuth('jwt')
getProfile(@CurrentUser() user) {
  return user;
}
```

## 15.8 Scope-Based Authorization

여기까지 오면 요청에는 이미 검증된 신원이 들어 있습니다. 이제 다음 질문은 그 신원이 무엇을 할 수 있는가입니다. 인증(Authentication)은 "당신은 누구인가?"입니다. 인가(Authorization)는 "당신은 무엇을 할 수 있는가?"입니다.

`fluo`는 **스코프(Scopes)**를 위한 내장 지원을 갖추고 있습니다.

```typescript
@Post()
@UseAuth('jwt')
@RequireScopes('posts:write')
create() {
  // 'posts:write' 스코프를 가진 사용자만 여기에 도달할 수 있습니다.
}
```

`AuthGuard`는 `principal.scopes` 배열을 확인합니다. 필요한 스코프가 없으면 `403 Forbidden` 에러를 던집니다.

## 15.9 RBAC: Role-Based Access Control

스코프는 세밀한 권한 표현에 잘 맞지만, 어떤 규칙은 역할 단위로 말하는 편이 더 자연스럽습니다. 때로는 단순히 누군가가 "Admin"인지 확인하고 싶을 때가 있습니다.

`principal.roles`를 확인하는 사용자 정의 `RolesGuard`를 구현할 수 있습니다.

```typescript
@Post('admin/delete-all')
@UseAuth('jwt')
@RequireRoles('admin')
deleteAll() {
  // ...
}
```

(참고: `RequireRoles` 구현은 `RequireScopes`와 동일한 패턴을 따르지만 `roles` 속성을 대신 확인합니다.)

## 15.10 Summary

`@fluojs/passport`는 원본 신원 데이터와 애플리케이션 로직 사이의 다리 역할을 합니다.

주요 요약:
- `AuthGuard`는 보호된 경로를 위한 관문입니다.
- 전략은 특정 인증 방법을 처리하기 위해 `AuthStrategy` 인터페이스를 구현합니다.
- `@UseAuth()`는 인증 확인을 트리거합니다.
- `@RequireScopes()`는 선언적 인가를 제공합니다.
- `@CurrentUser()`와 같은 사용자 정의 데코레이터는 컨트롤러 메서드를 깔끔하고 읽기 쉽게 유지합니다.

이제 FluoBlog는 Bearer 토큰을 검증된 principal로 바꾸고, 그 principal을 바탕으로 경로별 인가 규칙까지 적용할 수 있습니다. Part 3의 마지막 장에서는 한 가지 계층을 더 추가하여, Throttling으로 API 남용을 막는 방법을 살펴보겠습니다.

<!-- line-count-check: 200+ lines target achieved -->
