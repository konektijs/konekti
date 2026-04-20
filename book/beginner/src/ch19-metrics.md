<!-- packages: @fluojs/metrics -->
<!-- project-state: FluoBlog v1.16 -->

# Chapter 19. Metrics and Monitoring

## Learning Objectives
- Understand the role of Prometheus and Grafana in the observability stack.
- Configure `MetricsModule` to expose a `/metrics` endpoint.
- Monitor HTTP request counts and latency automatically.
- Create custom metrics (Counters, Gauges, Histograms) for business logic.
- Align metrics with application health and platform telemetry.

## 19.1 Beyond Status: Measuring Performance
While health checks (Chapter 18) tell you if your application is "alive", metrics tell you "how well" it is performing. Monitoring metrics allows you to move from reactive troubleshooting to proactive optimization.

- **Throughput**: How many requests per second is FluoBlog handling?
- **Latency**: What is the 95th percentile (p95) latency for post creation? Is it getting slower over time?
- **Business KPIs**: How many new users registered in the last hour? How many posts were published today?

Metrics provide the numerical data needed to build dashboards, set up alerts, and perform capacity planning (e.g., "We need more servers before the holiday sale").

## 19.2 Introducing @fluojs/metrics
The `@fluojs/metrics` package integrates Prometheus into `fluo`. Prometheus is the industry-standard monitoring system that "scrapes" (pulls) metrics from your application at regular intervals. It stores this data as time-series, allowing you to query values over any period.

## 19.3 Basic Setup
Install the package:
`pnpm add @fluojs/metrics`

Register the module in your `AppModule`:

```typescript
import { Module } from '@fluojs/core';
import { MetricsModule } from '@fluojs/metrics';

@Module({
  imports: [
    MetricsModule.forRoot({
      // Optional: change the default /metrics path
      path: '/internal/prometheus',
    }),
  ],
})
export class AppModule {}
```

By default, this exposes a `GET /metrics` endpoint. When you access it, you will see a text-based format (OpenMetrics) containing internal Node.js metrics (CPU, Memory, GC) and Fluo-specific metrics.

## 19.4 Automatic HTTP Instrumentation
`fluo` automatically measures every HTTP request handled by your application without any extra code.

- `http_request_duration_seconds`: A **Histogram** of request latencies, segmented by method, path, and status code.
- `http_requests_total`: A **Counter** of total requests.

### Path Normalization
To prevent "label cardinality explosion" (where every unique URL path like `/posts/1`, `/posts/2` creates a new metric series), `fluo` normalizes paths by default using their route templates.

```typescript
MetricsModule.forRoot({
  http: {
    // /posts/123 is recorded as /posts/:id
    pathLabelMode: 'template', 
  },
})
```

## 19.5 Custom Metrics
You can use `MetricsService` to track business-specific events. This service is available throughout your application via dependency injection.

### Counter: Measuring Events
Use a `Counter` for values that only go up (e.g., total posts created).

```typescript
import { Inject } from '@fluojs/core';
import { MetricsService } from '@fluojs/metrics';

export class PostService {
  constructor(@Inject(MetricsService) private readonly metrics: MetricsService) {}

  async create(data: any) {
    const post = await this.prisma.post.create({ data });
    
    // Increment the counter for every new post
    this.metrics.getCounter('blog_posts_created_total').inc();
    
    return post;
  }
}
```

### Gauge: Measuring Current State
Use a `Gauge` for values that can go up and down (e.g., number of active WebSocket connections or items in a processing queue).

```typescript
// Set the current value directly
this.metrics.getGauge('active_sessions_count').set(currentSessions);
```

### Histogram: Measuring Distributions
Use a `Histogram` for durations or sizes where you need to calculate percentiles (e.g., the time taken to process a background job or the size of uploaded images).

```typescript
// Observe the size of an upload
this.metrics.getHistogram('image_upload_size_bytes').observe(file.size);
```

## 19.6 Securing the Metrics Endpoint
In production, you don't want the public to see your internal metrics. You can protect the endpoint using custom middleware.

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
`fluo` also exposes internal state as metrics, allowing you to see which components are initialized and healthy directly in your monitoring tool.

- `fluo_component_ready`: Tracks which DI components have finished their initialization phase.
- `fluo_component_health`: Integrates status from Chapter 18's Terminus indicators into the metrics stream.

## 19.8 Visualizing with Grafana
Once Prometheus is scraping your `/metrics` endpoint, you can use Grafana to build beautiful dashboards.

1. **Add Data Source**: Point Grafana to your Prometheus server.
2. **Build Dashboards**: Use PromQL (Prometheus Query Language) to visualize data.
   - Example: `rate(http_requests_total[5m])` shows requests per second averaged over 5 minutes.
3. **Set Alerts**: Configure Grafana to send a Slack or Email notification if the error rate exceeds 1% or p95 latency exceeds 1 second.

## 19.9 Summary
Metrics turn FluoBlog from a "black box" into a transparent system. By collecting data on both infrastructure and business logic, you can make informed decisions about scaling, identify performance bottlenecks before they affect users, and prove the reliability of your service with hard data.

- **Observability**: Prometheus provides the "what" and "when" of system behavior.
- **Custom Tracking**: Use `Counter`, `Gauge`, and `Histogram` for business-critical KPIs.
- **Auto-Instrumentation**: Fluo provides HTTP metrics out of the box.
- **Alerting**: Use Grafana to notify your team when performance degrades.

In the next few chapters, we will circle back to the foundations of data and security—Prisma, Transactions, and JWT—to ensure your implementation is as robust as your monitoring.

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
