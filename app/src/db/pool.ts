/**
 * Fleet-Workload PG Connection Pool
 *
 * Configures pool sizing and statement timeouts for the fleet
 * orchestration workload. Registers graceful shutdown handlers.
 *
 * See: SDD §9.3 Connection Pooling
 * @since cycle-012 — Sprint 86, Task T-1.10 (Flatline IMP-001)
 */
import { createDbPool, closeDbPool, type DbPool } from './client.js';

export interface FleetPoolConfig {
  readonly connectionString: string;
  readonly min?: number;
  readonly max?: number;
  readonly idleTimeoutMs?: number;
  readonly connectionTimeoutMs?: number;
  readonly log?: (level: 'error' | 'warn' | 'info', data: Record<string, unknown>) => void;
}

/** Default pool config for fleet workload. */
export const FLEET_POOL_DEFAULTS = {
  min: 2,
  max: 10,
  idleTimeoutMs: 30_000,
  connectionTimeoutMs: 5_000,
} as const;

/**
 * Create a fleet-tuned PG pool with shutdown handlers.
 */
export function createFleetPool(config: FleetPoolConfig): DbPool {
  const pool = createDbPool({
    connectionString: config.connectionString,
    minConnections: config.min ?? FLEET_POOL_DEFAULTS.min,
    maxConnections: config.max ?? FLEET_POOL_DEFAULTS.max,
    idleTimeoutMs: config.idleTimeoutMs ?? FLEET_POOL_DEFAULTS.idleTimeoutMs,
    connectionTimeoutMs: config.connectionTimeoutMs ?? FLEET_POOL_DEFAULTS.connectionTimeoutMs,
    log: config.log,
  });

  const shutdown = async () => {
    config.log?.('info', { event: 'fleet_pool_draining' });
    await closeDbPool(pool);
    config.log?.('info', { event: 'fleet_pool_drained' });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return pool;
}
