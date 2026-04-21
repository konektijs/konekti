<!-- packages: @fluojs/graphql, @fluojs/core, @fluojs/http -->
<!-- project-state: FluoShop v2.2.0 -->

# Chapter 18. GraphQL API

이 장은 FluoShop에 REST 외의 유연한 질의 계층을 추가하는 방법을 설명합니다. Chapter 17까지 알림과 실시간 흐름을 확장했다면, 이 장은 제품 카탈로그를 중심으로 GraphQL API와 실행 가드레일을 구축합니다.

## Learning Objectives
- fluo에서 GraphQL을 도입할 때 얻는 구조적 이점을 이해합니다.
- `GraphqlModule`을 설정하고 코드 우선 리졸버를 등록하는 방법을 배웁니다.
- 요청 스코프 DataLoader로 N+1 문제를 줄이는 흐름을 익힙니다.
- SSE 기본 구독과 선택적 WebSocket 구독 구성을 살펴봅니다.
- 복잡도 제한과 인트로스펙션 제어 같은 운영 가드레일을 적용합니다.
- FluoShop 제품 카탈로그에 GraphQL을 연결하는 방식을 정리합니다.

## Prerequisites
- Chapter 13, Chapter 14, Chapter 15, Chapter 16, Chapter 17 완료.
- Resolver, 스키마, 구독 같은 GraphQL 핵심 용어 이해.
- API 보안과 성능 제한을 함께 설계해야 한다는 운영 감각.

## 18.1 Why GraphQL in fluo?

**명시성이 암시성보다 낫다(Explicit Over Implicit)**는 fluo의 철학은 GraphQL의 강력한 타입 스키마와 완벽하게 일치합니다. `@fluojs/graphql`을 사용하면 다음과 같은 이점을 얻을 수 있습니다.

- **통합된 DI**: 리졸버는 fluo 컨테이너 내의 최상위 프로바이더로 취급됩니다.
- **프로토콜 이식성**: 여러분의 GraphQL API는 코드 수정 없이 Node.js, Bun, Deno 또는 Edge Workers에서 실행됩니다.
- **표준 데코레이터**: 레거시 `experimentalDecorators` 플래그가 필요하지 않습니다.
- **성능**: 런타임 퍼사드(facade)와의 직접적인 통합을 통해 오버헤드를 최소화합니다.

## 18.2 Installation and Setup

먼저, 필요한 의존성을 설치합니다.

```bash
pnpm add @fluojs/graphql graphql graphql-yoga
```

통합의 핵심은 `GraphqlModule`입니다. 다른 많은 fluo 모듈과 달리, 현재 `GraphqlModule`은 동기적인 `forRoot` 설정 방식을 사용합니다.

## 18.3 Building Code-first Resolvers

Fluo는 TypeScript 클래스가 GraphQL 스키마를 정의하는 **코드 우선(code-first)** 방식을 선호합니다.

### Defining the Resolver

```typescript
import { Resolver, Query, Mutation, Arg } from '@fluojs/graphql';
import { Inject } from '@fluojs/core';
import { ProductService } from './product.service';

@Resolver()
export class ProductResolver {
  constructor(
    @Inject(ProductService) private readonly productService: ProductService
  ) {}

  @Query()
  async product(@Arg('id') id: string) {
    return this.productService.findById(id);
  }

  @Query()
  async products() {
    return this.productService.findAll();
  }
}
```

### Registering the Module

```typescript
import { Module } from '@fluojs/core';
import { GraphqlModule } from '@fluojs/graphql';
import { ProductResolver } from './product.resolver';

@Module({
  imports: [
    GraphqlModule.forRoot({
      resolvers: [ProductResolver],
      graphiql: true, // 개발용 IDE 활성화
    }),
  ],
  providers: [ProductResolver],
})
export class AppModule {}
```

## 18.4 Solving N+1 with DataLoaders

N+1 문제는 GraphQL에서 가장 흔한 성능 병목 현상입니다. Fluo는 내장된 요청 스코프 **DataLoader** 지원을 제공합니다.

### Creating a DataLoader

```typescript
import { createDataLoader, type GraphQLContext } from '@fluojs/graphql';

const authorLoader = createDataLoader(async (ids: string[]) => {
  const authors = await authorService.findByIds(ids);
  // 반환되는 배열이 입력 ID의 순서와 일치하도록 보장해야 합니다.
  return ids.map(id => authors.find(a => a.id === id));
});
```

### Using the Loader in a Resolver

```typescript
@Resolver()
export class BookResolver {
  @Query()
  async book(@Arg('id') id: string) {
    return bookService.findById(id);
  }

  // Book의 'author' 필드에 대한 필드 리졸버
  async author(book: Book, context: GraphQLContext) {
    return authorLoader(context).load(book.authorId);
  }
}
```

`authorLoader(context)`는 특정 GraphQL 실행 컨텍스트에 묶인 로더 인스턴스를 반환하므로, 단일 요청 내에서만 배치가 수집되도록 보장합니다.

## 18.5 Real-time with Subscriptions

Fluo는 기본적으로 **SSE(Server-Sent Events)**를 사용하여 GraphQL 구독을 지원하며, 선택적으로 WebSocket도 지원합니다.

### SSE Subscriptions (Default)

```typescript
import { Subscription } from '@fluojs/graphql';

@Resolver()
export class NotificationResolver {
  @Subscription()
  async onNewNotification() {
    return pubsub.subscribe('NEW_NOTIFICATION');
  }
}
```

### Enabling WebSockets

양방향 실시간 통신이 필요한 경우 WebSocket 트랜스포트를 활성화합니다.

```typescript
GraphqlModule.forRoot({
  subscriptions: {
    websocket: {
      enabled: true,
      limits: {
        maxConnections: 100,
      },
    },
  },
})
```

## 18.6 Operational Guardrails

GraphQL API는 복잡하고 리소스를 많이 소모하는 쿼리에 취약할 수 있습니다. Fluo는 기본적으로 **운영 가드레일**을 강제합니다.

- **인트로스펙션(Introspection)**: 프로덕션 환경에서 기본적으로 비활성화됩니다.
- **복잡도 제한**: `maxDepth`, `maxComplexity`, `maxCost`를 사용하여 서비스 거부(DoS) 공격을 방지합니다.

```typescript
GraphqlModule.forRoot({
  limits: {
    maxDepth: 8,      // 쿼리 중첩 깊이 제한
    maxComplexity: 120, // 전체 필드 가중치 제한
    maxCost: 240,     // 예상 계산 비용 제한
  },
})
```

## 18.7 FluoShop Context: The Product Catalog

FluoShop에서는 풍부한 제품 카탈로그 경험을 제공하기 위해 GraphQL을 사용합니다. 카테고리 조회를 위해 DataLoader를 사용하고, 검색 엔드포인트를 보호하기 위해 복잡도 제한을 적용함으로써 빠르고 안전한 API를 보장합니다.

```typescript
@Resolver()
export class CatalogResolver {
  @Query()
  async search(@Arg('query') query: string) {
    // 복잡도는 결과 세트 크기에 따라 자동으로 계산됩니다.
    return this.catalogService.search(query);
  }
}
```

## 18.8 Conclusion

Fluo에서의 GraphQL은 단순한 추가 기능이 아니라 생태계의 깊이 통합된 일부입니다. 표준 데코레이터와 네이티브 DI 컨테이너를 활용함으로써 클라이언트에게는 유연하고 개발자에게는 유지보수가 용이한 API를 구축할 수 있습니다.

다음 장에서는 이러한 API를 구동하는 데이터를 **MongoDB와 Mongoose**를 사용하여 영속화하는 방법을 살펴보겠습니다.
