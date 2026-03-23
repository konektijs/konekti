# 보안 미들웨어 (security middleware)

<p><strong><kbd>English</kbd></strong> <a href="./security-middleware.ko.md"><kbd>한국어</kbd></a></p>

이 가이드는 `@konekti/http`에 구현된 트랜스포트 수준 보안 미들웨어를 설명합니다.

### 관련 문서

- `./http-runtime.ko.md`
- `../../packages/http/README.md`

## 미들웨어 제품군

### 속도 제한 (rate limiting)

`RateLimitMiddleware`는 트랜스포트 수준 보호를 제공합니다:

- **가용성**: `@konekti/http`에서 내보내집니다.
- **인터페이스**: 표준 미들웨어 인터페이스를 구현합니다.
- **식별**: 요청 식별을 위한 커스텀 리졸버를 지원합니다.
- **응답**: 제한을 초과하면 `Retry-After` 헤더와 함께 `429 Too Many Requests`를 반환합니다.
- **저장소**: 기본적으로 프로세스 내 저장소를 사용합니다. 공유 어댑터 없이는 클러스터 환경에서 안전하지 않습니다.
- **사용법**: 단일 프로세스 보호에 권장됩니다. 분산 시스템의 경우, 에지 또는 인프라 수준에서 공유 제한기를 사용하세요.

### 보안 헤더 (security headers)

`SecurityHeadersMiddleware`는 보안 중심의 HTTP 헤더를 관리합니다:

- **가용성**: `@konekti/http`에서 내보내집니다.
- **동작**: 기본적인 보안 헤더 세트를 작성합니다.
- **커스터마이징**: 특정 헤더를 덮어쓰거나 비활성화할 수 있습니다.
- **안전성**: `X-Powered-By`를 절대 포함하지 않습니다.

## 기본 보안 헤더

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 0`
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 책임 범위

- **위치**: 이 미들웨어들은 HTTP 런타임 패키지 내에 위치합니다.
- **명시적 활성화**: 보안 미들웨어는 애플리케이션에서 명시적으로 활성화해야 합니다.
- **라이프사이클**:
  - 속도 제한은 라우트 디스패치 전에 발생하며 핸들러 로직과는 독립적입니다.
  - 보안 헤더는 핸들러 결과와 관계없이 모든 응답에 적용됩니다.
