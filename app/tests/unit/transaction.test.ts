/**
 * Transaction Helper Tests — cycle-009 Sprint 1, Task 1.4
 *
 * Validates withTransaction:
 * - COMMIT on success
 * - ROLLBACK on error
 * - Client always released
 */
import { describe, it, expect, vi } from 'vitest';
import { withTransaction } from '../../src/db/transaction.js';
import { createMockPool } from '../fixtures/pg-test.js';

describe('withTransaction()', () => {
  it('commits on successful callback', async () => {
    const pool = createMockPool();
    pool._mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

    const result = await withTransaction(
      pool as unknown as import('../../src/db/client.js').DbPool,
      async (client) => {
        await client.query('INSERT INTO test VALUES ($1)', ['data']);
        return 'ok';
      },
    );

    expect(result).toBe('ok');
    const queries = pool._mockClient.query.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    expect(queries).toContain('BEGIN');
    expect(queries).toContain('COMMIT');
    expect(queries).not.toContain('ROLLBACK');
    expect(pool._mockClient.release).toHaveBeenCalledOnce();
  });

  it('rolls back on callback error', async () => {
    const pool = createMockPool();
    pool._mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

    await expect(
      withTransaction(
        pool as unknown as import('../../src/db/client.js').DbPool,
        async () => {
          throw new Error('test error');
        },
      ),
    ).rejects.toThrow('test error');

    const queries = pool._mockClient.query.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    expect(queries).toContain('BEGIN');
    expect(queries).toContain('ROLLBACK');
    expect(queries).not.toContain('COMMIT');
    expect(pool._mockClient.release).toHaveBeenCalledOnce();
  });

  it('always releases the client even on query error', async () => {
    const pool = createMockPool();
    // Make ROLLBACK itself fail (shouldn't prevent release)
    let queryCount = 0;
    pool._mockClient.query.mockImplementation(async (text: string) => {
      queryCount++;
      if (text === 'ROLLBACK') throw new Error('rollback failed');
      if (queryCount === 3) throw new Error('callback query failed');
      return { rows: [], rowCount: 0 };
    });

    await expect(
      withTransaction(
        pool as unknown as import('../../src/db/client.js').DbPool,
        async (client) => {
          await client.query('SOME QUERY');
        },
      ),
    ).rejects.toThrow();

    expect(pool._mockClient.release).toHaveBeenCalledOnce();
  });
});
