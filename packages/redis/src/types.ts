import type { RedisOptions } from 'ioredis';

type RedisConnectionOptions = Omit<RedisOptions, 'lazyConnect'>;

/** Options accepted by the default unnamed Redis registration. */
export type DefaultRedisModuleOptions = RedisConnectionOptions & {
  /** Whether the default Redis aliases should be visible globally. Defaults to `true`. */
  global?: boolean;
  name?: undefined;
};

/** Options accepted by an additional named Redis registration. */
export type NamedRedisModuleOptions = RedisConnectionOptions & {
  /** Registration name used to derive named raw-client and facade tokens. */
  name: string;
  /** Named Redis registrations remain scoped to their importing module. */
  global?: false;
};

/**
 * Options accepted by {@link RedisModule.forRoot}.
 *
 * Fluo always enables `lazyConnect` internally so the client connects during
 * application bootstrap instead of import time.
 */
export type RedisModuleOptions = DefaultRedisModuleOptions | NamedRedisModuleOptions;

/** Redis constructor options after Fluo module-only fields are removed. */
export type RedisClientOptions = RedisConnectionOptions;
