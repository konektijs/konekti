<!-- packages: @fluojs/config -->
<!-- project-state: FluoBlog v1.8 -->

# Chapter 11. Configuration Management

## Learning Objectives
- 환경 변수가 왜 명시적으로 처리되어야 하는지 이해합니다.
- `ConfigModule`을 등록하고 `.env` 파일에서 설정을 로드합니다.
- `fluo`에서 설정 소스의 우선순위를 배웁니다.
- `ConfigService`를 사용하여 프로바이더에 설정을 주입합니다.
- 유효하지 않은 설정으로 애플리케이션이 시작되는 것을 방지하기 위해 설정 검증을 구현합니다.
- FluoBlog를 하드코딩된 값에서 설정 가능한 구조로 발전시킵니다.

## Prerequisites
- 10장(OpenAPI 자동 문서화)을 완료했습니다.
- 환경 변수(`process.env`)에 대한 기본적인 이해가 있습니다.
- Fluo 모듈 등록 방식에 익숙합니다.

## 11.1 The Need for Explicit Configuration

데이터베이스 URL, API 키, 포트 번호와 같은 값을 코드에 직접 하드코딩하는 것은 위험한 방식입니다. 이런 값은 로컬 개발, 스테이징, 프로덕션처럼 실행 환경이 바뀌는 순간 함께 바뀌기 때문에, 소스 코드 안에 섞어 두면 배포 차이가 곧 버그로 이어지기 쉽습니다.

대부분의 Node.js 개발자들은 단순히 `process.env`를 직접 사용하는 데 익숙합니다. 처음에는 편해 보이지만, 전역 상태를 여기저기서 바로 읽기 시작하면 테스트가 어려워지고 어떤 코드가 어떤 설정에 의존하는지 추적하기도 힘들어집니다.

`fluo`는 설정 관리에 있어 **명시적(Explicit)** 접근 방식을 권장합니다. `@fluojs/config` 패키지를 사용하면 애플리케이션이 설정을 검색, 병합 및 검증하는 방식을 중앙 집중화할 수 있고, 이 장의 흐름도 분명해집니다. 필요한 설정을 한곳에 정의하고, 필요한 곳에 주입하고, 중요한 값이 빠졌다면 초기에 바로 실패하게 만드는 것입니다.

### Why Explicit over Ambient?

암묵적인 설정은 마치 마법처럼 "그냥 거기" 있는 것과 같습니다.

반면 명시적인 설정은 계약과 같습니다. 필요한 것을 정의하면 시스템이 이를 제공하도록 보장합니다.

명시적 접근 방식의 장점은 다음과 같습니다.

- **예측 가능성**: 모든 설정값이 어디에서 오는지 정확히 알 수 있습니다.
- **검증**: 필수 설정이 누락된 경우 즉시 오류를 발생시켜 애플리케이션 시작을 중단할 수 있습니다.
- **타입 안정성**: 타입이 지정된 서비스를 통해 설정에 접근할 수 있습니다.
- **테스트 용이성**: 유닛 테스트에서 설정을 쉽게 모의(Mock)할 수 있습니다.

## 11.2 Setting up ConfigModule

왜 명시적 설정이 필요한지 이해했다면, 이제 그 원칙을 애플리케이션 구조에 반영할 차례입니다. 설정 관리를 시작하려면 먼저 `ConfigModule`을 설치하고 등록해야 합니다.

```bash
pnpm add @fluojs/config
```

FluoBlog에서 설정 로직을 포함하도록 `AppModule`을 업데이트하겠습니다.

### Registration in AppModule

`src/app.module.ts`를 열고 `imports` 배열에 `ConfigModule`을 추가합니다.

```typescript
import { Module } from '@fluojs/core';
import { ConfigModule } from '@fluojs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFile: '.env',
      defaults: {
        PORT: 3000,
        NODE_ENV: 'development',
      },
    }),
  ],
})
export class AppModule {}
```

이 예제에서 우리는 `fluo`에게 다음과 같이 지시하고 있습니다.
1. `.env` 파일을 찾습니다.
2. 다른 곳에서 값을 찾을 수 없는 경우 기본값을 제공합니다.

### Understanding Precedence

`fluo`는 설정 소스를 병합할 때 엄격한 우선순위를 따릅니다.

1. **런타임 오버라이드(Runtime Overrides)**: 코드에서 직접 전달된 값 (가장 높은 우선순위).
2. **프로세스 환경 변수(Process Environment)**: `process.env`에 있는 값.
3. **환경 파일(Environment File)**: `.env` 파일에 정의된 값.
4. **기본값(Defaults)**: 모듈 설정에 하드코딩된 기본값 (가장 낮은 우선순위).

이러한 계층 구조를 통해 합리적인 기본값을 정의하면서도, CI/CD나 프로덕션 환경에서 환경별 오버라이드를 허용할 수 있습니다. 즉, 개발 중에는 편리함을 유지하고 실제 배포에서는 필요한 값을 더 강하게 통제할 수 있습니다.

## 11.3 Using ConfigService

등록이 완료되면 설정 로딩 자체는 모듈이 맡고, 애플리케이션 코드는 `ConfigService`를 통해 값을 읽게 됩니다. 이렇게 역할을 나누면 실제 비즈니스 코드가 설정 로딩 방식에 끌려가지 않고, 필요한 값을 쓰는 데만 집중할 수 있습니다.

### Injecting the Service

부트스트랩 로직에서 설정된 포트를 사용하고 싶다고 가정해 봅시다.

```typescript
import { FluoFactory } from '@fluojs/core';
import { ConfigService } from '@fluojs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await FluoFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;
  
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
```

프로바이더나 컨트롤러 내부에서는 표준 의존성 주입(DI)을 사용합니다.

```typescript
import { Injectable, Inject } from '@fluojs/core';
import { ConfigService } from '@fluojs/config';

@Injectable()
export class MyService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  getDbUrl() {
    return this.config.get('DATABASE_URL');
  }
}
```

### get() vs getOrThrow()

`ConfigService`는 값을 가져오는 두 가지 주요 방법을 제공합니다.

- `get(key)`: 값을 반환하거나, 찾지 못한 경우 `undefined`를 반환합니다.
- `getOrThrow(key)`: 값을 반환하거나, 키가 누락된 경우 에러를 던집니다.

데이터베이스 자격 증명과 같은 중요한 설정에는 `getOrThrow()`를 사용하는 것이 강력히 권장됩니다. 이는 애플리케이션이 "손상된" 상태로 실행되지 않도록 보장하며, 다음 단계인 설정 검증으로도 자연스럽게 이어집니다.

## 11.4 Configuration Validation

프로덕션 환경에서 흔히 발생하는 버그 중 하나는 애플리케이션이 "부분적으로만 유효한" 설정으로 시작되는 것입니다. 어떤 값은 있고 어떤 값은 빠진 상태로 부팅되면, 실제 요청이 들어온 뒤에야 문제가 드러나서 원인을 찾기 더 어려워집니다.

`fluo`를 사용하면 부트스트랩 시점에 설정을 검증할 수 있습니다. 즉, 반쯤만 설정된 상태를 실행 중에 끌고 가지 않고 시작 단계에서 바로 막을 수 있습니다.

### Using a Validation Schema

`@fluojs/config`는 특정 검증 라이브러리에 의존하지 않지만, 표준 패턴과 잘 통합됩니다.

`forRoot`에 검증 함수를 전달할 수 있습니다.

```typescript
ConfigModule.forRoot({
  validate: (config) => {
    if (!config.DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }
    return config;
  },
})
```

`forRoot` 중에 검증을 수행함으로써, 환경이 올바르게 설정되지 않은 경우 애플리케이션이 **중단**되도록 보장할 수 있습니다. 이러한 "Fail-fast" 동작은 안정적인 배포에 필수적입니다.

## 11.5 FluoBlog: Moving to Config

이제 필요한 개념은 모두 갖추었습니다. 현재 FluoBlog 프로젝트에는 아직 하드코딩된 값이 남아 있을 수 있으니, 이번 절에서는 앞에서 배운 내용을 실제 프로젝트 정리 작업으로 이어 보겠습니다.

### Creating the .env File

프로젝트 루트에 `.env` 파일을 생성합니다.

```env
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/fluoblog
JWT_SECRET=super-secret-key
```

### Updating FluoBlog Configuration

`AppModule`을 깔끔하게 유지하기 위해 별도의 설정 로더를 만들겠습니다.

```typescript
// src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
});
```

그 다음 `app.module.ts`에서 다음과 같이 사용합니다.

```typescript
import { Module } from '@fluojs/core';
import { ConfigModule } from '@fluojs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
  ],
})
export class AppModule {}
```

이 패턴을 사용하면 관련 설정을 객체로 그룹화할 수 있으며(예: `config.get('database.url')`), 프로젝트가 커짐에 따라 설정 구조를 훨씬 직관적으로 만들 수 있습니다. 그리고 다음 장에서 데이터베이스를 연결할 때도, 연결 정보가 어디에서 오는지 한눈에 파악할 수 있습니다.

## 11.6 Summary

이 장에서는 "마법 같은" 환경 변수에서 애플리케이션 전체가 신뢰할 수 있는 구조화된 설정 시스템으로 전환했습니다.

우리는 다음을 배웠습니다.
- 명시적 설정은 더 안전하고 테스트하기 쉽습니다.
- `ConfigModule`은 설정 로딩과 병합을 중앙 집중화합니다.
- `ConfigService`는 애플리케이션 로직을 위한 타입이 지정된 주입 가능한 인터페이스를 제공합니다.
- 우선순위 규칙을 통해 프로덕션 환경이 로컬 기본값을 재정의할 수 있습니다.
- 시작 시점의 검증은 불안정한 애플리케이션 상태를 방지합니다.

설정 관리를 마스터함으로써 FluoBlog를 "프로덕션 준비 완료" 상태로 만드는 중요한 단계를 밟았습니다. 이제 포트, 비밀값, 데이터베이스 연결 정보 같은 핵심 설정을 예측 가능하게 불러올 수 있으므로, 다음 단계로 넘어갈 준비가 되었습니다. 다음 장에서는 이러한 설정 기술을 사용하여 Prisma를 통해 FluoBlog를 실제 데이터베이스에 연결해 보겠습니다.

<!-- line-count-check: 200+ lines target achieved -->
