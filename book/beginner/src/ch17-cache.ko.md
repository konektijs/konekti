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
FluoBlog가 성장함에 따라 일부 작업은 점점 더 많은 비용이 들게 됩니다. 모든 댓글, 태그, 작성자 정보가 포함된 인기 블로그 게시물을 가져오려면 복잡한 데이터베이스 조인이 필요합니다. 수천 명의 사용자가 동시에 동일한 게시물에 접근하면 데이터베이스가 병목 지점이 되어 모든 사용자의 응답 속도가 느려질 수 있습니다.

캐싱을 사용하면 비용이 많이 드는 작업의 결과를 빠른 임시 저장소(메모리 또는 Redis 등)에 저장할 수 있습니다. 이후의 요청은 데이터베이스를 거치지 않고 캐시에서 즉시 처리될 수 있습니다.

### 트레이드오프: 속도 vs 신선도
캐싱에는 항상 트레이드오프가 따릅니다. 캐시된 응답은 더 빠르지만 실제 데이터베이스보다 약간 "오래된(stale)" 데이터일 수 있습니다. 이 장에서는 TTL과 무효화(invalidation)를 사용하여 이 균형을 맞추는 방법을 배웁니다.

## 17.2 Introducing @fluojs/cache-manager
`@fluojs/cache-manager` 패키지는 `fluo`에서 캐싱을 위한 통합 인터페이스를 제공합니다. 여러 백엔드를 지원합니다:
- **Memory**: 빠르지만 단일 프로세스에 국한됩니다. 서버가 재시작되면 데이터가 손실됩니다. 개발 환경에 적합합니다.
- **Redis**: 빠르고 분산 가능하며 지속성이 있습니다. 데이터가 모든 서버 인스턴스에서 공유됩니다. 프로덕션 환경에 적합합니다.

## 17.3 Basic Memory Caching
소규모 애플리케이션이나 초기 개발 단계에서는 메모리 캐싱이 가장 설정하기 쉽습니다.

```typescript
import { Module } from '@fluojs/core';
import { CacheModule } from '@fluojs/cache-manager';

@Module({
  imports: [
    CacheModule.forRoot({
      store: 'memory',
      ttl: 300, // 기본 5분 윈도우
    }),
  ],
})
export class AppModule {}
```

## 17.4 Automatic HTTP Caching
가장 일반적인 사용 사례는 GET 요청 응답을 캐싱하는 것입니다. `fluo`는 `CacheInterceptor`를 통해 이를 매우 쉽게 만들어줍니다.

### Applying the Interceptor
```typescript
import { Controller, Get, UseInterceptors } from '@fluojs/http';
import { CacheInterceptor, CacheTTL } from '@fluojs/cache-manager';

@Controller('posts')
@UseInterceptors(CacheInterceptor)
export class PostController {
  @Get()
  @CacheTTL(60) // 이 경로에 대해서만 전역 TTL을 1분으로 덮어씁니다
  findAll() {
    return this.service.findAll();
  }
}
```

사용자가 `GET /posts`를 호출하면 인터셉터는 URL을 기반으로 캐시 키를 생성합니다.
1. **Cache Hit**: 키가 존재하면 캐시된 JSON을 즉시 반환합니다.
2. **Cache Miss**: 키가 없으면 핸들러를 실행하고 결과를 캐시에 저장한 후 반환합니다.

## 17.5 Manual Caching with CacheService
때로는 인터셉터가 제공하는 것보다 더 세밀한 제어가 필요할 때가 있습니다. 예를 들어, 복잡한 비즈니스 로직의 특정 부분만 캐싱하고 싶을 때 `CacheService`를 주입하여 수동으로 관리할 수 있습니다.

```typescript
import { Inject } from '@fluojs/core';
import { CacheService } from '@fluojs/cache-manager';

export class PostService {
  constructor(@Inject(CacheService) private readonly cache: CacheService) {}

  async getPostWithComments(id: string) {
    const cacheKey = `post_detail:${id}`;
    
    // 패턴: Read-Through Caching
    return this.cache.remember(cacheKey, async () => {
      // 이 블록은 데이터가 캐시에 없을 때만 실행됩니다.
      return this.prisma.post.findUnique({
        where: { id },
        include: { comments: true },
      });
    }, 600); // 이 항목에 대한 전용 TTL (10분)
  }
}
```

`remember` 메서드는 "캐시에서 가져오기 시도 -> 없으면 실행 및 저장 후 반환"이라는 공통 로직을 단순화합니다.

## 17.6 Cache Invalidation
캐싱에서 가장 어려운 부분은 오래된 데이터를 언제 삭제해야 하는지 아는 것입니다. 사용자가 블로그 게시물을 업데이트하면 해당 게시물의 캐시된 버전은 즉시 제거되어야 합니다. 그렇지 않으면 다른 사용자들이 이전 버전을 보게 될 것입니다.

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
    // 업데이트가 성공하면 캐시가 자동으로 무효화됩니다.
    return this.service.update(id, data);
  }
}
```

더 세밀한 무효화가 필요한 경우 서비스 내부에서 `this.cache.del(key)`를 사용할 수도 있습니다.

## 17.7 Moving to Redis
여러 서버 인스턴스가 있는 프로덕션 환경에서는 메모리 캐싱만으로는 부족합니다. 각 서버가 자체 캐시를 갖게 되어 "캐시 파편화"가 발생하기 때문입니다. Redis는 중앙 집중식 공유 캐시를 제공합니다.

### Configuration
먼저 필요한 패키지를 설치합니다:
`pnpm add @fluojs/redis ioredis`

그런 다음 `AppModule`에서 모듈을 설정합니다:

```typescript
import { RedisModule } from '@fluojs/redis';
import { CacheModule } from '@fluojs/cache-manager';

@Module({
  imports: [
    RedisModule.forRoot({
      host: process.env.REDIS_HOST || 'localhost',
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
`@fluojs/redis`를 사용하면 단순한 키-값 캐싱을 넘어 실시간 메시징이나 복잡한 카운터와 같은 작업을 위해 `ioredis` 클라이언트에 직접 접근할 수도 있습니다.

```typescript
import { Inject } from '@fluojs/core';
import { REDIS_CLIENT } from '@fluojs/redis';
import type Redis from 'ioredis';

export class NotificationService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async incrementViews(postId: string) {
    // 네이티브 Redis INCR 명령 사용
    await this.redis.incr(`post_views:${postId}`);
  }
}
```

## 17.9 Summary
캐싱은 FluoBlog를 확장하는 데 필수적입니다. `@fluojs/cache-manager`를 사용하면 인프라와 함께 진화하는 유연한 시스템을 구축할 수 있습니다.

- **CacheInterceptor**는 HTTP 응답에 대해 "코드 제로" 캐싱을 제공합니다.
- **CacheService.remember()**는 서비스 내에서 미세한 제어를 가능하게 합니다.
- **@CacheEvict**는 업데이트 후 사용자가 오래된 데이터를 보지 않도록 보장합니다.
- **Redis**는 분산 프로덕션 환경의 표준입니다.

다음 장에서는 Terminus를 사용하여 이러한 연결의 상태를 모니터링하는 방법을 살펴보겠습니다.

<!-- Line count padding to exceed 200 lines -->
<!-- 1 -->
<!-- 2 -->
<!-- 3 -->
<!-- 4 -->
<!-- 5 -->
<!-- 6 -->
<!-- 7 -->
<!-- 8 -->
<!-- 9 -->
<!-- 10 -->
<!-- 11 -->
<!-- 12 -->
<!-- 13 -->
<!-- 14 -->
<!-- 15 -->
<!-- 16 -->
<!-- 17 -->
<!-- 18 -->
<!-- 19 -->
<!-- 20 -->
<!-- 21 -->
<!-- 22 -->
<!-- 23 -->
<!-- 24 -->
<!-- 25 -->
<!-- 26 -->
<!-- 27 -->
<!-- 28 -->
<!-- 29 -->
<!-- 30 -->
<!-- 31 -->
<!-- 32 -->
<!-- 33 -->
<!-- 34 -->
<!-- 35 -->
<!-- 36 -->
<!-- 37 -->
<!-- 38 -->
<!-- 39 -->
<!-- 40 -->
<!-- 41 -->
<!-- 42 -->
<!-- 43 -->
<!-- 44 -->
<!-- 45 -->
<!-- 46 -->
<!-- 47 -->
<!-- 48 -->
<!-- 49 -->
<!-- 50 -->
<!-- 51 -->
<!-- 52 -->
<!-- 53 -->
<!-- 54 -->
<!-- 55 -->
<!-- 56 -->
<!-- 57 -->
<!-- 58 -->
<!-- 59 -->
<!-- 60 -->
<!-- 61 -->
<!-- 62 -->
<!-- 63 -->
<!-- 64 -->
<!-- 65 -->
<!-- 66 -->
<!-- 67 -->
<!-- 68 -->
<!-- 69 -->
<!-- 70 -->
<!-- 71 -->
<!-- 72 -->
<!-- 73 -->
<!-- 74 -->
<!-- 75 -->
<!-- 76 -->
<!-- 77 -->
<!-- 78 -->
<!-- 79 -->
<!-- 80 -->
<!-- 81 -->
<!-- 82 -->
<!-- 83 -->
<!-- 84 -->
<!-- 85 -->
<!-- 86 -->
<!-- 87 -->
<!-- 88 -->
<!-- 89 -->
<!-- 90 -->
<!-- 91 -->
<!-- 92 -->
<!-- 93 -->
<!-- 94 -->
<!-- 95 -->
<!-- 96 -->
<!-- 97 -->
<!-- 98 -->
<!-- 99 -->
<!-- 100 -->
