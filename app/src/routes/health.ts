import { Hono } from 'hono';
import type { FinnClient } from '../proxy/finn-client.js';
import type { HealthResponse, ServiceHealth } from '../types.js';
import { toProtocolCircuitState } from '../types.js';
import type { DbPool } from '../db/client.js';
import type { RedisClient } from '../services/redis-client.js';
import type { SignalEmitter } from '../services/signal-emitter.js';
import type { ReputationService } from '../services/reputation-service.js';
import { PostgresReputationStore } from '../db/pg-reputation-store.js';
import { getCorpusMeta, resetCorpusMetaCache } from '../services/corpus-meta.js';
import { governorRegistry } from '../services/governor-registry.js';
import { safeEqual } from '../utils/crypto.js';

const VERSION = '2.0.0';
const startedAt = Date.now();

/** Cached finn health to avoid hitting upstream on every request */
let cachedFinnHealth: { data: ServiceHealth; expiresAt: number } | null = null;
/**
 * Asymmetric cache TTLs (Netflix Eureka pattern):
 * - Healthy upstream: cache for 30s (reduce probe load during normal operation)
 * - Unhealthy upstream: cache for 5s (detect recovery within one ALB check interval)
 */
const HEALTHY_CACHE_TTL_MS = 30_000;
const UNHEALTHY_CACHE_TTL_MS = 5_000;

function cacheTtl(status: string): number {
  return status === 'healthy' ? HEALTHY_CACHE_TTL_MS : UNHEALTHY_CACHE_TTL_MS;
}

/** Cached DB health probe */
let cachedDbHealth: { data: ServiceHealth; expiresAt: number } | null = null;

/** Cached Redis health probe */
let cachedRedisHealth: { data: ServiceHealth; expiresAt: number } | null = null;

export interface HealthDependencies {
  finnClient: FinnClient;
  dbPool?: DbPool | null;
  redisClient?: RedisClient | null;
  signalEmitter?: SignalEmitter | null;
  /** Admin key for gated endpoints (e.g., /governance). Task 22.3 */
  adminKey?: string;
  /** Reputation service for aggregate health reporting. @since Sprint 6 — Task 6.2 */
  reputationService?: ReputationService | null;
}

export function createHealthRoutes(deps: HealthDependencies): Hono {
  const app = new Hono();

  app.get('/', async (c) => {
    const finnHealth = await getFinnHealth(deps.finnClient);
    const pgHealth = deps.dbPool ? await getDbHealth(deps.dbPool) : null;
    const redisHealth = deps.redisClient ? await getRedisHealth(deps.redisClient) : null;
    const natsHealth = deps.signalEmitter ? getNatsHealth(deps.signalEmitter) : null;

    // Overall: unhealthy if finn is unreachable, degraded if any infra service is down
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (finnHealth.status === 'unreachable') {
      overallStatus = 'unhealthy';
    } else if (
      finnHealth.status === 'degraded' ||
      pgHealth?.status === 'unreachable' ||
      redisHealth?.status === 'unreachable' ||
      natsHealth?.status === 'unreachable'
    ) {
      overallStatus = 'degraded';
    }

    const corpusMeta = getCorpusMeta();

    // Sprint 6 — Task 6.2: Reputation service health reporting
    // Phase 3: Enhanced with store_type and pool metrics for operational visibility
    const isPostgres = deps.reputationService?.store instanceof PostgresReputationStore;
    let reputationStatus: Record<string, unknown> | undefined;
    if (deps.reputationService) {
      let aggregateCount: number;
      try {
        aggregateCount = await deps.reputationService.store.count();
      } catch {
        aggregateCount = -1; // Store unreachable — degrade gracefully
      }
      reputationStatus = {
        initialized: true,
        store_type: isPostgres ? 'postgres' : 'memory',
        aggregate_count: aggregateCount,
        ...(isPostgres && deps.dbPool ? {
          pool_total: deps.dbPool.totalCount,
          pool_idle: deps.dbPool.idleCount,
          pool_waiting: deps.dbPool.waitingCount,
        } : {}),
      };
    }

    const services: HealthResponse['services'] = {
      dixie: { status: 'healthy' },
      loa_finn: {
        ...finnHealth,
        circuit_state: toProtocolCircuitState(deps.finnClient.circuit),
      },
      knowledge_corpus: corpusMeta ?? undefined,
    };

    // Phase 2 infrastructure services (only included when configured)
    const infraServices: Record<string, ServiceHealth> = {};
    if (pgHealth) infraServices.postgresql = pgHealth;
    if (redisHealth) infraServices.redis = redisHealth;
    if (natsHealth) infraServices.nats = natsHealth;

    const response: HealthResponse & { reputation_service?: Record<string, unknown> } = {
      status: overallStatus,
      version: VERSION,
      uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
      services,
      infrastructure: Object.keys(infraServices).length > 0 ? infraServices : undefined,
      reputation_service: reputationStatus,
      timestamp: new Date().toISOString(),
    };

    return c.json(response);
  });

  /**
   * GET /governance — unified health of all registered resource governors.
   * Gated behind admin auth (Task 22.3: prevents leaking internal system topology).
   * See: Deep Bridgebuilder Meditation §VII.2, Kubernetes operator pattern.
   */
  app.get('/governance', (c) => {
    // Task 22.3: Require admin auth — governance data reveals internal topology
    // Task 23.1: Uses shared safeEqual utility (no more inline crypto)
    const adminKey = deps.adminKey;
    if (adminKey) {
      const authHeader = c.req.header('authorization');
      if (!authHeader) {
        return c.json({ error: 'unauthorized', message: 'Admin key required' }, 401);
      }
      const key = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      if (!safeEqual(key, adminKey)) {
        return c.json({ error: 'forbidden', message: 'Invalid admin key' }, 403);
      }
    }

    const snapshot = governorRegistry.getAll();
    return c.json({
      governors: snapshot,
      totalResources: snapshot.length,
      degradedResources: snapshot.filter((g) => g.health?.status === 'degraded').length,
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

// Overload for backward compatibility with Phase 1 call signature
export function createHealthRoutesCompat(finnClient: FinnClient): Hono {
  return createHealthRoutes({ finnClient });
}

async function getFinnHealth(client: FinnClient): Promise<ServiceHealth> {
  const now = Date.now();
  if (cachedFinnHealth && now < cachedFinnHealth.expiresAt) {
    return cachedFinnHealth.data;
  }

  const start = now;
  try {
    await client.getHealth();
    const result: ServiceHealth = {
      status: 'healthy',
      latency_ms: Date.now() - start,
    };
    cachedFinnHealth = { data: result, expiresAt: now + cacheTtl(result.status) };
    return result;
  } catch {
    const result: ServiceHealth = {
      status: 'unreachable',
      latency_ms: Date.now() - start,
      error: 'Failed to reach loa-finn',
    };
    cachedFinnHealth = { data: result, expiresAt: now + cacheTtl(result.status) };
    return result;
  }
}

async function getDbHealth(pool: DbPool): Promise<ServiceHealth> {
  const now = Date.now();
  if (cachedDbHealth && now < cachedDbHealth.expiresAt) {
    return cachedDbHealth.data;
  }

  const start = now;
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
    const result: ServiceHealth = { status: 'healthy', latency_ms: Date.now() - start };
    cachedDbHealth = { data: result, expiresAt: now + cacheTtl(result.status) };
    return result;
  } catch (err) {
    const result: ServiceHealth = {
      status: 'unreachable',
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'PostgreSQL health check failed',
    };
    cachedDbHealth = { data: result, expiresAt: now + cacheTtl(result.status) };
    return result;
  }
}

async function getRedisHealth(client: RedisClient): Promise<ServiceHealth> {
  const now = Date.now();
  if (cachedRedisHealth && now < cachedRedisHealth.expiresAt) {
    return cachedRedisHealth.data;
  }

  const start = now;
  try {
    const result = await client.ping();
    if (result !== 'PONG') {
      const health: ServiceHealth = { status: 'degraded', latency_ms: Date.now() - start, error: `Unexpected PING response: ${result}` };
      cachedRedisHealth = { data: health, expiresAt: now + cacheTtl(health.status) };
      return health;
    }
    const health: ServiceHealth = { status: 'healthy', latency_ms: Date.now() - start };
    cachedRedisHealth = { data: health, expiresAt: now + cacheTtl(health.status) };
    return health;
  } catch (err) {
    const health: ServiceHealth = {
      status: 'unreachable',
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'Redis health check failed',
    };
    cachedRedisHealth = { data: health, expiresAt: now + cacheTtl(health.status) };
    return health;
  }
}

function getNatsHealth(emitter: SignalEmitter): ServiceHealth {
  if (emitter.connected) {
    return { status: 'healthy' };
  }
  return { status: 'unreachable', error: 'NATS not connected' };
}

// Re-export getCorpusMeta for backward compatibility (consumers should migrate to corpus-meta service)
export { getCorpusMeta } from '../services/corpus-meta.js';

/** Reset cache — useful for testing */
export function resetHealthCache(): void {
  cachedFinnHealth = null;
  cachedDbHealth = null;
  cachedRedisHealth = null;
  resetCorpusMetaCache();
}
