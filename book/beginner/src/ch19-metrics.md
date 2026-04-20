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
Health checks in Chapter 18 told us whether FluoBlog was alive and ready. Metrics answer the next operational question, which is how well the application is performing once traffic is flowing.

- How many requests per second is FluoBlog handling?
- What is the 95th percentile (p95) latency for post creation?
- How many new users registered in the last hour?

Those numbers are what let you build dashboards, define alerts, and make capacity decisions based on evidence instead of guesswork.

## 19.2 Introducing @fluojs/metrics
The `@fluojs/metrics` package connects `fluo` to Prometheus. Prometheus is the monitoring system that regularly scrapes metrics from your application, which makes it the natural follow-up once health endpoints are already in place.

## 19.3 Basic Setup
The basic setup is intentionally small so you can expose useful telemetry before you design any custom dashboard.

Install the package:
`pnpm add @fluojs/metrics`

Register the module:

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

By default, this exposes a `GET /metrics` endpoint. When you open it, you will see the text format Prometheus expects to scrape.

## 19.4 Automatic HTTP Instrumentation
Before you add business-specific numbers, `fluo` already measures the request path through your application.

- `http_request_duration_seconds`: Histogram of request latencies.
- `http_requests_total`: Counter of total requests.

### Path Normalization
To prevent "label cardinality explosion" (where every unique URL path creates a new metric series), `fluo` normalizes paths by default using templates.

```typescript
MetricsModule.forRoot({
  http: {
    pathLabelMode: 'template', // /posts/123 -> /posts/:id
  },
})
```

## 19.5 Custom Metrics
Automatic HTTP metrics show platform behavior, but they do not explain everything that matters to your product. For that, you can use `MetricsService` to track business-specific events.

### Counter: Measuring Events
Use a `Counter` for values that only go up (e.g., total posts created).

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
Use a `Gauge` for values that can go up and down (e.g., number of active WebSocket connections).

```typescript
this.metrics.getGauge('active_sessions').set(currentSessions);
```

### Histogram: Measuring Distributions
Use a `Histogram` for durations or sizes where you need to calculate percentiles (e.g., image upload size).

```typescript
this.metrics.getHistogram('image_upload_bytes').observe(file.size);
```

## 19.6 Securing the Metrics Endpoint
Once metrics become useful, they also become sensitive. In production, you usually do not want the public to see internal latency, traffic, or component data, so protect the endpoint with middleware.

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
Metrics are not limited to HTTP traffic and business counters. `fluo` also exposes internal state as metrics, which lets you see initialization and health information in the same monitoring tool.

- `fluo_component_ready`: Status of DI components.
- `fluo_component_health`: Status from Terminus indicators.

## 19.8 Visualizing with Grafana
Once Prometheus is scraping `/metrics`, Grafana becomes the place where those raw numbers turn into something your team can watch and act on.

1.  **Add Data Source**: Point Grafana to your Prometheus server.
2.  **Import Dashboards**: Many community dashboards exist for Node.js and Prometheus.
3.  **Create Alerts**: Set up Slack or Email notifications when p95 latency exceeds 500ms.

## 19.9 Summary
Metrics turn FluoBlog from a service that merely responds into one you can observe directly. By collecting data about request behavior, internal state, and business events, you can make scaling and optimization decisions with much better context.

- Use `MetricsModule` to expose data to Prometheus.
- Leverage automatic HTTP instrumentation for latency monitoring.
- Use `Counter` and `Gauge` for business KPIs.
- Secure your metrics endpoint in production.
- Use Grafana to visualize performance and set alerts.

Congratulations, you have completed Part 4: Caching and Operations. FluoBlog now has faster reads, explicit health signals, and observable runtime behavior. In the final part, we will focus on testing and the last production checks.
