import { describe, it, expect, vi } from 'vitest';
import { createRedisClient, checkRedisHealth, closeRedisClient } from '../../src/services/redis-client.js';

// Mock ioredis — named export `Redis`
vi.mock('ioredis', () => {
  class MockRedis {
    ping = vi.fn().mockResolvedValue('PONG');
    quit = vi.fn().mockResolvedValue('OK');
    on = vi.fn();
    get = vi.fn();
    set = vi.fn();
    del = vi.fn();
  }

  return { Redis: MockRedis };
});

describe('services/redis-client', () => {
  describe('createRedisClient', () => {
    it('creates a client with URL', () => {
      const client = createRedisClient({ url: 'redis://localhost:6379' });
      expect(client).toBeDefined();
      expect(client.on).toBeDefined();
    });

    it('registers error and connect event handlers', () => {
      const log = vi.fn();
      const client = createRedisClient({
        url: 'redis://localhost:6379',
        log,
      });

      expect(client.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(client.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(client.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });
  });

  describe('checkRedisHealth', () => {
    it('returns latency on PONG response', async () => {
      const client = createRedisClient({ url: 'redis://localhost:6379' });
      const latency = await checkRedisHealth(client);
      expect(latency).toBeGreaterThanOrEqual(0);
    });

    it('throws on unexpected PING response', async () => {
      const client = createRedisClient({ url: 'redis://localhost:6379' });
      (client.ping as ReturnType<typeof vi.fn>).mockResolvedValueOnce('NOT_PONG');

      await expect(checkRedisHealth(client)).rejects.toThrow('Redis PING returned unexpected');
    });
  });

  describe('closeRedisClient', () => {
    it('calls quit()', async () => {
      const client = createRedisClient({ url: 'redis://localhost:6379' });
      await closeRedisClient(client);
      expect(client.quit).toHaveBeenCalled();
    });
  });
});
