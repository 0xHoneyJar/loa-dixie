import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectionCache } from '../../src/services/projection-cache.js';

interface TestData {
  id: string;
  value: number;
}

function createMockRedis() {
  const store = new Map<string, string>();

  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, _mode?: string, _ttl?: number) => {
      store.set(key, value);
      return 'OK';
    }),
    del: vi.fn(async (...keys: string[]) => {
      let deleted = 0;
      for (const key of keys) {
        if (store.delete(key)) deleted++;
      }
      return deleted;
    }),
    scan: vi.fn(async (_cursor: string, _match: string, pattern: string, _count: string, _n: number) => {
      const matchingKeys = Array.from(store.keys()).filter(k => k.startsWith(pattern.replace('*', '')));
      return ['0', matchingKeys];
    }),
    // Satisfy RedisClient type
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
    _store: store,
  } as any;
}

describe('services/projection-cache', () => {
  let redis: ReturnType<typeof createMockRedis>;
  let cache: ProjectionCache<TestData>;

  beforeEach(() => {
    redis = createMockRedis();
    cache = new ProjectionCache<TestData>(redis, 'test:prefix', 300);
  });

  describe('get', () => {
    it('returns null on cache miss', async () => {
      const result = await cache.get('missing-id');
      expect(result).toBeNull();
    });

    it('returns cached data on hit', async () => {
      const data: TestData = { id: 'abc', value: 42 };
      redis._store.set('test:prefix:abc', JSON.stringify(data));

      const result = await cache.get('abc');
      expect(result).toEqual(data);
    });
  });

  describe('set', () => {
    it('stores data with TTL', async () => {
      const data: TestData = { id: 'xyz', value: 99 };
      await cache.set('xyz', data);

      expect(redis.set).toHaveBeenCalledWith(
        'test:prefix:xyz',
        JSON.stringify(data),
        'EX',
        300,
      );
    });
  });

  describe('getOrFetch', () => {
    it('returns cached data without calling fetcher', async () => {
      const data: TestData = { id: 'cached', value: 1 };
      redis._store.set('test:prefix:cached', JSON.stringify(data));
      const fetcher = vi.fn();

      const result = await cache.getOrFetch('cached', fetcher);
      expect(result).toEqual(data);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('calls fetcher on cache miss and caches result', async () => {
      const data: TestData = { id: 'fresh', value: 2 };
      const fetcher = vi.fn().mockResolvedValue(data);

      const result = await cache.getOrFetch('fresh', fetcher);
      expect(result).toEqual(data);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(redis.set).toHaveBeenCalledWith(
        'test:prefix:fresh',
        JSON.stringify(data),
        'EX',
        300,
      );
    });
  });

  describe('invalidate', () => {
    it('removes a specific key', async () => {
      redis._store.set('test:prefix:target', '{}');
      await cache.invalidate('target');
      expect(redis.del).toHaveBeenCalledWith('test:prefix:target');
    });
  });

  describe('invalidateAll', () => {
    it('scans and deletes all matching keys', async () => {
      redis._store.set('test:prefix:a', '{}');
      redis._store.set('test:prefix:b', '{}');

      const deleted = await cache.invalidateAll();
      expect(deleted).toBe(2);
    });
  });
});
