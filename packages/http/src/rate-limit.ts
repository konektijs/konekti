import type { MiddlewareContext, Middleware } from './types.js';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  keyResolver?: (ctx: MiddlewareContext) => string;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

function defaultKeyResolver(ctx: MiddlewareContext): string {
  const forwarded = ctx.request.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? 'unknown';

  return ip;
}

export function createRateLimitMiddleware(options: RateLimitOptions): Middleware {
  const store = new Map<string, WindowEntry>();

  return {
    async handle(context, next) {
      const key = options.keyResolver
        ? options.keyResolver(context)
        : defaultKeyResolver(context);

      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now >= entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + options.windowMs });
        return next();
      }

      if (entry.count >= options.limit) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

        context.response.setHeader('Retry-After', String(retryAfter));
        context.response.setStatus(429);
        await context.response.send({ message: 'Too Many Requests' });
        return;
      }

      entry.count++;
      return next();
    },
  };
}
