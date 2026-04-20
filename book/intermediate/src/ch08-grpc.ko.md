<!-- packages: @fluojs/microservices, @grpc/grpc-js, @grpc/proto-loader -->
<!-- project-state: FluoShop v1.7.0 -->

# 8. gRPC

gRPC는 메시지 브로커가 아닙니다.

그래도 Part 1의 끝에 위치하는 이유는 이 파트의 본질이 broker 브랜드 소개가 아니라 transport choice 전체를 다루기 때문입니다.

v1.7.0이 되면 FluoShop에는 durable queue, replayable stream, 빠른 control-plane subject, edge telemetry topic이 모두 존재합니다.

그럼에도 아직 필요한 것이 하나 남아 있습니다.

명시적 schema와 streaming의 이점을 얻을 수 있는 service contract를 위한 strongly typed RPC boundary입니다.

바로 그 지점에서 gRPC가 등장합니다.

fluo에서 gRPC는 다른 microservice transport 위에 군림하는 특별한 계층이 아니라, 그들과 나란히 놓이는 transport입니다.

DI 모델은 그대로 유지됩니다.

pattern도 계속 사용합니다.

단지 broker-oriented framing에서 proto-defined RPC contract로 이동할 뿐입니다.

## 8.1 Why gRPC in FluoShop

FluoShop은 strict contract와 streaming semantics가 broker decoupling보다 더 중요한 경계에서 gRPC를 사용합니다.

대표적인 예시는 다음과 같습니다.

- Gateway와 Checkout 사이의 internal pricing 및 quote API
- server-streamed order tracking update
- client-streamed warehouse scan batch
- bidirectional courier session

이 링크들은 protobuf schema, generated client expectation, 잘 정의된 streaming mode의 이점을 봅니다.

이를 queue work item으로 표현할 필요는 없습니다.

정밀한 RPC contract로 표현하는 편이 더 적합합니다.

## 8.2 Proto-first transport setup

`GrpcMicroserviceTransport`는 패키지에서 가장 풍부한 transport입니다.

README는 unary와 streaming 지원을 문서화하고 있으며, public API는 root barrel에서 streaming decorator를 직접 export합니다.

이것은 의도된 사용 방식에 대한 강한 신호입니다.

fluo의 gRPC는 단순 request-reply에만 머물지 않습니다.

unary와 server, client, bidirectional streaming을 모두 아우르는 first-class transport입니다.

### 8.2.1 Core options

이 transport는 여러 설정값을 요구합니다.

- `protoPath`
- `packageName`
- `url`
- 등록 범위를 제한하고 싶을 때의 `services`
- `requestTimeoutMs`
- `loaderOptions`
- `channelOptions`
- 필요 시 `kindMetadataKey`와 관련 message 또는 event metadata 값

다른 transport보다 목록이 긴 이유는 gRPC가 schema-first이기 때문입니다.

이 추가적인 명시성이 바로 가치의 일부입니다.

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

이것도 여전히 같은 fluo 이야기입니다.

transport만 달라집니다.

module과 provider 구조는 익숙하게 유지됩니다.

## 8.3 Unary RPC with typed contracts

Unary gRPC 호출은 이전 request-response transport와 가장 비슷한 대응물입니다.

다만 이제는 protobuf가 계약의 형태를 명시적으로 정의합니다.

transport는 unary와 event-style unary 호출 모두에 대해 `<Service>.<Method>` 형식의 pattern을 기대합니다.

### 8.3.1 Pricing and checkout quote requests

Checkout가 최종 확정 전에 strongly typed pricing quote를 받아야 한다고 가정해 봅시다.

이것은 좋은 gRPC 경계입니다.

호출은 동기적입니다.

schema가 중요합니다.

나중에 여러 언어로 구현된 클라이언트가 붙을 수도 있습니다.

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

핸들러는 여전히 간결합니다.

계약의 정밀함은 `.proto` 파일에 있습니다.

이 분리는 건강합니다.

### 8.3.2 Event-style unary with metadata kind

fluo의 gRPC는 event-style unary call도 발행할 수 있습니다.

transport는 기본적으로 `x-fluo-kind` 같은 metadata를 사용해 message와 event 동작을 구분합니다.

이 세부 사항은 어떤 RPC 호출이 데이터를 요청하는 classic request라기보다 event acknowledgment처럼 동작해야 할 때 중요합니다.

예를 들어 Compliance Service는 단순히 원격 확인만 필요로 하는 `TrackingService.RecordCheckpoint` event-style unary call을 보낼 수 있습니다.

이 방식은 모든 상호작용을 broker event로 억지 변환하지 않고도 strong typing을 유지하게 해줍니다.

## 8.4 Streaming patterns

streaming은 gRPC가 이 파트의 다른 transport와 분명히 달라지는 지점입니다.

root barrel은 전체 표면을 보여 주는 세 가지 decorator를 export합니다.

- `@ServerStreamPattern`
- `@ClientStreamPattern`
- `@BidiStreamPattern`

저장소 테스트도 이 세 모드 전부를 꽤 깊게 다룹니다.

즉 이것은 주변 기능이 아닙니다.

의도된 공개 계약의 일부입니다.

### 8.4.1 Server-streaming order tracking

server streaming은 하나의 요청이 업데이트 스트림을 열어야 할 때 잘 맞습니다.

FluoShop에서 customer support는 escalation이 시작된 뒤 live order checkpoint를 구독할 수 있습니다.

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

이 모델은 HTTP polling을 반복하거나 queue 위에 pseudo-stream을 억지로 얹는 것보다 자연스럽습니다.

### 8.4.2 Client-streaming warehouse batch scans

client streaming은 많은 작은 메시지가 하나의 요약 응답으로 이어져야 할 때 잘 맞습니다.

warehouse handheld device가 좋은 예시입니다.

pick wave 동안 수집된 scan result 배치를 업로드할 수 있습니다.

서버는 stream을 받아 배치를 검증하고 하나의 aggregate response를 반환합니다.

이 방식은 채팅성 요청을 줄이면서도 계약을 typed하게 유지합니다.

### 8.4.3 Bidirectional courier sessions

bidirectional streaming은 가장 풍부한 패턴입니다.

양쪽이 하나의 논리적 세션 위에서 독립적으로 메시지를 보낼 수 있습니다.

FluoShop은 courier handoff나 dispatch console에 이를 사용할 수 있습니다.

courier 앱은 위치 ping과 배송 상태 변화를 보냅니다.

백엔드는 reroute 힌트, 서명 요구 사항, escalation instruction을 되돌려줄 수 있습니다.

이 상호작용은 broker만으로는 어색합니다.

gRPC는 이를 명시적인 session contract로 만듭니다.

## 8.5 Timeouts, cancellation, and observability

transport는 unary 스타일 요청에 대해 `requestTimeoutMs`를 지원합니다.

저장소 테스트는 cancellation과 stream error propagation도 다룹니다.

typed contract가 있다고 해서 distributed failure가 사라지는 것은 아니기 때문에 이런 세부 사항이 중요합니다.

typed contract는 건강한 호출이 무엇인지 정의하기 쉽게 만들어 줄 뿐입니다.

FluoShop에서 팀은 여전히 다음을 결정해야 합니다.

- 어떤 unary call이 latency-sensitive한가
- 어떤 stream이 몇 분 동안 열려 있을 수 있는가
- client cancellation을 user-facing status로 어떻게 매핑할 것인가
- logger-driven event failure를 어떻게 관측할 것인가

gRPC는 contract precision을 개선합니다.

운영 판단의 필요성을 없애 주지는 않습니다.

## 8.6 FluoShop v1.7.0 architecture

Part 1의 끝에 이르면 FluoShop은 링크마다 의도가 분명한 transport-diverse system이 됩니다.

- TCP는 단순한 direct read를 제공합니다.
- Redis Streams는 일부 durable business workflow를 보호합니다.
- RabbitMQ는 warehouse queue를 소유합니다.
- Kafka는 replayable history를 저장합니다.
- NATS는 빠른 control-plane coordination을 담당합니다.
- MQTT는 edge telemetry를 수집합니다.
- gRPC는 typed RPC와 streaming contract를 제공합니다.

이것이 이 파트의 진짜 교훈입니다.

handler structure가 안정적으로 유지되고 각 링크에 존재 이유가 있을 때 transport diversity는 충분히 관리 가능합니다.

gRPC는 어떤 경계는 queue나 topic보다 schema와 stream으로 표현하는 편이 더 적절하다는 사실을 보여 주며 이 그림을 완성합니다.

## 8.7 Summary

- gRPC는 broker가 아니더라도 transport toolbox 안에 들어가야 합니다.
- fluo는 first-class decorator를 통해 unary와 server, client, bidirectional streaming을 모두 지원합니다.
- protobuf contract는 cross-service RPC boundary를 명시적이고 다언어 친화적으로 만듭니다.
- metadata-driven event-style unary call은 모든 것을 request-response로 강제하지 않으면서도 strong typing을 유지하게 해줍니다.
- 이제 FluoShop은 typed checkout, tracking, courier session contract에 gRPC를 사용합니다.

Part 1은 direct transport 사고에서 시작했습니다.

그리고 더 넓은 원리로 끝납니다.

비즈니스 경계에 맞는 transport를 고르고, 시스템이 장마다 진화할 수 있도록 handler model은 충분히 안정적으로 유지하라는 원리입니다.
