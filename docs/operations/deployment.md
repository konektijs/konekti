# Deployment

<p>
  <strong>English</strong> | <a href="./deployment.ko.md">한국어</a>
</p>

This document defines the production deployment standards, containerization patterns, and runtime health indicators for the fluo framework. It ensures that applications remain resilient, observable, and easy to manage across diverse cloud environments.

## When this document matters

- **Production Readiness**: When preparing a fluo application for a live environment.
- **Infrastructure Configuration**: When setting up Kubernetes probes, resource limits, or cloud-native scaling.
- **Troubleshooting**: When diagnosing startup failures, unexpected restarts, or graceful shutdown issues.

---

## Containerization

fluo recommends a multi-stage Docker build to minimize image size and reduce the attack surface.

### Recommended Dockerfile Pattern
```dockerfile
# Stage 1: Builder
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile
RUN pnpm build

# Stage 2: Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 fluo
USER fluo

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Optional: Add a healthcheck for container runtimes that support it
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

---

## Health and Readiness Probes

fluo provides built-in endpoints for automated health monitoring. These integrate directly with Kubernetes `livenessProbe` and `readinessProbe`.

- **Liveness (`/health`)**: Returns `200 OK` as long as the process is running. Used to trigger container restarts.
- **Readiness (`/ready`)**: Returns `200 OK` only after the application bootstrap is complete and all registered dependency checks (e.g., Database, Redis) pass. Returns `503 Service Unavailable` during startup or dependency failure.

### Global Prefix Handling
If a `globalPrefix` is configured (e.g., `/api`), probes must use the prefixed path (e.g., `/api/health`) unless they are explicitly excluded via the `globalPrefixExclude` configuration.

### Kubernetes Configuration Example
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 2
  periodSeconds: 5
```

---

## Graceful Shutdown

The fluo runtime (specifically `runNodeApplication` from `@fluojs/runtime/node`) automatically listens for `SIGTERM` and `SIGINT` signals to initiate a clean shutdown.

1. **Stop Ingress**: The HTTP adapter stops accepting new connections.
2. **Request Drain**: The runtime waits for active requests to finish within the `shutdownTimeoutMs` window (default: 10s).
3. **Lifecycle Hooks**: `onModuleDestroy` and `onApplicationShutdown` hooks are executed in reverse order.
4. **Exit**: The process terminates once all connections and hooks are cleared.

> **Tip**: Align your Kubernetes `terminationGracePeriodSeconds` to be slightly higher than your `shutdownTimeoutMs` to avoid abrupt process kills.

---

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Sets the execution mode (e.g., `production`, `development`). | `development` |
| `PORT` | The port the HTTP adapter binds to. | `3000` |
| `LOG_LEVEL` | Controls the verbosity of the framework logger. | `info` |

---

## Alternative Runtimes

While Node.js is the primary target, fluo provides first-class support for modern runtimes through specialized platform packages.

### Bun
Bun provides built-in support for TypeScript and fast startup times. Use `@fluojs/platform-bun` for tight integration.

**Entrypoint:**
```bash
bun run dist/main.js
```

### Deno
Deno offers a secure-by-default environment. Use `@fluojs/platform-deno` to leverage Deno's native APIs.

**Entrypoint:**
```bash
deno run --allow-net dist/main.js
```

### Cloudflare Workers
For edge deployments, use `@fluojs/platform-cloudflare-workers`. This requires a `wrangler.toml` configuration.

**Example `wrangler.toml`:**
```toml
name = "fluo-app"
main = "dist/main.js"
compatibility_date = "2024-01-01"

[vars]
NODE_ENV = "production"
```

---

## CI/CD Pipeline

Standardizing your deployment pipeline ensures consistent quality and repeatable builds.

### GitHub Actions Example
```yaml
name: CI/CD
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Deploy
        run: ./deploy.sh
```

---

## Scaling Strategies

fluo is designed to scale horizontally across multiple instances.

### Horizontal Scaling
- **Stateless Design**: Avoid storing session data in memory. Use Redis or a database for shared state.
- **Pod Autoscaling**: In Kubernetes, use Horizontal Pod Autoscaler (HPA) based on CPU or memory metrics.

### Connection Pooling
When scaling instances, ensure your database connections are pooled correctly to prevent exhausting server limits. Tools like PgBouncer for PostgreSQL are recommended.

### Load Balancing
Distribute incoming traffic across instances using a load balancer (e.g., NGINX, AWS ALB). Ensure health checks are configured to use the `/health` endpoint.

---

## Troubleshooting

### Common Deployment Pitfalls
- **Port Mismatch**: Ensure the `PORT` environment variable matches your infrastructure configuration.
- **Missing Peer Dependencies**: Some platform-specific features require manual installation of peer dependencies (e.g., `@fluojs/platform-bun`).
- **Memory Limits**: Standard Node.js heap limits may be too restrictive for large applications. Tune `--max-old-space-size` if necessary.

---

## Related Docs
- [Behavioral Contract Policy](./behavioral-contract-policy.md)
- [Testing Guide](./testing-guide.md)
- [Release Governance](./release-governance.md)
