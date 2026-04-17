# DI와 모듈

<p><a href="./di-and-modules.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>

fluo는 **명시적 토큰 기반 의존성 주입(Dependency Injection, DI) 시스템**과 계층적 **모듈 그래프(Module Graph)**를 통해 애플리케이션 복잡성을 관리합니다. “마법” 같은 리플렉션에 의존하는 프레임워크와 달리, fluo는 모든 공급자(provider)와 소비자(consumer) 사이에 명확한 계약을 요구합니다.

## 이 개념이 중요한 이유

대규모 애플리케이션에서 프레임워크가 생성자 타입(constructor type)을 바탕으로 필요한 것을 “추측”하는 암시적 DI는 유지보수의 어려움을 초래합니다. 이는 다음과 같은 문제를 일으킬 수 있습니다:
- **보이지 않는 결합**: 문제가 발생하기 전까지 의존성 트리가 얼마나 깊은지 파악하기 어렵습니다.
- **어려운 테스트**: 무엇이 주입되는지 100% 확실하지 않으면 모킹(mocking) 작업이 번거로워집니다.
- **런타임의 예상치 못한 오류**: 순환 의존성이나 누락된 공급자는 종종 런타임에서 난해한 `undefined` 오류로 이어집니다.

fluo는 의존성 그래프를 **감사 가능하고 명시적으로** 만들어 이러한 문제를 해결합니다. 어떤 클래스를 보더라도 그것이 무엇을 필요로 하는지, 그 요구사항이 어디에서 오는지, 어떤 범위(scope)에 속하는지 정확히 확인할 수 있습니다.

## 핵심 아이디어

### 토큰 기반 DI
fluo에서 모든 의존성은 **토큰(Token)**으로 식별됩니다. 토큰은 다음이 될 수 있습니다:
- **클래스(Class)**: 가장 일반적인 경우입니다. 클래스 생성자 자체가 고유 식별자 역할을 합니다.
- **심볼(Symbol) 또는 문자열(String)**: 소비자를 바꾸지 않고 구현을 교체하고 싶을 때 사용하는 추상 인터페이스(예: `ILogger`)용입니다.
- **구성 정보 키(Configuration Key)**: 특정 설정 값을 서비스에 직접 주입할 때 사용합니다.

명시적 토큰을 사용함으로써 `emitDecoratorMetadata`가 필요 없어지고, 코드가 최신 JavaScript 빌드 도구와 호환되도록 보장합니다.

### “경계”로서의 모듈
fluo의 **모듈(Module)**은 단순한 정리 도구가 아니라 **보안과 캡슐화의 경계**입니다.
- **기본값은 비공개**: `UserModule`에 정의된 서비스는 `UserModule`이 `exports` 배열에 명시적으로 포함하고, `AuthModule`이 `imports`에 `UserModule`을 포함하지 않는 한 `AuthModule`에서 보이지 않습니다.
- **캡슐화된 구현**: 이를 통해 시스템의 다른 부분에서 실수로 사용되거나 결합될 수 없는 내부 “헬퍼” 서비스를 둘 수 있습니다.

### 생성자 주입 패턴
우리는 **생성자 주입(Constructor Injection)**을 기본 패턴으로 사용합니다. 이는 표준 클래스 기반 프로그래밍과 잘 맞고, 단위 테스트를 매우 단순하게 만듭니다. 모의 객체(mock object)를 생성자에 그대로 전달하면 됩니다.

```ts
@Inject(UsersRepository, 'APP_CONFIG')
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly config: any
  ) {}
}
```

## 공급자 유형

- **클래스 공급자(Class Providers)**: 프레임워크가 인스턴스화하는 표준 서비스입니다.
- **값 공급자(Value Providers)**: 상수, 구성 정보, 외부 라이브러리 인스턴스를 주입합니다.
- **팩토리 공급자(Factory Providers)**: 다른 서비스나 환경 상태를 기반으로 동적으로 생성되는 로직 기반 공급자입니다.
- **별칭 공급자(Alias Providers)**: 하나의 토큰을 다른 토큰에 매핑합니다(예: `ILogger`를 `PinoLogger`에 매핑).

```ts
@Module({
  providers: [
    // 클래스 공급자 (단축 표기)
    UsersService,

    // 값 공급자
    {
      provide: 'APP_CONFIG',
      useValue: { port: 3000, debug: true }
    },

    // 팩토리 공급자
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: async (config: any) => {
        const conn = new Connection(config);
        await conn.connect();
        return conn;
      },
      inject: ['APP_CONFIG']
    },

    // 별칭 공급자
    {
      provide: ILogger,
      useExisting: PinoLogger
    }
  ]
})
export class AppModule {}
```

## 비동기 모듈 (async modules)

모듈이 자신의 서비스를 제공하기 전에 외부 데이터(예: 원격 보관소의 구성 정보)에 의존해야 하는 경우 비동기적으로 설정할 수 있습니다. fluo는 이를 위해 `AsyncModuleOptions` 패턴을 사용합니다.

```ts
export interface RedisModuleOptions {
  host: string;
  port: number;
}

@Module({})
export class RedisModule {
  static registerAsync(options: AsyncModuleOptions<RedisModuleOptions>) {
    return {
      module: RedisModule,
      imports: options.imports || [],
      providers: [
        {
          provide: 'REDIS_CLIENT',
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            return new RedisClient(config);
          },
          inject: options.inject || []
        }
      ],
      exports: ['REDIS_CLIENT']
    };
  }
}
```

## 주입 범위(Injection Scopes)

- **싱글톤(Singleton, 기본값)**: 앱 전체에서 공유되는 하나의 인스턴스입니다. 상태가 없는 서비스나 커넥션 풀에 가장 적합합니다.
- **요청(Request)**: 들어오는 각 HTTP 요청마다 새 인스턴스가 생성됩니다. 현재 사용자 같은 요청별 상태를 저장할 때 유용합니다.
- **트랜지언트(Transient)**: 주입 지점마다 새 인스턴스가 생성됩니다.

## 경계

- **전역 범위 없음**: 명시적으로 표시되지 않은 한 “전역(global)” 공급자는 없습니다. 우리는 가져오기/내보내기(import/export) 체인의 안전성을 선호합니다.
- **모듈 내보내기**: `exports` 배열에 나열된 공급자만 해당 모듈을 가져오는 다른 모듈에서 사용할 수 있습니다.

```ts
@Module({
  providers: [PublicService, PrivateService],
  exports: [PublicService] // PrivateService는 숨겨진 상태로 유지됨
})
export class UserModule {}

@Module({
  imports: [UserModule],
  providers: [AuthService] // PublicService는 주입받을 수 있지만, PrivateService는 불가
})
export class AuthModule {}
```

- **순환 의존성 감지**: fluo의 DI 컨테이너는 부트스트랩 시점에 순환 의존성을 감지하고 명확한 오류를 발생시켜 스택 오버플로를 방지합니다.
- **엄격한 검증**: 필요한 의존성이 모듈 그래프에서 빠져 있으면 애플리케이션은 **시작에 실패**합니다. 운영 중 충돌보다 부트 시점의 실패를 선호합니다.

## 문제 해결 (troubleshooting)

- **CircularDependencyError**: 두 개 이상의 서비스가 서로 의존할 때 발생합니다. `forwardRef()`를 사용해 해결을 늦추거나, 공통 서비스로 로직을 분리하는 리팩토링을 권장합니다.
- **공급자 누락 (Missing Provider)**: 해당 공급자가 현재 모듈의 `providers`에 포함되어 있거나, 가져온 모듈에서 `exports` 되었는지 확인하세요.
- **토큰 불일치 (Token Mismatch)**: 심볼이나 문자열 토큰을 사용하는 경우, `@Inject(TOKEN)` 데코레이터가 `provide: TOKEN` 키와 정확히 일치하는지 확인하세요.
- **내보내기 누락**: 서비스를 `exports` 배열에 추가하는 것을 잊는 것이 의존 모듈에서 "Provider not found" 오류가 발생하는 가장 흔한 원인입니다.

## 관련 문서

- [Architecture Overview](./architecture-overview.ko.md)
- [Decorators and Metadata](./decorators-and-metadata.ko.md)
- [HTTP Runtime](./http-runtime.ko.md)
- [DI Package README](../../packages/di/README.ko.md)
