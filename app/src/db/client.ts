import pg from 'pg';

const { Pool } = pg;

export type DbPool = pg.Pool;

export interface DbClientOptions {
  connectionString: string;
  minConnections?: number;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
  log?: (level: 'error' | 'warn' | 'info', data: Record<string, unknown>) => void;
}

/**
 * Create a PostgreSQL connection pool.
 *
 * Architecture: Dixie owns schedules and autonomous_permissions tables directly.
 * Soul memory events are accessed via loa-finn's API, not direct DB queries.
 * See: SDD §5.1 Data Ownership, §9.3 Connection Pooling
 *
 * Pool sizing: min 2 (keeps warm connections for health checks),
 * max 10 (ECS task has 512 CPU / 1024MB — 10 connections is conservative).
 */
export function createDbPool(opts: DbClientOptions): DbPool {
  const pool = new Pool({
    connectionString: opts.connectionString,
    min: opts.minConnections ?? 2,
    max: opts.maxConnections ?? 10,
    idleTimeoutMillis: opts.idleTimeoutMs ?? 30_000,
    connectionTimeoutMillis: opts.connectionTimeoutMs ?? 5_000,
  });

  pool.on('error', (err) => {
    opts.log?.('error', {
      event: 'pg_pool_error',
      message: err.message,
    });
  });

  pool.on('connect', () => {
    opts.log?.('info', { event: 'pg_pool_connect' });
  });

  return pool;
}

/**
 * Health check — acquires and releases a connection.
 * Returns latency in ms or throws on failure.
 */
export async function checkDbHealth(pool: DbPool): Promise<number> {
  const start = Date.now();
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return Date.now() - start;
  } finally {
    client.release();
  }
}

/**
 * Graceful shutdown — drains all connections.
 */
export async function closeDbPool(pool: DbPool): Promise<void> {
  await pool.end();
}
