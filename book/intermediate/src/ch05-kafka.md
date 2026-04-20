<!-- packages: @fluojs/microservices, kafkajs -->
<!-- project-state: FluoShop v1.4.0 -->

# 5. Kafka

Kafka is not a better RabbitMQ.

It is a different architectural bet.

RabbitMQ organizes work around queues and consumers.

Kafka organizes communication around append-only topics, replay, and consumer groups that can revisit history.

That difference matters in FluoShop v1.4.0.

By this stage, the company wants more than safe fulfillment queues.

It wants a durable order timeline that analytics, fraud review, and support dashboards can replay.

That is exactly where Kafka starts to feel natural.

The key question for this chapter is simple.

Which FluoShop links benefit from a durable event log rather than a queue-owned work item?

## 5.1 Why Kafka after RabbitMQ

RabbitMQ helped us assign warehouse work.

Kafka helps us preserve business history.

When a product manager asks how long checkout took during a flash sale, the answer is easier if order lifecycle events are retained in a log.

When support wants to rebuild a customer timeline after a bug fix, replay matters.

When analytics needs multiple downstream projections, consumer groups matter.

FluoShop uses Kafka for exactly those reasons.

In v1.4.0 we add a durable `order-timeline` stream.

The Order Service, Payment Service, and Fulfillment Service all publish milestones into that stream.

Separate consumers then build projections for analytics and operations.

## 5.2 Bootstrapping Kafka with explicit producer and consumer wiring

The package README is direct about Kafka.

`@fluojs/microservices` does not spin up hidden Kafka clients for you.

The application passes caller-owned producer and consumer collaborators into `KafkaMicroserviceTransport`.

That keeps broker ownership visible.

It also means group IDs, retry configuration, connection bootstrap, and partition strategy remain application decisions.

### 5.2.1 Topic topology

The transport supports three topic-level options.

- `eventTopic`
- `messageTopic`
- `responseTopic`

The defaults are intentionally generic.

In FluoShop, explicit names are clearer.

- `fluoshop.timeline.events`
- `fluoshop.domain.messages`
- `fluoshop.responses.<instance>`

The response topic should usually stay per client instance.

That is how fluo avoids reply collisions during concurrent request-reply flows.

### 5.2.2 Module wiring

The transport bootstrap looks like this.

```typescript
import { Module } from '@fluojs/core';
import { KafkaMicroserviceTransport, MicroservicesModule } from '@fluojs/microservices';

const transport = new KafkaMicroserviceTransport({
  consumer: kafkaConsumer,
  producer: kafkaProducer,
  eventTopic: 'fluoshop.timeline.events',
  messageTopic: 'fluoshop.domain.messages',
  requestTimeoutMs: 5_000,
});

@Module({
  imports: [MicroservicesModule.forRoot({ transport })],
  providers: [TimelineHandler],
})
export class TimelineModule {}
```

As in earlier chapters, the module stays small.

The framework is not asking you to re-architect handlers.

It is asking you to make the transport contract explicit.

## 5.3 Request-reply on durable topics

Kafka is best known for event streams.

fluo still exposes `send()` on top of Kafka when you need a request-response contract that benefits from durable broker routing.

This is slower and heavier than TCP.

It can still be the right fit when you need broker-mediated decoupling and can accept the extra latency.

### 5.3.1 Per-client response topics

The repository transport code sets `responseTopic` to a UUID-based default when you do not provide one.

That is not a random implementation detail.

It is the safety mechanism that prevents multiple instances from consuming one another's replies.

The tests explicitly verify that concurrent request flows remain isolated.

For FluoShop, this lets the Backoffice Service request a replay snapshot without stealing responses from the Support Service.

Each instance waits on its own response topic.

That keeps correlation understandable.

### 5.3.2 Abort and timeout budgets

Kafka request-reply can reject in several different ways.

- the caller timed out
- the caller aborted before publish
- the caller aborted after publish
- the remote handler threw an error

Those distinctions appear in the transport tests and deserve to appear in your architecture thinking.

If a Support tool cancels a replay request because the agent navigated away, that is not the same as a Timeline Service failure.

If the handler rejects because the date range is invalid, that is a domain error.

If the topic path times out, that is a dependency error.

Good systems keep those outcomes separate.

## 5.4 Event streams and consumer groups

Kafka becomes most valuable when many consumers can process the same durable topic for different purposes.

FluoShop leans into that strength.

The core order timeline topic receives milestones like:

- `order.created`
- `payment.authorized`
- `payment.settled`
- `fulfillment.wave-created`
- `shipment.dispatched`

These are not just notifications.

They are a replayable history.

### 5.4.1 Order timeline topic

One possible handler is straightforward.

```typescript
@EventPattern('order.timeline.append')
async appendTimelineEntry(event: {
  orderId: string;
  occurredAt: string;
  stage: string;
  source: string;
}) {
  await this.timelineStore.append(event);
}
```

The main idea is not that Kafka requires special handler code.

It does not.

The idea is that the topic retains history long enough for other teams to build fresh projections later.

That is the strategic shift from RabbitMQ.

### 5.4.2 Analytics projection

FluoShop adds an Analytics Projection Service in v1.4.0.

It subscribes as its own consumer group.

The Support Dashboard may subscribe as a different group.

Fraud review tooling may subscribe as a third group.

They can all consume the same events without interfering with one another.

That is exactly why Kafka is useful here.

The business does not want one queue deciding which department gets the event.

It wants a shared durable history that each department can process independently.

## 5.5 Partitioning, ordering, and replay

Kafka's operational power comes with design responsibilities.

Ordering is usually only guaranteed within a partition.

Replay is powerful but can amplify bad event design.

Retention is useful only if the events are meaningful enough to rebuild state.

### 5.5.1 Choosing keys in FluoShop

For order lifecycle events, `orderId` is usually the right partition key.

That keeps the milestones for one order in a stable sequence within the same partition.

It also means consumers rebuilding an order timeline do not need cross-partition sorting for the common case.

This design is not perfect for every analytical query.

It is good for the main operational question.

What happened to this order, and in what order did it happen?

### 5.5.2 Replay after an incident

Imagine that the Support Dashboard had a bug and silently ignored `shipment.dispatched` for two hours.

With Kafka, the fix does not require every producing service to republish history.

The dashboard group can rewind offsets and rebuild its projection.

That is the feature FluoShop actually cares about.

Replay reduces coordination cost after consumer-side bugs.

It also turns a painful outage into a manageable recovery exercise.

## 5.6 Operating Kafka in a mixed-transport system

Kafka is not a mandatory center of gravity for the whole platform.

FluoShop remains mixed by design.

- RabbitMQ still owns warehouse work assignment.
- Redis Streams still protects some payment durability paths.
- TCP can still serve simple direct lookups.
- Kafka owns durable shared history and multi-team projections.

This division keeps each transport in the role where it is strongest.

Operationally, teams should watch:

- consumer lag by group
- topic retention and storage growth
- partition skew by key
- replay duration for large projections
- timeout rates on request-reply topics

These signals reveal whether Kafka is serving its intended purpose.

If request-reply timeouts dominate, you may be forcing synchronous behavior onto a transport better suited for logged events.

If replay costs are too high, your projections may be too dependent on raw history without snapshots.

## 5.7 FluoShop v1.4.0 progression

At the end of this chapter, FluoShop gains a durable historical spine.

The platform can now answer different classes of questions.

- What is the current customer-facing state?
- Which warehouse queue is backlogged?
- What exactly happened across the full lifecycle of this order?

That third question becomes much easier once Kafka is present.

Kafka does not replace the transports optimized for direct work.

It preserves the timeline that the rest of the organization wants to analyze, replay, and audit.

## 5.8 Summary

- Kafka is strongest when the business benefits from durable shared history, consumer groups, and replay.
- fluo keeps Kafka bootstrap explicit through caller-owned producer and consumer collaborators.
- per-client response topics make Kafka request-reply safe for concurrent service instances.
- partition keys should follow business ordering needs, not convenience alone.
- FluoShop now writes a replayable order timeline that analytics, support, and fraud tooling can consume independently.

RabbitMQ taught us how to assign work.

Kafka teaches us how to preserve and reuse business history.

That is why both transports belong in the same system.
