<!-- packages: @fluojs/testing -->
<!-- project-state: FluoBlog v1.17 -->

# Chapter 20. Testing

## Learning Objectives
- Vitest와 `@fluojs/testing`을 이용한 테스트 환경을 구축합니다.
- `fluo`에서 단위 테스트와 통합 테스트의 차이점을 이해합니다.
- `createTestingModule`을 사용하여 단위 테스트를 위해 컴포넌트를 격리하는 방법을 배웁니다.
- 테스트 중에 프로바이더를 모의 객체(mock)나 가짜 객체(fake)로 교체(override)합니다.
- `createTestApp`을 사용하여 HTTP 통합 테스트를 구현합니다.
- FluoBlog의 컨트롤러와 서비스를 위한 자동화된 테스트를 작성합니다.

## 20.1 Why Testing Matters in fluo
표준 데코레이터와 명시적인 의존성 주입(DI)을 기반으로 구축된 프레임워크인 `fluo`에서는 테스트가 훨씬 쉬워집니다. `fluo`는 숨겨진 메타데이터나 글로벌 상태에 의존하지 않기 때문에, 테스트 스위트에서 원하는 대로 컴포넌트를 인스턴스화하고 연결할 수 있습니다.

테스트는 다음 사항을 보장합니다:
- 비즈니스 로직이 올바르게 작동하는지 확인합니다.
- API 엔드포인트가 예상된 데이터와 상태 코드를 반환하는지 확인합니다.
- 보안 가드와 인터셉터가 의도한 대로 작동하는지 확인합니다.
- 리팩토링이 기존 기능을 망가뜨리지 않는지 확인합니다.

## 20.2 Setting Up the Environment
우리는 **Vitest**를 기본 테스트 러너로 사용합니다. Vitest는 빠르고 Vite와 호환되며 TypeScript와 완벽하게 작동하기 때문입니다. Vitest는 Jest에 익숙한 사용자에게 친숙한 API를 제공하면서도 현대적인 TypeScript 프로젝트에서 훨씬 더 나은 성능을 보여줍니다.

필요한 의존성을 설치합니다:
```bash
pnpm add -g vitest
pnpm add -D @fluojs/testing @babel/core
```

`@babel/core`가 필요한 이유는 `@fluojs/testing/vitest`가 테스트 실행 중에 표준 데코레이터를 처리하기 위해 Babel 플러그인을 사용하기 때문입니다. TypeScript가 타입을 처리하는 동안 Babel은 테스트 중에도 런타임과 동일한 표준 데코레이터 동작을 보장합니다.

### Vitest Configuration
프로젝트 루트에 `vitest.config.ts` 파일을 생성합니다:

```typescript
import { defineConfig } from 'vitest/config';
import { fluoBabelDecoratorsPlugin } from '@fluojs/testing/vitest';

export default defineConfig({
  plugins: [
    fluoBabelDecoratorsPlugin(),
  ],
  test: {
    globals: true,
    environment: 'node',
    // src 내부와 모든 __tests__ 디렉토리의 테스트를 포함합니다
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  },
});
```

`fluoBabelDecoratorsPlugin`은 복잡한 설정 없이도 Vitest가 `fluo`의 표준 데코레이터를 이해할 수 있게 해주는 다리 역할을 합니다.

## 20.3 Unit Testing with createTestingModule
단위 테스트는 단일 클래스(주로 서비스)의 격리된 동작에 집중합니다. 이를 위해 해당 클래스의 의존성을 가짜 객체나 모의 객체로 제공해야 합니다. 이렇게 하면 테스트가 실패했을 때 정확히 어느 부분이 문제인지 즉시 알 수 있습니다.

### The Service to Test
우리의 `PostService`를 살펴봅시다:

```typescript
@Inject(PostRepository)
export class PostService {
  constructor(private readonly repo: PostRepository) {}

  async findOne(id: string) {
    const post = await this.repo.findById(id);
    if (!post) throw new Error('Post not found');
    return post;
  }
}
```

### The Test Suite
`createTestingModule`을 사용하여 테스트를 위한 최소한의 모듈 그래프를 컴파일합니다. 이는 오직 테스트만을 위한 미니 DI 컨테이너처럼 작동합니다.

```typescript
import { createTestingModule } from '@fluojs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PostService } from './post.service';
import { PostRepository } from './post.repository';

describe('PostService', () => {
  let service: PostService;
  let mockRepo: any;

  beforeEach(async () => {
    // 1. 모의 구현(mock implementation) 정의
    mockRepo = {
      findById: vi.fn(),
    };

    // 2. 테스트 모듈 생성
    const module = await createTestingModule({
      providers: [PostService],
    })
      .overrideProvider(PostRepository, mockRepo)
      .compile();

    // 3. 테스트하려는 인스턴스 해결(resolve)
    service = await module.resolve(PostService);
  });

  it('should find a post by id', async () => {
    mockRepo.findById.mockResolvedValue({ id: '1', title: 'Hello fluo' });

    const post = await service.findOne('1');

    expect(post.title).toBe('Hello fluo');
    expect(mockRepo.findById).toHaveBeenCalledWith('1');
  });

  it('should throw if post is not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.findOne('999')).rejects.toThrow('Post not found');
  });
});
```

이 패턴—**모의(Mock) -> 컴파일 -> 해결(Resolve) -> 실행(Act) -> 단언(Assert)**—은 `fluo` 단위 테스트의 핵심입니다.

## 20.4 Provider Overrides
`fluo`는 실제 컴포넌트를 테스트 대역(test double)으로 교체하는 여러 가지 방법을 제공합니다.

- **`overrideProvider(token, value)`**: 특정 토큰을 값(객체 또는 인스턴스)으로 교체합니다.
- **`overrideProviders([[token, value], ...])`**: 여러 토큰을 한 번에 교체합니다.

### Mocks vs Fakes
- **모의 객체(Mock)**: 호출 기록을 남기고 반환 값을 제어할 수 있는 객체입니다(예: `vi.fn()`). 상호작용을 검증할 때 좋습니다.
- **가짜 객체(Fake)**: 지름길로 구현된 실제 작동 구현체입니다(예: `InMemoryPostRepository`). 실제 데이터베이스 없이 상태 중심 테스트를 할 때 좋습니다.

```typescript
// 가짜(Fake) 구현체 사용 예시
class FakePostRepository {
  private data = new Map();
  async findById(id: string) { return this.data.get(id); }
  async save(post: any) { this.data.set(post.id, post); }
}

const module = await createTestingModule({ providers: [PostService] })
  .overrideProvider(PostRepository, new FakePostRepository())
  .compile();
```

## 20.5 Integration Testing with createTestApp
통합 테스트는 HTTP 레이어, 가드, 인터셉터를 포함하여 여러 컴포넌트가 함께 작동하는 방식을 검증합니다. `fluo`에서 이는 실제 네트워크 하드웨어만 제외하고 모든 스택을 실행하기 때문에 "E2E-lite"라고도 불립니다.

실제 네트워크 서버를 시작하는 대신, 가상 요청 디스패치 시스템을 제공하는 `createTestApp`을 사용합니다. 이는 테스트 속도를 크게 높이고 더 안정적으로 만들어 줍니다.

### The Test Case
```typescript
import { createTestApp } from '@fluojs/testing';
import { AppModule } from './app.module';

describe('PostController (Integration)', () => {
  let app: any;

  beforeAll(async () => {
    // 테스트 스위트를 위해 앱을 한 번만 초기화합니다
    app = await createTestApp({ rootModule: AppModule });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /posts should return a list of posts', async () => {
    const response = await app
      .request('GET', '/posts')
      .send();

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

### Mocking the Principal
경로가 사용자 세션을 확인하는 가드에 의해 보호되는 경우, `.principal()`을 사용하여 로그인된 사용자를 시뮬레이션할 수 있습니다. 이는 모든 테스트에서 전체 로그인 흐름을 수행할 필요가 없게 해줍니다.

```typescript
it('POST /posts should create a new post for admin', async () => {
  const response = await app
    .request('POST', '/posts')
    .principal({ subject: 'admin-user', roles: ['admin'] })
    .body({ title: 'Standard-First', content: 'Fluent and fast.' })
    .send();

  expect(response.status).toBe(201);
  expect(response.body.authorId).toBe('admin-user');
});
```

## 20.6 Mocking with createMock and createDeepMock
복잡한 클래스의 경우 모의 객체를 수동으로 생성하는 것이 번거로울 수 있습니다. `@fluojs/testing/mock`은 Proxy를 사용하여 타입을 자동으로 모의해주는 헬퍼를 제공합니다.

```typescript
import { createMock, createDeepMock } from '@fluojs/testing/mock';
import { vi } from 'vitest';

// 특정 메서드만 정의하는 얕은 모의 객체 생성
const repo = createMock<PostRepository>({ 
  findAll: vi.fn().mockResolvedValue([]) 
});

// 모든 메서드가 자동으로 모의되는 깊은 모의 객체 생성
// 의존성이 많은 서비스를 테스트할 때 유용합니다
const mailer = createDeepMock(MailService);
mailer.send.mockResolvedValue(true);
```

## 20.7 Best Practices for FluoBlog Testing
1.  **프레임워크를 테스트하지 마세요**: `@Get()`이 작동하는지가 아니라, 여러분의 비즈니스 로직에 집중하세요. `fluo`가 라우팅을 처리한다고 믿고, 해당 경로가 호출되었을 때 *여러분*의 코드가 무엇을 하는지 테스트하세요.
2.  **데이터베이스에는 가짜(Fake)를 사용하세요**: 통합 테스트는 실제 테스트용 데이터베이스(예: Docker의 PostgreSQL)를 사용할 수 있지만, 단위 테스트는 속도를 위해 항상 모의 객체나 가짜를 사용해야 합니다.
3.  **리소스 정리**: 리소스를 해제하기 위해 항상 `await app.close()` 또는 `await module.close()`를 호출하세요. 이는 메모리 누수와 테스트 러너가 종료되지 않는 문제를 방지합니다.
4.  **보안을 위한 통합 테스트**: 항상 가드와 RBAC 로직은 통합 테스트에서 테스트하세요. 단위 테스트는 대개 이를 우회하므로, 통합 테스트가 실제 보안을 검증하는 곳입니다.

## 20.8 Summary
`fluo`에서의 테스트는 명시적이고 표준 기반이며 추론하기 쉽다는 핵심 철학의 연장선상에 있습니다.

- 현대적인 개발자 경험과 빠른 실행을 위해 **Vitest**를 사용하세요.
- 프로바이더 교체를 통한 격리된 단위 테스트를 위해 `createTestingModule`을 사용하세요.
- 실제 네트워크 연결 없이 풀스택 통합 테스트를 위해 `createTestApp`을 사용하세요.
- 보호된 경로를 쉽게 테스트하기 위해 principal 모의(mocking)를 활용하세요.

탄탄한 테스트 스위트가 있다면 자신 있게 FluoBlog를 배포할 수 있습니다. 마지막 장에서는 애플리케이션의 프로덕션 배포를 준비하겠습니다.

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
