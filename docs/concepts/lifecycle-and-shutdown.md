# lifecycle and shutdown

<p><strong><kbd>English</kbd></strong> <a href="./lifecycle-and-shutdown.ko.md"><kbd>한국어</kbd></a></p>

fluo provides a rigorous, deterministic **Application Lifecycle** that governs how your service starts, signals health, and gracefully exits. This lifecycle ensures that your application is never in a "half-alive" state.

## why this matters

In modern cloud-native environments (Kubernetes, AWS, etc.), the way an application starts and stops is as important as how it handles requests.
- **The Startup Race**: If your app starts accepting traffic before the database connection is ready, you'll see a spike of 500 errors.
- **The "Dirty" Shutdown**: If you kill a process while it's still writing to a database, you risk data corruption.
- **Zombie Resources**: Failing to close Redis clients or message broker connections can lead to resource exhaustion over time.

fluo eliminates these risks by providing a **Structured Lifecycle Contract**. Every module and provider in your application can participate in this contract, ensuring that dependencies are initialized and destroyed in the correct order.

## core ideas

### atomic bootstrap
Bootstrap is an "all-or-nothing" operation.
1. **Config Validation**: If `.env` is wrong, we stop.
2. **Module Compilation**: If the DI graph is broken, we stop.
3. **Provider Initialization**: If a database connection fails during `onModuleInit`, we stop.

fluo ensures that a process only stays alive if it is **fully functional**.

### readiness vs. liveness
fluo distinguishes between being "alive" (the process is running) and being "ready" (the process can handle traffic).
- **Liveness**: Managed by the runtime engine.
- **Readiness**: Only signaled after `onApplicationBootstrap` has successfully completed across all modules. This is the signal for load balancers to start routing traffic to the instance.

### graceful shutdown sequence
When a `SIGTERM` or `SIGINT` is received, fluo begins a coordinated retreat:
1. **Stop Ingestion**: The HTTP server stops accepting new connections immediately.
2. **Request Draining**: Active requests are given a grace period (configurable) to finish.
3. **Reverse-Order Teardown**: Shutdown hooks (`onModuleDestroy`, `beforeApplicationShutdown`) are executed in the **exact reverse order** of their initialization. If Module A depends on Module B, Module A is destroyed *first* to ensure Module B's resources are still available during A's cleanup.

## lifecycle hooks

- **`onModuleInit`**: Logic that must run as soon as a module's providers are instantiated (e.g., establishing a socket connection).
  ```ts
  import { OnModuleInit } from '@fluojs/runtime';

  export class ConnectionProvider implements OnModuleInit {
    async onModuleInit(): Promise<void> {
      await this.connect();
    }
  }
  ```
- **`onApplicationBootstrap`**: Logic that runs once the *entire* application graph is ready (e.g., starting a background cron job).
  ```ts
  import { OnApplicationBootstrap } from '@fluojs/runtime';

  export class JobRunner implements OnApplicationBootstrap {
    onApplicationBootstrap(): void {
      this.startPolling();
    }
  }
  ```
- **`onModuleDestroy`**: Cleanup logic for a specific module.
  ```ts
  import { OnModuleDestroy } from '@fluojs/runtime';

  export class CacheProvider implements OnModuleDestroy {
    async onModuleDestroy(): Promise<void> {
      await this.flush();
    }
  }
  ```
- **`onApplicationShutdown`**: The final chance to perform cleanup before the process exits. Receives the signal that triggered the shutdown.
  ```ts
  import { OnApplicationShutdown } from '@fluojs/runtime';

  export class LoggerService implements OnApplicationShutdown {
    onApplicationShutdown(signal?: string): void {
      console.log(`received ${signal}, closing logs`);
    }
  }
  ```

## implementing lifecycle hooks

You can implement multiple hooks in a single provider to manage a resource throughout its entire life.

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
    // connect as soon as the module is ready
    this.client = await createClient();
  }

  async onModuleDestroy(): Promise<void> {
    // ensure connection is closed before module is gone
    await this.client.close();
  }
}
```

## shutdown configuration

You can tune the shutdown behavior through the application configuration.

```ts
const app = await FluoFactory.create(AppModule);

app.enableShutdownHooks({
  // duration to wait for hooks to finish before force exit
  shutdownTimeoutMs: 5000, 
});

await app.listen(3000);
```

## troubleshooting

### hooks not running
Lifecycle hooks only execute if the class is registered as a provider in a module. If you just create an instance with `new`, fluo cannot manage its lifecycle.

### wrong cleanup order
If a service depends on another (Service A uses Service B), ensure they are correctly injected. fluo uses this graph to ensure Service A is cleaned up while Service B is still alive.

### hanging shutdown
If your shutdown takes too long, it's often due to an unawaited promise or a connection that refuses to close. Use the `shutdownTimeoutMs` to identify which hooks are causing delays.

## boundaries

- **Dependency-Aware**: You never have to worry about the order of cleanup. fluo calculates the correct sequence based on your `@Inject()` metadata.
- **Timeout Protection**: If a shutdown hook takes too long (e.g., a hanging database query), fluo will eventually force-exit to prevent "zombie" processes from blocking deployments.
- **Idempotency**: Lifecycle hooks are guaranteed to run exactly once per application instance.

## related docs

- [Architecture Overview](./architecture-overview.md)
- [Dev Reload Architecture](./dev-reload-architecture.md)
- [Config and Environments](./config-and-environments.md)
- [Runtime Package README](../../packages/runtime/README.md)
