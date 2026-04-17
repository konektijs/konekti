# 데코레이터와 메타데이터

<p><a href="./decorators-and-metadata.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>

fluo는 **TC39 Standard Decorators**를 기반으로 처음부터 구축되었습니다. 우리는 레거시 `experimentalDecorators` 및 `emitDecoratorMetadata` 모델을 완전히 버리고, 깔끔하고 성능이 높으며 표준에 부합하는 metadata system을 채택했습니다.

## 이 개념이 중요한 이유

오랫동안 TypeScript 생태계는 표준이 되지 못한 “proposal” 버전의 decorators에 의존해 왔습니다. 이 레거시 시스템은 compiler가 타입을 “추측”하고 이를 숨겨진 metadata(`reflect-metadata`)로 내보내야 했기 때문에 다음과 같은 문제가 있었습니다:
- **숨겨진 성능 비용**: 사용하지 않더라도 모든 class에 대해 많은 metadata가 생성됩니다.
- **취약한 타입 추측**: 순환 의존성은 종종 “metadata emit”을 깨뜨려, 런타임의 `undefined` 오류로 이어졌습니다.
- **종속성 고착**: 코드가 특정 TypeScript compiler flag에 의존하게 되어, 복잡한 plugin 없이는 `esbuild`, `swc`, native engine 등에서 실행하기 어려워졌습니다.

fluo가 **Standard Decorators**로 전환한 것은 백엔드를 이식 가능하고 명시적으로 만들며, JavaScript의 미래에 대비시키기 위함입니다.

## 핵심 아이디어

### 표준 데코레이터 (TC39)
fluo의 모든 decorator—`@Module`, `@Controller`, `@Inject`—는 표준 JavaScript decorator입니다. 잘 정의된 context를 받고, 자신이 장식하는 요소의 수정된 버전을 반환하는 함수입니다.
- **Reflect Metadata 없음**: `reflect-metadata`를 사용하지 않습니다. 메타데이터는 구조화된 프레임워크 소유 레지스트리(registry)에 저장됩니다.
- **네이티브 속도**: 무거운 리플렉션 라이브러리에 의존하지 않기 때문에 애플리케이션 시작과 의존성 해결(dependency resolution)이 훨씬 빠릅니다.

### 명시적 방식이 암시적 방식보다 우선
레거시 프레임워크는 생성자 타입(constructor type)을 보고 의존성을 “추측”하는 경우가 많았습니다. fluo는 **명시성**을 중시합니다.
- `@Inject(UsersService)`를 사용해 의존성을 명확히 선언합니다.
- 이 방식은 코드를 검색 가능하고 감사 가능하게 만들며, 디버깅이 어려운 DI 문제를 일으키는 “마법”을 제거합니다.

### 프레임워크 소유 레지스트리
fluo의 데코레이터는 중앙 **프레임워크 레지스트리(Framework Registry)**를 채우는 “선언” 역할을 합니다. 이 레지스트리는 다음의 단일 진실 공급원입니다:
1. **의존성 그래프(Dependency Graph)**: 어떤 클래스가 어떤 토큰에 의존하는지
2. **라우팅 테이블(Routing Table)**: 어떤 메서드가 어떤 HTTP 경로를 처리하는지
3. **검증 스키마(Validation Schema)**: 들어오는 JSON을 어떻게 파싱하고 검사해야 하는지

HTTP 라우팅에서 이 레지스트리는 의도적으로 단순한 경로 계약을 사용합니다. 각 경로 세그먼트(route segment)는 문자열 리터럴이거나 전체 세그먼트 `:param` 자리표시자(placeholder)여야 합니다. `user-:id`와 같이 섞인 세그먼트나 와일드카드, 정규표현식 유사 문법은 런타임마다 해석이 달라지지 않도록 라우트 데코레이터에서 의도적으로 제외합니다. 와일드카드가 필요한 경우에는 `forRoutes('/prefix/*')`와 같은 미들웨어 라우트 필터를 사용해야 하며, 이는 컨트롤러 라우트 문법과 별개의 기능입니다.

## 데코레이터 계열

- **구조적 (`@Module`)**: 기능의 경계와 내보낸 공급자(exported provider)를 정의합니다.
- **구성 요소 (`@Controller`)**: 클래스가 프레임워크 수명 주기(lifecycle)의 참여자임을 표시합니다.
- **의존성 (`@Inject`, `@Scope`, `@Global`)**: 클래스와 그 의존성 사이의 계약을 명시적으로 선언합니다.
- **행동적 (`@Get`, `@Post`, `@UseGuards`, `@RequestDto`)**: 특정 메서드나 클래스에 런타임 로직을 연결합니다.

### 구조적 데코레이터

`@Module()` 데코레이터는 fluo 조직화의 기본 단위입니다. 모듈의 경계와 다른 모듈과의 관계를 정의합니다.

```ts
import { Module } from '@fluojs/core';
import { HelloController } from './hello.controller';
import { HelloService } from './hello.service';

@Module({
  imports: [],
  controllers: [HelloController],
  providers: [HelloService],
  exports: [HelloService],
})
export class HelloModule {}
```

- **imports**: 이 모듈에서 필요로 하는 공급자를 내보내는 모듈 목록입니다.
- **controllers**: 이 모듈에서 정의되고 인스턴스화되어야 하는 컨트롤러입니다.
- **providers**: fluo 인젝터에 의해 인스턴스화되고, 최소한 이 모듈 전체에서 공유될 수 있는 공급자입니다.
- **exports**: 이 모듈에서 제공하며, 이 모듈을 가져오는 다른 모듈에서도 사용할 수 있게 할 공급자의 하위 집합입니다.

사용자가 등록 시점에 모듈을 구성할 수 있도록 `forRoot` 또는 `forRootAsync` 패턴을 사용하는 **동적 모듈(Dynamic Modules)**을 생성할 수도 있습니다.

### 구성 요소 데코레이터

구성 요소 데코레이터는 클래스를 애플리케이션의 특정 참여자 유형으로 표시합니다.

```ts
import { Controller, Get, Post } from '@fluojs/http';

@Controller('/users')
export class UsersController {
  @Get('/')
  findAll() {
    return [];
  }

  @Post('/')
  create() {
    return { id: '1' };
  }
}
```

- **@Controller**: 클래스를 HTTP 컨트롤러로 마킹합니다. `@Controller`는 `@fluojs/core`가 아니라 HTTP 런타임에 특화된 `@fluojs/http`에서 가져온다는 점에 유의하세요.
- **basePath**: `@Controller('/users')`에 전달된 매개변수는 클래스 내에 정의된 모든 경로의 접두사(prefix) 역할을 합니다.

### 의존성 데코레이터

이 데코레이터들은 의존성 주입(DI) 컨테이너에 인스턴스를 연결하고 관리하는 방법에 대한 명시적인 지침을 제공합니다.

```ts
import { Inject, Scope, Global } from '@fluojs/core';

@Global()
@Inject(UsersRepository, ConfigService)
@Scope('request')
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly config: ConfigService,
  ) {}
}
```

- **@Inject**: fluo는 `reflect-metadata`를 사용하지 않으므로 생성자 의존성을 명시적으로 선언해야 합니다. `@Inject`는 생성자 매개변수와 동일한 순서로 토큰을 받습니다.
- **@Scope**: 공급자의 수명 주기를 정의합니다. 지원되는 값은 `'singleton'` (기본값), `'request'` (요청당 인스턴스), `'transient'` (해결 시마다 새 인스턴스)입니다.
- **@Global**: 모듈에 적용하면, 모든 기능 모듈에서 일일이 가져올 필요 없이 애플리케이션 전체에서 해당 모듈의 내보낸 공급자를 사용할 수 있게 됩니다.

### 행동적 데코레이터

행동적 데코레이터는 라우팅, 유효성 검사, 보안과 같은 런타임 로직을 특정 클래스 메서드에 연결합니다.

```ts
import { Controller, Get, Post, RequestDto, UseGuards } from '@fluojs/http';
import { UseAuth, RequireScopes } from '@fluojs/passport';

@Controller('/auth')
export class AuthController {
  @Post('/token')
  @RequestDto(LoginDto)
  issueToken(dto: LoginDto) {
    return { token: '...' };
  }

  @Get('/profile')
  @UseAuth('jwt')
  @RequireScopes('profile:read')
  getProfile(_input: undefined, ctx: RequestContext) {
    return ctx.principal;
  }
}
```

- **경로 데코레이터**: `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`, `@Options`, `@Head`, `@All`은 HTTP 엔드포인트를 정의합니다.
- **@RequestDto**: 자동 바인딩 및 유효성 검사를 위해 DTO(Data Transfer Object) 클래스를 경로와 연결합니다.
- **Guards**: `@UseGuards` (`@fluojs/http`) 및 `@UseAuth`, `@RequireScopes` (`@fluojs/passport`)와 같은 도메인 특화 데코레이터들이 권한 부여 및 보안을 관리합니다.

## 레거시 데코레이터와 비교

| 항목 | 레거시 (experimentalDecorators) | fluo (TC39 표준) |
| :--- | :--- | :--- |
| **DI 연결** | `reflect-metadata`를 통한 암시적 방식 | `@Inject()`를 통한 명시적 방식 |
| **컴파일러 플래그** | `experimentalDecorators` + `emitDecoratorMetadata` | 필요 없음 |
| **번들러 호환성** | 복잡한 플러그인 필요 | 네이티브 지원 |

## 경계

- **Magic Discovery 없음**: fluo는 파일 시스템을 “스캔”하지 않습니다. metadata는 class가 import되고 decorator가 실행될 때만 등록됩니다.
- **Runtime에서 불변**: 애플리케이션이 bootstrap된 후에는 framework registry가 일반적으로 잠깁니다. 실행 중인 class에 decorator를 동적으로 추가할 수는 없습니다.
- **Type Safety 우선**: decorator가 metadata를 추가하더라도 class의 type signature는 바꾸지 않습니다. IDE와 compiler는 여전히 원래의 깔끔한 TypeScript class를 봅니다.

## 관련 문서

- [Architecture Overview](./architecture-overview.ko.md)
- [DI and Modules](./di-and-modules.ko.md)
- [HTTP Runtime](./http-runtime.ko.md)
- [Core README](../../packages/core/README.ko.md)
