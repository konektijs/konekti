<!-- packages: @fluojs/cache-manager, @fluojs/redis -->
<!-- project-state: FluoBlog v1.14 -->

# Chapter 17. Distributed Caching with Redis

## Learning Objectives
- 고성능 FluoBlog를 위해 캐싱이 필수적인 이유를 이해합니다.
- 메모리 및 Redis 저장소를 사용하는 `CacheModule`을 설정합니다.
- 자동 HTTP 응답 캐싱을 위해 `CacheInterceptor`를 사용합니다.
- `CacheService`를 사용하여 수동 캐싱 전략을 적용합니다.
- `@CacheEvict`를 사용하여 캐시 무효화를 구현합니다.
- 다중 인스턴스 배포를 위한 분산 캐싱 전략을 설계합니다.

## 17.1 The Need for Speed
이제 FluoBlog에는 실제 데이터와 인증, 그리고 반복해서 호출되는 엔드포인트가 생겼습니다. 그래서 다음으로 신경 써야 할 실용적인 주제는 성능입니다. 모든 댓글, 태그, 작성자 정보가 포함된 인기 블로그 게시물을 가져오려면 복잡한 데이터베이스 조인이 필요하고, 수천 명의 사용자가 동시에 같은 게시물에 접근하면 데이터베이스가 병목 지점이 될 수 있습니다.

캐싱은 이런 문제를 줄여 줍니다. 비용이 큰 작업의 결과를 메모리나 Redis 같은 빠른 임시 저장소에 보관해 두면, 다음 요청은 같은 작업을 다시 수행하지 않고 저장된 결과를 바로 사용할 수 있습니다.

## 17.2 Introducing @fluojs/cache-manager
`@fluojs/cache-manager` 패키지는 `fluo`에서 이 작업을 한 가지 방식으로 다루게 해 줍니다. 먼저 단순한 설정으로 시작하고, 나중에 분산 캐시로 옮겨 가더라도 같은 흐름을 유지할 수 있습니다. 여러 백엔드를 지원합니다:
- **Memory**: 빠르지만 단일 프로세스에 국한됩니다. 서버가 재시작되면 데이터가 손실됩니다.
- **Redis**: 빠르고 분산 가능하며 지속성이 있습니다. 프로덕션 클러스터에 이상적입니다.

## 17.3 Basic Memory Caching
가장 쉽게 시작하는 방법은 메모리 캐싱입니다. 개발 환경이나 단일 프로세스로 동작하는 작은 배포에서는 이 방식이 잘 맞습니다.

```typescript
import { Module } from '@fluojs/core';
import { CacheModule } from '@fluojs/cache-manager';

@Module({
  imports: [
    CacheModule.forRoot({
      store: 'memory',
      ttl: 300, // 기본 5분
    }),
  ],
})
export class AppModule {}
```

## 17.4 Automatic HTTP Caching
캐시를 붙였을 때 가장 먼저 체감되는 이점은 반복되는 GET 요청입니다. `fluo`는 `CacheInterceptor`로 그 경우를 바로 처리할 수 있게 해 줍니다.

### Applying the Interceptor
```typescript
import { Controller, Get, UseInterceptors } from '@fluojs/http';
import { CacheInterceptor, CacheTTL } from '@fluojs/cache-manager';

@Controller('posts')
@UseInterceptors(CacheInterceptor)
export class PostController {
  @Get()
  @CacheTTL(60) // 전역 TTL을 1분으로 덮어씁니다
  findAll() {
    return this.service.findAll();
  }
}
```

사용자가 `GET /posts`를 호출하면 인터셉터는 먼저 응답이 캐시에 있는지 확인합니다. 이미 있으면 그 값을 즉시 반환하고, 없으면 핸들러를 실행한 뒤 결과를 저장하고 반환합니다. 그다음 요청부터는 저장된 값이 다시 사용됩니다.

## 17.5 Manual Caching with CacheService
모든 유용한 캐시가 HTTP 응답 형태에 딱 맞는 것은 아닙니다. 서비스 계층의 조회 결과를 캐시하거나 키를 직접 통제해야 한다면 `CacheService`를 주입해 수동으로 관리하면 됩니다.

```typescript
import { Inject } from '@fluojs/core';
import { CacheService } from '@fluojs/cache-manager';

export class PostService {
  constructor(@Inject(CacheService) private readonly cache: CacheService) {}

  async getPostWithComments(id: string) {
    const cacheKey = `post_detail:${id}`;
    
    return this.cache.remember(cacheKey, async () => {
      // 캐시에 없으면 DB에서 가져옵니다
      return this.prisma.post.findUnique({
        where: { id },
        include: { comments: true },
      });
    }, 600);
  }
}
```

`remember` 메서드는 자주 반복되는 흐름을 한곳에 모아 줍니다. 먼저 키를 읽고, 값이 없으면 함수를 실행해 결과를 저장한 다음 반환합니다. 덕분에 비용이 큰 조회와 캐시 규칙이 서비스 안에서 함께 읽히게 됩니다.

## 17.6 Cache Invalidation
읽기를 빠르게 만드는 것만으로는 충분하지 않습니다. 캐시된 데이터가 믿을 수 있어야 합니다. 사용자가 블로그 게시물을 수정한 순간, 이전 캐시를 지우지 않으면 독자는 오래된 내용을 계속 보게 됩니다.

### Using @CacheEvict
`fluo`는 이를 선언적으로 처리하기 위해 `@CacheEvict`를 제공합니다.

```typescript
import { Post, Put, Param } from '@fluojs/http';
import { CacheEvict } from '@fluojs/cache-manager';

@Controller('posts')
export class PostController {
  @Put(':id')
  @CacheEvict('posts') // 'posts'로 시작하는 모든 캐시 키를 삭제합니다
  update(@Param('id') id: string, @Body() data: UpdatePostDto) {
    return this.service.update(id, data);
  }
}
```

## 17.7 Moving to Redis
메모리 캐싱은 좋은 출발점이지만, FluoBlog가 여러 서버 인스턴스로 실행되기 시작하면 그것만으로는 부족합니다. 각 서버가 자기 캐시만 가지게 되면 "캐시 파편화"가 생기고 인스턴스마다 결과가 달라질 수 있습니다.

Redis는 이 지점을 해결합니다. 모든 인스턴스가 같은 공유 캐시에 접근할 수 있기 때문입니다.

### Configuration
먼저 필요한 패키지를 설치합니다:
`pnpm add @fluojs/redis ioredis`

그런 다음 모듈을 설정합니다:

```typescript
import { RedisModule } from '@fluojs/redis';
import { CacheModule } from '@fluojs/cache-manager';

@Module({
  imports: [
    RedisModule.forRoot({
      host: 'localhost',
      port: 6379,
    }),
    CacheModule.forRoot({
      store: 'redis',
      ttl: 600,
    }),
  ],
})
export class AppModule {}
```

## 17.8 Advanced Redis Patterns
이 파트에서 Redis를 먼저 도입한 이유는 캐싱이지만, Redis를 쓰는 이유가 그것뿐인 것은 아닙니다. `@fluojs/redis`를 사용하면 Pub/Sub이나 복잡한 데이터 타입 같은 고급 작업을 위해 `ioredis` 클라이언트에 직접 접근할 수도 있습니다.

```typescript
import { Inject } from '@fluojs/core';
import { REDIS_CLIENT } from '@fluojs/redis';
import type Redis from 'ioredis';

export class NotificationService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async publish(channel: string, message: string) {
    await this.redis.publish(channel, message);
  }
}
```

## 17.9 Summary
캐싱은 기능을 바꾸지 않고도 FluoBlog를 더 빠르게 체감하게 만드는 가장 직접적인 방법 중 하나입니다. `@fluojs/cache-manager`를 사용하면 간단한 응답 캐싱으로 시작하고, 필요한 곳에 수동 규칙을 더하고, 배포가 커지면 Redis로 자연스럽게 옮겨 갈 수 있습니다.

- 쉬운 GET 응답 캐싱을 위해 `CacheInterceptor`를 사용하세요.
- 수동 로직을 위해 `CacheService.remember()`를 사용하세요.
- 데이터를 최신 상태로 유지하기 위해 `@CacheEvict`를 사용하세요.
- 인스턴스 간 일관성을 위해 프로덕션에서는 항상 Redis를 사용하세요.

다음 장에서는 Terminus를 사용해 데이터베이스와 Redis, 그리고 애플리케이션 자체가 실제로 트래픽을 받을 만큼 건강한지 확인해 보겠습니다.
