<!-- packages: @fluojs/runtime, @fluojs/http, @fluojs/core, @fluojs/di -->
<!-- project-state: T16 Part 3 source-analysis draft for runtime branching across root, Node, and Web-standard execution surfaces -->

# 10. Runtime Branching: Node vs Web vs Edge

## 10.1 Fluo branches by package surface and adapter seams more than by giant runtime conditionals
Chapter 10에 오면 가장 먼저 봐야 할 사실은,
Fluo의 runtime portability가 하나의 거대한
`if (isNode) ... else if (isEdge) ...` 블록으로 구현되지 않는다는 점입니다.
branch point는 훨씬 더 좁고,
훨씬 더 아키텍처적입니다.

`path:packages/runtime/src/bootstrap.ts:920-1202`의 핵심 bootstrap logic 대부분은 transport-neutral합니다.
module graph를 compile하고,
DI container를 만들고,
runtime token을 등록하고,
lifecycle instance를 resolve하고,
hook을 실행하고,
application/context shell을 조립합니다.
이 코드 어디에도 Node인지,
Web platform인지,
edge runtime인지 묻는 거대한 분기문은 없습니다.

실제 branching은 host-specific capability가 필요한 seam에서만 일어납니다.
그 seam은 크게 세 곳에서 보입니다.
첫째,
package export map이 각 subpath에서 무엇이 public인지 결정합니다.
둘째,
transport adapter가 raw request/response를 framework object로 바꾸는 방식을 결정합니다.
셋째,
shutdown과 server orchestration helper는 root runtime barrel이 아니라 Node-only file에 위치합니다.

그래서 장 제목이 "runtime fork"가 아니라 "runtime branching"입니다.
Fluo는 host마다 runtime 전체를 복제하지 않습니다.
공통 runtime shell은 중앙에 두고,
명시적인 surface boundary에서만 분기합니다.

이 철학은 `path:packages/runtime/src/exports.test.ts:12-79`에 코드로 박혀 있습니다.
테스트는 root runtime barrel이 transport-neutral해야 하고,
Node-only helper는 `./node`에 있어야 하며,
Web helper는 `./web`에 있어야 하고,
lower-level adapter seam은 `./internal/...` subpath에 있어야 한다고 강제합니다.

즉 Fluo에서 portability는 구현 세부만의 문제가 아닙니다.
package topology 자체가 runtime contract의 일부입니다.

구현 관점에서 요약하면 다음과 같습니다.

```text
shared bootstrap shell in root runtime
  + explicit Node subpath for Node-only helpers
  + explicit Web subpath for Request/Response normalization
  + explicit internal seams for adapter-level composition
```

이 프레임이 이 장 전체의 배경입니다.
Node,
Web,
Edge는 서로 독립된 세 runtime이 아니라,
하나의 transport-neutral bootstrap core에 서로 다른 host I/O semantics를 붙이는 세 방식입니다.

## 10.2 The root runtime barrel is intentionally transport-neutral and the export map enforces it
root public surface는 `path:packages/runtime/src/index.ts:1-30`에 정의되어 있습니다.
여기서는 bootstrap API,
error,
diagnostics,
health helper,
platform contract,
request-transaction helper,
선별된 runtime token만 export합니다.
Node adapter helper나 Web request-dispatch helper는 export하지 않습니다.

이 omission은 우연이 아닙니다.
`path:packages/runtime/src/exports.test.ts:13-29`가 직접 검증합니다.
root barrel에는 `dispatchWebRequest`,
`createWebRequestResponseFactory`,
`createNodeShutdownSignalRegistration`,
`bootstrapHttpAdapterApplication`이 있으면 안 됩니다.

즉 root runtime API는 portable bootstrap concern만 중심에 두고 큐레이션됩니다.
모든 host가 공유할 수 있는 것만 노출합니다.
`FluoFactory`,
`fluoFactory`,
`APPLICATION_LOGGER`, `PLATFORM_SHELL` 같은 runtime token,
그리고 공유 runtime type system이 여기에 속합니다.

`path:packages/runtime/package.json:27-56`의 package export map은 이 큐레이션을 package-resolution 단계에서 강제합니다.
명시적인 subpath는 다음과 같습니다.
`.`,
`./node`,
`./web`,
`./internal`,
`./internal/http-adapter`,
`./internal/request-response-factory`,
`./internal-node`입니다.

이 점이 중요한 이유는 export map이 documentation보다 강하기 때문입니다.
임의의 deep import로 internal file이나 host-specific file을 끌어다 쓰는 것을 막아 줍니다.
즉 runtime branching policy는 package boundary 자체에 encoded되어 있습니다.

`path:packages/runtime/src/node/node.test.ts:7-55`도 consumer 관점에서 같은 규칙을 강화합니다.
이 테스트는 root runtime API에 `bootstrapNodeApplication`,
`createNodeHttpAdapter`,
`runNodeApplication`이 없어야 한다고 단언합니다.
이 helper들은 Node subpath에서만 합법입니다.

`path:packages/runtime/src/exports.test.ts:61-78`은 package export map과 `typesVersions`가 이 narrowed entrypoint를 선언하는지도 검사합니다.
바로 여기서 runtime branching은 구현 세부를 넘어 안정적인 published contract가 됩니다.

요컨대 root runtime barrel은 이런 질문에 답합니다.
"모든 runtime이 공통으로 공유할 수 있는 것은 무엇인가?"
host-specific한 것은 의도적으로 그 surface 밖으로 밀려납니다.

결과적인 branch model은 다음과 같습니다.

```text
root runtime surface:
  portable bootstrap and contracts only

subpaths:
  host-specific or lower-level transport helpers only
```

이 설계는 portability mistake를 눈에 띄게 만듭니다.
application code가 Node helper를 import한다면,
그 import path 자체가 이미 portability cost를 선언하고 있는 셈입니다.

## 10.3 The Node branch packages server lifecycle, retries, compression, and shutdown behind the ./node subpath
public Node entrypoint는 `path:packages/runtime/src/node.ts:1-18`입니다.
이 파일은 logger factory와 `./node/internal-node.js`의 일부 API만 re-export합니다.
파일이 아주 작다는 사실 자체가 의미심장합니다.
Node branch는 깊은 구현 파일 위에 놓인 curated façade에 가깝습니다.

실제 구현은 `path:packages/runtime/src/node/internal-node.ts:1-421`에 있습니다.
여기서야 비로소 runtime은 root runtime이 가정할 수 없는 capability를 직접 다룹니다.
Node HTTP/HTTPS server,
sockets,
listen retry behavior,
compression wiring,
process-signal shutdown helper가 모두 이 파일에 있습니다.

`path:packages/runtime/src/node/internal-node.ts:108-194`의 `NodeHttpApplicationAdapter`가 핵심 Node transport object입니다.
이 adapter는 native server,
request/response factory,
drain-aware shutdown을 위한 socket set을 소유합니다.
이런 것은 root runtime의 abstract adapter contract가 알 수 없는 영역입니다.

constructor는 request-response factory를 만들고,
`httpsOptions` 여부에 따라 HTTP 또는 HTTPS server를 만들며,
나중에 lingering socket을 강제 종료할 수 있도록 connection을 추적합니다.

listen은 `path:packages/runtime/src/node/internal-node.ts:294-320`의 `listenNodeServerWithRetry()`가 처리합니다.
이 helper는 `EADDRINUSE` 에러를 설정된 한도까지 재시도합니다.
이 동작은 명백히 Node-host logic입니다.
portable bootstrap core가 아니라 Node branch에 있어야 할 책임입니다.

shutdown은 `path:packages/runtime/src/node/internal-node.ts:335-368`의 `closeNodeServerWithDrain()`이 처리합니다.
이 함수는 server를 닫고,
idle connection을 닫고,
drain timeout을 넘기면 socket을 강제로 닫습니다.
역시 root runtime과 분리된 host-specific operational logic입니다.

`path:packages/runtime/src/node/internal-node.ts:240-253`의 `createNodeHttpAdapter()`는 이러한 Node concern을 portable한 `HttpApplicationAdapter` 구현으로 포장합니다.
`path:packages/runtime/src/node/internal-node.ts:255-264`의 `bootstrapNodeApplication()`은 그 adapter를 공유 HTTP bootstrap path에 주입합니다.
`path:packages/runtime/src/node/internal-node.ts:266-277`의 `runNodeApplication()`은 거기에 shutdown-signal registration까지 얹습니다.

테스트는 의도된 public contract를 설명합니다.
`path:packages/runtime/src/node/node.test.ts:14-48`은 adapter 기본 포트가 `process.env.PORT`가 아니라 `3000`임을 보여 줍니다.
이것도 explicitness choice입니다.
Node-specific convenience가 ambient process configuration을 묵시적으로 끌고 들어오지 못하게 합니다.

같은 파일의 `path:packages/runtime/src/node/node.test.ts:50-54`는 Node compression internal이 public Node subpath에 노출되지 않음을 검증합니다.
즉 Node branch 내부에서도 supported public helper와 low-level implementation detail을 구분합니다.

Node branch는 다음처럼 그릴 수 있습니다.

```text
./node public surface
  -> createNodeHttpAdapter()
  -> bootstrapNodeApplication()
  -> runNodeApplication()
  -> logger + shutdown helpers

internally
  -> native server creation
  -> request/response normalization
  -> listen retry
  -> drain-aware shutdown
  -> optional compression wiring
```

여기서 중요한 아키텍처 포인트는 단순히 Node가 special helper를 가진다는 사실이 아닙니다.
그 helper를 root runtime surface를 오염시키지 않고도 제공한다는 사실입니다.

## 10.4 The Web and Edge branch reuse the Web-standard Request/Response seam instead of inventing separate runtimes
Web branch는 `path:packages/runtime/src/web.ts:1-606`에 있습니다.
역할은 bootstrap을 다시 구현하는 것이 아닙니다.
native Web `Request`와 `Response` semantics를 Fluo의 framework request/response contract로 정규화하는 것입니다.

핵심 public API는 `path:packages/runtime/src/web.ts:246-274`의 `createWebRequestResponseFactory()`와,
`path:packages/runtime/src/web.ts:282-297`의 `dispatchWebRequest()`입니다.
이것이 Node adapter path에 대응하는 Web-standard branch입니다.

실제 정규화는 `path:packages/runtime/src/web.ts:309-...`의 `createWebFrameworkRequest()`가 담당합니다.
URL,
header,
cookie,
body content,
multipart payload,
optional raw body retention을 모두 처리합니다.
응답 측에서는 `MutableWebFrameworkResponse`와 `WebResponseStream`이 SSE-friendly streaming semantics까지 구현합니다.

`path:packages/runtime/src/web.test.ts:7-146`의 테스트는 이 branch가 무엇을 약속하는지 정확히 보여 줍니다.
native `Request`를 framework request shape으로 번역하고,
framework error를 native `Response`로 serialize하며,
SSE streaming을 지원하고,
oversized streaming request body를 무제한으로 읽기 전에 거부합니다.

이 마지막 속성은 Edge-style host에서 특히 중요합니다.
edge runtime은 대개 Node socket이 아니라 Web-standard `Request`/`Response` API를 제공합니다.
Fluo는 이 동일한 Web-standard normalization seam을 통해 edge host를 지원할 수 있습니다.
별도의 edge bootstrap system을 만들 필요가 없습니다.

그래서 장 제목이 `Node vs Web vs Edge`입니다.
runtime package 안에 dedicated `edge.ts` 파일은 없지만,
개념적으로 Edge branch는 Web-standard path의 specialization입니다.
host가 Web `Request`와 `Response` semantics를 준다면,
runtime은 바로 이 Web seam을 통해 붙습니다.

따라서 branch model은 다음과 같습니다.

```text
Node host:
  raw server + socket lifecycle -> Node adapter

Web-standard host:
  Request/Response + AbortSignal -> Web request/response factory

Edge host:
  usually enters through the same Web-standard seam
```

바뀌는 것은 transport edge입니다.
그 위에 있는 shared dispatcher와 더 높은 runtime shell은 그대로 유지됩니다.

바로 이것이 portability win입니다.
Fluo는 Node용 dispatcher와 Edge용 dispatcher를 따로 둘 필요가 없습니다.
raw transport family마다 normalization seam 하나면 충분합니다.

## 10.5 Shared request/response factories are the narrow bridge that keeps higher runtime behavior identical across hosts
전체 branching 이야기를 한 번에 이해하게 해 주는 파일은
`path:packages/runtime/src/adapters/request-response-factory.ts:1-63`입니다.
이 파일이 raw I/O와 framework dispatcher 사이의 host-agnostic bridge입니다.

`RequestResponseFactory` interface는 단 다섯 가지만 요구합니다.
raw request로부터 framework request를 만들 것,
raw response나 host primitive로부터 abort signal을 만들 것,
framework response를 만들 것,
request id를 해석할 것,
error response를 쓸 것입니다.

그 위에서 `dispatchWithRequestResponseFactory()`가 나머지를 담당합니다.
framework response를 만들고,
abort signal을 얻고,
framework request를 만들고,
dispatcher가 준비되지 않았으면 throw하며,
request를 dispatch하고,
아무 것도 commit되지 않았으면 빈 응답을 자동으로 보내고,
실패 시 signal이 이미 abort되었거나 response가 이미 committed된 경우를 제외하고는 normalized error response를 기록합니다.

이 helper가 runtime branching의 진짜 anti-duplication seam입니다.
Node branch와 Web branch는 각각 dispatcher invocation,
empty-response fallback,
error-serialization flow를 따로 구현하지 않습니다.
서로 다른 factory만 공급합니다.

대칭 구조는 source에서 바로 보입니다.
Node의 `createNodeRequestResponseFactory()`는 `path:packages/runtime/src/node/internal-node.ts:196-238`에 있고,
Web의 `createWebRequestResponseFactory()`는 `path:packages/runtime/src/web.ts:246-274`에 있습니다.
둘 다 같은 interface를 반환하고,
둘 다 이후에는 `dispatchWithRequestResponseFactory()`에 의해 소비됩니다.

즉 host-specific divergence는 좁고 명시적입니다.
그 위의 higher-level runtime behavior는 동일하게 유지됩니다.

```text
host-specific factory
  -> dispatchWithRequestResponseFactory()
  -> shared dispatcher behavior
  -> shared commit fallback
  -> shared error handling shape
```

이 seam이 존재하기 때문에,
runtime의 나머지 부분은 놀랄 만큼 안정적으로 남을 수 있습니다.
`bootstrapApplication()`은 최종 host가 Node인지 Edge worker인지 자체에는 관심이 없습니다.
호환 가능한 adapter나 dispatch seam이 있는지만 중요합니다.

이 점은 앞서 본 export boundary도 설명해 줍니다.
진짜 host-specific code가 request/response factory 아래쪽에 있기 때문에,
root barrel은 portable하게 유지될 수 있습니다.

따라서 10장의 마지막 교훈은 import hygiene보다 더 넓습니다.
Fluo의 runtime branching이 성립하는 이유는,
framework가 대부분의 bootstrap을 host-agnostic하게 만든 뒤,
아주 늦은 시점의 좁은 transport seam에서만 분기하기 때문입니다.
Node는 server lifecycle helper를 받고,
Web/Edge host는 Request/Response normalization helper를 받습니다.
하지만 그 seam 위에서는
module graph,
container,
lifecycle hook,
platform shell,
dispatcher model이 동일합니다.

이것이 내부 portability contract입니다. "호스트당 하나의 런타임"이 아니라, "가장자리에 명시적인 호스트 어댑터가 있는 하나의 공유 런타임 셸"입니다.

이 아키텍처를 진정으로 이해하려면 특히 "Edge" 사례를 어떻게 처리하는지 살펴봐야 합니다. 장기 실행 프로세스와 영구 소켓을 제공하는 Node와 달리, Cloudflare Workers나 Vercel Edge Functions와 같은 Edge 런타임은 종종 엄격한 메모리 및 시간 제한이 있는 요청 기반 실행 모델에서 작동합니다. Fluo의 지연 분기(late-branching) 설계는 핵심 DI 컨테이너와 모듈 그래프가 극도로 가볍게 최적화되어 있음을 의미하며, 이는 자원이 제한된 Edge 플랫폼에서도 콜드 스타트(cold-start) 패널티를 최소화하도록 보장합니다. 이러한 성능 최적화는 빌드 단계에서 모듈 그래프를 미리 컴파일하여 런타임에 필요한 작업량을 줄이는 방식에서 잘 드러납니다.

공유 부트스트랩 단계에서 등록된 `PLATFORM_SHELL` 토큰은 환경적 차이를 위한 추상화 계층 역할을 합니다. Node에서 이 토큰은 `process.versions` 및 `os` 정보를 노출할 수 있고, 웹 표준 런타임에서는 `navigator`나 호스트별 전역 상수에 대한 접근을 제공할 수 있습니다. `PLATFORM_SHELL`을 주입함으로써 애플리케이션 로직은 이식성을 유지하면서도 필요할 때 플랫폼을 인식할 수 있습니다. 이는 코드베이스 전체에 `if (typeof window !== 'undefined')`와 같은 체크를 흩어놓는 것보다 훨씬 깨끗합니다. 또한 단위 테스트에서 환경을 더 쉽게 모킹(mocking)할 수 있게 해주어 애플리케이션의 전반적인 신뢰성을 향상시킵니다.

나아가 `dispatchWebRequest` API는 `FetchEvent` 라이프사이클과 완벽하게 호환되도록 설계되었습니다. 이를 통해 Fluo는 단 몇 줄의 보일러플레이트 코드만으로 모든 웹 표준 서비스 워커나 에지 핸들러에 내장될 수 있습니다. 프레임워크는 바디 파싱과 응답 스트리밍이라는 복잡한 작업을 처리하여, 개발자가 Node 기반 마이크로서비스에서 사용하는 것과 동일한 컨트롤러와 서비스를 사용하여 비즈니스 로직을 작성하는 데 집중할 수 있게 합니다. 서로 다른 호스트 유형 간에 이러한 개발자 경험을 통합하는 것은 Fluo의 가장 큰 장점 중 하나입니다.

우리는 이러한 일관성을 `AbortSignal` 처리에서도 확인할 수 있습니다. Fluo의 디스패처는 처음부터 시그널을 인식하도록 설계되었으므로, 사용자가 브라우저 탭을 닫거나 Edge 런타임이 요청을 종료하는 것과 같은 호스트 수준의 취소는 프레임워크의 미들웨어를 거쳐 사용자의 서비스로 자연스럽게 전파됩니다. 이는 낭비되는 계산을 방지하고, 호스트 환경에 관계없이 데이터베이스 연결이나 API 클라이언트와 같은 자원이 즉시 해제되도록 보장합니다. 이러한 전파 로직의 구현은 Node와 Web 브리지 모두에서 사용되는 공유 디스패처 코드에서 찾을 수 있습니다.

이러한 이식성을 테스트하는 것은 Fluo 저장소에서 일등 시민(first-class)의 관심사입니다. Node와 Web 어댑터 모의 객체(mock) 모두에 대해 동일한 프레임워크 수준의 통합 테스트 스위트를 실행함으로써, 팀은 호스트 전용 회귀(regression)가 공유 런타임 코어로 유출되지 않도록 보장합니다. 이러한 "이중 호스트" 테스트 전략은 개발자가 다양한 현대적 실행 환경에 Fluo 애플리케이션을 배포할 수 있는 확신을 줍니다. 또한 이는 서로 다른 플랫폼 간의 기대 동작에 대한 살아있는 문서 역할을 합니다.

Bun이나 Deno와 같은 새로운 호스트 유형의 도입은 이 아키텍처 덕분에 훨씬 쉬워졌습니다. 프레임워크 전체를 다시 작성하는 대신, 개발자는 새로운 `RequestResponseFactory`와 일부 호스트 전용 부트스트랩 헬퍼만 구현하면 됩니다. 프레임워크의 나머지 로직은 즉시 사용 가능하며 동일하게 동작함이 보장됩니다. 이러한 "어댑터 우선" 접근 방식은 Fluo 생태계를 확장 가능하고 미래 지향적으로 만듭니다.

궁극적으로 Fluo의 런타임 분기 목표는 호스트 환경을 구현 세부 사항으로 만드는 것입니다. 코드가 데이터 센터의 거대한 컨테이너에서 실행되든 네트워크 가장자리의 작은 격리된 환경(isolate)에서 실행되든, 프레임워크의 동작 계약(behavioral contract)은 동일하게 유지됩니다. 애플리케이션을 한 번 작성하면 Fluo가 배포되는 모든 곳에서 올바르게 동작하도록 보장하며, 호스트별 I/O와 호스트 독립적 로직 사이의 간극을 메워줍니다. 이러한 철학은 백엔드 실행 환경이 계속 진화하더라도 Fluo가 이식 가능한 TypeScript 개발의 최전선에 머물 수 있도록 보장합니다.








































