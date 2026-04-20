<!-- packages: @fluojs/terminus -->
<!-- project-state: FluoBlog v1.15 -->

# Chapter 18. Health Monitoring with Terminus

## Learning Objectives
- Understand the importance of Liveness and Readiness probes in production.
- Configure `TerminusModule` to aggregate application health status.
- Implement built-in indicators for Database, Redis, and Memory.
- Create custom health indicators for specific business logic.
- Integrate health endpoints with infrastructure (Kubernetes, Docker).

## 18.1 Why Health Checks Matter
After adding caching, FluoBlog has more moving parts to depend on in production. The application does not run in a vacuum. It depends on a database, a cache, and sometimes external APIs. If the database goes down, the process may still be running, but the service is effectively broken.

That is why monitoring tools and orchestrators such as Kubernetes need a simple way to ask two separate questions: "Are you alive?" and "Are you ready to handle traffic?".

- **Liveness**: "Am I healthy or should I be restarted?"
- **Readiness**: "Am I ready to receive requests or am I still initializing/overloaded?"

## 18.2 Introducing @fluojs/terminus
`@fluojs/terminus` is the toolkit that gives `fluo` those answers. It aggregates multiple health indicators into one JSON response so infrastructure can make decisions from a single endpoint.

## 18.3 Basic Setup
The basic setup is small, which makes it a good next step once the application has important dependencies.

Install the package first:
`pnpm add @fluojs/terminus`

Then, register the module in your root `AppModule`:

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

This configuration exposes health endpoints, typically `/health` and `/ready`, so the process can report more than "I started successfully."

## 18.4 Monitoring Dependencies
The next step is checking the dependencies that determine whether FluoBlog can actually do useful work, especially Prisma and Redis.

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
Since Redis is an optional peer, its indicator is provided via a dedicated subpath to keep the core package light.

```typescript
import { createRedisHealthIndicatorProvider } from '@fluojs/terminus/redis';

TerminusModule.forRoot({
  indicatorProviders: [
    createRedisHealthIndicatorProvider({ key: 'redis' }),
  ],
})
```

## 18.5 The Health Report
Once indicators are registered, `GET /health` returns a report that both humans and infrastructure can read quickly:

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

If any indicator fails, the status becomes `error` and the endpoint returns `503 Service Unavailable`. That tells a load balancer or Kubernetes to stop sending traffic to this instance until it recovers.

## 18.6 Custom Health Indicators
Built-in indicators cover common dependencies, but they are not the whole story. Sometimes the most important signal is specific to your own application, such as whether a directory is writable or an external service is reachable.

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
Separating indicators by impact keeps the health model useful. A process can be alive enough to avoid a restart while still being unready to serve requests.

```typescript
TerminusModule.forRoot({
  indicators: [
    // Liveness: basic process health
    new MemoryHealthIndicator({ key: 'memory', liveness: true }),
    
    // Readiness: external dependencies
    new PrismaHealthIndicator({ key: 'db', readiness: true }),
    createRedisHealthIndicatorProvider({ key: 'redis', readiness: true }),
  ],
})
```

By default, `/health` checks everything, while `/ready` focuses on readiness indicators. That split lets the platform react differently to a dead process and to a process that is temporarily not ready.

## 18.8 Infrastructure Integration
Once the endpoints exist, the last step is wiring them into the platform that runs the app.

- **Docker Compose**: Use `healthcheck` to monitor your container.
- **Kubernetes**: Configure `livenessProbe` and `readinessProbe` in your deployment YAML.

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
Terminus makes FluoBlog easier to operate because it turns application state into a clear signal for the platform. Instead of waiting for a user to report that the site is down, your infrastructure can detect failures early and react automatically.

- Use `TerminusModule` to aggregate health status.
- Monitor `Prisma` and `Redis` as critical dependencies.
- Use `MemoryHealthIndicator` to detect leaks.
- Leverage `/ready` and `/health` endpoints in your CI/CD and orchestration.

In the next chapter, we will build on that health signal by collecting metrics that show not just whether FluoBlog is up, but how it is performing.
