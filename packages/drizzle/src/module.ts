import type { Provider } from '@konekti/di';
import { defineModule, type ModuleType } from '@konekti/runtime';

import { DrizzleDatabase } from './database.js';
import { DRIZZLE_DATABASE, DRIZZLE_DISPOSE, DRIZZLE_OPTIONS } from './tokens.js';
import { DrizzleTransactionInterceptor } from './transaction.js';
import type { DrizzleDatabaseLike, DrizzleModuleOptions } from './types.js';

export function createDrizzleProviders<
  TDatabase extends DrizzleDatabaseLike<TTransactionDatabase, TTransactionOptions>,
  TTransactionDatabase = TDatabase,
  TTransactionOptions = unknown,
>(options: DrizzleModuleOptions<TDatabase, TTransactionDatabase, TTransactionOptions>): Provider[] {
  return [
    {
      provide: DRIZZLE_DATABASE,
      useValue: options.database,
    },
    {
      provide: DRIZZLE_DISPOSE,
      useValue: options.dispose,
    },
    {
      provide: DRIZZLE_OPTIONS,
      useValue: { strictTransactions: options.strictTransactions ?? false },
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
