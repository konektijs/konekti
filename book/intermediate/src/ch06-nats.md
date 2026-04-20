<!-- packages: @fluojs/microservices, nats -->
<!-- project-state: FluoShop v1.5.0 -->

# 6. NATS

NATS is the lightest transport in this part that still feels fully brokered.

It does not try to be a giant durability platform by default.

It aims for low-latency messaging, subject-based routing, and operational simplicity.

That makes it attractive for control-plane style traffic inside FluoShop.

By v1.5.0, the company has several workflows that need quick service-to-service coordination without the heavier operational feel of Kafka or the queue-centric semantics of RabbitMQ.

Inventory reservation hints, cache invalidation, and fast internal policy lookups are good examples.

NATS fits these links because speed and clear subject routing matter more than historical replay.

## 6.1 Why NATS in FluoShop

Every transport chapter in this part should answer one question.

What does this transport let the architecture express more clearly?

For NATS, the answer is fast control-plane communication.

FluoShop uses it for two related capabilities.

1. quick request-reply checks between Order and Inventory services
2. lightweight event fan-out for cache and policy refresh signals

These are important interactions.

They are not the same as durable business history.

They are also not warehouse work queues.

They are short-lived internal coordination steps.

## 6.2 Caller-owned client and codec setup

The package README calls out an important fact.

NATS is caller-owned.

`@fluojs/microservices` expects the application to supply both a NATS client and a codec.

The generated starters mentioned in the README use `nats` plus `JSONCodec()`.

That detail is useful because it shows fluo is not trying to hide the real NATS contract.

### 6.2.1 Subject design

`NatsMicroserviceTransport` exposes these core options.

- `client`
- `codec`
- `eventSubject`
- `messageSubject`
- `requestTimeoutMs`

The defaults use `fluo.microservices.events` and `fluo.microservices.messages`.

In FluoShop we can choose subject names that reflect domain intent.

- `fluoshop.inventory.events`
- `fluoshop.inventory.messages`

The transport still carries JSON-framed packets.

The subject names simply make broker inspection easier.

### 6.2.2 Module wiring

```typescript
import { Module } from '@fluojs/core';
import { MicroservicesModule, NatsMicroserviceTransport } from '@fluojs/microservices';
import { JSONCodec, connect } from 'nats';

const client = await connect({ servers: process.env.NATS_URL });
const codec = JSONCodec();

const transport = new NatsMicroserviceTransport({
  client,
  codec: {
    encode(value) {
      return codec.encode(value);
    },
    decode(data) {
      return codec.decode(data) as string;
    },
  },
  eventSubject: 'fluoshop.inventory.events',
  messageSubject: 'fluoshop.inventory.messages',
  requestTimeoutMs: 1_500,
});

@Module({
  imports: [MicroservicesModule.forRoot({ transport })],
  providers: [InventoryCoordinationHandler],
})
export class InventoryCoordinationModule {}
```

The exact codec wrapper can vary.

The architectural point does not.

Your application owns the NATS connection and codec choice explicitly.

## 6.3 Fast request-reply for inventory control

NATS uses request-reply natively.

The fluo transport maps `send()` onto `client.request(...)` with a timeout.

That makes the path feel direct while still preserving the microservice abstraction.

### 6.3.1 Inventory reservation lookups

In FluoShop, the Order Service sometimes needs a fast answer before confirming checkout.

It may ask the Inventory Service whether a flash-sale SKU still has reserve stock in a particular zone.

This is not the final durable reservation.

It is a fast coordination check.

That is a good NATS use case.

```typescript
@MessagePattern('inventory.reserve-preview')
async previewReservation(input: { sku: string; zoneId: string; quantity: number }) {
  return await this.inventoryPolicy.preview(input);
}
```

The Order Service gets a quick answer.

If it needs the truly durable business record later, another transport can own that step.

NATS does not need to carry every responsibility alone.

### 6.3.2 Timeout budgets

The transport defaults to a request timeout of 3 seconds unless you override it.

FluoShop should usually shorten that for control-plane checks.

If an inventory preview is not available quickly, the gateway should degrade gracefully rather than stall the customer journey.

A fast failure is often more honest than a long uncertain wait.

That is particularly true for advisory lookups.

## 6.4 Event fan-out and logger-driven failures

NATS also supports `emit()` for lightweight event delivery.

This is perfect for cache invalidation or policy refresh notices.

For example, if Catalog updates a restricted-item rule, several services may need to refresh local read models.

That signal should be fast.

It does not need Kafka-style historical replay for every environment.

### 6.4.1 Cache invalidation in FluoShop

One simple example is the invalidation of inventory read caches.

```typescript
@EventPattern('inventory.cache.invalidate')
async invalidateCache(event: { sku: string }) {
  await this.inventoryCache.evict(event.sku);
}
```

The handler still looks ordinary.

The subject routing and NATS publish mechanics stay inside the transport.

This consistency is what lets one team understand multiple transports without learning a new handler model each time.

### 6.4.2 No console fallback for event failures

The repository tests verify a subtle but important behavior.

Event handler failures are logger-driven.

If you set a transport logger, the error is reported there.

If you do not set one, fluo does not mirror the failure through a raw `console.error` fallback.

That matters for production hygiene.

It avoids duplicate noise and keeps observability policy explicit.

For FluoShop, this means the platform team should wire a structured logger whenever NATS event paths matter operationally.

## 6.5 Operations and trade-offs

NATS looks simple because it is simple in the ways many teams want.

That simplicity is a feature.

It is also a warning against forcing it into roles where richer durability or replay semantics are required.

FluoShop uses NATS for quick coordination, not as the canonical timeline and not as the main queueing system.

Operationally, teams should watch:

- timeout rates on request-reply subjects
- burst fan-out volume for event subjects
- connection churn across service instances
- structured event-handler error logs

If these signals stay healthy, NATS remains a clean internal coordination layer.

If the business starts demanding replay or long-lived retention, another transport should take over that responsibility.

## 6.6 FluoShop v1.5.0 progression

By the end of this chapter, FluoShop gains a fast control plane.

The architecture now has a clear split.

- Kafka is for durable shared history.
- RabbitMQ is for queue-owned warehouse work.
- Redis Streams still covers some durable workflows.
- NATS is for low-latency internal coordination.

This is not over-engineering.

It is explicit role assignment.

Systems become easier to reason about when each transport has one primary job.

## 6.7 Summary

- NATS is well suited for low-latency control-plane messaging and lightweight event fan-out.
- fluo expects a caller-owned NATS client and codec, keeping infrastructure wiring explicit.
- `send()` maps naturally onto NATS request-reply for fast coordination checks.
- event-handler failures remain logger-driven, with no raw `console.error` fallback when no logger is configured.
- FluoShop now uses NATS for fast inventory and cache-coordination paths where speed matters more than replay.

NATS does not try to win every transport contest.

It wins the one about fast, understandable coordination.

That is exactly why it belongs in FluoShop.
