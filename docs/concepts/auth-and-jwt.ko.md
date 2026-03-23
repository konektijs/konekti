# auth and jwt

<p><a href="./auth-and-jwt.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>

이 가이드는 인증과 JWT 지원이 Konekti 패키지에 어떻게 분산되어 있는지 설명합니다.

## 패키지 경계

- **`@konekti/jwt`**: 핵심 JWT 규약, 서명, 검증, 클레임(claim) 유효성 검사, principal 정규화.
- **`@konekti/passport`**: 전략 등록, 범용 인증 가드 연결, 전략 어댑터 규약.
- **`@konekti/http`**: 가드 오케스트레이션, `RequestContext` 관리, 런타임 실행.
- **`@konekti/config`**: 키 자료(key material), 발행자(issuer), 대상(audience) 관리.

## 책임 분담

- **토큰 추출**: 전략별 어댑터 로직.
- **서명 및 클레임 검증**: `JwtVerifier`가 처리합니다.
- **principal 정규화**: `JwtVerifier`가 처리합니다.
- **라우트 레벨 인증 요구사항**: passport 메타데이터 및 인증 가드를 통해 관리합니다.
- **컨텍스트 첨부**: 검증된 principal을 `RequestContext`에 첨부합니다.
- **에러 매핑**: passport 및 HTTP 예외 레이어에서 처리합니다.

## 요청 흐름

일반적인 인증된 요청은 다음 경로를 따릅니다:

1.  **HTTP 요청** 도착.
2.  **인증 가드**가 필요한 전략을 식별.
3.  **인증 전략**이 자격 증명(예: JWT)을 검증.
4.  **Principal** 추출 및 정규화.
5.  **`RequestContext.principal`** 데이터 채우기.
6.  **Controller/Service**가 인증된 principal과 함께 실행.

## 핵심 원칙

- JWT는 하나의 특정 전략일 뿐, 전체 인증 모델이 아닙니다.
- `@konekti/passport`는 전략에 구애받지 않습니다(strategy-agnostic).
- `@konekti/jwt`는 트랜스포트에 구애받지 않습니다(transport-agnostic).
- 애플리케이션 코드는 원시 페이로드 대신 정규화된 principal과 상호작용해야 합니다.

## JWT 지원 범위

### 알고리즘

- **HMAC**: `HS256`, `HS384`, `HS512`.
- **비대칭**: `RS256`, `RS384`, `RS512`, `ES256`, `ES384`, `ES512`.

### 키 관리

비대칭 알고리즘의 경우, `JwtVerifierOptions`에 `privateKey`와 `publicKey`(PEM 문자열 또는 `KeyObject`)를 제공하세요. `kid`(Key ID) 헤더를 사용하는 `keys` 배열을 통해 키 로테이션이 지원됩니다.

## 표준 인증 패턴

권장되는 인증 패턴은 `Authorization: Bearer <token>` 헤더를 통한 Bearer 토큰 인증입니다.

### 애플리케이션 레벨 정책

다음 영역은 현재 애플리케이션 특정 사항으로 간주되며 프레임워크 내에서 표준화되지 않았습니다:

- HttpOnly 쿠키 인증 프리셋.
- 리프레시 토큰 라이프사이클 및 로테이션.
- 로그아웃 및 토큰 취소.
- ID 제공자 계정 연결(Identity provider account linking).

이러한 항목들은 프로젝트 요구사항에 따라 애플리케이션 레벨에서 구현되어야 합니다.

## 추가 정보

- **`@konekti/jwt`**: `../../packages/jwt/README.md`
- **`@konekti/passport`**: `../../packages/passport/README.md`
- **`@konekti/http`**: `../../packages/http/README.md`
