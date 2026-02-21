import { describe, it, expect, vi } from 'vitest';
import { createDbPool, checkDbHealth, closeDbPool } from '../../src/db/client.js';

// Mock pg module
vi.mock('pg', () => {
  const mockClient = {
    query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
    release: vi.fn(),
  };

  const MockPool = vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(mockClient),
    end: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    _mockClient: mockClient,
  }));

  return { default: { Pool: MockPool }, Pool: MockPool };
});

describe('db/client', () => {
  describe('createDbPool', () => {
    it('creates a pool with default options', () => {
      const pool = createDbPool({
        connectionString: 'postgresql://user:pass@localhost:5432/dixie',
      });

      expect(pool).toBeDefined();
      expect(pool.on).toBeDefined();
    });

    it('creates a pool with custom options', () => {
      const log = vi.fn();
      const pool = createDbPool({
        connectionString: 'postgresql://user:pass@localhost:5432/dixie',
        minConnections: 1,
        maxConnections: 5,
        idleTimeoutMs: 10_000,
        connectionTimeoutMs: 3_000,
        log,
      });

      expect(pool).toBeDefined();
    });
  });

  describe('checkDbHealth', () => {
    it('returns latency on successful health check', async () => {
      const pool = createDbPool({
        connectionString: 'postgresql://user:pass@localhost:5432/dixie',
      });

      const latency = await checkDbHealth(pool);
      expect(latency).toBeGreaterThanOrEqual(0);
    });

    it('releases the connection after health check', async () => {
      const pool = createDbPool({
        connectionString: 'postgresql://user:pass@localhost:5432/dixie',
      });

      await checkDbHealth(pool);
      const mockClient = (pool as any)._mockClient;
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('closeDbPool', () => {
    it('calls pool.end()', async () => {
      const pool = createDbPool({
        connectionString: 'postgresql://user:pass@localhost:5432/dixie',
      });

      await closeDbPool(pool);
      expect(pool.end).toHaveBeenCalled();
    });
  });
});
