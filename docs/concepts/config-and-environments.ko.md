# config와 environments

<p><a href="./config-and-environments.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>

fluo는 configuration을 주변에 흩어진 environment variable의 모음이 아니라 **검증된 runtime data**로 취급합니다. 명시적 로딩, 엄격한 검증, 타입 안전한 접근을 강제함으로써 어떤 환경에서도 애플리케이션의 동작이 예측 가능하도록 보장합니다.

## 이 개념이 중요한 이유

코드베이스 전체에 `process.env.DB_URL`을 흩뿌리는 식의 "ambient" configuration은 프로덕션 불안정성의 주요 원인입니다.
- **숨겨진 의존성**: 애플리케이션이 실제로 어떤 환경 변수를 필요로 하는지 프로덕션에서 충돌하기 전까지 알 수 없습니다.
- **타입 불확실성**: `process.env` 값은 항상 문자열입니다. `PORT`를 숫자로, `DEBUG` 플래그를 불리언으로 파싱하는 것을 잊으면 미묘하고 추적하기 어려운 버그가 발생합니다.
- **테스트 마찰**: 단위 테스트에서 전역 `process.env`를 모킹하는 일은 번거롭고 테스트 스위트 간 사이드 이펙트를 일으킬 수 있습니다.

fluo는 **Config Boundary**를 만들어 이 문제를 해결합니다. 모든 configuration은 애플리케이션 로직에 도달하기 전에 반드시 검증 게이트를 통과해야 합니다.

## 핵심 아이디어

### 명시적 로딩 (no magic env)
fluo는 시스템 전체를 자동으로 스캔해 환경 변수를 찾지 않습니다. 부트스트랩 과정에서 configuration 소스를 명시적으로 정의해야 합니다. 예를 들면 다음과 같습니다.
- 특정 `.env` 파일 경로
- 정적인 JSON 또는 YAML configuration
- `process.env`의 필터링된 일부

이 명시성은 애플리케이션을 "hermetic"하게 만듭니다. 애플리케이션은 사용자가 제공한 정보만 알기 때문에 이식성이 높고 테스트하기 쉽습니다.

### 조기 검증 게이트
configuration이 유효하지 않으면 애플리케이션은 **시작을 거부합니다**.
- **Schema-Driven**: 검증 라이브러리 등을 사용해 config의 형상을 정의합니다.
- **Fail-Fast**: 누락된 키, 잘못된 타입, 범위를 벗어난 값은 코드 실행의 첫 줄에서 잡힙니다. 이는 특정 서비스가 호출될 때만 실패하는 "half-booted" 애플리케이션을 방지합니다.

### `ConfigService` 경계
애플리케이션 내부에서는 외부 환경 변수에 직접 접근하지 않습니다. 대신 `ConfigService`를 주입합니다.
- **타입 안전한 접근**: `config.get<number>('port')`는 올바른 데이터 타입을 사용하고 있음을 보장합니다.
- **안전한 기본값**: 환경 변수가 제공되지 않을 때만 사용되는 폴백 값을 코드에 정의할 수 있습니다.
- **Secret Masking**: `ConfigService`는 애플리케이션 상태를 로그로 남길 때 API 키 같은 민감한 값을 마스킹하도록 설정할 수 있습니다.

## 로딩 우선순위

여러 source가 제공되면 fluo는 이를 결정론적인 순서로 병합합니다:
1. **Bootstrap Overrides**: `fluo.create()` 호출에 직접 전달된 값(가장 높은 우선순위)
2. **Environment Variables**: 시스템 environment에서 매핑된 값
3. **Configuration Files**: `.env`, `config.json` 등에서 읽은 값
4. **Code Defaults**: 하드코딩된 fallback 값(가장 낮은 우선순위)

## 경계

- **Zero Global Dependency**: fluo 생태계의 어떤 패키지도 `process.env`에 직접 접근할 수 없습니다. 모든 것은 DI 컨테이너를 거쳐야 합니다.
- **Validation Barrier**: 하나의 필수 필드라도 검증에 실패하면 configuration 스냅샷은 "손상된(corrupt)" 것으로 간주됩니다. 부분적인 configuration은 절대 적용되지 않습니다.
- **Runtime Reloading**: 개발 환경에서는 `ConfigService`가 프로세스를 재시작하지 않고도 새 스냅샷을 적용할 수 있습니다([Dev Reload Architecture](./dev-reload-architecture.ko.md) 참고).

## 관련 문서

- [Architecture Overview](./architecture-overview.ko.md)
- [Dev Reload Architecture](./dev-reload-architecture.ko.md)
- [Lifecycle and Shutdown](./lifecycle-and-shutdown.ko.md)
- [Config Package README](../../packages/config/README.ko.md)
