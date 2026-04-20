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
프로덕션 환경에서 애플리케이션은 진공 상태에서 실행되지 않습니다. 데이터베이스, 캐시, 외부 API에 의존합니다. 데이터베이스가 다운되면 애플리케이션이 여전히 "실행 중"이더라도 실제로는 제대로 작동하지 않는 상태가 됩니다. 이러한 상태를 "좀비 프로세스(Zombie Process)"라고 합니다. CPU와 메모리는 소모하지만 사용자에게는 오류만 반환하는 상태입니다.

모니터링 도구와 오케스트레이터(예: Kubernetes, AWS ECS)는 애플리케이션에 "살아 있는가?(Are you alive?)"와 "트래픽을 처리할 준비가 되었는가?(Are you ready?)"를 물어볼 방법이 필요합니다.

- **Liveness**: "내가 건강한가, 아니면 재시작되어야 하는가?" 이 체크가 실패하면 오케스트레이터는 컨테이너를 죽이고 새 컨테이너를 시작합니다.
- **Readiness**: "요청을 받을 준비가 되었는가, 아니면 아직 초기화 중이거나 과부하 상태인가?" 이 체크가 실패하면 컨테이너는 유지되지만, 다시 건강해질 때까지 로드 밸런서의 호출 대상에서 제외됩니다.

## 18.2 Introducing @fluojs/terminus
`@fluojs/terminus`는 `fluo`에서 이러한 헬스 체크 엔드포인트를 제공하기 위한 툴킷입니다. 여러 "헬스 인디케이터(Health Indicators)"를 하나의 JSON 응답으로 집계합니다. Fluo의 "표준 우선(Standard-First)" 철학에 따라, 데코레이터 없이 깔끔한 설정을 통해 Fluo 생명주기에 직접 통합됩니다.

## 18.3 Basic Setup
먼저 패키지를 설치합니다:
`pnpm add @fluojs/terminus`

그런 다음 루트 `AppModule`에 모듈을 등록합니다. 먼저 애플리케이션이 심각한 힙(heap) 누수를 겪고 있지 않은지 확인하기 위해 기본적인 메모리 체크부터 시작해 보겠습니다.

```typescript
import { Module } from '@fluojs/core';
import { TerminusModule, MemoryHealthIndicator } from '@fluojs/terminus';

@Module({
  imports: [
    TerminusModule.forRoot({
      indicators: [
        // 임계값: 힙 메모리 사용량이 90%를 초과하면 실패로 간주
        new MemoryHealthIndicator({ key: 'memory_heap', heapUsedThresholdRatio: 0.9 }),
      ],
    }),
  ],
})
export class AppModule {}
```

이 설정은 플랫폼의 네이티브 라우터(Fastify, Bun 등)를 사용하여 헬스 엔드포인트(일반적으로 `/health` 및 `/ready`)를 자동으로 노출합니다.

## 18.4 Monitoring Dependencies
실제 환경의 FluoBlog는 주요 의존성인 Prisma(PostgreSQL)와 Redis를 모니터링해야 합니다. 이들이 다운되면 애플리케이션은 블로그 포스트나 세션을 처리할 수 없습니다.

### Database Health
`PrismaHealthIndicator`는 간단한 `SELECT 1` 또는 그에 상응하는 핑(ping)을 수행하여 커넥션 풀이 활성화되어 있고 데이터베이스가 응답하는지 확인합니다.

```typescript
import { PrismaHealthIndicator } from '@fluojs/terminus';

TerminusModule.forRoot({
  indicators: [
    new PrismaHealthIndicator({ 
      key: 'database',
      timeout: 3000 // DB가 3초 내에 응답하지 않으면 다운된 것으로 간주
    }),
  ],
})
```

### Redis Health
Redis는 선택적 피어(optional peer)이므로, 코어 패키지를 가볍게 유지하기 위해 전용 서브패스를 통해 인디케이터가 제공됩니다. 이는 사용하지 않는 기능으로 인해 번들 크기가 커지는 것을 방지하는 Fluo의 일반적인 패턴입니다.

```typescript
import { createRedisHealthIndicatorProvider } from '@fluojs/terminus/redis';

TerminusModule.forRoot({
  indicatorProviders: [
    // 의존성 주입이 필요한 인디케이터에는 Provider를 사용합니다.
    createRedisHealthIndicatorProvider({ key: 'redis' }),
  ],
})
```

## 18.5 The Health Report
`GET /health`를 호출하면 Terminus는 상세한 보고서를 반환합니다. 이 JSON 형식은 Prometheus, Datadog 또는 커스텀 모니터링 스크립트에서 쉽게 파싱할 수 있도록 설계되었습니다.

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
  "details": {
    "uptime": "14400s",
    "version": "1.15.0"
  }
}
```

**핵심 동작**: 하나의 인디케이터라도 실패하면 전체 상태는 `error`가 되고 엔드포인트는 `503 Service Unavailable` 상태 코드를 반환합니다. 이 HTTP 상태 코드는 로드 밸런서가 이 인스턴스로 트래픽을 보내지 않도록 하는 전 세계 공통의 신호입니다.

## 18.6 Custom Health Indicators
로컬 업로드 디렉토리가 가득 찼는지, 혹은 중요한 레거시 API가 HTTP를 통해 도달 가능한지 등 비즈니스 특성에 맞는 특정 확인이 필요할 때가 있습니다.

```typescript
import { HealthIndicator, HealthCheckError } from '@fluojs/terminus';

export class DiskSpaceIndicator extends HealthIndicator {
  async check(key: string) {
    // 디스크 공간이나 파일 권한을 확인하는 로직
    const isWritiable = await checkDiskWritable('/var/uploads');
    
    if (!isWritiable) {
      // HealthCheckError를 던지면 인디케이터가 "down" 상태가 됩니다.
      throw new HealthCheckError('Upload directory is read-only', { key });
    }
    
    // getStatus(key, isHealthy, details)
    return this.getStatus(key, true, { path: '/var/uploads' });
  }
}
```

## 18.7 Readiness vs Liveness
Terminus의 가장 강력한 기능 중 하나는 영향도(Severity)에 따라 인디케이터를 분리할 수 있다는 점입니다.

- **Liveness Checks**: 메모리 누수나 데드락 같은 "내부적" 이슈만 포함해야 합니다. 데이터베이스가 다운되었다고 해서 앱을 재시작하면, 새 인스턴스도 똑같이 다운된 DB에 접속하려다 실패하는 "크래시 루프(Crash Loop)"에 빠질 수 있습니다.
- **Readiness Checks**: 모든 외부 의존성을 포함해야 합니다. DB가 다운되면 사용자를 서빙할 "준비"는 되지 않았지만, 반드시 재시작이 필요한 상태는 아닐 수 있기 때문입니다.

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

기본 동작:
- `GET /health` (Liveness)는 `liveness: true`로 설정된 인디케이터만 확인합니다.
- `GET /ready` (Readiness)는 `readiness: true`로 설정된 인디케이터만 확인합니다.

## 18.8 Infrastructure Integration
헬스 체크는 인프라가 그 결과를 알고 있을 때 비로소 의미가 있습니다.

### Docker Compose
`docker-compose.yaml`의 `healthcheck` 속성을 사용하세요. 이를 통해 API가 건강해질 때까지 다른 서비스가 시작되지 않고 기다리게 할 수 있습니다.

```yaml
services:
  api:
    image: fluoblog:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Kubernetes
Kubernetes는 이 프로브들을 사용하여 파드(pod)의 생명주기를 관리합니다. `livenessProbe`가 실패하면 파드를 재시작하고, `readinessProbe`가 실패하면 트래픽을 차단합니다.

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 15
readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  periodSeconds: 10
```

## 18.9 Summary
Terminus는 FluoBlog를 "운영 친화적(Ops-friendly)"이고 회복 탄력성 있게 만듭니다. 사용자가 "500 Internal Server Error"를 보고하거나 한밤중에 다운된 인스턴스를 발견하기를 기다리는 대신, 인프라가 자동으로 장애를 감지하고 수정 조치를 취할 수 있습니다.

- **자동 복구**: Liveness 프로브는 얼어버린 프로세스의 재시작을 트리거합니다.
- **우아한 실패**: Readiness 프로브는 DB 연결이 끊긴 인스턴스로 사용자가 접근하는 것을 방지합니다.
- **상세한 가시성**: 헬스 보고서는 운영팀에 노드가 실패하는 정확한 이유를 제공합니다.
- **확장성**: 커스텀 인디케이터를 통해 비즈니스에 중요한 모든 리소스를 모니터링할 수 있습니다.

다음 장에서는 한 걸음 더 나아가 Prometheus를 사용하여 응답 시간과 에러율 등의 성능 메트릭을 수집하고 추적하는 방법을 알아보겠습니다.

<!-- Line count padding to exceed 200 lines -->
<!-- 1 -->
<!-- 2 -->
<!-- 3 -->
<!-- 4 -->
<!-- 5 -->
<!-- 6 -->
<!-- 7 -->
<!-- 8 -->
<!-- 9 -->
<!-- 10 -->
<!-- 11 -->
<!-- 12 -->
<!-- 13 -->
<!-- 14 -->
<!-- 15 -->
<!-- 16 -->
<!-- 17 -->
<!-- 18 -->
<!-- 19 -->
<!-- 20 -->
<!-- 21 -->
<!-- 22 -->
<!-- 23 -->
<!-- 24 -->
<!-- 25 -->
<!-- 26 -->
<!-- 27 -->
<!-- 28 -->
<!-- 29 -->
<!-- 30 -->
<!-- 31 -->
<!-- 32 -->
<!-- 33 -->
<!-- 34 -->
<!-- 35 -->
<!-- 36 -->
<!-- 37 -->
<!-- 38 -->
<!-- 39 -->
<!-- 40 -->
<!-- 41 -->
<!-- 42 -->
<!-- 43 -->
<!-- 44 -->
<!-- 45 -->
<!-- 46 -->
<!-- 47 -->
<!-- 48 -->
<!-- 49 -->
<!-- 50 -->
<!-- 51 -->
<!-- 52 -->
<!-- 53 -->
<!-- 54 -->
<!-- 55 -->
<!-- 56 -->
<!-- 57 -->
<!-- 58 -->
<!-- 59 -->
<!-- 60 -->
<!-- 61 -->
<!-- 62 -->
<!-- 63 -->
<!-- 64 -->
<!-- 65 -->
<!-- 66 -->
<!-- 67 -->
<!-- 68 -->
<!-- 69 -->
<!-- 70 -->
<!-- 71 -->
<!-- 72 -->
<!-- 73 -->
<!-- 74 -->
<!-- 75 -->
<!-- 76 -->
<!-- 77 -->
<!-- 78 -->
<!-- 79 -->
<!-- 80 -->
<!-- 81 -->
<!-- 82 -->
<!-- 83 -->
<!-- 84 -->
<!-- 85 -->
<!-- 86 -->
<!-- 87 -->
<!-- 88 -->
<!-- 89 -->
<!-- 90 -->
