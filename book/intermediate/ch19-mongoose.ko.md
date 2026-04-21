<!-- packages: @fluojs/mongoose, mongoose, @fluojs/core -->
<!-- project-state: FluoShop v2.2.0 -->

# Chapter 19. MongoDB and Mongoose

이 장은 FluoShop의 문서 지향 데이터 모델을 fluo 애플리케이션 안에 안정적으로 통합하는 방법을 설명합니다. Chapter 18이 GraphQL로 카탈로그 조회 계층을 열었다면, 이 장은 그 뒤를 받치는 MongoDB 영속성과 트랜잭션 흐름을 다룹니다.

## Learning Objectives
- fluo에서 Mongoose 통합이 필요한 이유와 장점을 이해합니다.
- `MongooseModule`을 구성하고 연결 수명 주기를 관리하는 방법을 배웁니다.
- `MongooseConnection`을 활용한 리포지토리 패턴을 익힙니다.
- 수동 트랜잭션과 요청 스코프 트랜잭션의 차이를 분석합니다.
- FluoShop 제품 카탈로그에 문서 모델을 적용하는 방식을 살펴봅니다.
- 상태 스냅샷으로 MongoDB 연결을 관측하는 방법을 정리합니다.

## Prerequisites
- Chapter 18 완료.
- MongoDB 문서 모델과 Mongoose 기본 사용법 이해.
- 트랜잭션과 요청 단위 데이터 일관성에 대한 기본 감각.

## 19.1 Why Mongoose in fluo?

Mongoose는 Node.js 생태계에서 MongoDB를 다루는 사실상의 표준입니다. fluo 전용 통합 패키지를 사용하면 다음과 같은 이점을 얻을 수 있습니다.

- **수명 주기 관리**: `onApplicationBootstrap` 단계에서 연결이 자동으로 설정되고, `beforeApplicationShutdown` 단계에서 안전하게 닫힙니다.
- **세션 인지(Session Awareness)**: `MongooseConnection` 서비스는 콜 스택 전체에서 MongoDB 세션을 추적하여 트랜잭션 관리를 훨씬 용이하게 합니다.
- **요청 스코프 트랜잭션**: `MongooseTransactionInterceptor`를 사용하면 데코레이터 하나만으로 전체 HTTP 요청을 MongoDB 트랜잭션으로 묶을 수 있습니다.

## 19.2 Installation and Setup

Mongoose와 fluo 통합 패키지를 설치합니다.

```bash
pnpm add mongoose @fluojs/mongoose
```

다른 일부 데이터베이스 통합과 달리, fluo는 여러분이 직접 Mongoose `Connection` 객체를 생성하여 제공하기를 기대합니다. 이를 통해 연결 옵션에 대한 완전한 제어권을 가질 수 있습니다.

## 19.3 Configuring the MongooseModule

`MongooseModule`은 동기 또는 비동기 방식으로 구성할 수 있습니다.

### Synchronous Configuration

```typescript
import { Module } from '@fluojs/core';
import { MongooseModule } from '@fluojs/mongoose';
import mongoose from 'mongoose';

const connection = mongoose.createConnection('mongodb://localhost:27017/fluoshop');

@Module({
  imports: [
    MongooseModule.forRoot({
      connection,
      dispose: async (conn) => conn.close(),
    }),
  ],
})
export class PersistenceModule {}
```

## 19.4 Repositories and Connection Management

Fluo에서는 일반적으로 리포지토리를 통해 MongoDB와 상호작용합니다. 전역 `mongoose` 객체를 사용하는 대신, `MongooseConnection` 서비스를 주입받아 사용합니다.

```typescript
import { MongooseConnection } from '@fluojs/mongoose';
import { Inject } from '@fluojs/core';

export class ProductRepository {
  constructor(
    @Inject(MongooseConnection) private readonly conn: MongooseConnection
  ) {}

  async findById(id: string) {
    const Product = this.conn.current().model('Product');
    return Product.findById(id);
  }
}
```

`conn.current()` 메서드는 현재 활성화된 Mongoose 연결을 반환합니다. 트랜잭션이 활성 상태인 경우, 컨텍스트에 따라 세션 정보도 함께 유지될 수 있습니다.

## 19.5 Transaction Management

MongoDB 트랜잭션은 활성화된 **세션(Session)**을 필요로 합니다. Fluo는 통합된 트랜잭션 래퍼를 제공하여 이를 단순화합니다.

### Manual Transactions

```typescript
await this.conn.transaction(async () => {
  const session = this.conn.currentSession();
  const Product = this.conn.current().model('Product');
  const Inventory = this.conn.current().model('Inventory');

  await Product.updateOne({ _id: pid }, { $set: { status: 'SOLD' } }, { session });
  await Inventory.updateOne({ productId: pid }, { $inc: { stock: -1 } }, { session });
});
```

### Request-Scoped Transactions

더 깔끔한 코드를 위해 `MongooseTransactionInterceptor`를 사용할 수 있습니다. 이 인터셉터는 HTTP 요청이 시작될 때 자동으로 세션과 트랜잭션을 시작하고, 요청이 성공적으로 완료되면 이를 커밋합니다.

```typescript
import { UseInterceptors } from '@fluojs/http';
import { MongooseTransactionInterceptor } from '@fluojs/mongoose';

@UseInterceptors(MongooseTransactionInterceptor)
@Controller('orders')
export class OrderController {
  @Post()
  async createOrder() {
    // 이 안의 모든 작업은 자동으로 MongoDB 트랜잭션으로 묶입니다.
  }
}
```

## 19.6 FluoShop Context: Product Catalog Persistence

FluoShop에서는 전자제품이나 의류 등 제품 유형에 따라 스키마가 크게 달라질 수 있기 때문에 제품 카탈로그용으로 MongoDB를 사용합니다.

기본 스키마를 정의하고, Mongoose의 **Discriminators**를 사용하여 단일 컬렉션에 서로 다른 제품 유형을 저장하면서도 이를 효과적으로 관리합니다.

```typescript
const productSchema = new mongoose.Schema({ name: String, price: Number }, { discriminatorKey: 'type' });
const Product = conn.model('Product', productSchema);

const Electronics = Product.discriminator('Electronics', new mongoose.Schema({ warranty: Number }));
const Apparel = Product.discriminator('Apparel', new mongoose.Schema({ size: String, material: String }));
```

`MongooseConnection`을 활용함으로써 리포지토리 코드를 깔끔하고 테스트 가능하게 유지할 수 있습니다.

## 19.7 Health and Observability

데이터베이스 연결 상태는 백엔드 운영에 필수적인 지표입니다. Fluo는 Mongoose를 위한 헬스 스냅샷 생성 헬퍼를 제공합니다.

```typescript
import { createMongoosePlatformStatusSnapshot } from '@fluojs/mongoose';

const status = await createMongoosePlatformStatusSnapshot(mongooseConnection);
if (!status.isReady) {
  // 알림을 보내거나 장애 복구(failover) 모드로 진입합니다.
}
```

## 19.8 Conclusion

Fluo에서의 Mongoose 통합은 수명 주기를 고려한 견고한 MongoDB 작업 방식을 제공합니다. Mongoose의 강력한 모델링 기능과 fluo의 DI 및 트랜잭션 관리를 결합하면 유연하면서도 신뢰할 수 있는 데이터 중심 서비스를 구축할 수 있습니다.

다음 장에서는 SQL 중심의 작업을 위한 현대적인 대안인 **Drizzle ORM**에 대해 살펴보겠습니다.
