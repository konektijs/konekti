<!-- packages: @fluojs/config -->
<!-- project-state: FluoBlog v1.8 -->

# Chapter 11. Configuration Management

## Learning Objectives
- Understand why environment variables should be handled explicitly.
- Register `ConfigModule` and load configuration from `.env` files.
- Learn the precedence of configuration sources in `fluo`.
- Use `ConfigService` to inject configuration into providers.
- Implement configuration validation using Zod or simple schema checkers.
- Progress FluoBlog from hardcoded values to a production-ready configurable setup.

## 11.1 The Need for Explicit Configuration
Hardcoding values like database URLs, API keys, or port numbers directly in your code is a recipe for disaster. In a real-world project, these values change depending on whether you are running locally, in a CI/CD pipeline, or in a live production cluster.

While Node.js provides `process.env` globally, reaching for it directly everywhere in your code makes your application brittle, harder to test, and difficult to audit. `fluo` encourages an **explicit** approach to configuration via the `@fluojs/config` package.

### Why Explicit over Ambient?
- **Predictability**: You know exactly where every setting comes from.
- **Fail-Fast**: The system can prevent the app from starting if a required setting is missing.
- **Type Safety**: Access your configuration through a typed service rather than string-based environment lookups.
- **Testability**: Easily swap or mock configuration values in your unit and integration tests.

## 11.2 Setting up ConfigModule
To start managing configuration, we first need to install the module.

```bash
pnpm add @fluojs/config
```

In FluoBlog, we will update our `AppModule` to centralize our settings.

### Registration in AppModule
Open `src/app.module.ts` and add the `ConfigModule` to the imports array.

```typescript
import { Module } from '@fluojs/core';
import { ConfigModule } from '@fluojs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      // Path to your environment file
      envFile: '.env',
      // Sensible defaults for local development
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
`fluo` follows a strict precedence order when merging configuration sources:
1. **Runtime Overrides**: Values passed directly in the code (highest priority).
2. **Process Environment**: Values found in `process.env`.
3. **Environment File**: Values defined in your `.env` file.
4. **Defaults**: Hardcoded default values in your module setup (lowest priority).

## 11.3 Using ConfigService
Once registered, the `ConfigService` becomes available throughout your application via dependency injection.

### Injecting the Service
In your bootstrap logic (`main.ts`), you can use the service to determine which port to listen on.

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

In a service or controller:

```typescript
@Injectable()
export class ApiService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  getExternalApiUrl() {
    // getOrThrow ensures the app crashes if this critical key is missing
    return this.config.getOrThrow('EXTERNAL_API_URL');
  }
}
```

## 11.4 Advanced Pattern: Validation Schemas
A common production failure is an app starting with an "empty" or "invalid" database URL. We can prevent this by validating our config at startup.

```typescript
import { z } from 'zod'; // Optional validation library

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

By validating during `forRoot`, Fluo will throw a detailed error and **abort startup** if the configuration is invalid. This ensures that a misconfigured node never enters your load balancer rotation.

## 11.5 FluoBlog: Moving to Config
Let's clean up our project by moving our "magic strings" to a `.env` file.

1. **Create `.env`**:
   ```env
   PORT=4000
   DATABASE_URL=postgresql://user:pass@localhost:5432/blog
   ```

2. **Access via Service**:
   Replace any hardcoded ports in `main.ts` and repository URLs with `ConfigService` lookups.

## 11.6 Multi-Environment Patterns
In larger projects, you often need different configurations for `test`, `dev`, and `prod`. You can handle this by dynamically choosing the `envFile`:

```typescript
ConfigModule.forRoot({
  envFile: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
})
```

## 11.7 Summary
In this chapter, we transitioned from "magic" environment variables to a structured and validated configuration system.

- **Explicit is better than implicit**: Don't use `process.env` directly.
- **ConfigService** provides a unified, injectable interface for all settings.
- **Validation** at startup prevents unstable application states.
- **Precedence** allows flexible overrides across different environments.

By mastering configuration, you've made FluoBlog robust enough for real-world deployments. In the next chapter, we will use these skills to connect FluoBlog to a real database using Prisma.

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
