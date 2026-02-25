/**
 * Transaction Helper — Atomic database operations with automatic rollback.
 *
 * Acquires a client from the pool, runs BEGIN, executes the callback,
 * and either COMMITs on success or ROLLBACKs on error. Always releases
 * the client in a finally block.
 *
 * @since cycle-009 Sprint 1 — Task 1.4 (FR-1)
 */
import type pg from 'pg';
import type { DbPool } from './client.js';

/**
 * Execute a function within a database transaction.
 *
 * @param pool - PostgreSQL connection pool
 * @param fn - Callback receiving a transactional client
 * @returns The callback's return value
 * @throws Re-throws the callback's error after ROLLBACK
 */
export async function withTransaction<T>(
  pool: DbPool,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
