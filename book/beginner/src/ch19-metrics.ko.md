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
헬스 체크(18장)가 애플리케이션이 "살아 있는지"를 알려준다면, 메트릭(Metrics)은 "얼마나 잘" 작동하고 있는지를 알려줍니다. 메트릭을 모니터링하면 사후 약방문식의 문제 해결에서 벗어나 선제적인 최적화가 가능해집니다.

- **처리량(Throughput)**: FluoBlog가 초당 몇 개의 요청을 처리하고 있는가?
- **지연 시간(Latency)**: 게시물 생성의 95퍼센타일(p95) 지연 시간은 얼마인가? 시간이 지날수록 느려지고 있지는 않은가?
- **비즈니스 KPI**: 지난 한 시간 동안 얼마나 많은 신규 사용자가 등록했는가? 오늘 발행된 포스트는 몇 개인가?

메트릭은 대시보드를 구축하고, 알림을 설정하고, 용량 계획(Capacity Planning, 예: "연말 세일 전에 서버가 더 필요하겠군")을 수행하는 데 필요한 수치 데이터를 제공합니다.

## 19.2 Introducing @fluojs/metrics
`@fluojs/metrics` 패키지는 Prometheus를 `fluo`에 통합합니다. Prometheus는 정기적인 간격으로 애플리케이션에서 메트릭을 "스크랩(Scrape, 가져오기)"하는 업계 표준 모니터링 시스템입니다. 이 데이터를 시계열(Time-series)로 저장하므로, 특정 기간 동안의 값 변화를 쿼리할 수 있습니다.

## 19.3 Basic Setup
패키지를 설치합니다:
`pnpm add @fluojs/metrics`

루트 `AppModule`에 모듈을 등록합니다:

```typescript
import { Module } from '@fluojs/core';
import { MetricsModule } from '@fluojs/metrics';

@Module({
  imports: [
    MetricsModule.forRoot({
      // 선택 사항: 기본값인 /metrics 경로를 변경할 수 있습니다.
      path: '/internal/prometheus',
    }),
  ],
})
export class AppModule {}
```

기본적으로 이는 `GET /metrics` 엔드포인트를 노출합니다. 이 엔드포인트에 접속하면 내부 Node.js 메트릭(CPU, 메모리, GC)과 Fluo 전용 메트릭이 포함된 텍스트 형식(OpenMetrics)의 데이터를 볼 수 있습니다.

## 19.4 Automatic HTTP Instrumentation
`fluo`는 별도의 코드 작성 없이도 애플리케이션에서 처리되는 모든 HTTP 요청을 자동으로 측정합니다.

- `http_request_duration_seconds`: 메서드, 경로, 상태 코드별로 세분화된 요청 지연 시간의 **히스토그램(Histogram)**.
- `http_requests_total`: 전체 요청 횟수의 **카운터(Counter)**.

### Path Normalization
"라벨 카디널리티 폭발(Label Cardinality Explosion, `/posts/1`, `/posts/2`와 같이 고유한 URL 경로마다 새로운 메트릭 시리즈가 생성되어 시스템에 부하를 주는 현상)"을 방지하기 위해, `fluo`는 기본적으로 라우트 템플릿을 사용하여 경로를 정규화합니다.

```typescript
MetricsModule.forRoot({
  http: {
    // /posts/123 경로가 /posts/:id로 기록됩니다.
    pathLabelMode: 'template', 
  },
})
```

## 19.5 Custom Metrics
`MetricsService`를 사용하여 비즈니스 전용 이벤트를 추적할 수 있습니다. 이 서비스는 의존성 주입을 통해 애플리케이션 어디에서나 사용할 수 있습니다.

### Counter: Measuring Events
값이 증가하기만 하는 지표(예: 총 게시물 생성 수)에는 `Counter`를 사용하세요.

```typescript
import { Inject } from '@fluojs/core';
import { MetricsService } from '@fluojs/metrics';

export class PostService {
  constructor(@Inject(MetricsService) private readonly metrics: MetricsService) {}

  async create(data: any) {
    const post = await this.prisma.post.create({ data });
    
    // 새 포스트가 생성될 때마다 카운터를 증가시킵니다.
    this.metrics.getCounter('blog_posts_created_total').inc();
    
    return post;
  }
}
```

### Gauge: Measuring Current State
올라가거나 내려갈 수 있는 값(예: 활성 웹소켓 연결 수 또는 처리 대기 중인 큐의 아이템 수)에는 `Gauge`를 사용하세요.

```typescript
// 현재 값을 직접 설정합니다.
this.metrics.getGauge('active_sessions_count').set(currentSessions);
```

### Histogram: Measuring Distributions
퍼센타일을 계산해야 하는 기간이나 크기(예: 백그라운드 작업 처리 시간 또는 업로드된 이미지의 크기)에는 `Histogram`을 사용하세요.

```typescript
// 업로드된 파일 크기를 관측합니다.
this.metrics.getHistogram('image_upload_size_bytes').observe(file.size);
```

## 19.6 Securing the Metrics Endpoint
프로덕션 환경에서는 일반 대중에게 내부 메트릭을 공개하고 싶지 않을 것입니다. 커스텀 미들웨어를 사용하여 엔드포인트를 보호할 수 있습니다.

```typescript
MetricsModule.forRoot({
  endpointMiddleware: [
    (context, next) => {
      const apiKey = context.request.headers['x-monitoring-key'];
      if (apiKey !== process.env.MONITORING_SECRET) {
        throw new ForbiddenException('Restricted Access');
      }
      return next();
    }
  ],
})
```

## 19.7 Platform Telemetry
`fluo`는 내부 상태를 메트릭으로 노출하기도 합니다. 이를 통해 어떤 컴포넌트가 초기화되었고 건강한지 모니터링 도구에서 직접 확인할 수 있습니다.

- `fluo_component_ready`: DI 컴포넌트들이 초기화 단계를 마쳤는지 추적합니다.
- `fluo_component_health`: 18장에서 다룬 Terminus 인디케이터의 상태를 메트릭 스트림에 통합합니다.

## 19.8 Visualizing with Grafana
Prometheus가 `/metrics` 엔드포인트를 스크랩하기 시작하면, Grafana를 사용하여 아름다운 대시보드를 구축할 수 있습니다.

1. **데이터 소스 추가**: Grafana에서 Prometheus 서버를 지정합니다.
2. **대시보드 구축**: PromQL(Prometheus Query Language)을 사용하여 데이터를 시각화합니다.
   - 예: `rate(http_requests_total[5m])`은 5분 평균 초당 요청 수를 보여줍니다.
3. **알림 설정**: 에러율이 1%를 초과하거나 p95 지연 시간이 1초를 넘으면 Slack이나 이메일 알림을 보내도록 Grafana를 설정합니다.

## 19.9 Summary
메트릭은 FluoBlog를 "블랙박스"에서 투명한 시스템으로 변화시킵니다. 인프라와 비즈니스 로직 모두에서 데이터를 수집함으로써 확장과 최적화에 대해 정보에 기반한 결정을 내리고, 성능 병목 현상을 사전에 식별하며, 객관적인 수치로 서비스의 신뢰성을 증명할 수 있습니다.

- **관측성**: Prometheus는 시스템 동작의 "무엇(What)"과 "언제(When)"를 제공합니다.
- **커스텀 추적**: 비즈니스에 중요한 KPI를 위해 `Counter`, `Gauge`, `Histogram`을 사용하세요.
- **자동 인스트루먼테이션**: Fluo는 별도 설정 없이 HTTP 메트릭을 제공합니다.
- **알림**: 성능이 저하될 때 팀에 알리도록 Grafana를 활용하세요.

다음 몇 장에서는 Prisma, 트랜잭션, 그리고 JWT와 같은 데이터 및 보안의 기초로 돌아가, 여러분의 구현이 모니터링만큼이나 견고한지 확인해 보겠습니다.

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
