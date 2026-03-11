export type Constructor<T = unknown> = new (...args: any[]) => T;

export type Token<T = unknown> = string | symbol | Constructor<T>;

export type MaybePromise<T> = T | Promise<T>;

export type MetadataPropertyKey = string | symbol;

export type MetadataSource = 'path' | 'query' | 'header' | 'cookie' | 'body';
