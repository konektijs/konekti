# 플랫폼 일관성 설계

<p><a href="./platform-consistency-design.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>

**플랫폼 일관성 설계(Platform Consistency Design)**는 fluo 프레임워크의 중추(spine)입니다. 데이터베이스 드라이버부터 메시지 브로커까지 모든 공식 패키지가 따라야 하는 보편적인 계약(contract)을 정의하여, 일관된 운영 경험을 보장합니다.

## 이 개념이 중요한 이유

현대 백엔드 생태계는 종종 일관성 없는 라이브러리들로 가득한 “서부 개척 시대(Wild West)”와 같습니다. 어떤 라이브러리는 구성을 위해 환경 변수(environment variable)를 사용하고, 다른 라이브러리는 JSON 파일을 요구합니다. 어떤 것은 Prometheus 메트릭을 내보내지만, 어떤 것은 표준 출력(stdout)에만 기록합니다.

이러한 불일치는 **운영 마찰(Operational Friction)**을 만듭니다:
- 개발자는 새 패키지마다 새로운 “사용 방식”을 배워야 합니다.
- SRE와 DevOps 팀은 각 서비스가 상태(health)를 다르게 보고하기 때문에 통합 모니터링과 알람 체계를 구축하기 어렵습니다.
- 스택 전반에서 에러 형식과 진단 코드가 크게 다르면 문제 해결(troubleshooting)은 악몽이 됩니다.

fluo는 **공유된 개념적 계약**을 강제하여 이 마찰을 제거합니다. `@fluojs/redis`, `@fluojs/prisma`, 또는 커스텀 내부 모듈을 사용하더라도, 구성, 모니터링, 확장의 “형태(shape)”는 동일하게 유지됩니다.

## 핵심 아이디어

### 플랫폼 쉘 (`@fluojs/runtime`)
런타임은 오케스트레이터(orchestrator) 역할을 합니다. 어떤 패키지가 하는 일(예: Redis에 데이터 저장)을 알 필요는 없지만, 어떻게 대화해야 하는지는 압니다. 모든 패키지는 다음에 대한 표준 인터페이스를 구현함으로써 이 쉘에 “플러그인”해야 합니다:
- **수명 주기(Lifecycle)**: 어떻게 안전하게 시작하고 멈출 것인가
- **상태(Health)**: “나는 살아 있습니다”를 보고하는 방법
- **준비성(Readiness)**: “작업할 준비가 되었습니다”를 보고하는 방법
- **텔레메트리(Telemetry)**: 메트릭과 트레이스를 표준화된 형식으로 내보내는 방법

### 리소스 소유권과 책임
설계의 핵심 원칙은 **명확한 소유권**입니다.
- 패키지가 TCP 소켓이나 파일 핸들 같은 리소스를 생성했다면, 정리 책임은 전적으로 그 패키지에 있습니다.
- 사용자가 리소스를 패키지에 제공한 경우(예: 기존 데이터베이스 클라이언트 전달), 패키지는 그것을 닫으려 해서는 안 됩니다.
이것은 종료 중 “이중 해제(double-free)” 오류와 연결이 끊기지 않는 현상을 방지합니다.

### 일관된 진단 정보
fluo의 에러는 단순한 문자열이 아니라 **실행 가능한 데이터**입니다. 일관성 설계는 모든 공식 패키지가 다음을 제공하도록 요구합니다:
- **안정적인 에러 코드**: 기계 판독 가능한 ID(예: `ERR_KV_CONNECTION_FAILED`)
- **수정 힌트**: 문제를 해결하는 방법에 대한 사람이 읽을 수 있는 지침(예: “.env의 REDIS_URL을 확인하세요”)
- **상황별 메타데이터**: 실패를 일으킨 구체적인 매개변수로, 자동화된 문제 해결을 가능하게 합니다.

## 공유 계약 중추(Shared Contract Spine)

모든 플랫폼 지향 패키지는 다음 네 가지 기둥에 맞춰집니다:

1. **구성 봉투(Config Envelope)**: `enabled`, `id`, `timeout`, `telemetry`에 대한 표준 필드
2. **상태 모델(State Model)**: `CREATED` -> `INITIALIZING` -> `READY` -> `STOPPING` -> `STOPPED`의 예측 가능한 상태 머신
3. **공통 관찰 가능성(Common Observability)**: 메트릭(예: `service_id`, `environment`)과 트레이싱 스팬(span)을 위한 공유 레이블
4. **행동 계약(Behavioral Contracts)**: 재시도(retry), 서킷 브레이킹(circuit breaking), 백프레셔(backpressure)를 처리하는 엄격한 규칙

## 경계

- **추상화 누수 방지(No Leaky Abstractions)**: 기반 라이브러리의 기능을 숨기지 않습니다. Prisma 패키지를 사용하면 여전히 전체 Prisma API를 사용할 수 있지만, fluo의 운영 안전성으로 감싸집니다.
- **마법보다 명시성**: 모듈의 숨겨진 “자동 감지(auto-discovery)”는 없습니다. 모든 것은 `AppModule`에서 명시적으로 가져오고 설정됩니다.
- **운영상의 진실(Operational Truth)**: 상태와 준비성은 **편향 없는 사실**로 취급됩니다. 데이터베이스가 다운되면 패키지는 전체 애플리케이션이 “준비되지 않음(Unready)” 상태가 되더라도 이를 솔직하게 보고해야 합니다.

## 관련 문서

- [Architecture Overview](./architecture-overview.ko.md)
- [Lifecycle and Shutdown](./lifecycle-and-shutdown.ko.md)
- [Config and Environments](./config-and-environments.ko.md)
- [Package Surface](../reference/package-surface.ko.md)
