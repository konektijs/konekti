# migrate from nestjs

<p><strong><kbd>English</kbd></strong> <a href="./migrate-from-nestjs.ko.md"><kbd>한국어</kbd></a></p>

fluo provides a familiar structural home for NestJS developers while moving the framework foundation to **TC39 standard decorators**. You get the same modular benefits without legacy metadata overhead or experimental compiler flags.

### target audience
Developers with NestJS experience who want to use modern TypeScript standards and explicit, auditable dependency injection.

### 1. simplify your tsconfig
fluo works with standard TypeScript defaults. You can turn off the legacy flags that NestJS requires.

```json
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": false, // fluo uses standard decorators
    "emitDecoratorMetadata": false   // No magic reflection metadata
  }
}
```

### 2. standard decorators
Decorators like `@Module` and `@Controller` are built on the **native TC39 decorator standard**. fluo drops `@Injectable()` entirely; classes are registered as providers through the module's `providers` array.

- **NestJS**: Relies on a legacy TypeScript implementation and `reflect-metadata`.
- **fluo**: Relies on native language features, ensuring compatibility with the future JavaScript ecosystem.

### 3. explicit over implicit injection
The biggest shift is how dependencies are declared. NestJS uses metadata to guess constructor types. fluo requires an explicit `@Inject` decorator on the class, making your dependency graph visible and auditable.

**NestJS (Implicit):**
```ts
@Injectable()
export class UsersService {
  constructor(private repo: UsersRepository) {}
}
```

**fluo (Explicit):**
```ts
import { Inject } from '@fluojs/core';

@Inject(UsersRepository)
export class UsersService {
  constructor(private repo: UsersRepository) {}
}
```

### 4. adapter-first factory
Bootstrap feels similar, but fluo makes the platform choice (Fastify, Express, etc.) an explicit part of the factory call.

That broader adapter choice does not mean every documented platform is already wired into `fluo new`. For the current starter contract, see the [fluo new support matrix](../reference/fluo-new-support-matrix.md).

**NestJS:**
```ts
const app = await NestFactory.create(AppModule);
```

**fluo:**
```ts
import { FluoFactory } from '@fluojs/runtime';
import { createFastifyAdapter } from '@fluojs/platform-fastify';

const app = await FluoFactory.create(AppModule, {
  adapter: createFastifyAdapter()
});
```

### why move to fluo?
- **No Magic**: Dependencies are declared in code, not hidden in emitted JSON metadata.
- **Modern Standards**: Move away from experimental features and align with the official ECMAScript spec.
- **Runtime Flexibility**: Deploy the same code to Node.js, Bun, Deno, or Cloudflare Workers by swapping an adapter.

### next steps
- **Start Fresh**: Use the [Quick Start](./quick-start.md) to see a fluo project.
- **Check starter coverage**: Review the [fluo new support matrix](../reference/fluo-new-support-matrix.md) for available presets.
- **Learn the Graph**: Read [DI and Modules](../concepts/di-and-modules.md) for a deep dive into explicit injection.
