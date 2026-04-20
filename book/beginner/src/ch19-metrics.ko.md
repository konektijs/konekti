<!-- packages: @fluojs/metrics -->
<!-- project-state: FluoBlog v1.16 -->

# Chapter 19. Metrics and Monitoring

## Learning Objectives
- 관측성(Observability) 스택에서 Prometheus와 Grafana의 역할을 이해합니다.
- `/metrics` 엔드포인트를 노출하도록 `MetricsModule`을 설정합니다.
- HTTP 요청 횟수와 지연 시간을 자동으로 모니터링합니다.
- 비즈니스 로직을 위한 커스텀 메트릭(Counter, Gauge, Histogram)을 생성합니다.
- 메트릭을 애플리케이션 상태 및 플랫폼 텔레메트리와 일치시킵니다.

## 19.1 Beyond Status: Measuring Performance
18장의 헬스 체크가 FluoBlog가 살아 있고 준비되었는지를 알려줬다면, 메트릭은 실제로 트래픽이 흐를 때 애플리케이션이 얼마나 잘 동작하는지를 보여 줍니다.

- FluoBlog가 초당 몇 개의 요청을 처리하고 있는가?
- 게시물 생성의 95퍼센타일(p95) 지연 시간은 얼마인가?
- 지난 한 시간 동안 얼마나 많은 신규 사용자가 등록했는가?

이 수치 데이터가 있어야 대시보드를 만들고, 알림을 설정하고, 추측이 아니라 근거를 바탕으로 용량 계획을 세울 수 있습니다.

## 19.2 Introducing @fluojs/metrics
`@fluojs/metrics` 패키지는 Prometheus를 `fluo`에 연결합니다. Prometheus는 일정한 간격으로 애플리케이션에서 메트릭을 스크랩하는 표준 모니터링 시스템이기 때문에, 헬스 엔드포인트를 만든 다음 단계로 자연스럽게 이어집니다.

## 19.3 Basic Setup
기본 설정은 의도적으로 작습니다. 커스텀 대시보드를 만들기 전에 먼저 유용한 텔레메트리를 노출할 수 있게 해 줍니다.

패키지를 설치합니다:
`pnpm add @fluojs/metrics`

모듈을 등록합니다:

```typescript
import { Module } from '@fluojs/core';
import { MetricsModule } from '@fluojs/metrics';

@Module({
  imports: [
    MetricsModule.forRoot(),
  ],
})
export class AppModule {}
```

기본적으로 이는 `GET /metrics` 엔드포인트를 노출합니다. 여기에 접속하면 Prometheus가 스크랩할 수 있는 텍스트 형식의 데이터를 볼 수 있습니다.

## 19.4 Automatic HTTP Instrumentation
비즈니스 전용 지표를 추가하기 전에도, `fluo`는 애플리케이션을 지나는 HTTP 요청을 자동으로 측정합니다.

- `http_request_duration_seconds`: 요청 지연 시간의 히스토그램.
- `http_requests_total`: 전체 요청 횟수의 카운터.

### Path Normalization
"라벨 카디널리티 폭발(Label Cardinality Explosion, 모든 고유한 URL 경로가 새로운 메트릭 시리즈를 생성하는 현상)"을 방지하기 위해, `fluo`는 기본적으로 템플릿을 사용하여 경로를 정규화합니다.

```typescript
MetricsModule.forRoot({
  http: {
    pathLabelMode: 'template', // /posts/123 -> /posts/:id
  },
})
```

## 19.5 Custom Metrics
자동 HTTP 메트릭은 플랫폼 동작을 보여 주지만, 제품에서 중요한 모든 것을 설명해 주지는 않습니다. 그런 값은 `MetricsService`를 사용해 비즈니스 전용 이벤트로 직접 추적할 수 있습니다.

### Counter: Measuring Events
값이 증가하기만 하는 지표(예: 총 게시물 생성 수)에는 `Counter`를 사용하세요.

```typescript
import { Inject } from '@fluojs/core';
import { MetricsService } from '@fluojs/metrics';

export class PostService {
  constructor(@Inject(MetricsService) private readonly metrics: MetricsService) {}

  async create(data: any) {
    const post = await this.prisma.post.create({ data });
    
    this.metrics.getCounter('blog_posts_created_total').inc();
    
    return post;
  }
}
```

### Gauge: Measuring Current State
올라가거나 내려갈 수 있는 값(예: 활성 웹소켓 연결 수)에는 `Gauge`를 사용하세요.

```typescript
this.metrics.getGauge('active_sessions').set(currentSessions);
```

### Histogram: Measuring Distributions
퍼센타일을 계산해야 하는 기간이나 크기(예: 이미지 업로드 크기)에는 `Histogram`을 사용하세요.

```typescript
this.metrics.getHistogram('image_upload_bytes').observe(file.size);
```

## 19.6 Securing the Metrics Endpoint
메트릭이 유용해질수록 민감한 정보가 되기도 합니다. 프로덕션에서는 내부 지연 시간이나 트래픽, 컴포넌트 상태를 공개하고 싶지 않으므로 미들웨어로 엔드포인트를 보호하는 편이 좋습니다.

```typescript
MetricsModule.forRoot({
  endpointMiddleware: [
    (context, next) => {
      const token = context.request.headers['x-metrics-token'];
      if (token !== process.env.METRICS_TOKEN) {
        throw new ForbiddenException();
      }
      return next();
    }
  ],
})
```

## 19.7 Platform Telemetry
메트릭은 HTTP 트래픽이나 비즈니스 카운터에만 머물지 않습니다. `fluo`는 내부 상태도 메트릭으로 노출하므로, 어떤 컴포넌트가 초기화되었고 건강한지를 같은 모니터링 도구에서 함께 볼 수 있습니다.

- `fluo_component_ready`: DI 컴포넌트의 상태.
- `fluo_component_health`: Terminus 인디케이터의 상태.

## 19.8 Visualizing with Grafana
Prometheus가 `/metrics`를 스크랩하기 시작하면, Grafana는 그 원시 수치를 팀이 보고 판단할 수 있는 화면으로 바꿔 주는 곳이 됩니다.

1.  **데이터 소스 추가**: Grafana에서 Prometheus 서버를 지정합니다.
2.  **대시보드 가져오기**: Node.js 및 Prometheus를 위한 많은 커뮤니티 대시보드가 존재합니다.
3.  **알림 생성**: p95 지연 시간이 500ms를 초과할 때 Slack이나 이메일 알림을 설정합니다.

## 19.9 Summary
메트릭은 FluoBlog를 단순히 응답하는 서비스에서 직접 관찰할 수 있는 시스템으로 바꿔 줍니다. 요청 동작과 내부 상태, 비즈니스 이벤트에 대한 데이터를 모으면 확장과 최적화 결정을 훨씬 더 좋은 맥락에서 내릴 수 있습니다.

- 데이터를 Prometheus에 노출하기 위해 `MetricsModule`을 사용하세요.
- 지연 시간 모니터링을 위해 자동 HTTP 인스트루먼테이션을 활용하세요.
- 비즈니스 KPI를 위해 `Counter`와 `Gauge`를 사용하세요.
- 프로덕션에서는 메트릭 엔드포인트를 보호하세요.
- 성능을 시각화하고 알림을 설정하기 위해 Grafana를 사용하세요.

축하합니다. Part 4: 캐싱과 운영을 마쳤습니다. 이제 FluoBlog에는 더 빠른 읽기 경로와 명확한 헬스 신호, 그리고 실행 중 상태를 관찰할 수 있는 메트릭이 갖춰졌습니다. 마지막 파트에서는 테스트와 최종 프로덕션 점검에 집중해 보겠습니다.
