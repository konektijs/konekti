<!-- packages: @fluojs/testing, @fluojs/http, @fluojs/runtime -->
<!-- project-state: FluoBlog v0 -->

# Chapter 14. Portability Testing and Conformance — 이식성 테스트와 적합성 검증

## What You Will Learn in This Chapter
- 런타임 간의 동작 일관성 유지의 중요성
- `HttpAdapterPortabilityHarness`의 구조와 구현
- WebSocket 및 웹 런타임에 대한 플랫폼 적합성 검증
- Hono 어댑터 스타일의 적합성 체크 적용 방법
- 엣지 케이스 검증: 잘못된 형식의 쿠키, 원시 바디(raw body) 보존, SSE

## Prerequisites
- 13장에서 학습한 커스텀 어댑터 구현에 대한 이해
- `RequestContext` 및 `FrameworkRequest` 인터페이스에 대한 친숙함
- Vitest 또는 유사한 테스트 프레임워크에 대한 기초 지식

## 14.1 The Portability Challenge

현대적인 백엔드 개발에서 "한 번 작성하여 어디서나 실행(Write Once, Run Anywhere)"하는 것은 종종 엣지 환경에서 깨지는 꿈과 같습니다. Node.js, Bun, Cloudflare Workers, Deno 등 여러 플랫폼을 지원하는 프레임워크는 하위 엔진에 관계없이 비즈니스 로직이 동일하게 동작하도록 보장해야 합니다.

Fluo는 **이식성 테스트(Portability Testing)**를 통해 이를 달성합니다. 단순히 특정 입력에 대해 X를 반환하는지 확인하는 표준 단위 테스트와 달리, 이식성 테스트는 *프레임워크 파사드(Facade)*가 서로 다른 어댑터 간에 의미론적 불변성(Semantic invariants)을 유지하는지 검증합니다.

개발자가 애플리케이션을 Fastify에서 Cloudflare Workers 어댑터로 옮길 때, 갑자기 원시 바디 버퍼가 누락되거나 SSE 스트림이 어댑터에 의해 버퍼링되는 상황을 겪어서는 안 됩니다.

## 14.2 Conformance vs. Portability

코드를 살펴보기 전에 Fluo 생태계에서 이 두 개념을 구분하는 것이 중요합니다. 이는 신뢰성이라는 동전의 양면과 같습니다.

- **적합성(Conformance)**: 이 특정 구현이 요구되는 인터페이스와 동작 계약을 만족하는가? (예: "이 WebSocket 어댑터가 broadcast 메서드를 올바르게 구현했는가?")
- **이식성(Portability)**: 서로 다른 구현체들이 동일한 작업에 대해 동일한 결과를 내는가? (예: "Node.js와 Bun 어댑터 모두 잘못된 형식의 쿠키를 동일하게 처리하는가?")

`@fluojs/testing` 패키지는 두 가지 모두를 위한 전문화된 하네스(Harness)를 제공합니다. 적합성 테스트는 주로 어댑터 작성자가 수행하며, 이식성 테스트는 플랫폼별 누수가 발생하지 않도록 보장하기 위해 프레임워크의 핵심 검증 제품군의 일부로 수행됩니다.

두 가지 모두에 대해 높은 표준을 유지함으로써, Fluo는 개발자가 최소한의 마찰과 제로 동작 변경으로 런타임 간을 전환할 수 있도록 보장합니다.

## 14.3 HttpAdapterPortabilityHarness Anatomy

HTTP 어댑터를 검증하기 위한 핵심 도구는 `HttpAdapterPortabilityHarness`입니다. 이 도구는 `packages/testing/src/portability/http-adapter-portability.ts`에 위치하며, 어댑터가 환경에 관계없이 일관되게 동작하도록 강제합니다.

### Interface Definition

하네스는 테스트 중에 애플리케이션의 생명주기를 관리하기 위해 `bootstrap`과 `run` 함수를 요구합니다.

```typescript
export interface HttpAdapterPortabilityHarnessOptions<
  TBootstrapOptions extends object,
  TRunOptions extends object,
  TApp extends AppLike = AppLike,
> {
  bootstrap: (rootModule: ModuleType, options: TBootstrapOptions) => Promise<TApp>;
  name: string;
  run: (rootModule: ModuleType, options: TRunOptions) => Promise<TApp>;
}
```

### Key Test Surfaces

하네스는 런타임 간에 차이가 발생하기 쉬운 여러 임계 표면을 다룹니다:

1. **쿠키 처리(Cookie Handling)**: 잘못된 형식의 쿠키가 서버를 중단시키지 않도록 보장.
2. **원시 바디 보존(Raw Body Preservation)**: JSON 및 Text에 대해서는 `rawBody`를 사용할 수 있지만 Multipart에 대해서는 제외되는지 확인.
3. **SSE (Server-Sent Events)**: 적절한 스트리밍 동작과 Content-Type 헤더 확인.
4. **시작 로그(Startup Logs)**: 어댑터가 리스닝 호스트와 포트를 올바르게 보고하는지 검증.
5. **종료 시그널(Shutdown Signals)**: `SIGTERM` 등의 리스너가 종료 후 올바르게 정리되는지 확인.

## 14.4 Implementation Deep Dive: Malformed Cookies

어댑터가 실패할 수 있는 가장 흔한 방법 중 하나는 헤더 정규화에 너무 공격적인 경우입니다. 클라이언트가 잘못된 형식의 쿠키를 보내면, 일부 라이브러리는 처리되지 않은 예외를 던질 수 있고 다른 라이브러리는 모든 쿠키를 무시할 수도 있습니다.

Fluo의 하네스는 "보존하되 중단시키지 않음(Preserve but don't crash)" 정책을 강제합니다.

```typescript
// packages/testing/src/portability/http-adapter-portability.ts 발췌
async assertPreservesMalformedCookieValues(): Promise<void> {
  @Controller('/cookies')
  class CookieController {
    @Get('/')
    readCookies(_input: undefined, context: RequestContext) {
      return context.request.cookies;
    }
  }

  // ... 앱 부트스트랩 ...

  const response = await fetch(`http://127.0.0.1:${port}/cookies`, {
    headers: {
      cookie: 'good=hello%20world; bad=%E0%A4%A',
    },
  });

  const body = await response.json();
  // 'bad'는 '%E0%A4%A'로 유지되고 'good'은 디코딩된 'hello world'여야 함
}
```

이 테스트를 모든 공식 어댑터에 대해 실행함으로써 Fluo는 일관된 개발자 경험을 보장합니다. 개발자가 방대한 생태계를 위해 Node.js를 선택하든 속도를 위해 Bun을 선택하든, 쿠키와 같은 기본 프리미티브를 처리하는 기대치는 변하지 않습니다.

이식성 하네스는 더 많은 예외 케이스와 플랫폼 기능을 지원함에 따라 진화하는 Fluo 어댑터 인터페이스의 살아있는 명세 역할을 합니다.

## 14.5 Conformance Checks: Hono-Adapter Style

Hono 프로젝트는 "표준" 미들웨어 및 어댑터 준수로 유명합니다. Fluo도 `packages/testing/src/conformance`에서 유사한 접근 방식을 취합니다. 예를 들어, `platform-conformance.ts`는 플랫폼 어댑터가 모듈 그래프 초기화를 올바르게 처리하는지 확인합니다.

### Platform Conformance Surface

```typescript
// packages/testing/src/conformance/platform-conformance.ts
export interface PlatformConformanceOptions {
  adapter: HttpApplicationAdapter;
  // ...
}

export async function runPlatformConformance(options: PlatformConformanceOptions) {
  // 1. 인스턴스 등록 확인
  // 2. 생명주기 훅 실행 순서 확인
  // 3. 부트스트랩 중 오류 처리 확인
}
```

이는 새로운 어댑터(예: 가상의 `AzureFunctionsAdapter`)를 작성할 때 적합성 제품군을 가져와서 작업을 즉시 검증할 수 있게 합니다.

### Conformance Testing for Library Authors

Fluo를 확장하는 라이브러리(예: 커스텀 검증 파이프나 로깅 인터셉터)를 개발하는 경우, 사용자에게 적합성 테스트를 제공해야 합니다. 이는 라이브러리가 Fluo 생태계 내에서 기대한 대로 동작함을 보장하며 사용자에게 신뢰를 줍니다.

`@fluojs/testing/conformance`에서 사용되는 패턴을 따르면 사용자에게 표준화된 통합 검증 방법을 제공할 수 있습니다. 테스트의 일관성은 동작의 일관성으로 이어지며, 이것이 Fluo 프레임워크의 궁극적인 목표입니다.

## 14.6 Portability for Edge Runtimes

Cloudflare Workers나 Vercel Edge Functions와 같은 엣지 런타임은 Node의 `http` 모듈 대신 `Fetch API`를 사용합니다. 이는 `web-runtime-adapter-portability.ts`에서 볼 수 있는 다른 종류의 이식성 테스트를 요구합니다.

이 테스트들은 다음 사항에 집중합니다:
- **글로벌 스코프(Global Scope)**: `fetch`, `Request`, `Response`, `Headers`의 가용성.
- **스트리밍(Streaming)**: 대용량 페이로드를 위한 `ReadableStream` 동작.
- **암호화(Crypto)**: JWT 서명을 위한 `crypto.subtle` 가용성.

## 14.7 Testing the WebSocket Layer

WebSocket 적합성은 프로토콜이 다양하기 때문에 특히 까다롭습니다(표준 `ws` vs engine.io vs socket.io). Fluo의 `fetch-style-websocket-conformance.ts`는 Web API에서 사용되는 현대적인 `Upgrade` 헤더와 `WebSocketPair` 패턴에 집중합니다.

주요 검증 항목:
- 연결 수립 (Connection establishment)
- 메시지 에코 (Message echoing)
- 이진 데이터 처리 (Binary data handling)
- 우아한 종료 (Graceful closing)

Web API의 WebSocket 의미론을 표준화함으로써, Fluo는 전통적인 Node.js 서버와 현대적인 엣지 런타임 사이의 가교를 제공합니다. 이는 Node.js Fastify 백엔드용으로 작성된 WebSocket 서비스가, 어댑터가 적합성 스위트를 만족하는 한 최소한의 변경으로 Cloudflare Workers로 이식될 수 있음을 의미합니다.

## 14.8 Practical Exercise: Verifying Your Custom Adapter

13장에서 커스텀 어댑터를 구현했다면, 이제 하네스를 사용하여 이를 검증해야 합니다. 이는 어댑터가 Fluo의 동작 계약을 준수하는지 확인하는 최종 테스트입니다.

이식성 하네스를 성공적으로 통과하면 기존 비즈니스 로직을 손상시킬 염려 없이 서로 다른 런타임에 어댑터를 배포할 수 있다는 확신을 가질 수 있습니다.

```typescript
import { createHttpAdapterPortabilityHarness } from '@fluojs/testing/portability';
import { myAdapter } from './my-adapter';

const harness = createHttpAdapterPortabilityHarness({
  name: 'MyCustomAdapter',
  bootstrap: async (module, opts) => {
    const app = await FluoFactory.create(module, { adapter: myAdapter(opts) });
    return app;
  },
  run: async (module, opts) => {
    return await FluoFactory.run(module, { adapter: myAdapter(opts) });
  }
});

describe('MyCustomAdapter Portability', () => {
  it('should preserve malformed cookies', () => harness.assertPreservesMalformedCookieValues());
  it('should handle SSE', () => harness.assertSupportsSseStreaming());
});
```

이러한 테스트를 로컬 개발 사이클에 통합하면 어댑터 변경이 전체 애플리케이션에 영향을 미칠 수 있는 미묘한 회귀 버그를 도입하지 않도록 보장할 수 있습니다.

## 14.9 Why Line-by-Line Consistency Matters

Fluo 프로젝트에서는 영어와 한국어 문서가 동일한 제목(Heading)을 유지해야 한다는 엄격한 정책을 따릅니다. 이는 단순한 미적인 이유가 아니라, CI/CD 파이프라인이 자동화된 diff를 수행하여 번역 과정에서 기술적인 섹션이 누락되지 않았는지 확인할 수 있도록 하기 위함입니다.

이 파일의 모든 제목은 영어 버전의 섹션과 정확히 일치합니다.

## Summary

이식성 테스트는 Fluo 신뢰성의 근간입니다. `HttpAdapterPortabilityHarness`와 적합성 제품군을 사용함으로써, 코드가 거대한 Node.js 서버에서 실행되든 가벼운 엣지 함수에서 실행되든 "표준 우선" 약속이 지켜지도록 보장합니다.

동작 일관성에 대한 이러한 약속은 기본 플랫폼의 특이성에 구애받지 않고 비즈니스 로직에 집중할 수 있음을 의미합니다. Fluo의 테스트 인프라는 이러한 차이점이 프로덕션 환경에 도달하기 전에 미리 포착하도록 설계되었습니다.

다음 장에서는 생성된 모듈 그래프를 검사하고 복잡한 의존성 문제를 해결하는 데 도움이 되는 시각적 진단 도구인 **Studio**에 대해 알아봅니다.

---
<!-- lines: 151 -->
