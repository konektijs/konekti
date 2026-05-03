import { beforeEach, describe, expect, it } from 'vitest';

import { Inject } from '@fluojs/core';
import { forwardRef, optional } from '@fluojs/di';
import { defineClassDiMetadata, defineModuleMetadata } from '@fluojs/core/internal';

import {
  clearModuleGraphCompileCacheForTesting,
  compileModuleGraph,
  createModuleGraphCacheKey,
  getModuleGraphCompileCacheSizeForTesting,
} from './module-graph.js';

describe('module graph cache-key prerequisites', () => {
  beforeEach(() => {
    clearModuleGraphCompileCacheForTesting();
  });

  it('returns the same key for the same root module and options inputs', () => {
    class AppModule {}
    defineModuleMetadata(AppModule, {});

    expect(createModuleGraphCacheKey(AppModule)).toBe(createModuleGraphCacheKey(AppModule));
  });

  it('changes when runtime providers change', () => {
    class Logger {}
    class Metrics {}
    class AppModule {}
    defineModuleMetadata(AppModule, {});

    const loggerKey = createModuleGraphCacheKey(AppModule, { providers: [Logger] });
    const metricsKey = createModuleGraphCacheKey(AppModule, { providers: [Metrics] });

    expect(metricsKey).not.toBe(loggerKey);
  });

  it('changes when validation tokens change', () => {
    const FIRST_TOKEN = Symbol('first-validation-token');
    const SECOND_TOKEN = Symbol('second-validation-token');

    class AppModule {}
    defineModuleMetadata(AppModule, {});

    const firstKey = createModuleGraphCacheKey(AppModule, { validationTokens: [FIRST_TOKEN] });
    const secondKey = createModuleGraphCacheKey(AppModule, { validationTokens: [SECOND_TOKEN] });

    expect(secondKey).not.toBe(firstKey);
  });

  it('includes the compile algorithm version in the cache key', () => {
    class AppModule {}
    defineModuleMetadata(AppModule, {});

    expect(createModuleGraphCacheKey(AppModule)).toContain('algorithm:1');
  });

  it('changes when module metadata changes', () => {
    class Logger {}
    class AppModule {}
    defineModuleMetadata(AppModule, {});
    const emptyKey = createModuleGraphCacheKey(AppModule);

    defineModuleMetadata(AppModule, {
      providers: [Logger],
    });

    expect(createModuleGraphCacheKey(AppModule)).not.toBe(emptyKey);
  });

  it('changes when class-DI metadata changes', () => {
    class Logger {}

    @Inject(Logger)
    class AppService {
      constructor(readonly logger: Logger) {}
    }

    class AppModule {}
    defineModuleMetadata(AppModule, {
      providers: [Logger, AppService],
    });
    const initialKey = createModuleGraphCacheKey(AppModule);

    defineClassDiMetadata(AppService, {
      scope: 'request',
    });

    expect(createModuleGraphCacheKey(AppModule)).not.toBe(initialKey);
  });

  it('does not cache failed module graph compilation as a successful reusable result', () => {
    class MissingDependency {}

    @Inject(MissingDependency)
    class AppService {
      constructor(readonly missingDependency: MissingDependency) {}
    }

    class AppModule {}
    defineModuleMetadata(AppModule, {
      providers: [AppService],
    });

    const compileAndStore = () => {
      compileModuleGraph(AppModule, { moduleGraphCache: true });
    };

    expect(compileAndStore).toThrow('not local, not exported by an imported module');
    expect(getModuleGraphCompileCacheSizeForTesting()).toBe(0);
  });

  it('keeps cached module graph snapshots isolated from returned result mutations', () => {
    class Logger {}
    class AppModule {}
    defineModuleMetadata(AppModule, {
      providers: [Logger],
      exports: [Logger],
    });

    const firstCompile = compileModuleGraph(AppModule, { moduleGraphCache: true });
    firstCompile[0]?.providerTokens.clear();
    firstCompile[0]?.exportedTokens.clear();
    firstCompile[0]?.definition.providers?.splice(0);

    const secondCompile = compileModuleGraph(AppModule, { moduleGraphCache: true });

    expect(secondCompile[0]?.providerTokens.has(Logger)).toBe(true);
    expect(secondCompile[0]?.exportedTokens.has(Logger)).toBe(true);
    expect(secondCompile[0]?.definition.providers).toEqual([Logger]);
  });

  it('keeps cached provider descriptors and nested inject wrappers isolated from returned result mutations', () => {
    class Logger {}
    class Metrics {}
    class MissingDependency {}
    const SERVICE_TOKEN = Symbol('service-token');
    const POISONED_TOKEN = Symbol('poisoned-token');
    const createService = (logger: Logger) => ({ logger });

    class AppModule {}
    defineModuleMetadata(AppModule, {
      providers: [
        Logger,
        Metrics,
        {
          provide: SERVICE_TOKEN,
          inject: [forwardRef(() => Logger), optional(Metrics)],
          useFactory: createService,
        },
      ],
    });

    const firstCompile = compileModuleGraph(AppModule, { moduleGraphCache: true });
    const factoryProvider = firstCompile[0]?.definition.providers?.[2];
    if (typeof factoryProvider === 'function' || factoryProvider === undefined || !('useFactory' in factoryProvider) || factoryProvider.inject === undefined) {
      expect.unreachable('expected a factory provider with explicit inject metadata');
    }

    factoryProvider.provide = POISONED_TOKEN;
    factoryProvider.inject.splice(0, factoryProvider.inject.length, forwardRef(() => MissingDependency));
    const poisonedWrapper = factoryProvider.inject[0];
    if (typeof poisonedWrapper === 'object' && poisonedWrapper !== null && '__forwardRef__' in poisonedWrapper) {
      poisonedWrapper.forwardRef = () => MissingDependency;
    }

    const secondCompile = compileModuleGraph(AppModule, { moduleGraphCache: true });
    const cachedFactoryProvider = secondCompile[0]?.definition.providers?.[2];
    if (typeof cachedFactoryProvider === 'function' || cachedFactoryProvider === undefined || !('useFactory' in cachedFactoryProvider) || cachedFactoryProvider.inject === undefined) {
      expect.unreachable('expected a cached factory provider with explicit inject metadata');
    }

    expect(cachedFactoryProvider.provide).toBe(SERVICE_TOKEN);
    expect(cachedFactoryProvider.inject).toHaveLength(2);
    const firstWrapper = cachedFactoryProvider.inject[0];
    if (typeof firstWrapper === 'object' && firstWrapper !== null && '__forwardRef__' in firstWrapper) {
      expect(firstWrapper.__forwardRef__).toBe(true);
      expect(firstWrapper.forwardRef()).toBe(Logger);
    } else {
      expect.unreachable('expected the first cached dependency to remain a forwardRef wrapper');
    }
    expect(cachedFactoryProvider.inject[1]).toEqual(optional(Metrics));
  });

  it('keeps the module graph cache opt-in', () => {
    class Logger {}
    class AppModule {}
    defineModuleMetadata(AppModule, {
      providers: [Logger],
    });

    const firstCompile = compileModuleGraph(AppModule);
    firstCompile[0]?.providerTokens.clear();

    expect(getModuleGraphCompileCacheSizeForTesting()).toBe(0);

    compileModuleGraph(AppModule, { moduleGraphCache: true });

    expect(getModuleGraphCompileCacheSizeForTesting()).toBe(1);
    expect(compileModuleGraph(AppModule)[0]?.providerTokens.has(Logger)).toBe(true);
  });
});
