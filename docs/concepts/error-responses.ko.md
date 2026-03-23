# error responses

<p><a href="./error-responses.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>

이 가이드는 Konekti HTTP 런타임에서 사용되는 표준 에러 응답 형식과 노출 정책을 설명합니다.

### 관련 문서

- `./http-runtime.ko.md`
- `./auth-and-jwt.ko.md`
- `../../packages/http/README.ko.md`

## 표준 에러 형식

성공 응답은 일반 객체를 반환합니다. 에러 응답은 표준 엔벨로프(envelope)를 따릅니다:

```ts
type ErrorResponse = {
  error: {
    code: string;
    status: number;
    message: string;
    requestId?: string;
    details?: Array<{
      field?: string;
      source?: 'path' | 'query' | 'header' | 'cookie' | 'body';
      code: string;
      message: string;
    }>;
    meta?: Record<string, unknown>;
  };
};
```

## 기본 상태 매핑 (default status mapping)

프레임워크는 일반적인 에러 시나리오에 대해 다음과 같은 표준 HTTP 상태 코드를 사용합니다:

- **400 (Bad Request)**: 바인딩 및 유효성 검사 실패.
- **401 (Unauthorized)**: 인증 실패.
- **403 (Forbidden)**: 인가 실패.
- **404 (Not Found)**: 리소스를 찾을 수 없음.
- **409 (Conflict)**: 리소스 충돌.
- **500 (Internal Server Error)**: 처리되지 않은 내부 예외.

## 아키텍처 구조

- **코어 레이어 (Core Layer)**: 트랜스포트 중립적인 에러 규약을 정의합니다.
- **`@konekti/http`**: HTTP를 인식하는 예외 클래스들을 제공합니다.
- **어댑터 (Adapters)**: 가드 및 리졸버가 내부 실패를 HTTP 예외 모델로 변환합니다.

## 노출 정책

### 노출해도 안전한 항목

- 유효성 검사 필드 경로.
- 클라이언트 친화적인 유효성 검사 메시지.
- 요청 ID.
- 일반적인 인증 실패 카테고리.

### 민감한 항목 (노출 금지)

- 스택 트레이스 (Stack traces).
- 내부 원인 체인 (Internal cause chains).
- 가공되지 않은 데이터베이스 또는 ORM 에러 페이로드.
- JWT 검증 내부 세부 정보.
- 설정 또는 시크릿 값.

## 요청 상관관계 (request correlation)

가능한 경우 에러 응답에 `requestId`가 포함됩니다. 이 ID는 로그, 트레이스, 메트릭 전반에서 주요 상관관계 키 역할을 합니다.
