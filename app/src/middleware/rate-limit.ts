import { createMiddleware } from 'hono/factory';
import type { RedisClient } from '../services/redis-client.js';

interface RateLimitEntry {
  timestamps: number[];
  lastAccess: number;
}

/**
 * Create a sliding window rate limiter.
 *
 * Supports two backends:
 * - 'memory': In-memory Map (Phase 1 behavior, single-instance only)
 * - 'redis': Redis-backed sliding window (Phase 2, distributed across instances)
 *
 * Design: Uses a sliding window (array of timestamps) rather than fixed-window
 * counters to avoid the boundary-burst problem where a client can send 2x the
 * limit by timing requests at the boundary of two fixed windows.
 *
 * See: SDD §9.2 (Distributed Rate Limiting)
 */
export function createRateLimit(maxRpm: number, opts?: { redis?: RedisClient; maxTracked?: number }) {
  if (opts?.redis) {
    return createRedisRateLimit(maxRpm, opts.redis);
  }
  return createMemoryRateLimit(maxRpm, opts?.maxTracked);
}

/**
 * In-memory rate limiter (Phase 1 behavior).
 * Single-instance only — does not share state across ECS tasks.
 */
function createMemoryRateLimit(maxRpm: number, maxTracked?: number) {
  const MAX_TRACKED = maxTracked ?? 10_000;
  const store = new Map<string, RateLimitEntry>();

  // Clean up expired entries every 60 seconds, then evict LRU if over MAX_TRACKED (Bridge iter2-low-2)
  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - 60_000;
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
    // Evict oldest by lastAccess if store exceeds MAX_TRACKED
    if (store.size > MAX_TRACKED) {
      const sorted = [...store.entries()].sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      const evictCount = store.size - MAX_TRACKED;
      for (let i = 0; i < evictCount; i++) {
        store.delete(sorted[i]![0]);
      }
    }
  }, 60_000);

  // Allow cleanup interval to not keep process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return createMiddleware(async (c, next) => {
    const wallet = c.get('wallet') as string | undefined;
    const ip = c.req.header('x-forwarded-for') ?? 'unknown';
    const key = wallet ?? ip;

    const now = Date.now();
    const windowStart = now - 60_000;

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [], lastAccess: now };
      store.set(key, entry);
    }

    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
    entry.lastAccess = now;

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

/**
 * Redis-backed distributed sliding window rate limiter.
 *
 * Uses a Lua script for atomic increment + TTL to avoid race conditions
 * across multiple ECS instances.
 *
 * Redis key: ratelimit:{identity}:{window}
 * TTL: 60s (matches window size)
 *
 * See: SDD §5.3 (Redis Schema), §9.2
 */
function createRedisRateLimit(maxRpm: number, redis: RedisClient) {
  // Lua script: atomic increment with TTL
  // Returns: [current_count, ttl_remaining]
  const RATE_LIMIT_SCRIPT = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local current = redis.call('INCR', key)
    if current == 1 then
      redis.call('EXPIRE', key, window)
    end
    local ttl = redis.call('TTL', key)
    return {current, ttl}
  `;

  return createMiddleware(async (c, next) => {
    const wallet = c.get('wallet') as string | undefined;
    const ip = c.req.header('x-forwarded-for') ?? 'unknown';
    const identity = wallet ?? ip;

    // Window key: 60-second buckets aligned to minute boundaries
    const windowKey = Math.floor(Date.now() / 60_000);
    const key = `ratelimit:${identity}:${windowKey}`;

    try {
      const result = await redis.eval(RATE_LIMIT_SCRIPT, 1, key, maxRpm, 60) as [number, number];
      const [current, ttl] = result;

      c.header('X-RateLimit-Limit', String(maxRpm));
      c.header('X-RateLimit-Remaining', String(Math.max(0, maxRpm - current)));

      if (current > maxRpm) {
        const retryAfter = Math.max(1, ttl);
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
    } catch {
      // Redis failure: fall through and allow the request (graceful degradation)
      // This matches SDD §14.1: Redis down → rate limiting disabled
    }

    await next();
  });
}
