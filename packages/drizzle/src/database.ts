import { AsyncLocalStorage } from 'node:async_hooks';

import type { OnApplicationShutdown } from '@konekti-internal/module';
import { Inject } from '@konekti/core';

import { DRIZZLE_DATABASE, DRIZZLE_DISPOSE } from './tokens';
import type { DrizzleDatabaseLike, DrizzleHandleProvider } from './types';

@Inject([DRIZZLE_DATABASE, DRIZZLE_DISPOSE])
export class DrizzleDatabase<
  TDatabase extends DrizzleDatabaseLike<TTransactionDatabase, TTransactionOptions>,
  TTransactionDatabase = TDatabase,
  TTransactionOptions = unknown,
> implements DrizzleHandleProvider<TDatabase, TTransactionDatabase, TTransactionOptions>, OnApplicationShutdown
{
  private readonly transactions = new AsyncLocalStorage<TTransactionDatabase>();

  constructor(
    private readonly database: TDatabase,
    private readonly dispose?: (database: TDatabase) => Promise<void> | void,
  ) {}

  current(): TDatabase | TTransactionDatabase {
    return this.transactions.getStore() ?? this.database;
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.dispose) {
      await this.dispose(this.database);
    }
  }

  async transaction<T>(fn: () => Promise<T>, options?: TTransactionOptions): Promise<T> {
    const current = this.transactions.getStore();

    if (current) {
      return fn();
    }

    if (typeof this.database.transaction !== 'function') {
      return fn();
    }

    return this.database.transaction((transactionDatabase) => this.transactions.run(transactionDatabase, fn), options);
  }
}
