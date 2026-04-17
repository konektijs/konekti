# HTTP 런타임

<p><a href="./http-runtime.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>

fluo는 기반 웹 서버(Fastify, Bun, Cloudflare Workers 등)의 복잡성을 추상화하면서도 엄격한 단계(phase) 기반 요청 수명 주기(lifecycle)를 제공하는 고성능 **HTTP 런타임 퍼사드(Runtime Facade)**를 제공합니다.

## 이 개념이 중요한 이유

많은 프레임워크에서 “요청 여정(request journey)”은 블랙박스(black box)와 같습니다. 미들웨어(middleware), 필터(filter), 가드(guard), 인터셉터(interceptor)가 서로 복잡하게 얽혀 있어 다음과 같은 단순한 질문에도 답하기 어렵습니다:
- “인증 로직은 어디에 넣어야 하나요?”
- “왜 내 검증 에러(validation error)가 전역 필터에 잡히지 않나요?”
- “내 응답(response)은 로거(logger)에 도달하기 전에 이미 직렬화(serialized) 되었나요?”

fluo는 **명시적인 실행 순서**로 이 모호함을 제거합니다. 모든 요청에 대해 명확하고 단방향인 여정을 정의함으로써 보안(security), 검증(validation), 관찰 가능성(observability)이 API 전반에서 일관되게 처리되도록 보장합니다.

## 핵심 아이디어

### 런타임 추상화 (퍼사드)
비즈니스 로직은 Node.js + Fastify에서 실행되는지, 서버리스 에지 함수(Edge function)에서 실행되는지에 의존해서는 안 됩니다.
- **통합 컨텍스트**: fluo는 원시 요청/응답 객체(raw request/response object)를 `fluoContext`로 감쌉니다.
- **플랫폼 독립성(Platform Agnostic)**: 컨트롤러와 서비스는 한 번만 작성하면 됩니다. 플랫폼 어댑터(예: `@fluojs/platform-fastify`)가 특정 서버 엔진으로의 변환을 처리합니다.

### 구체화 게이트(Materialization Gate)
fluo는 들어오는 HTTP 데이터(body, query, params)를 **신뢰할 수 없는 원시 입력**으로 취급합니다.
- **게이트키퍼(Gatekeeper)**: `@FromBody()`와 같은 데코레이터를 사용해 데이터를 타입이 지정된 TypeScript 클래스로 “구체화(materialize)”합니다.
- **검증 우선(Validation-First)**: 컨트롤러 핸들러가 호출되기 전에 이 구체화된 데이터는 정의된 스키마에 따라 검증됩니다. 검증에 실패하면 요청은 명확한 400 에러로 거부되어 비즈니스 로직이 손상된 데이터를 다루지 않게 됩니다.

### 인터셉터 “어니언(Onion)”
fluo는 요청 처리를 위해 “어니언(양파)” 모델을 사용합니다. 각 단계(미들웨어 -> 가드 -> 인터셉터)는 다음 단계를 감싸며, 핸들러의 **전**과 **후** 모두에서 로직을 실행할 수 있게 합니다. 이는 로깅, 성능 측정(performance timing), 응답 변환(response transformation)에 특히 적합합니다.

## 실행 순서

1. **플랫폼 어댑터**: 네트워크로부터 원시 바이트 스트림(raw byte stream)을 수신합니다.
2. **컨텍스트 초기화**: `fluoContext`를 생성합니다.
3. **전역 미들웨어**: 원시 횡단 관심사(CORS, 압축 등)를 처리합니다.
4. **라우트 탐색**: URL 경로를 특정 컨트롤러 메서드와 매칭합니다.
5. **가드 체크**: 권한 부여 경계(authorization boundary)입니다. 가드가 `false`를 반환하면 여정은 403으로 끝납니다.
6. **인터셉터 (핸들러 전)**: 데이터가 처리되기 직전 로직을 실행합니다.
7. **입력 구체화 및 검증**: 원시 JSON이 타입이 지정되고 검증된 클래스 인스턴스가 됩니다.
8. **컨트롤러 핸들러**: 비즈니스 로직이 실행됩니다.
9. **인터셉터 (핸들러 후)**: 결과를 변환합니다(예: `{ data: ... }` 객체로 감싸기).
10. **응답 직렬화(Serialization)**: 결과를 JSON 또는 요청된 형식으로 다시 변환합니다.
11. **최종 쓰기**: 플랫폼 어댑터가 응답을 클라이언트로 보냅니다.

## 경계

- **원시 접근(Raw Access) 금지**: 플랫폼 이식성(portability)을 유지하기 위해 `req`나 `res`를 직접 건드리는 것을 권장하지 않습니다. 대신 `fluoContext`를 사용하세요.
- **계약 기반 응답**: 컨트롤러의 반환값은 `@Produces()` 또는 `@HttpCode()` 메타데이터를 기반으로 자동 직렬화됩니다.
- **예외 경계(Exception Boundary)**: 어떤 단계에서든 포착되지 않은 에러는 **전역 예외 필터(Global Exception Filter)**가 잡아 클라이언트에게 원시 스택 트레이스 대신 표준화된 에러 응답을 전달합니다.

## 관련 문서

- [Architecture Overview](./architecture-overview.ko.md)
- [Decorators and Metadata](./decorators-and-metadata.ko.md)
- [DI and Modules](./di-and-modules.ko.md)
- [HTTP Package README](../../packages/http/README.ko.md)
