# @konekti/serializer

<p><a href="./README.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>


Konekti용 응답 직렬화 데코레이터 및 인터셉터 패키지입니다.

이 패키지는 NestJS 스타일의 클래스 기반 응답 직렬화를 제공합니다.

- `@Exclude()` 직렬화 결과에서 필드를 제거합니다.
- `@Expose()` 포함할 필드를 표시하며, 클래스 단위 `excludeExtraneous` 모드를 지원합니다.
- `@Transform(fn)` 재귀 직렬화 전에 필드 값을 변환합니다.
- `SerializerInterceptor`가 핸들러 응답에 `serialize()`를 자동 적용합니다.

## 설치

```bash
pnpm add @konekti/serializer
```

## 빠른 시작

```typescript
import { Controller, Get, UseInterceptor } from '@konekti/http';
import { Exclude, Expose, SerializerInterceptor } from '@konekti/serializer';

@Expose({ excludeExtraneous: true })
class UserView {
  @Expose()
  id: string;

  @Exclude()
  password: string;

  constructor(id: string, password: string) {
    this.id = id;
    this.password = password;
  }
}

@Controller('/users')
class UsersController {
  @Get('/')
  @UseInterceptor(SerializerInterceptor)
  listUsers() {
    return [new UserView('u-1', 'secret')];
  }
}
```

## 전역 등록

부트스트랩 시 전역 인터셉터로 직렬화를 등록할 수 있습니다.

```typescript
import { bootstrapApplication } from '@konekti/runtime';
import { SerializerInterceptor } from '@konekti/serializer';

await bootstrapApplication({
  mode: 'prod',
  rootModule: AppModule,
  interceptors: [SerializerInterceptor],
});
```

## API

- `Exclude(): FieldDecorator`
- `Expose(options?: { excludeExtraneous?: boolean }): ClassDecorator | FieldDecorator`
- `Transform(fn: (value: unknown) => unknown): FieldDecorator`
- `serialize(value: unknown): unknown`
- `class SerializerInterceptor implements Interceptor`
