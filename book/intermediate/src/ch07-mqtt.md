<!-- packages: @fluojs/microservices, mqtt -->
<!-- project-state: FluoShop v1.6.0 -->

# 7. MQTT

MQTT enters FluoShop when the platform stops talking only to server processes.

By v1.6.0, the system also listens to warehouse devices, smart lockers, and cold-chain sensors attached to the shipping flow.

These producers are not all full backend services.

Some are constrained devices.

Some connect over unstable networks.

Some need retained last-known state more than rich historical replay.

That is the world where MQTT becomes useful.

The main idea of this chapter is simple.

FluoShop can extend beyond service-to-service messaging and still keep the same fluo handler model.

## 7.1 Why MQTT in FluoShop

MQTT is topic-based, lightweight, and designed for intermittent or resource-constrained clients.

That makes it a strong fit for device and telemetry scenarios.

FluoShop uses MQTT for shipping and warehouse edge signals.

Examples include:

- cold-chain temperature probes on perishable shipments
- smart locker status updates
- handheld scanner acknowledgments from pickers
- courier ETA beacons

These signals matter operationally.

They do not all need Kafka-level replay.

They often do need sensible QoS and retained state behavior.

## 7.2 MQTT transport setup

Unlike the caller-owned brokers in NATS, Kafka, and RabbitMQ, MQTT can be used either with a supplied client or with a URL that lets the transport resolve its own connection via the `mqtt` package.

That flexibility matches real deployment patterns.

Some teams already manage a shared MQTT client.

Others prefer transport-local ownership.

### 7.2.1 Core options

`MqttMicroserviceTransport` exposes more delivery-shape options than many other transports.

- `namespace`
- `eventTopic`
- `messageTopic`
- `replyTopic`
- `requestTimeoutMs`
- `eventQos`, `messageQos`, `responseQos`
- `eventRetain`, `messageRetain`, `responseRetain`

If you only provide a namespace, the transport derives topic names below it.

That is a good default for FluoShop.

The system can use `fluoshop.devices` as a namespace and let the transport derive event, message, and response topics beneath it.

### 7.2.2 Module wiring

```typescript
import { Module } from '@fluojs/core';
import { MicroservicesModule, MqttMicroserviceTransport } from '@fluojs/microservices';

const transport = new MqttMicroserviceTransport({
  url: process.env.MQTT_URL,
  namespace: 'fluoshop.devices',
  eventQos: 1,
  messageQos: 1,
  responseQos: 1,
  eventRetain: false,
  responseRetain: false,
  requestTimeoutMs: 2_000,
});

@Module({
  imports: [MicroservicesModule.forRoot({ transport })],
  providers: [ShipmentTelemetryHandler],
})
export class ShipmentTelemetryModule {}
```

This setup is intentionally plain.

As always, the handler model stays stable.

The transport changes how messages move, not how providers express business logic.

## 7.3 Request-reply over MQTT

Many developers think of MQTT only as event pub/sub.

fluo adds request-reply support by publishing message frames with a `replyTopic` and correlating responses by `requestId`.

That lets FluoShop send device commands and await acknowledgments.

### 7.3.1 Device command acknowledgments

Suppose a smart locker must confirm that a pickup compartment has opened.

The API does not want to wait forever.

It does want a bounded response path.

```typescript
@MessagePattern('locker.open-compartment')
async openCompartment(input: { lockerId: string; compartmentId: string }) {
  return await this.lockerGateway.open(input);
}
```

The locker edge service can process the command and reply through the MQTT response topic.

This pattern is especially useful when devices are MQTT-native but the application still wants a request-style programming model.

### 7.3.2 Reply topics and timeouts

The transport uses a per-instance reply topic by default.

The tests verify that the generated topic matches `fluo.microservices.responses.<uuid>` when defaults are used.

That mirrors the reply-isolation story we already saw in RabbitMQ and Kafka.

Timeouts matter even more with devices than with server processes.

Connectivity can be unstable.

A locker that does not answer within the request budget should surface as a transient edge failure, not as a hanging web request.

## 7.4 Event delivery for telemetry

MQTT becomes especially expressive when you start thinking about QoS and retained state.

FluoShop uses both concepts to model real operational signals.

### 7.4.1 Retained state snapshots

A cold-chain sensor may publish the latest trailer temperature.

New subscribers often need the most recent reading immediately.

That is exactly what retained messages are for.

If you configure a retained event channel for a state snapshot topic, new observers do not need to wait for the next natural update before seeing the current state.

This is different from historical replay.

It is a last-known-value strategy.

That distinction is important.

### 7.4.2 QoS trade-offs

QoS settings are business decisions, not just transport toggles.

- QoS 0 favors low overhead and accepts loss.
- QoS 1 favors at-least-once delivery with possible duplicates.
- QoS 2 is stricter but more expensive.

In FluoShop, a rapidly updating courier ETA beacon may fit QoS 0.

A smart-locker open command probably deserves QoS 1.

A retained warehouse status snapshot may also use QoS 1 so late subscribers reliably receive the brokered state.

## 7.5 FluoShop delivery monitoring

MQTT extends the platform beyond the datacenter.

That changes the kinds of stories the system can tell.

### 7.5.1 Cold-chain alerts

If a refrigerated shipment exceeds the temperature threshold, the edge gateway can emit `shipment.temperature-alert`.

The Notification Service can react.

The Operations Dashboard can react.

A compliance recorder can react.

None of them need to be part of the sensor's direct request path.

That is the same decoupling principle we saw with earlier transports, applied to physical-world telemetry.

### 7.5.2 Order ETA updates

Courier devices can also publish ETA updates.

The Customer Experience Service may reduce those into a simplified order-tracking status.

The important design point is that MQTT does not need to own the final customer-facing representation.

It only needs to carry edge-originated facts into the platform reliably enough for the downstream systems to respond.

## 7.6 Operations and security

MQTT is often deployed in environments with more network variability and more identity diversity than purely internal service meshes.

That means FluoShop should treat broker auth, topic namespace design, and retained-message scope as security-sensitive architecture choices.

Operationally, teams should watch:

- publish failure rates from edge clients
- timeout rates for request-reply commands
- retained topic sprawl
- duplicate delivery patterns on QoS 1 paths
- reconnect churn for device gateways

These signals tell you whether MQTT is serving as a healthy edge-ingestion layer or quietly accumulating delivery debt.

## 7.7 FluoShop v1.6.0 progression

At the end of this chapter, FluoShop is no longer only a set of server-side services.

It is a platform that can absorb device and telemetry input.

That makes the architecture more realistic.

Modern commerce systems often depend on scanners, lockers, courier apps, and sensor networks.

MQTT gives those integrations a transport that respects their environment.

## 7.8 Summary

- MQTT is a strong fit for edge, device, and telemetry scenarios with constrained or unstable connectivity.
- fluo supports both event and request-reply patterns on MQTT through topic and reply-topic routing.
- QoS and retain settings should follow business semantics, not generic defaults.
- per-instance reply topics keep concurrent request flows isolated.
- FluoShop now uses MQTT to bring locker, courier, and cold-chain signals into the platform.

The broader lesson is architectural again.

A transport choice should reflect the shape of the network and the producers on that network.

MQTT belongs in FluoShop because the system now reaches the physical edge.
