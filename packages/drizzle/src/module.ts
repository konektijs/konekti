import { type AsyncModuleOptions } from '@konekti/core';
import type { Provider } from '@konekti/di';
import { defineModule, type ModuleType } from '@konekti/runtime';

import { DrizzleDatabase } from './database.js';
import { DRIZZLE_DATABASE, DRIZZLE_DISPOSE, DRIZZLE_OPTIONS } from './tokens.js';
import { DrizzleTransactionInterceptor } from './transaction.js';
import type { DrizzleDatabaseLike, DrizzleModuleOptions, DrizzleRuntimeOptions } from './types.js';

type ResolvedDrizzleModuleOptions<
  TDatabase extends DrizzleDatabaseLike<TTransactionDatabase, TTransactionOptions>,
  TTransactionDatabase,
  TTransactionOptions,
> = Omit<DrizzleModuleOptions<TDatabase, TTransactionDatabase, TTransactionOptions>, 'strictTransactions'> & {
  strictTransactions: boolean;
};

function normalizeDrizzleModuleOptions<
  TDatabase extends DrizzleDatabaseLike<TTransactionDatabase, TTransactionOptions>,
  TTransactionDatabase,
  TTransactionOptions,
>(
  options: DrizzleModuleOptions<TDatabase, TTransactionDatabase, TTransactionOptions>,
): ResolvedDrizzleModuleOptions<TDatabase, TTransactionDatabase, TTransactionOptions> {
  return {
    ...options,
    strictTransactions: options.strictTransactions ?? false,
  };
}

function createRuntimeOptionsProviderValue(strictTransactions: boolean): DrizzleRuntimeOptions {
  return { strictTransactions };
}

function createMemoizedDrizzleOptionsResolver<
  TDatabase extends DrizzleDatabaseLike<TTransactionDatabase, TTransactionOptions>,
  TTransactionDatabase,
  TTransactionOptions,
>(
  options: AsyncModuleOptions<DrizzleModuleOptions<TDatabase, TTransactionDatabase, TTransactionOptions>>,
): (...deps: unknown[]) => Promise<ResolvedDrizzleModuleOptions<TDatabase, TTransactionDatabase, TTransactionOptions>> {
  let cachedResult: Promise<ResolvedDrizzleModuleOptions<TDatabase, TTransactionDatabase, TTransactionOptions>> | undefined;

  return (...deps: unknown[]) => {
    if (!cachedResult) {
      cachedResult = Promise.resolve(options.useFactory(...deps)).then((resolved) =>
        normalizeDrizzleModuleOptions<TDatabase, TTransactionDatabase, TTransactionOptions>(resolved),
      );
    }

    if (!cachedResult) {
      throw new Error('Drizzle module options resolver initialization failed.');
    }

    return cachedResult;
  };
}

function createDrizzleProvidersAsync<
  TDatabase extends DrizzleDatabaseLike<TTransactionDatabase, TTransactionOptions>,
  TTransactionDatabase,
  TTransactionOptions,
>(
  options: AsyncModuleOptions<DrizzleModuleOptions<TDatabase, TTransactionDatabase, TTransactionOptions>>,
): Provider[] {
  const resolveOptions = createMemoizedDrizzleOptionsResolver(options);

  const databaseProvider = {
    inject: options.inject,
    provide: DRIZZLE_DATABASE,
    scope: 'singleton' as const,
    useFactory: async (...deps: unknown[]) => {
      const resolved = await resolveOptions(...deps);
      return resolved.database;
    },
  };

  const disposeProvider = {
    inject: options.inject,
    provide: DRIZZLE_DISPOSE,
    scope: 'singleton' as const,
    useFactory: async (...deps: unknown[]) => {
      const resolved = await resolveOptions(...deps);
      return resolved.dispose;
    },
  };

  const optionsProvider = {
    inject: options.inject,
    provide: DRIZZLE_OPTIONS,
    scope: 'singleton' as const,
    useFactory: async (...deps: unknown[]) => {
      const resolved = await resolveOptions(...deps);
      return createRuntimeOptionsProviderValue(resolved.strictTransactions);
    },
  };

  return [databaseProvider, disposeProvider, optionsProvider, DrizzleDatabase, DrizzleTransactionInterceptor];
}

export function createDrizzleProviders<
  TDatabase extends DrizzleDatabaseLike<TTransactionDatabase, TTransactionOptions>,
  TTransactionDatabase = TDatabase,
  TTransactionOptions = unknown,
>(options: DrizzleModuleOptions<TDatabase, TTransactionDatabase, TTransactionOptions>): Provider[] {
  const resolved = normalizeDrizzleModuleOptions(options);

  return [
    {
      provide: DRIZZLE_DATABASE,
      useValue: resolved.database,
    },
    {
      provide: DRIZZLE_DISPOSE,
      useValue: resolved.dispose,
    },
    {
      provide: DRIZZLE_OPTIONS,
      useValue: createRuntimeOptionsProviderValue(resolved.strictTransactions),
    },
    DrizzleDatabase,
    DrizzleTransactionInterceptor,
  ];
}

export function createDrizzleModule<
  TDatabase extends DrizzleDatabaseLike<TTransactionDatabase, TTransactionOptions>,
  TTransactionDatabase = TDatabase,
  TTransactionOptions = unknown,
>(options: DrizzleModuleOptions<TDatabase, TTransactionDatabase, TTransactionOptions>): ModuleType {
  class DrizzleModule {}

  return defineModule(DrizzleModule, {
    exports: [DrizzleDatabase, DrizzleTransactionInterceptor],
    providers: createDrizzleProviders(options),
  });
}

export function createDrizzleModuleAsync<
  TDatabase extends DrizzleDatabaseLike<TTransactionDatabase, TTransactionOptions>,
  TTransactionDatabase = TDatabase,
  TTransactionOptions = unknown,
>(options: AsyncModuleOptions<DrizzleModuleOptions<TDatabase, TTransactionDatabase, TTransactionOptions>>): ModuleType {
  class DrizzleAsyncModule {}

  return defineModule(DrizzleAsyncModule, {
    exports: [DrizzleDatabase, DrizzleTransactionInterceptor],
    providers: createDrizzleProvidersAsync(options),
  });
}
