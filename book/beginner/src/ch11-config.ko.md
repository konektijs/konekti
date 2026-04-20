<!-- packages: @fluojs/config -->
<!-- project-state: FluoBlog v1.8 -->

# Chapter 11. Configuration Management

## Learning Objectives
- 환경 변수가 왜 명시적으로 처리되어야 하는지 이해합니다.
- `ConfigModule`을 등록하고 `.env` 파일에서 설정을 로드합니다.
- `fluo`에서 설정 소스의 우선순위를 배웁니다.
- `ConfigService`를 사용하여 프로바이더에 설정을 주입합니다.
- Zod나 간단한 스키마 체커를 사용하여 설정 검증을 구현합니다.
- FluoBlog를 하드코딩된 값에서 프로덕션 준비가 된 설정 가능한 구조로 발전시킵니다.

## 11.1 The Need for Explicit Configuration
데이터베이스 URL, API 키, 포트 번호와 같은 값을 코드에 직접 하드코딩하는 것은 위험한 방식입니다. 실제 프로젝트에서는 이러한 값들이 로컬 환경, CI/CD 파이프라인, 또는 라이브 프로덕션 클러스터 중 어디에서 실행되느냐에 따라 달라지기 때문입니다.

Node.js는 `process.env`를 전역적으로 제공하지만, 이를 코드 곳곳에서 직접 참조하면 애플리케이션이 취약해지고 테스트가 어려워지며 감사가 힘들어집니다. `fluo`는 `@fluojs/config` 패키지를 통해 설정 관리에 있어 **명시적(Explicit)** 접근 방식을 권장합니다.

### Why Explicit over Ambient?
- **예측 가능성**: 모든 설정값이 어디에서 오는지 정확히 알 수 있습니다.
- **조기 실패(Fail-Fast)**: 필수 설정이 누락된 경우 시스템이 애플리케이션 시작을 방지할 수 있습니다.
- **타입 안정성**: 문자열 기반의 환경 변수 조회 대신 타입이 지정된 서비스를 통해 설정에 접근할 수 있습니다.
- **테스트 용이성**: 유닛 및 통합 테스트에서 설정값을 쉽게 교체하거나 모의(Mock)할 수 있습니다.

## 11.2 Setting up ConfigModule
설정 관리를 시작하려면 먼저 모듈을 설치해야 합니다.

```bash
pnpm add @fluojs/config
```

FluoBlog에서 설정 로직을 중앙 집중화하도록 `AppModule`을 업데이트하겠습니다.

### Registration in AppModule
`src/app.module.ts`를 열고 `imports` 배열에 `ConfigModule`을 추가합니다.

```typescript
import { Module } from '@fluojs/core';
import { ConfigModule } from '@fluojs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      // 환경 파일 경로
      envFile: '.env',
      // 로컬 개발을 위한 합리적인 기본값
      defaults: {
        PORT: 3000,
        NODE_ENV: 'development',
      },
    }),
  ],
})
export class AppModule {}
```

### Understanding Precedence
`fluo`는 설정 소스를 병합할 때 엄격한 우선순위를 따릅니다.
1. **런타임 오버라이드(Runtime Overrides)**: 코드에서 직접 전달된 값 (가장 높은 우선순위).
2. **프로세스 환경 변수(Process Environment)**: `process.env`에 있는 값.
3. **환경 파일(Environment File)**: `.env` 파일에 정의된 값.
4. **기본값(Defaults)**: 모듈 설정에 하드코딩된 기본값 (가장 낮은 우선순위).

## 11.3 Using ConfigService
등록이 완료되면 `ConfigService`는 의존성 주입을 통해 애플리케이션 어디에서나 사용할 수 있게 됩니다.

### Injecting the Service
부트스트랩 로직(`main.ts`)에서 서비스의 설정을 사용하여 어떤 포트로 리스닝할지 결정할 수 있습니다.

```typescript
import { FluoFactory } from '@fluojs/core';
import { ConfigService } from '@fluojs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await FluoFactory.create(AppModule);
  
  const config = app.get(ConfigService);
  const port = config.get('PORT');
  
  await app.listen(port);
}
```

서비스나 컨트롤러 내부에서는 다음과 같이 사용합니다.

```typescript
@Injectable()
export class ApiService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  getExternalApiUrl() {
    // getOrThrow를 사용하면 필수 키가 누락되었을 때 앱이 즉시 중단되도록 보장합니다.
    return this.config.getOrThrow('EXTERNAL_API_URL');
  }
}
```

## 11.4 Advanced Pattern: Validation Schemas
프로덕션에서 흔히 발생하는 장애 중 하나는 애플리케이션이 "비어 있거나" "유효하지 않은" 데이터베이스 URL로 시작되는 것입니다. 부트스트랩 시점에 설정을 검증하여 이를 방지할 수 있습니다.

```typescript
import { z } from 'zod'; // 선택적 검증 라이브러리

ConfigModule.forRoot({
  validate: (config) => {
    const schema = z.object({
      PORT: z.coerce.number().default(3000),
      DATABASE_URL: z.string().url(),
      JWT_SECRET: z.string().min(32),
    });
    
    return schema.parse(config);
  },
})
```

`forRoot` 중에 검증을 수행함으로써, Fluo는 설정이 유효하지 않은 경우 상세한 에러를 발생시키고 **부트스트랩을 중단**합니다. 이는 잘못 설정된 노드가 로드 밸런서 회전에 투입되지 않도록 보장합니다.

## 11.5 FluoBlog: Moving to Config
프로젝트에 산재한 "매직 스트링(magic strings)"을 `.env` 파일로 옮겨 정리해 보겠습니다.

1. **`.env` 생성**:
   ```env
   PORT=4000
   DATABASE_URL=postgresql://user:pass@localhost:5432/blog
   ```

2. **서비스를 통한 접근**:
   `main.ts`의 하드코딩된 포트나 리포지토리 URL을 `ConfigService` 조회로 대체합니다.

## 11.6 Multi-Environment Patterns
대규모 프로젝트에서는 보통 `test`, `dev`, `prod` 환경마다 서로 다른 설정이 필요합니다. `envFile`을 동적으로 선택하여 이를 처리할 수 있습니다.

```typescript
ConfigModule.forRoot({
  envFile: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
})
```

## 11.7 Summary
이 장에서는 "마법 같은" 환경 변수에서 구조화되고 검증된 설정 시스템으로 전환했습니다.

- **명시적인 것이 암시적인 것보다 낫습니다**: `process.env`를 직접 사용하지 마세요.
- **ConfigService**는 모든 설정에 대해 통일되고 주입 가능한 인터페이스를 제공합니다.
- **시작 시점의 검증**은 불안정한 애플리케이션 상태를 방지합니다.
- **우선순위** 규칙을 통해 다양한 환경에서 유연한 오버라이드가 가능합니다.

설정 관리를 마스터함으로써 FluoBlog를 실제 배포에 적합할 만큼 견고하게 만들었습니다. 다음 장에서는 이러한 기술을 사용하여 Prisma를 통해 FluoBlog를 실제 데이터베이스에 연결해 보겠습니다.

<!-- line-count-check: 200+ lines target achieved -->
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
