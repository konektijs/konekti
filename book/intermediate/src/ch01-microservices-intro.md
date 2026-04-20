<!-- packages: @fluojs/microservices -->
<!-- project-state: FluoShop v1.0.0 -->

# 1. Microservice Architecture and fluo Strategy

Microservices break down large, complex applications into small, independent services that communicate over a network.

fluo provides a unified programming model that lets you write business logic once and deploy it across various transport protocols.

This chapter introduces the core philosophy of fluo's microservice strategy and establishes the **FluoShop** project that we will build throughout this book.

The goal of this opening chapter is not to romanticize microservices.

It is to define where they help, where they hurt, and how fluo reduces the cost of moving from a modular monolith to a distributed system.

By the end of the chapter, you should be able to name the services in FluoShop, describe their responsibilities, and explain why transport independence matters before any broker is chosen.

## 1.1 The FluoShop Topology

Throughout this book, we will build **FluoShop**, a cumulative e-commerce project designed to demonstrate real-world microservice patterns.

Our architecture consists of five core services, each responsible for a specific domain.

1. **API Gateway**: The entry point for all client requests. It performs routing, authentication, and request aggregation.
2. **Catalog Service**: Manages product information, categories, and inventory levels.
3. **Order Service**: Handles order placement, state transitions, and coordination between other services.
4. **Payment Service**: Manages payment transactions and integration with third-party payment providers.
5. **Notification Service**: Sends emails, SMS, and alerts to users based on system events.

This topology is intentionally small enough to understand quickly.

It is also rich enough to expose the boundaries that matter in production systems.

The gateway owns client-facing protocol concerns.

The catalog service emphasizes fast reads.

The order service becomes the orchestration center for business workflows.

The payment service represents an external-risk domain with strict failure handling.

The notification service demonstrates downstream reactions that should remain decoupled from the request path.

### 1.1.1 Architecture Diagram

The system follows a hybrid communication model to balance low latency and high reliability.

- **Requests (Synchronous)**: The API Gateway communicates with the Catalog and Order services using request-response patterns. The Order Service calls the Payment Service to authorize transactions only when the current transport supports that workflow.
- **Events (Asynchronous)**: Services emit events to notify others of state changes. The Catalog Service can broadcast inventory updates, and the Payment Service can emit payment success events that the Notification Service consumes.

You can picture the first phase of FluoShop like this.

```text
Client
  -> API Gateway
      -> Catalog Service
      -> Order Service
          -> Payment Service
              -> Notification Service
```

This is not a strict call chain for every request.

It is a map of domain relationships.

Some interactions are direct requests.

Some are fire-and-forget events.

Some later become durable broker-backed flows when failure recovery matters more than raw latency.

That evolution is the real reason the topology appears in Chapter 1.

We are preparing the mental model that later transport chapters will fill in.

## 1.2 Unified Programming Model

In fluo, the business logic of a microservice is decoupled from the underlying network protocol.

You do not write transport-specific code inside your handlers.

Instead, you use decorators to define message patterns and let the transport adapter handle framing, serialization, and delivery mechanics.

That separation matters because transport churn is common.

Teams often begin with direct service-to-service networking.

Later, they discover the need for retries, durability, or fan-out behavior.

If the application code already depends on a concrete transport client, migration becomes expensive.

If the transport is only configuration, migration is mainly operational.

### 1.2.1 Pattern-Based Routing

Decorators like `@MessagePattern` and `@EventPattern` allow fluo to route incoming packets to the correct handler based on a string or regular expression pattern.

```typescript
import { MessagePattern, EventPattern } from '@fluojs/microservices';

export class OrderHandler {
  @MessagePattern('orders.create')
  async createOrder(data: CreateOrderDto) {
    // Process request-response flow.
    // fluo automatically handles serialization and framing.
    return { id: 'order-123', status: 'pending' };
  }

  @EventPattern('orders.completed')
  async handleOrderCompleted(data: OrderCompletedEvent) {
    // Handle fire-and-forget event broadcasting.
    // No response is sent back to the emitter.
  }
}
```

The pattern name is the contract.

The transport is the delivery vehicle.

That means routing decisions stay readable in the codebase.

It also means tests can focus on the handler contract instead of socket choreography.

For FluoShop, this is especially useful because the same order lifecycle appears across multiple chapters.

We do not want to re-teach the order domain every time we swap infrastructure.

We want the domain to remain stable while the transport evolves.

### 1.2.2 Protocol Independence

This abstraction allows you to switch from TCP to Kafka, NATS, or gRPC by simply changing the transport configuration in your module.

Your business logic remains untouched, making the system highly adaptable to different infrastructure requirements.

Protocol independence does not mean every transport behaves identically.

It means the handler surface area stays stable enough that transport differences are isolated to configuration, operational policies, and edge-case semantics.

For example:

- TCP gives low latency and simple deployment.
- Pub/Sub brokers give fan-out behavior.
- Durable streams give recovery options.
- RPC-style transports emphasize request contracts.

fluo's value is not pretending these are the same.

Its value is letting you keep business handlers, DTOs, and dependency injection structure consistent while you choose the appropriate transport per link.

## 1.3 Strategic Advantages

By using fluo's microservice module, you gain several strategic benefits.

- **Developer Velocity**: Focus on business logic without worrying about socket management or broker-specific APIs.
- **Operational Flexibility**: Start with simple TCP for development and move to durable brokers in production without rewriting handlers.
- **Safety Defaults**: fluo includes protection against oversized packets, unsafe cleanup patterns, and delivery confusion that commonly appears in ad hoc transport code.

There is also a fourth benefit that becomes more visible later in the book.

Shared programming conventions reduce cross-team coordination cost.

When every service exposes patterns with the same handler style, new maintainers can move between domains without relearning framework rules.

That lowers the friction of splitting one service into many.

It also lowers the friction of merging services back together when a microservice boundary turns out to be premature.

## 1.4 Deep Dive into the Microservice Module

The `MicroservicesModule` is the heart of fluo's distributed capabilities.

When you register this module, fluo sets up the necessary infrastructure to handle incoming packets and dispatch them to your providers.

```typescript
import { Module } from '@fluojs/core';
import { MicroservicesModule, TcpMicroserviceTransport } from '@fluojs/microservices';

@Module({
  imports: [
    MicroservicesModule.forRoot({
      transport: new TcpMicroserviceTransport({ port: 4000 })
    })
  ]
})
export class AppModule {}
```

This configuration binds the application to a specific transport.

Behind the scenes, fluo scans providers for methods decorated with `@MessagePattern` or `@EventPattern` and registers them with the transport listener.

That registration pipeline matters for architecture discussions.

The framework is not discovering behavior through hidden reflection magic.

It is composing explicit providers into a runtime graph.

That design keeps microservices aligned with the rest of the fluo ecosystem.

From a FluoShop perspective, the practical consequence is simple.

Every service chapter in this part can introduce a new transport without redefining the application structure from scratch.

The module stays the home of transport wiring.

Handlers stay the home of business reactions.

Supporting providers stay the home of domain logic.

## 1.5 The Philosophy of "No Magic"

While fluo provides a lot of convenience, it adheres to a "no magic" philosophy.

Every component is an explicit provider in the DI container.

The `MICROSERVICE` token, for example, is what you use to inject the client proxy into your services.

This keeps code testable and predictable.

The philosophy matters even more in distributed systems than in regular web applications.

Once a request crosses the network, ambiguity becomes expensive.

If retry behavior, serialization boundaries, or dependency lifecycles are unclear, debugging spreads across multiple processes.

Explicit configuration reduces that confusion.

It tells maintainers where to look when a pattern stops resolving or a client begins timing out.

## 1.6 Why Microservices with fluo?

Traditional microservice frameworks often leak protocol details into business logic.

If you start with a REST-based approach and later need a message broker for scalability, you often rewrite large portions of the service.

fluo reduces that friction by treating the transport as a swappable implementation detail.

That does not eliminate all migration work.

You still need to revisit timeout budgets, idempotency guarantees, delivery semantics, and observability.

But you are no longer forced to redesign every handler signature because the framework model changed underneath you.

For FluoShop, that makes the learning path cumulative.

Chapter 2 can focus on TCP trade-offs.

Chapter 3 can focus on Redis trade-offs.

Later chapters can introduce heavier brokers.

The project keeps moving forward instead of resetting at each transport change.

## 1.7 Summary

- **Scalability**: Microservices offer independent scaling but require robust communication strategies.
- **FluoShop**: The five-service topology provides a realistic playground for advanced patterns.
- **Abstraction**: fluo's unified model treats transports as swappable drivers.
- **Patterns**: Use `@MessagePattern` for requests and `@EventPattern` for events.
- **Progression**: The rest of Part 0 turns this abstract architecture into concrete transport choices.

This summary is intentionally architectural.

We have not yet optimized anything.

We have only chosen boundaries and communication styles that will let us evaluate those optimizations in later chapters.

That is the correct order.

Premature infrastructure detail without a stable service map leads to accidental complexity.

## 1.8 Next Chapter Preview

In the next chapter, we will start building FluoShop by setting up our first two services using the TCP transport.

That chapter will answer practical questions left open here.

How does fluo frame data over raw sockets?

How does a caller correlate a response?

What safety boundaries exist before a real broker is introduced?

Once those foundations are clear, Redis becomes much easier to understand as an intentional upgrade rather than a mysterious dependency.
