<!-- packages: @fluojs/microservices, @grpc/grpc-js, @grpc/proto-loader -->
<!-- project-state: FluoShop v1.7.0 -->

# 8. gRPC

gRPC is not a message broker.

It still belongs at the end of Part 1 because this part is really about transport choices, not only broker brands.

By v1.7.0, FluoShop has durable queues, replayable streams, fast control-plane subjects, and edge telemetry topics.

What it still needs is a strongly typed RPC boundary for service contracts that benefit from explicit schemas and streaming.

That is where gRPC enters.

In fluo, gRPC sits beside the other microservice transports rather than above them.

You still get the same dependency injection model.

You still use patterns.

You simply move from broker-oriented framing to proto-defined RPC contracts.

## 8.1 Why gRPC in FluoShop

FluoShop uses gRPC where strict contracts and streaming semantics are more valuable than broker decoupling.

Typical examples include:

- internal pricing and quote APIs between Gateway and Checkout
- server-streamed order tracking updates
- client-streamed warehouse scan batches
- bidirectional courier sessions

These links benefit from protobuf schemas, generated client expectations, and well-defined streaming modes.

They do not need to be expressed as queue work items.

They need to be expressed as precise RPC contracts.

## 8.2 Proto-first transport setup

`GrpcMicroserviceTransport` is the richest transport in the package.

The README documents its unary and streaming support, and the public API exports streaming decorators directly from the root barrel.

That gives us a strong signal about intended usage.

gRPC in fluo is not limited to simple request-reply.

It is a first-class transport for unary plus server, client, and bidirectional streaming.

### 8.2.1 Core options

The transport requires several configuration values.

- `protoPath`
- `packageName`
- `url`
- `services` when you want to limit registration
- `requestTimeoutMs`
- `loaderOptions`
- `channelOptions`
- `kindMetadataKey` and related message or event metadata values when needed

That list is longer than other transports because gRPC is schema-first.

The extra explicitness is part of the value.

### 8.2.2 Module wiring

```typescript
import { Module } from '@fluojs/core';
import { GrpcMicroserviceTransport, MicroservicesModule } from '@fluojs/microservices';

const transport = new GrpcMicroserviceTransport({
  protoPath: new URL('./proto/fluoshop.proto', import.meta.url).pathname,
  packageName: 'fluoshop.checkout',
  url: '0.0.0.0:50051',
  services: ['CheckoutService', 'TrackingService'],
  requestTimeoutMs: 2_500,
});

@Module({
  imports: [MicroservicesModule.forRoot({ transport })],
  providers: [CheckoutRpcHandler, TrackingRpcHandler],
})
export class CheckoutRpcModule {}
```

This still looks like the same fluo story.

The transport changes.

The module and provider structure stay familiar.

## 8.3 Unary RPC with typed contracts

Unary gRPC calls are the closest equivalent to earlier request-response transports.

The difference is that protobuf now defines the contract shape explicitly.

The transport expects patterns in `<Service>.<Method>` form for unary and event-style unary calls.

### 8.3.1 Pricing and checkout quote requests

Suppose Checkout needs a strongly typed pricing quote before final confirmation.

That is a good gRPC boundary.

The call is synchronous.

The schema matters.

The team may have multiple clients implemented in different languages later.

```proto
service CheckoutService {
  rpc GetQuote (QuoteRequest) returns (QuoteReply);
}
```

```typescript
@MessagePattern('CheckoutService.GetQuote')
async getQuote(input: { orderId: string; loyaltyTier: string }) {
  return await this.quoteService.calculate(input);
}
```

The handler remains compact.

The contract precision lives in the `.proto` file.

That split is healthy.

### 8.3.2 Event-style unary with metadata kind

gRPC in fluo can also emit event-style unary calls.

The transport uses metadata such as `x-fluo-kind` by default to distinguish message versus event behavior.

That detail matters when you want an RPC call that semantically behaves like an event acknowledgment rather than a classic request for data.

For example, the Compliance Service might emit a `TrackingService.RecordCheckpoint` event-style unary call that only needs remote acknowledgment.

This keeps the contract strongly typed without pretending every interaction is a broker event.

## 8.4 Streaming patterns

Streaming is where gRPC becomes clearly distinct from the other transports in this part.

The root barrel exports three decorators that signal the full surface.

- `@ServerStreamPattern`
- `@ClientStreamPattern`
- `@BidiStreamPattern`

The repository tests spend substantial effort covering all three modes.

That is a sign that they are not edge features.

They are part of the intended public contract.

### 8.4.1 Server-streaming order tracking

Server streaming works well when one request should open a stream of updates.

In FluoShop, customer support may subscribe to live order checkpoints after an escalation begins.

```typescript
@ServerStreamPattern('TrackingService.StreamOrder')
async streamOrder(
  input: { orderId: string },
  writer: ServerStreamWriter<{ stage: string; occurredAt: string }>,
) {
  for await (const checkpoint of this.trackingService.stream(input.orderId)) {
    writer.write(checkpoint);
  }

  writer.end();
}
```

This model is more natural than repeatedly polling through HTTP or encoding a pseudo-stream over a queue.

### 8.4.2 Client-streaming warehouse batch scans

Client streaming works well when many small messages should produce one summary reply.

Warehouse handheld devices are a good example.

They may upload a batch of scan results collected during a pick wave.

The server receives the stream, validates the batch, and returns one aggregate response.

This reduces chattiness while keeping the contract typed.

### 8.4.3 Bidirectional courier sessions

Bidirectional streaming is the richest pattern.

It allows both sides to send messages independently on one logical session.

FluoShop can use this for courier handoff or dispatch consoles.

The courier app sends location pings and delivery state changes.

The backend can respond with reroute hints, signature requirements, or escalation instructions.

That interaction would be awkward on a broker alone.

gRPC makes it an explicit session contract.

## 8.5 Timeouts, cancellation, and observability

The transport supports `requestTimeoutMs` for unary-style requests.

The repository tests also cover cancellation and stream error propagation behavior.

These details matter because typed contracts do not remove distributed failure.

They only make it easier to define what a healthy call looks like.

In FluoShop, teams should still decide:

- which unary calls are latency-sensitive
- which streams may stay open for minutes
- how client cancellation should map into user-facing status
- how logger-driven event failures should be observed

gRPC improves contract precision.

It does not eliminate the need for operational judgment.

## 8.6 FluoShop v1.7.0 architecture

By the end of Part 1, FluoShop has become a transport-diverse system with clear intent per link.

- TCP serves simple direct reads.
- Redis Streams protects some durable business workflows.
- RabbitMQ owns warehouse queues.
- Kafka stores replayable history.
- NATS handles fast control-plane coordination.
- MQTT ingests edge telemetry.
- gRPC provides typed RPC and streaming contracts.

This is the real lesson of the part.

Transport diversity is manageable when handler structure stays stable and each link has a reason for existing.

gRPC completes the picture because some boundaries are best expressed as schemas and streams rather than queues or topics.

## 8.7 Summary

- gRPC belongs in the transport toolbox even though it is not a broker.
- fluo supports unary plus server, client, and bidirectional streaming through first-class decorators.
- protobuf contracts make cross-service RPC boundaries explicit and language-friendly.
- metadata-driven event-style unary calls let teams keep strong typing without forcing everything into request-response semantics.
- FluoShop now uses gRPC for typed checkout, tracking, and courier session contracts.

Part 1 started with direct transport thinking.

It ends with a broader principle.

Choose the transport that matches the business boundary, then keep the handler model stable enough that the system can evolve chapter by chapter.
