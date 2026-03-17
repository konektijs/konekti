import { describe, expect, it } from 'vitest';

import { Global, Inject, Module, defineModuleMetadata } from '@konekti/core';

import { bootstrapModule } from './bootstrap.js';
import { ModuleInjectionMetadataError } from './errors.js';

describe('bootstrapModule', () => {
  it('boots a simple module graph deterministically', () => {
    class Logger {}

    class SharedModule {}
    defineModuleMetadata(SharedModule, {
      exports: [Logger],
      providers: [Logger],
    });

    @Inject([Logger])
    class AppService {
      constructor(readonly logger: Logger) {}
    }

    class AppModule {}
    defineModuleMetadata(AppModule, {
      imports: [SharedModule],
      providers: [AppService],
    });

    const result = bootstrapModule(AppModule);

    expect(result.modules.map((compiledModule) => compiledModule.type.name)).toEqual([
      'SharedModule',
      'AppModule',
    ]);
  });

  it('fails when a provider is not exported across modules', () => {
    class InternalRepository {}

    class DataModule {}
    defineModuleMetadata(DataModule, {
      providers: [InternalRepository],
    });

    @Inject([InternalRepository])
    class BillingService {}

    class BillingModule {}
    defineModuleMetadata(BillingModule, {
      imports: [DataModule],
      providers: [BillingService],
    });

    expect(() => bootstrapModule(BillingModule)).toThrow('not visible through a global module');
  });

  it('fails when a provider declares constructor dependencies without @Inject metadata', () => {
    class Logger {}

    class BillingService {
      constructor(readonly logger: Logger) {}
    }

    class BillingModule {}
    defineModuleMetadata(BillingModule, {
      providers: [Logger, BillingService],
    });

    expect(() => bootstrapModule(BillingModule)).toThrow(ModuleInjectionMetadataError);
    expect(() => bootstrapModule(BillingModule)).toThrow('Provider BillingService in module BillingModule');
  });

  it('fails when a class provider inject list is shorter than its constructor arity', () => {
    class Logger {}
    class Metrics {}

    class BillingService {
      constructor(
        readonly logger: Logger,
        readonly metrics: Metrics,
      ) {}
    }

    class BillingModule {}
    defineModuleMetadata(BillingModule, {
      providers: [
        Logger,
        Metrics,
        {
          provide: BillingService,
          inject: [Logger],
          useClass: BillingService,
        },
      ],
    });

    expect(() => bootstrapModule(BillingModule)).toThrow(ModuleInjectionMetadataError);
    expect(() => bootstrapModule(BillingModule)).toThrow('constructor parameter #1');
  });

  it('fails when a controller declares constructor dependencies without @Inject metadata', () => {
    class Logger {}

    class BillingController {
      constructor(readonly logger: Logger) {}
    }

    class BillingModule {}
    defineModuleMetadata(BillingModule, {
      controllers: [BillingController],
      providers: [Logger],
    });

    expect(() => bootstrapModule(BillingModule)).toThrow(ModuleInjectionMetadataError);
    expect(() => bootstrapModule(BillingModule)).toThrow('Controller BillingController in module BillingModule');
  });

  it('allows class providers to satisfy constructor dependencies with provider.inject', () => {
    class Logger {}

    class BillingService {
      constructor(readonly logger: Logger) {}
    }

    class BillingModule {}
    defineModuleMetadata(BillingModule, {
      providers: [
        Logger,
        {
          provide: BillingService,
          inject: [Logger],
          useClass: BillingService,
        },
      ],
    });

    expect(() => bootstrapModule(BillingModule)).not.toThrow();
  });

  it('allows exported providers from a global module without direct imports', () => {
    class Logger {}

    @Global()
    @Module({
      exports: [Logger],
      providers: [Logger],
    })
    class SharedModule {}

    @Inject([Logger])
    class BillingService {
      constructor(readonly logger: Logger) {}
    }

    @Module({
      imports: [SharedModule],
    })
    class RootModule {}

    @Module({
      providers: [BillingService],
    })
    class BillingModule {}

    class AppModule {}
    defineModuleMetadata(AppModule, {
      imports: [RootModule, BillingModule],
    });

    expect(() => bootstrapModule(AppModule)).not.toThrow();
  });
});

describe('bootstrapModule middleware DI registration', () => {
  it('registers middleware class tokens in the DI container', async () => {
    class LoggingMiddleware {
      async handle(_: unknown, next: () => Promise<void>) {
        await next();
      }
    }

    class AppModule {}
    defineModuleMetadata(AppModule, {
      middleware: [LoggingMiddleware],
    });

    const result = bootstrapModule(AppModule);
    const instance = await result.container.resolve(LoggingMiddleware);

    expect(instance).toBeInstanceOf(LoggingMiddleware);
  });

  it('registers MiddlewareRouteConfig middleware constructor in the DI container', async () => {
    class AuthMiddleware {
      async handle(_: unknown, next: () => Promise<void>) {
        await next();
      }
    }

    class AppModule {}
    defineModuleMetadata(AppModule, {
      middleware: [{ middleware: AuthMiddleware, routes: ['/users'] }],
    });

    const result = bootstrapModule(AppModule);
    const instance = await result.container.resolve(AuthMiddleware);

    expect(instance).toBeInstanceOf(AuthMiddleware);
  });

  it('silently skips plain object middleware (factory pattern)', () => {
    const factoryMiddleware = {
      handle: async (_: unknown, next: () => Promise<void>) => next(),
    };

    class AppModule {}
    defineModuleMetadata(AppModule, {
      middleware: [factoryMiddleware],
    });

    expect(() => bootstrapModule(AppModule)).not.toThrow();
  });

  it('does not throw when same class appears in both middleware and providers', () => {
    class LoggingMiddleware {
      async handle(_: unknown, next: () => Promise<void>) {
        await next();
      }
    }

    class AppModule {}
    defineModuleMetadata(AppModule, {
      middleware: [LoggingMiddleware],
      providers: [LoggingMiddleware],
    });

    expect(() => bootstrapModule(AppModule)).not.toThrow();
  });
});
