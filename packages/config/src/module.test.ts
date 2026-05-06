import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Module, type Token } from '@fluojs/core';
import { createTestingModule } from '@fluojs/testing';
import { describe, expect, it, vi } from 'vitest';

import { ConfigModule } from './module.js';
import { ConfigService } from './service.js';

const watchCallbacks = vi.hoisted(() => new Set<() => void>());

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();

  return {
    ...actual,
    watch: vi.fn((_filename, _options, listener) => {
      const callback = () => listener('change', null);
      watchCallbacks.add(callback);

      return {
        close: vi.fn(() => {
          watchCallbacks.delete(callback);
        }),
      };
    }),
  };
});

function emitWatchChange(): void {
  for (const callback of [...watchCallbacks]) {
    callback();
  }
}

async function waitForCondition(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error('Timed out waiting for condition.');
}

type WatchManager = { onApplicationBootstrap(): void; onModuleDestroy(): void };
type WatchManagerToken = Token<WatchManager> & { name?: string };

function isWatchManagerToken(provider: unknown): provider is WatchManagerToken {
  return typeof provider === 'function' && provider.name === 'ConfigModuleWatchManager';
}

describe('ConfigModule watch mode', () => {
  it('activates watch reloads from ConfigModule.forRoot without replacing ConfigService identity', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'fluo-config-module-watch-'));
    const envPath = join(cwd, '.env.dev');

    writeFileSync(envPath, 'PORT=4000\n');

    @Module({
      imports: [
        ConfigModule.forRoot({
          envFile: envPath,
          processEnv: {},
          watch: true,
        }),
      ],
    })
    class AppModule {}

    const testingModule = await createTestingModule({ rootModule: AppModule }).compile();
    const service = await testingModule.resolve(ConfigService);
    const watchManagerToken = testingModule.effectiveProviders.moduleProviders.find(isWatchManagerToken);

    expect(watchManagerToken).toBeDefined();

    const manager = await testingModule.resolve(watchManagerToken as WatchManagerToken);

    expect(service.get('PORT')).toBe('4000');

    try {
      manager.onApplicationBootstrap();

      writeFileSync(envPath, 'PORT=4100\n');
      emitWatchChange();
      await waitForCondition(() => service.get('PORT') === '4100');

      expect(service.get('PORT')).toBe('4100');
      expect(watchCallbacks.size).toBe(1);
    } finally {
      manager.onModuleDestroy();
    }

    expect(watchCallbacks.size).toBe(0);
  });
});
