import { createMiddleware } from 'hono/factory';

interface RateLimitEntry {
  timestamps: number[];
}

/**
 * Sliding window rate limiter.
 * Tracks requests per IP or wallet within a 1-minute window.
 */
export function createRateLimit(maxRpm: number) {
  const store = new Map<string, RateLimitEntry>();

  // Clean up expired entries every 60 seconds
  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - 60_000;
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 60_000);

  // Allow cleanup interval to not keep process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return createMiddleware(async (c, next) => {
    // Use wallet if authenticated, otherwise IP
    const wallet = c.get('wallet') as string | undefined;
    const ip = c.req.header('x-forwarded-for') ?? 'unknown';
    const key = wallet ?? ip;

    const now = Date.now();
    const windowStart = now - 60_000;

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= maxRpm) {
      const oldestInWindow = entry.timestamps[0]!;
      const retryAfter = Math.ceil((oldestInWindow + 60_000 - now) / 1000);

      c.header('Retry-After', String(retryAfter));
      return c.json(
        {
          error: 'rate_limited',
          message: 'Too many requests',
          retry_after: retryAfter,
        },
        429,
      );
    }

    entry.timestamps.push(now);
    await next();
  });
}
