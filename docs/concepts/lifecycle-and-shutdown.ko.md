# 라이프사이클 및 종료

<p><a href="./lifecycle-and-shutdown.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>

fluo는 서비스가 시작되고, 상태(health)를 알리고, 우아하게 종료(graceful exit)되는 방식을 규정하는 엄격하고 결정론적인 **애플리케이션 수명 주기(Application Lifecycle)**를 제공합니다. 이 수명 주기는 애플리케이션이 결코 “반쯤 살아있는(half-alive)” 상태에 머물지 않도록 보장합니다.

## 이 개념이 중요한 이유

현대의 클라우드 네이티브(cloud-native) 환경(Kubernetes, AWS 등)에서는 애플리케이션이 시작되고 멈추는 방식이 요청 처리만큼 중요합니다.
- **시작 시점의 경쟁(Startup Race)**: 데이터베이스 연결이 준비되기 전에 앱이 트래픽을 받기 시작하면 500 에러가 급증합니다.
- **“비정상” 종료(Dirty Shutdown)**: 데이터베이스에 데이터를 쓰는 중인 프로세스를 강제로 종료하면 데이터 손상(data corruption) 위험이 생깁니다.
- **좀비 리소스(Zombie Resources)**: Redis 클라이언트나 메시지 브로커 연결을 닫지 않으면 시간이 지남에 따라 리소스 고갈(resource exhaustion)이 발생할 수 있습니다.

fluo는 **구조화된 수명 주기 계약(Structured Lifecycle Contract)**을 제공함으로써 이러한 위험을 제거합니다. 애플리케이션의 모든 모듈과 공급자가 이 계약에 참여할 수 있으며, 의존성이 올바른 순서로 초기화되고 해제되도록 보장합니다.

## 핵심 아이디어

### 원자적 부트스트랩(Atomic Bootstrap)
부트스트랩은 “성공 아니면 실패(all-or-nothing)” 작업입니다.
1. **구성 정보 검증(Config Validation)**: `.env` 파일이 잘못되었으면 중단합니다.
2. **모듈 컴파일(Module Compilation)**: 의존성 주입(DI) 그래프가 깨졌으면 중단합니다.
3. **공급자 초기화(Provider Initialization)**: `onModuleInit` 도중 데이터베이스 연결이 실패하면 중단합니다.

fluo는 프로세스가 **완전히 기능할 때만** 실행 상태를 유지하도록 보장합니다.

### 준비성(Readiness) vs. 활성(Liveness)
fluo는 “살아 있음(Liveness, 프로세스 실행 중)”과 “준비됨(Readiness, 트래픽 처리 가능)”을 구분합니다.
- **활성(Liveness)**: 런타임 엔진이 관리합니다.
- **준비성(Readiness)**: 모든 모듈에서 `onApplicationBootstrap`이 성공적으로 완료된 후에만 신호가 켜집니다. 이는 로드 밸런서(load balancer)가 인스턴스로 트래픽 라우팅을 시작할 수 있다는 신호입니다.

### 우아한 종료 시퀀스(Graceful Shutdown Sequence)
`SIGTERM` 또는 `SIGINT` 신호를 받으면 fluo는 조정된 종료 절차를 시작합니다:
1. **유입 중단(Stop Ingestion)**: HTTP 서버가 즉시 새 연결 수락을 중단합니다.
2. **요청 드레이닝(Request Draining)**: 진행 중인 요청에 설정 가능한 유예 시간을 주어 완료하게 합니다.
3. **역순 해제(Reverse-Order Teardown)**: 종료 훅(`onModuleDestroy`, `beforeApplicationShutdown`)은 초기화의 **정확한 역순**으로 실행됩니다. 모듈 A가 모듈 B에 의존한다면, A의 정리 중에도 B의 리소스가 여전히 사용 가능하도록 모듈 A를 *먼저* 해제합니다.

## 수명 주기 훅(Lifecycle Hooks)

- **`onModuleInit`**: 모듈의 공급자가 인스턴스화되자마자 실행되어야 하는 로직입니다(예: 소켓 연결 수립).
  ```ts
  import { OnModuleInit } from '@fluojs/runtime';

  export class ConnectionProvider implements OnModuleInit {
    async onModuleInit(): Promise<void> {
      await this.connect();
    }
  }
  ```
- **`onApplicationBootstrap`**: *전체* 애플리케이션 그래프가 준비된 후 실행되는 로직입니다(예: 백그라운드 크론 작업 시작).
  ```ts
  import { OnApplicationBootstrap } from '@fluojs/runtime';

  export class JobRunner implements OnApplicationBootstrap {
    onApplicationBootstrap(): void {
      this.startPolling();
    }
  }
  ```
- **`onModuleDestroy`**: 특정 모듈을 정리하는 로직입니다.
  ```ts
  import { OnModuleDestroy } from '@fluojs/runtime';

  export class CacheProvider implements OnModuleDestroy {
    async onModuleDestroy(): Promise<void> {
      await this.flush();
    }
  }
  ```
- **`onApplicationShutdown`**: 프로세스가 종료되기 전에 정리를 수행할 수 있는 마지막 기회입니다. 종료를 유발한 신호를 인자로 받습니다.
  ```ts
  import { OnApplicationShutdown } from '@fluojs/runtime';

  export class LoggerService implements OnApplicationShutdown {
    onApplicationShutdown(signal?: string): void {
      console.log(`received ${signal}, closing logs`);
    }
  }
  ```

## 수명 주기 훅 구현하기(implementing lifecycle hooks)

하나의 공급자에서 여러 훅을 구현하여 리소스의 전체 수명 주기를 관리할 수 있습니다.

```ts
import { 
  OnModuleInit, 
  OnApplicationBootstrap, 
  OnModuleDestroy, 
  OnApplicationShutdown 
} from '@fluojs/runtime';

export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private client: any;

  async onModuleInit(): Promise<void> {
    // 모듈이 준비되는 즉시 연결
    this.client = await createClient();
  }

  async onModuleDestroy(): Promise<void> {
    // 모듈이 사라지기 전에 연결 종료 보장
    await this.client.close();
  }
}
```

## 종료 구성(shutdown configuration)

애플리케이션 구성을 통해 종료 동작을 세밀하게 조정할 수 있습니다.

```ts
const app = await FluoFactory.create(AppModule);

app.enableShutdownHooks({
  // 강제 종료 전까지 훅이 완료되기를 기다리는 시간
  shutdownTimeoutMs: 5000, 
});

await app.listen(3000);
```

## 문제 해결(troubleshooting)

### 훅이 실행되지 않음
수명 주기 훅은 해당 클래스가 모듈의 공급자(provider)로 등록된 경우에만 실행됩니다. `new`를 통해 직접 인스턴스를 생성하면 fluo가 수명 주기를 관리할 수 없습니다.

### 잘못된 정리 순서
한 서비스가 다른 서비스에 의존하는 경우(서비스 A가 서비스 B를 사용), 의존성이 올바르게 주입되었는지 확인하세요. fluo는 이 그래프를 사용하여 서비스 B가 살아있는 동안 서비스 A가 정리되도록 보장합니다.

### 종료 지연(Hanging Shutdown)
종료가 너무 오래 걸린다면 대개 기다리지 않은(unawaited) 프로미스나 종료를 거부하는 연결 때문입니다. `shutdownTimeoutMs`를 사용하여 어떤 훅이 지연을 일으키는지 확인하세요.

## 경계

- **의존성 인식(Dependency-Aware)**: 정리 순서에 대해 걱정할 필요가 없습니다. fluo는 `@Inject()` 메타데이터를 기반으로 올바른 순서를 계산합니다.
- **타임아웃 보호(Timeout Protection)**: 종료 훅이 너무 오래 걸리면(예: 응답 없는 데이터베이스 쿼리), fluo는 결국 강제 종료하여 “좀비” 프로세스가 배포를 막지 않도록 합니다.
- **멱등성(Idempotency)**: 수명 주기 훅은 애플리케이션 인스턴스당 정확히 한 번 실행되도록 보장됩니다.

## 관련 문서

- [Architecture Overview](./architecture-overview.ko.md)
- [Dev Reload Architecture](./dev-reload-architecture.ko.md)
- [Config and Environments](./config-and-environments.ko.md)
- [Runtime Package README](../../packages/runtime/README.ko.md)
