import { beforeEach, describe, expect, it } from 'vitest';

import { Inject } from '@fluojs/core';
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
