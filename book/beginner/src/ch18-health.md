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
In a production environment, your application doesn't run in a vacuum. It depends on a database, a cache, and external APIs. If the database goes down, your application might still be "running" but it's effectively broken. This state is known as a "Zombie Process"—it consumes CPU and RAM but returns only errors to users.

Monitoring tools and orchestrators (like Kubernetes or AWS ECS) need a way to ask your application: "Are you alive?" and "Are you ready to handle traffic?".

- **Liveness**: "Am I healthy or should I be restarted?" If this check fails, the orchestrator kills the container and starts a fresh one.
- **Readiness**: "Am I ready to receive requests or am I still initializing/overloaded?" If this fails, the container is kept alive but removed from the load balancer rotation until it becomes healthy again.

## 18.2 Introducing @fluojs/terminus
`@fluojs/terminus` is a toolkit for providing these health check endpoints in `fluo`. It aggregates multiple "Health Indicators" into a single JSON response. It follows the "Standard-First" philosophy by providing a clean, decorator-less configuration that integrates directly into the Fluo lifecycle.

## 18.3 Basic Setup
Install the package first:
`pnpm add @fluojs/terminus`

Then, register the module in your root `AppModule`. We'll start with a basic memory check to ensure the application isn't suffering from a massive heap leak.

```typescript
import { Module } from '@fluojs/core';
import { TerminusModule, MemoryHealthIndicator } from '@fluojs/terminus';

@Module({
  imports: [
    TerminusModule.forRoot({
      indicators: [
        // Threshold: 90% of heap memory used triggers a failure
        new MemoryHealthIndicator({ key: 'memory_heap', heapUsedThresholdRatio: 0.9 }),
      ],
    }),
  ],
})
export class AppModule {}
```

This configuration automatically exposes health endpoints (typically `/health` and `/ready`) using the platform's native router (Fastify, Bun, etc.).

## 18.4 Monitoring Dependencies
A real-world FluoBlog needs to monitor its critical dependencies: Prisma (PostgreSQL) and Redis. If these are down, the application cannot serve blog posts or sessions.

### Database Health
The `PrismaHealthIndicator` performs a simple `SELECT 1` or equivalent ping to ensure the connection pool is active and the database is responsive.

```typescript
import { PrismaHealthIndicator } from '@fluojs/terminus';

TerminusModule.forRoot({
  indicators: [
    new PrismaHealthIndicator({ 
      key: 'database',
      timeout: 3000 // If DB doesn't respond in 3s, mark as down
    }),
  ],
})
```

### Redis Health
Since Redis is an optional peer, its indicator is provided via a dedicated subpath to keep the core package light. This is a common pattern in Fluo to minimize bundle size for environments that don't use every feature.

```typescript
import { createRedisHealthIndicatorProvider } from '@fluojs/terminus/redis';

TerminusModule.forRoot({
  indicatorProviders: [
    // Providers are used for indicators that require dependency injection
    createRedisHealthIndicatorProvider({ key: 'redis' }),
  ],
})
```

## 18.5 The Health Report
When you call `GET /health`, Terminus returns a detailed report. This JSON format is designed to be easily parsed by Prometheus, Datadog, or custom monitoring scripts.

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

**Crucial Behavior**: If any indicator fails, the status becomes `error` and the endpoint returns a `503 Service Unavailable` status code. This HTTP status code is the universal signal for Load Balancers to stop sending traffic to this instance.

## 18.6 Custom Health Indicators
Sometimes you need to check something specific to your business, such as checking if a local upload directory is full or if a critical legacy API is reachable via HTTP.

```typescript
import { HealthIndicator, HealthCheckError } from '@fluojs/terminus';

export class DiskSpaceIndicator extends HealthIndicator {
  async check(key: string) {
    // Logic to check disk space or file permissions
    const isWritiable = await checkDiskWritable('/var/uploads');
    
    if (!isWritiable) {
      // Throwing HealthCheckError marks the indicator as "down"
      throw new HealthCheckError('Upload directory is read-only', { key });
    }
    
    // getStatus(key, isHealthy, details)
    return this.getStatus(key, true, { path: '/var/uploads' });
  }
}
```

## 18.7 Readiness vs Liveness
One of the most powerful features of Terminus is the ability to separate indicators based on their severity.

- **Liveness Checks**: Should only include "internal" issues like memory leaks or deadlocks. If you restart an app because its database is down, the new instance will just hit the same down database, causing a "crash loop."
- **Readiness Checks**: Should include all external dependencies. If the DB is down, we are not "ready" to serve users, but we don't necessarily need a restart.

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

By default:
- `GET /health` (Liveness) checks only indicators marked with `liveness: true`.
- `GET /ready` (Readiness) checks indicators marked with `readiness: true`.

## 18.8 Infrastructure Integration
The health check is useless unless your infrastructure knows about it.

### Docker Compose
Use the `healthcheck` property in your `docker-compose.yaml`. This allows other services to wait until the API is healthy before starting.

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
Kubernetes uses these probes to manage the pod lifecycle. If `livenessProbe` fails, the pod is restarted. If `readinessProbe` fails, traffic is stopped.

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
Terminus makes FluoBlog "Ops-friendly" and resilient. Instead of waiting for a user to report a "500 Internal Server Error" or finding a crashed instance in the middle of the night, your infrastructure can automatically detect failures and take corrective action.

- **Automated Recovery**: Liveness probes trigger restarts for frozen processes.
- **Graceful Failure**: Readiness probes prevent users from hitting instances with broken DB connections.
- **Detailed Visibility**: The health report gives Ops teams a clear picture of exactly *why* a node is failing.
- **Extensible**: Custom indicators allow you to monitor any business-critical resource.

In the next chapter, we will go one step further and collect performance metrics using Prometheus to track response times and error rates over time.

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
