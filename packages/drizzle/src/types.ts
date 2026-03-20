import type { MaybePromise } from '@konekti/core';

export type DrizzleTransactionCallback<TTransactionDatabase, TResult> = (database: TTransactionDatabase) => Promise<TResult>;

export type DrizzleTransactionRunner<TTransactionDatabase, TTransactionOptions> = <T>(
  callback: DrizzleTransactionCallback<TTransactionDatabase, T>,
  options?: TTransactionOptions,
) => Promise<T>;

export interface DrizzleDatabaseLike<TTransactionDatabase = unknown, TTransactionOptions = unknown> {
  transaction?: DrizzleTransactionRunner<TTransactionDatabase, TTransactionOptions>;
}

export interface DrizzleRuntimeOptions {
  strictTransactions: boolean;
}

export interface DrizzleModuleOptions<TDatabase extends DrizzleDatabaseLike<TTransactionDatabase, TTransactionOptions>, TTransactionDatabase = TDatabase, TTransactionOptions = unknown> {
  database: TDatabase;
  dispose?: (database: TDatabase) => MaybePromise<void>;
  strictTransactions?: boolean;
}

export interface DrizzleHandleProvider<TDatabase extends DrizzleDatabaseLike<TTransactionDatabase, TTransactionOptions>, TTransactionDatabase = TDatabase, TTransactionOptions = unknown> {
  current(): TDatabase | TTransactionDatabase;
  requestTransaction<T>(fn: () => Promise<T>, signal?: AbortSignal, options?: TTransactionOptions): Promise<T>;
  transaction<T>(fn: () => Promise<T>, options?: TTransactionOptions): Promise<T>;
}
