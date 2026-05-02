import { describe, expect, it } from 'vitest';

import { Inject } from '@fluojs/core';
import { defineClassDiMetadata, defineModuleMetadata } from '@fluojs/core/internal';

import { compileModuleGraph, createModuleGraphCacheKey } from './module-graph.js';

describe('module graph cache-key prerequisites', () => {
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

    const cache = new Map<string, ReturnType<typeof compileModuleGraph>>();
    const cacheKey = createModuleGraphCacheKey(AppModule);
    const compileAndStore = () => {
      const compiled = compileModuleGraph(AppModule);
      cache.set(cacheKey, compiled);
    };

    expect(compileAndStore).toThrow('not local, not exported by an imported module');
    expect(cache.has(cacheKey)).toBe(false);
  });
});
