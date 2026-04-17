# 개발 리로드 아키텍처

<p><a href="./dev-reload-architecture.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>

fluo는 개발 중 변경 사항을 소스 코드에 대한 **전체 프로세스 재시작(Full Process Restarts)**과 설정에 대한 **인프로세스 리로드(In-process Reloads)**라는 두 개의 별도 경로로 엄격하게 분리합니다. 이 구분은 개발 속도를 희생하지 않으면서도 최대한의 신뢰성을 확보하기 위한 의도적인 아키텍처 선택입니다.

## 이 개념이 중요한 이유

현대적인 백엔드 개발은 변경 사항이 즉시 반영되는 “라이브(live)”한 느낌을 요구합니다. 하지만 전통적인 “핫 모듈 교체(Hot Module Replacement, HMR)”나 단순한 “파일 감시 재시작(file-watching restarts)”은 종종 **상태가 없는 로직(Stateless Logic)**과 **상태를 가진 인프라(Stateful Infrastructure)**의 경계를 흐립니다.

부분 리로드 중에 데이터베이스 연결이나 네트워크 소켓이 제대로 정리되지 않으면 애플리케이션은 정의되지 않은 상태에 빠지게 되며, 수동 재시작 후에나 사라지는 “유령 버그(phantom bugs)”가 발생할 수 있습니다. fluo는 코드와 로직, 그리고 로직에는 깨끗한 시작점이 필요하다는 명확한 경계를 강제함으로써 이러한 오류를 제거합니다.

## 핵심 아이디어

### “깨끗한 시작점” 원칙 (코드 변경)
기본 개발 러너(runner, `@fluojs/cli`)는 전체 소스 트리(source tree)를 감시합니다. `.ts` 파일이 변경되면:
1. 러너가 현재 프로세스에 `SIGTERM` 신호를 보냅니다.
2. 애플리케이션이 [우아한 종료 시퀀스(graceful shutdown sequence)](./lifecycle-and-shutdown.ko.md)를 실행하여 데이터베이스 풀을 닫고 진행 중인 요청을 마무리합니다.
3. 러너가 완전히 새로운 프로세스를 시작합니다.

이렇게 하면 최신 TC39 표준 데코레이터(Standard Decorators)를 사용해 의존성 그래프(dependency graph)를 처음부터 다시 구성할 수 있고, 오래된 메모리나 “좀비” 연결이 남지 않습니다. 우리는 위험한 HMR이 주는 미세한 속도 향상보다 **절대적 정확성**을 우선합니다.

### “라이브 튜닝(Live Tune)” 경로 (구성 정보 변경)
`.env` 파일 편집이나 JSON 구성 정보 수정과 같은 업데이트는 다른 경로를 따릅니다. 구성 정보는 **정적 로직(static logic)**이 아니라 **동적 데이터(dynamic data)**로 설계되었기 때문에, fluo는 프로세스를 종료하지 않고도 이러한 변경 사항을 적용할 수 있습니다.

이를 통해 개발자는 다음을 수행할 수 있습니다:
- 기능 플래그(feature flags)를 즉시 전환합니다.
- 현재 디버그 컨텍스트를 유지하면서 로그 레벨(log levels)을 조정합니다.
- API 키나 비밀 정보(secrets)를 갱신하고 즉시 통합 상태를 확인합니다.

## 책임 경계

### 러너 오케스트레이션(Runner Orchestration)
**CLI**(`@fluojs/cli`)는 “감독자(supervisor)” 역할을 합니다. 파일 감시자(watcher)와 프로세스 수명 주기를 소유하며, 코드가 무엇을 하는지는 알지 못하고 그저 변경되었으며 새 환경이 필요하다는 사실만 인지합니다.

### 구성 정보 스냅샷 생성(Config Snapshot Production)
**구성 패키지**(`@fluojs/config`)는 환경을 “관찰”하는 책임을 집니다. 파일 기반 구성 정보와 환경 변수를 병합하여 불변의 **구성 정보 스냅샷(Config Snapshot)**을 생성합니다. 파일이 변경되면 새 스냅샷을 만들고 정의된 스키마에 따라 검증합니다.

### 런타임 애플리케이션(Runtime Application)
**런타임**(`@fluojs/runtime`)은 “소비자(consumer)” 역할을 합니다. 안정적인 참조 역할을 하는 `ConfigService`를 호스팅합니다. 구성 패키지에서 새로 검증된 스냅샷이 도착하면 `ConfigService`가 내부 상태를 갱신하고, 새 데이터에 반응해야 하는 서비스들을 위한 “리로드 훅(reload hooks)”을 트리거합니다(예: 캐시 TTL 업데이트).

## 경계

- **상태 없음(Statelessness) 요구**: 인프로세스 리로드가 안정적으로 동작하려면 `ConfigService`를 사용하는 서비스가 생성자(constructor)에서 구성 값을 로컬 비공개 변수에 “고정(bake)”하지 않아야 합니다. 항상 서비스를 조회하거나 업데이트를 구독해야 합니다.
- **검증 장벽(Validation Barrier)**: 새 구성 정보 스냅샷은 검증에 실패하면 **절대** 적용되지 않습니다. 애플리케이션은 “마지막으로 확인된 정상(last known good)” 구성 정보로 계속 실행되며, CLI는 콘솔에 검증 에러를 보고합니다.
- **개발 전용**: 이 아키텍처는 지원하지만, 일반적으로 운영 환경(production)에서는 새 구성 정보가 새 배포를 의미하는 “불변 인프라(immutable infrastructure)” 패턴을 유지하기 위해 인프로세스 리로딩을 비활성화합니다.

## 관련 문서

- [Architecture Overview](./architecture-overview.ko.md)
- [Config and Environments](./config-and-environments.ko.md)
- [Lifecycle and Shutdown](./lifecycle-and-shutdown.ko.md)
- [CLI README](../../packages/cli/README.ko.md)
