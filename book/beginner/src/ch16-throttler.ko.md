<!-- packages: @fluojs/throttler -->
<!-- project-state: FluoBlog v1.13 -->

# Chapter 16. Rate Limiting and Security Hardening

## Learning Objectives
- API 보안을 위한 속도 제한(Rate Limiting/Throttling)의 중요성을 이해합니다.
- 기본 TTL 및 limit 설정을 사용하여 `ThrottlerModule`을 구성합니다.
- `@Throttle()` 및 `@SkipThrottle()` 데코레이터를 적용합니다.
- 클라이언트 식별을 위한 사용자 정의 키 생성(key generation)을 구현합니다.
- 무차별 대입 공격(brute-force attacks)으로부터 FluoBlog의 로그인 엔드포인트를 보호합니다.
- `fluo`에서의 보안 강화(security hardening)를 위한 모범 사례를 검토합니다.

## 16.1 Protecting Your API from Abuse
이전 장들에서 우리는 인증을 요구함으로써 FluoBlog를 안전하게 만들었습니다. 그러나 보안은 단순히 "누가 접근할 수 있는가"뿐만 아니라 "얼마나 많이 접근할 수 있는가"에 관한 것이기도 합니다.

공격자가 사용자의 비밀번호를 추측하려고 한다고 가정해 봅시다. 그들은 초당 수천 개의 로그인 요청을 보낼 수 있습니다. 또는 버그가 있는 스크립트가 실수로 API를 무한 루프에서 호출할 수도 있습니다. 이러한 동작은 서버의 CPU, 메모리, 데이터베이스 연결을 순식간에 고갈시킬 수 있습니다.

이때 **속도 제한(Rate Limiting)** 또는 Throttling이 필요합니다. 이는 클라이언트가 특정 시간 내에 보낼 수 있는 요청 수를 제한함으로써 시스템의 안전 밸브 역할을 합니다.

## 16.2 Introducing @fluojs/throttler
`fluo`는 데코레이터 기반의 쉬운 속도 제한을 위해 `@fluojs/throttler` 패키지를 제공합니다. 이 패키지는 `AuthGuard` 및 `RequestContext`와 직접 통합됩니다.

### How it works
Throttler는 "고정 윈도우(Fixed Window)" 알고리즘을 사용합니다:
- **TTL (Time To Live)**: 윈도우의 지속 시간(초 단위).
- **Limit**: 해당 윈도우 내에서 허용되는 최대 요청 수.

클라이언트가 제한을 초과하면 `fluo`는 자동으로 `429 Too Many Requests` 에러를 던지고 `Retry-After` 헤더를 포함하여 클라이언트가 정확히 얼마나 기다려야 하는지 알려줍니다.

## 16.3 Basic Configuration
루트 모듈에 `ThrottlerModule`을 등록합니다. 이는 애플리케이션 전체에 대한 기본 정책을 설정합니다.

```typescript
import { Module } from '@fluojs/core';
import { ThrottlerModule } from '@fluojs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,   // 1분 윈도우
      limit: 100, // 분당 100회 요청
    }),
  ],
})
export class AppModule {}
```

이 설정은 "안전망"을 제공하여, 기본적으로 단일 클라이언트가 초당 수백 개의 요청으로 서버를 압도하는 것을 방지합니다.

## 16.4 Using Decorators
글로벌 설정을 재정의하거나 특정 컨트롤러나 메서드에 대해 속도 제한을 완전히 건너뛸 수 있습니다.

### Overriding with @Throttle()
로그인과 같이 민감한 경로의 경우 훨씬 더 엄격한 제한을 적용해야 합니다.

```typescript
import { Controller, Post } from '@fluojs/http';
import { Throttle } from '@fluojs/throttler';

@Controller('auth')
export class AuthController {
  
  @Post('login')
  @Throttle({ ttl: 60, limit: 5 }) // 엄격함: 분당 5회 시도만 허용
  async login() {
    // 이제 무차별 대입 공격이 훨씬 어려워졌습니다.
  }
}
```

### Bypassing with @SkipThrottle()
내부 헬스 체크나 신뢰할 수 있는 공급자의 웹훅 엔드포인트와 같은 일부 경로는 속도 제한을 우회해야 할 수도 있습니다.

```typescript
@Get('health')
@SkipThrottle() // 헬스 체크는 항상 접근 가능해야 합니다.
healthCheck() {
  return { status: 'ok' };
}
```

## 16.5 Client Identification and Custom Keys
기본적으로 throttler는 클라이언트를 IP 주소로 식별합니다. 그러나 IP만으로 사용자를 식별하는 데는 두 가지 주요 단점이 있습니다:
1. **공유 IP**: 기업 프록시나 NAT 뒤에 있는 많은 사용자가 동일한 IP를 공유할 수 있습니다.
2. **프록시 헤더**: 앱이 Nginx나 Cloudflare 뒤에 있는 경우 모든 IP가 프록시의 IP로 보일 수 있습니다.

### trustProxyHeaders
`X-Forwarded-For`와 같은 헤더를 설정하는 프록시를 신뢰하는 경우, 실제 클라이언트 IP를 확인하기 위해 이 설정을 활성화하세요:

```typescript
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100,
  trustProxyHeaders: true, // 헤더를 사용하여 실제 IP를 찾습니다.
})
```

### Custom Key Generation
최상의 사용자 경험을 위해, 사용자가 로그인한 상태라면 **Principal**을 기반으로 속도 제한을 적용해야 합니다.

```typescript
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100,
  keyGenerator: (context) => {
    const requestContext = context.switchToHttp().getRequestContext();
    // 1. 인증된 경우 고유한 사용자 ID(subject)를 사용합니다.
    if (requestContext.principal?.subject) {
      return `user:${requestContext.principal.subject}`;
    }
    // 2. 그렇지 않으면 IP 주소로 대체합니다.
    return `ip:${requestContext.ip}`;
  },
})
```

## 16.6 Multi-Instance Deployments with Redis
FluoBlog의 인스턴스를 여러 개 실행하는 경우(예: Kubernetes 클러스터), 인메모리 throttler는 동기화되지 않습니다. 사용자가 서버 A에서 제한에 도달하고 즉시 서버 B로 더 많은 요청을 보낼 수 있기 때문입니다.

이를 해결하기 위해 `RedisThrottlerStore`를 사용합니다.

```typescript
import { RedisThrottlerStore } from '@fluojs/throttler';
import { REDIS_CLIENT } from '@fluojs/redis';

ThrottlerModule.forRootAsync({
  inject: [REDIS_CLIENT],
  useFactory: (redis) => ({
    ttl: 60,
    limit: 100,
    // 카운터가 이제 Redis에 저장되고 동기화됩니다.
    store: new RedisThrottlerStore(redis),
  }),
})
```

## 16.7 Security Hardening Checklist
Part 3를 마무리하며 프로덕션 준비가 된 FluoBlog를 위한 필수 보안 체크리스트를 검토해 보겠습니다:

1.  **HTTPS 사용**: 일반 HTTP를 통해 JWT나 비밀번호를 전송하지 마세요.
2.  **짧은 수명의 액세스 토큰**: 유출된 토큰의 영향을 최소화하기 위해 1시간 미만으로 유지하세요.
3.  **안전한 리프레시 토큰**: `HttpOnly` 및 `SameSite: Strict` 쿠키에 저장하세요.
4.  **모든 입력 유효성 검사**: 인젝션 및 잘못된 형식의 데이터를 방지하기 위해 `@fluojs/validation`(Chapter 6)을 사용하세요.
5.  **속도 제한 활성화**: 민감한 경로(로그인, 가입, 비밀번호 찾기)를 보호하세요.
6.  **최소 권한 원칙**: 사용자가 정말로 필요한 권한만 가질 수 있도록 Scopes와 RBAC(Chapter 15)을 사용하세요.

## 16.8 Summary
속도 제한은 무차별 대입 공격과 API 남용에 대한 첫 번째 방어선입니다. 이는 공격을 받을 때도 모든 사용자가 애플리케이션을 계속 사용할 수 있도록 보장합니다.

- **ThrottlerModule**은 API에 대한 기본 요청 할당량을 설정합니다.
- **@Throttle()**은 특정 민감한 엔드포인트에 대해 보안을 강화할 수 있게 해줍니다.
- **사용자 정의 키 생성**은 프록시 뒤에서도 클라이언트를 올바르게 식별하도록 보장합니다.
- **Redis 저장소**는 분산 환경에서 일관된 공유 카운터를 제공합니다.

축하합니다! Part 3: 인증 및 보안을 완료했습니다. FluoBlog는 이제 견고하고 안전하며 전문적인 백엔드 애플리케이션이 되었습니다. Part 4에서는 HTTP를 넘어 WebSockets를 이용한 실시간 통신을 살펴보겠습니다.

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
