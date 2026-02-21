import type { RedisClient } from './redis-client.js';

/**
 * Generic cache-aside service backed by Redis.
 *
 * Pattern: Check cache → on miss, call fetcher → store result → return.
 * TTL is per-key-prefix, configurable at construction time.
 *
 * See: SDD §4.2 (Soul Memory Service — projection caching),
 *      SDD §5.3 (Redis Schema — memory:projection:{nftId})
 */
export class ProjectionCache<T> {
  private readonly redis: RedisClient;
  private readonly prefix: string;
  private readonly ttlSec: number;

  constructor(redis: RedisClient, prefix: string, ttlSec: number) {
    this.redis = redis;
    this.prefix = prefix;
    this.ttlSec = ttlSec;
  }

  private key(id: string): string {
    return `${this.prefix}:${id}`;
  }

  /**
   * Get a cached value. Returns null on cache miss.
   */
  async get(id: string): Promise<T | null> {
    const raw = await this.redis.get(this.key(id));
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  }

  /**
   * Get a cached value, or call the fetcher on cache miss.
   * The fetcher result is stored with the configured TTL.
   */
  async getOrFetch(id: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get(id);
    if (cached !== null) return cached;

    const value = await fetcher();
    await this.set(id, value);
    return value;
  }

  /**
   * Store a value in the cache with TTL.
   */
  async set(id: string, value: T): Promise<void> {
    await this.redis.set(this.key(id), JSON.stringify(value), 'EX', this.ttlSec);
  }

  /**
   * Invalidate a cached entry.
   */
  async invalidate(id: string): Promise<void> {
    await this.redis.del(this.key(id));
  }

  /**
   * Invalidate all entries matching the prefix.
   * Uses SCAN to avoid blocking Redis on large keyspaces.
   */
  async invalidateAll(): Promise<number> {
    let cursor = '0';
    let deleted = 0;
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `${this.prefix}:*`,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        deleted += await this.redis.del(...keys);
      }
    } while (cursor !== '0');
    return deleted;
  }
}
