# TC39 Decorator Contract

<p><a href="./decorators-and-metadata.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>

이 문서는 현재 fluo의 데코레이터 및 메타데이터 계약을 정의합니다. fluo는 TC39 표준 데코레이터를 사용하며, 레거시 TypeScript `experimentalDecorators` 및 `emitDecoratorMetadata` 모델을 기본 런타임 계약으로 지원하지 않습니다.

## Standard vs Legacy

| 계약 영역 | fluo의 표준 데코레이터 | 레거시 데코레이터 |
| --- | --- | --- |
| 언어 모델 | 데코레이터 컨텍스트 객체를 사용하는 TC39 표준 데코레이터 의미론 | TypeScript 레거시 제안 의미론 |
| 컴파일러 플래그 | `experimentalDecorators`와 `emitDecoratorMetadata`는 지원 기준선에 포함되지 않음 | 보통 `experimentalDecorators`와 `emitDecoratorMetadata`로 활성화됨 |
| DI 연결 | 생성자 의존성은 `@Inject(...)` 또는 provider 수준 `inject`로 명시 | 생성자 의존성을 방출된 설계 시점 메타데이터에서 추론하는 경우가 많음 |
| 메타데이터 출처 | 프레임워크 헬퍼와 표준 `context.metadata` 흐름이 메타데이터를 기록함 | 컴파일러가 메타데이터를 방출하고 리플렉션 헬퍼가 이를 읽는 경우가 많음 |
| 리플렉션 의존성 | fluo의 데코레이터 계약에는 `reflect-metadata`가 필요하지 않음 | 프레임워크 동작에 `reflect-metadata`가 필요한 경우가 많음 |
| 라우트 메타데이터 | `@Controller`, `@Get`, `@Post` 등은 프레임워크 소유 controller 및 route 레코드를 기록함 | 라우트 메타데이터가 레거시 데코레이터 실행과 리플렉션 관례에 의해 부착되는 경우가 많음 |
| DTO 및 검증 메타데이터 | DTO 바인딩 및 검증 메타데이터는 fluo 소유 메타데이터 헬퍼로 기록됨 | DTO 메타데이터가 반사 기반 설계 타입 읽기와 섞이는 경우가 많음 |
| 이식성 | 표준 데코레이터 경로에 정렬되며 레거시 플래그 없이 동작함 | 비표준 컴파일러 모드에 의존함 |

## Decorator Model

- `@fluojs/core`의 `@Module(...)`, `@Global()`, `@Inject(...)`, `@Scope(...)`는 표준 클래스 데코레이터입니다.
- `@fluojs/http`의 `@Controller(...)`는 표준 클래스 데코레이터입니다.
- `@Get(...)`, `@Post(...)`, `@Put(...)`, `@Patch(...)`, `@Delete(...)`, `@Options(...)`, `@Head(...)` 및 관련 HTTP 데코레이터는 표준 메서드 데코레이터입니다.
- `@FromBody(...)` 및 관련 HTTP 필드 데코레이터 같은 DTO 바인딩 데코레이터는 표준 필드 데코레이터입니다.
- 데코레이터는 평가 시점에 메타데이터를 기록합니다. fluo는 파일을 스캔하거나 무관한 소스 구조에서 런타임 계약을 추론하지 않습니다.
- `@Inject(...)`는 생성자 토큰을 명시적으로 정의합니다. 토큰 순서는 생성자 매개변수 순서와 대응합니다.
- 토큰이 없는 `@Inject()`는 상속된 생성자 토큰 메타데이터에 대한 명시적 빈 재정의를 기록합니다.
- `@Scope(...)`는 provider 수명 주기 메타데이터를 기록합니다. 지원 값은 `singleton`, `request`, `transient`입니다.
- `@Module(...)`는 `imports`, `providers`, `controllers`, `exports`, `global` 같은 모듈 구성 메타데이터를 기록합니다.
- `@Controller(...)`는 컨트롤러 기본 경로를 기록합니다.
- HTTP 라우트 데코레이터는 장식된 클래스 메서드에 HTTP 메서드와 라우트 경로를 기록합니다.
- HTTP 라우트 경로는 fluo 라우트 계약을 따릅니다. 세그먼트는 리터럴이거나 전체 세그먼트 `:param` 자리표시자여야 합니다. 와일드카드, 정규표현식 유사 문법, `user-:id` 같은 혼합 세그먼트는 라우트 데코레이터 계약 밖입니다.

## Metadata Rules

- fluo가 메타데이터 계약을 소유합니다. 런타임 소비자는 컴파일러가 방출한 설계 메타데이터가 아니라 fluo가 정의한 메타데이터 레코드를 읽습니다.
- 표준 데코레이터 메타데이터는 `Symbol.metadata` 또는 fluo 메타데이터 심벌 폴리필을 통해 TC39 메타데이터 bag에 연결됩니다.
- `@fluojs/core`는 module, class DI, controller, route, injection, DTO binding, validation 레코드용 메타데이터 헬퍼를 노출합니다.
- 메타데이터 헬퍼는 공유 가능한 가변 상태 누수를 막기 위해 읽기와 쓰기 경계에서 가변 payload를 복제합니다.
- controller 및 route 메타데이터는 표준 메타데이터 bag 내부에서 `fluo.standard.controller`, `fluo.standard.route` 같은 fluo 소유 심벌로 키잉됩니다.
- module 및 class DI 메타데이터도 프레임워크 소유 저장소를 통해 함께 유지되므로, 런타임 패키지는 리플렉션 라이브러리에 의존하지 않고 안정적인 계약을 읽을 수 있습니다.
- 메타데이터 등록은 장식된 클래스, 메서드, 필드가 평가될 때만 발생합니다. import되지 않은 선언은 런타임 그래프에 참여하지 않습니다.
- 메타데이터 레코드는 프레임워크 동작을 설명합니다. 장식된 선언의 TypeScript 타입 시그니처를 바꾸지 않습니다.
- DI 해석은 반드시 명시적 inject 토큰을 사용해야 합니다. 생성자 토큰 누락은 모듈 그래프 검증에서 `ModuleInjectionMetadataError`로 실패합니다.
- 모듈 간 토큰 가시성은 반드시 모듈 `imports`, `exports`, 글로벌 모듈 규칙을 따라야 합니다. 메타데이터가 존재한다는 사실만으로 토큰이 가시화되지는 않습니다.

## Migration Rules

| 레거시 패턴 | 필요한 마이그레이션 규칙 |
| --- | --- |
| `tsconfig.json`에서 `experimentalDecorators`를 활성화함 | 지원되는 fluo 설정 기준선에서 `experimentalDecorators`를 제거합니다. |
| `tsconfig.json`에서 `emitDecoratorMetadata`를 활성화함 | 지원되는 fluo 설정 기준선에서 `emitDecoratorMetadata`를 제거합니다. |
| DI가 생성자 타입 추론에 의존함 | 추론된 생성자 연결을 명시적 `@Inject(...)` 토큰 또는 provider `inject` 배열로 교체합니다. |
| 런타임이 `reflect-metadata` 읽기에 의존함 | 반사 기반 읽기를 fluo 메타데이터 헬퍼와 프레임워크 소유 메타데이터 소비자로 교체합니다. |
| 라우트 데코레이터가 와일드카드 또는 혼합 세그먼트 문법을 사용함 | 경로를 리터럴 세그먼트 또는 전체 `:param` 세그먼트를 사용하는 fluo 라우트 계약으로 다시 작성합니다. |
| 하위 클래스가 원치 않는 생성자 토큰 메타데이터를 상속함 | 새 토큰 선언 전에 `@Inject()`를 추가해 명시적 빈 재정의를 기록합니다. |

- fluo로의 마이그레이션은 레거시 데코레이터 플래그를 지원되는 종료 상태가 아니라 호환성 정리 대상으로 취급해야 합니다.
- 새 fluo 패키지와 예제는 `experimentalDecorators` 또는 `emitDecoratorMetadata`를 요구해서는 안 됩니다.
- 마이그레이션 작업은 데코레이터 변경 후 생성자 토큰 범위, 모듈 가시성, 라우트 경로 정규화를 검증해야 합니다.
- 암시적으로 방출된 메타데이터에 의존하는 NestJS 스타일은 fluo 계약의 일부가 아니며, 마이그레이션 중 제거되어야 합니다.
