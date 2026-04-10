/** Injection token for the shared `ioredis` client managed by {@link RedisModule}. */
export const REDIS_CLIENT = Symbol.for('fluo.redis.client');
