import { Hono } from 'hono';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FinnClient } from '../proxy/finn-client.js';
import type { HealthResponse, ServiceHealth } from '../types.js';
import type { DbPool } from '../db/client.js';
import type { RedisClient } from '../services/redis-client.js';
import type { SignalEmitter } from '../services/signal-emitter.js';

const VERSION = '2.0.0';
const startedAt = Date.now();

/** Cached finn health to avoid hitting upstream on every request */
let cachedFinnHealth: { data: ServiceHealth; expiresAt: number } | null = null;
const CACHE_TTL_MS = 10_000;

export interface HealthDependencies {
  finnClient: FinnClient;
  dbPool?: DbPool | null;
  redisClient?: RedisClient | null;
  signalEmitter?: SignalEmitter | null;
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

    const services: HealthResponse['services'] = {
      dixie: { status: 'healthy' },
      loa_finn: finnHealth,
      knowledge_corpus: corpusMeta ?? undefined,
    };

    // Phase 2 infrastructure services (only included when configured)
    const infraServices: Record<string, ServiceHealth> = {};
    if (pgHealth) infraServices.postgresql = pgHealth;
    if (redisHealth) infraServices.redis = redisHealth;
    if (natsHealth) infraServices.nats = natsHealth;

    const response: HealthResponse = {
      status: overallStatus,
      version: VERSION,
      uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
      services,
      infrastructure: Object.keys(infraServices).length > 0 ? infraServices : undefined,
      timestamp: new Date().toISOString(),
    };

    return c.json(response);
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
    cachedFinnHealth = { data: result, expiresAt: now + CACHE_TTL_MS };
    return result;
  } catch {
    const result: ServiceHealth = {
      status: 'unreachable',
      latency_ms: Date.now() - start,
      error: 'Failed to reach loa-finn',
    };
    cachedFinnHealth = { data: result, expiresAt: now + CACHE_TTL_MS };
    return result;
  }
}

async function getDbHealth(pool: DbPool): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
    return { status: 'healthy', latency_ms: Date.now() - start };
  } catch (err) {
    return {
      status: 'unreachable',
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'PostgreSQL health check failed',
    };
  }
}

async function getRedisHealth(client: RedisClient): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const result = await client.ping();
    if (result !== 'PONG') {
      return { status: 'degraded', latency_ms: Date.now() - start, error: `Unexpected PING response: ${result}` };
    }
    return { status: 'healthy', latency_ms: Date.now() - start };
  } catch (err) {
    return {
      status: 'unreachable',
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'Redis health check failed',
    };
  }
}

function getNatsHealth(emitter: SignalEmitter): ServiceHealth {
  if (emitter.connected) {
    return { status: 'healthy' };
  }
  return { status: 'unreachable', error: 'NATS not connected' };
}

/** Cached corpus metadata — loaded once at startup, refreshed on cache miss */
let cachedCorpusMeta: {
  data: NonNullable<HealthResponse['services']['knowledge_corpus']>;
  expiresAt: number;
} | null = null;
const CORPUS_CACHE_TTL_MS = 60_000; // 1 minute — corpus changes rarely

export function getCorpusMeta(
  nowOverride?: Date,
): NonNullable<HealthResponse['services']['knowledge_corpus']> | null {
  const now = Date.now();
  if (cachedCorpusMeta && now < cachedCorpusMeta.expiresAt) {
    return cachedCorpusMeta.data;
  }

  try {
    const sourcesPath = path.resolve(
      import.meta.dirname ?? __dirname,
      '../../../knowledge/sources.json',
    );
    const raw = fs.readFileSync(sourcesPath, 'utf-8');
    const config = JSON.parse(raw) as {
      corpus_version?: number;
      sources: Array<{ last_updated?: string; max_age_days: number }>;
    };

    const today = nowOverride ?? new Date();
    let staleCount = 0;

    for (const source of config.sources) {
      if (!source.last_updated) continue;
      const lastUpdated = new Date(source.last_updated);
      const ageDays = Math.floor(
        (today.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (ageDays > source.max_age_days) {
        staleCount++;
      }
    }

    const result = {
      status: (staleCount > 0 ? 'degraded' : 'healthy') as 'healthy' | 'degraded',
      corpus_version: config.corpus_version ?? 0,
      sources: config.sources.length,
      stale_sources: staleCount,
    };

    cachedCorpusMeta = { data: result, expiresAt: now + CORPUS_CACHE_TTL_MS };
    return result;
  } catch {
    return null;
  }
}

/** Reset cache — useful for testing */
export function resetHealthCache(): void {
  cachedFinnHealth = null;
  cachedCorpusMeta = null;
}
