<!-- packages: @fluojs/terminus -->
<!-- project-state: FluoBlog v1.15 -->

# Chapter 18. Health Monitoring with Terminus

## Learning Objectives
- 프로덕션 환경에서 Liveness 및 Readiness 프로브의 중요성을 이해합니다.
- 애플리케이션 상태를 집계하도록 `TerminusModule`을 설정합니다.
- 데이터베이스, Redis, 메모리에 대한 내장 인디케이터를 구현합니다.
- 특정 비즈니스 로직을 위한 커스텀 헬스 인디케이터를 생성합니다.
- 헬스 엔드포인트를 인프라(Kubernetes, Docker)와 통합합니다.

## 18.1 Why Health Checks Matter
캐시까지 도입한 지금의 FluoBlog는 프로덕션에서 더 많은 구성 요소에 의존합니다. 애플리케이션은 혼자 동작하지 않습니다. 데이터베이스와 캐시, 경우에 따라 외부 API에도 기대고 있습니다. 데이터베이스가 다운되면 프로세스는 여전히 "실행 중"일 수 있지만, 서비스는 사실상 고장 난 상태입니다.

그래서 모니터링 도구와 Kubernetes 같은 오케스트레이터는 두 가지를 따로 물어볼 수 있어야 합니다. "살아 있는가?" 그리고 "트래픽을 처리할 준비가 되었는가?"입니다.

- **Liveness**: "내가 건강한가, 아니면 재시작되어야 하는가?"
- **Readiness**: "요청을 받을 준비가 되었는가, 아니면 아직 초기화 중이거나 과부하 상태인가?"

## 18.2 Introducing @fluojs/terminus
`@fluojs/terminus`는 `fluo`에서 그 질문에 답하게 해 주는 툴킷입니다. 여러 헬스 인디케이터를 하나의 JSON 응답으로 모아 주기 때문에, 인프라는 하나의 엔드포인트만 보고도 판단할 수 있습니다.

## 18.3 Basic Setup
기본 설정은 작습니다. 중요한 의존성이 생긴 애플리케이션에 바로 붙이기 좋은 다음 단계입니다.

먼저 패키지를 설치합니다:
`pnpm add @fluojs/terminus`

그런 다음 루트 `AppModule`에 모듈을 등록합니다:

```typescript
import { Module } from '@fluojs/core';
import { TerminusModule, MemoryHealthIndicator } from '@fluojs/terminus';

@Module({
  imports: [
    TerminusModule.forRoot({
      indicators: [
        new MemoryHealthIndicator({ key: 'memory_heap', heapUsedThresholdRatio: 0.9 }),
      ],
    }),
  ],
})
export class AppModule {}
```

이 설정은 보통 `/health`와 `/ready` 같은 헬스 엔드포인트를 노출합니다. 즉, 프로세스가 단순히 시작되었다는 사실보다 더 많은 정보를 외부에 알려 줄 수 있습니다.

## 18.4 Monitoring Dependencies
다음 단계는 FluoBlog가 실제로 일을 할 수 있는지를 좌우하는 의존성을 확인하는 것입니다. 특히 Prisma와 Redis가 핵심입니다.

### Database Health
```typescript
import { PrismaHealthIndicator } from '@fluojs/terminus';

TerminusModule.forRoot({
  indicators: [
    new PrismaHealthIndicator({ key: 'database' }),
  ],
})
```

### Redis Health
Redis는 선택적 피어(optional peer)이므로, 코어 패키지를 가볍게 유지하기 위해 전용 서브패스를 통해 인디케이터가 제공됩니다.

```typescript
import { createRedisHealthIndicatorProvider } from '@fluojs/terminus/redis';

TerminusModule.forRoot({
  indicatorProviders: [
    createRedisHealthIndicatorProvider({ key: 'redis' }),
  ],
})
```

## 18.5 The Health Report
인디케이터를 등록하고 나면 `GET /health`는 사람과 인프라가 모두 빠르게 읽을 수 있는 보고서를 반환합니다:

```json
{
  "status": "ok",
  "contributors": {
    "up": ["database", "redis", "memory_heap"],
    "down": []
  },
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" },
    "memory_heap": { "status": "up", "used": "128MB" }
  },
  "error": {},
  "details": { ... }
}
```

인디케이터 하나라도 실패하면 상태는 `error`가 되고 엔드포인트는 `503 Service Unavailable`을 반환합니다. 그러면 로드 밸런서나 Kubernetes는 이 인스턴스가 회복될 때까지 트래픽을 보내지 않게 됩니다.

## 18.6 Custom Health Indicators
내장 인디케이터는 흔한 의존성을 잘 다루지만, 그것만으로 충분하지 않을 때도 있습니다. 때로는 특정 디렉토리에 쓰기 가능한지, 외부 서비스에 도달 가능한지처럼 애플리케이션 고유의 신호가 더 중요할 수 있습니다.

```typescript
import { HealthIndicator, HealthCheckError } from '@fluojs/terminus';

export class DiskSpaceIndicator extends HealthIndicator {
  async check(key: string) {
    const isWritiable = await checkDiskWritable();
    
    if (!isWritiable) {
      throw new HealthCheckError('Disk is not writable', { key });
    }
    
    return this.getStatus(key, true);
  }
}
```

## 18.7 Readiness vs Liveness
영향도에 따라 인디케이터를 나누면 헬스 모델이 더 실용적이 됩니다. 프로세스는 살아 있어서 재시작이 필요 없을 수 있지만, 요청을 받기에는 아직 준비되지 않았을 수도 있습니다.

```typescript
TerminusModule.forRoot({
  indicators: [
    // Liveness: 기본적인 프로세스 상태
    new MemoryHealthIndicator({ key: 'memory', liveness: true }),
    
    // Readiness: 외부 의존성 상태
    new PrismaHealthIndicator({ key: 'db', readiness: true }),
    createRedisHealthIndicatorProvider({ key: 'redis', readiness: true }),
  ],
})
```

기본적으로 `/health`는 전체를 확인하고, `/ready`는 readiness 인디케이터에 집중합니다. 이 구분 덕분에 플랫폼은 죽은 프로세스와 잠시 준비되지 않은 프로세스를 다르게 처리할 수 있습니다.

## 18.8 Infrastructure Integration
엔드포인트를 만들었다면 마지막 단계는 앱을 실행하는 플랫폼에 그 값을 연결하는 것입니다.

- **Docker Compose**: `healthcheck`를 사용하여 컨테이너를 모니터링합니다.
- **Kubernetes**: 배포 YAML에서 `livenessProbe` 및 `readinessProbe`를 설정합니다.

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
readinessProbe:
  httpGet:
    path: /ready
    port: 3000
```

## 18.9 Summary
Terminus는 애플리케이션 상태를 플랫폼이 이해할 수 있는 신호로 바꿔 주기 때문에 FluoBlog를 훨씬 운영하기 쉽게 만듭니다. 사용자가 사이트가 다운되었다고 알려 주기를 기다리는 대신, 인프라가 더 일찍 장애를 감지하고 자동으로 반응할 수 있습니다.

- 상태 집계를 위해 `TerminusModule`을 사용하세요.
- Prisma와 Redis를 주요 의존성으로 모니터링하세요.
- 메모리 누수를 감지하기 위해 `MemoryHealthIndicator`를 사용하세요.
- CI/CD 및 오케스트레이션에서 `/ready` 및 `/health` 엔드포인트를 활용하세요.

다음 장에서는 이 헬스 신호를 바탕으로, FluoBlog가 살아 있는지만이 아니라 얼마나 잘 동작하는지도 보여 주는 메트릭을 수집해 보겠습니다.
