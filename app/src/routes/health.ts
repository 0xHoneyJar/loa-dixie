import { Hono } from 'hono';
import type { FinnClient } from '../proxy/finn-client.js';
import type { HealthResponse, ServiceHealth } from '../types.js';

const VERSION = '1.0.0';
const startedAt = Date.now();

/** Cached finn health to avoid hitting upstream on every request */
let cachedFinnHealth: { data: ServiceHealth; expiresAt: number } | null = null;
const CACHE_TTL_MS = 10_000;

export function createHealthRoutes(finnClient: FinnClient): Hono {
  const app = new Hono();

  app.get('/', async (c) => {
    const finnHealth = await getFinnHealth(finnClient);

    const overallStatus =
      finnHealth.status === 'healthy'
        ? 'healthy'
        : finnHealth.status === 'degraded'
          ? 'degraded'
          : 'unhealthy';

    const response: HealthResponse = {
      status: overallStatus,
      version: VERSION,
      uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
      services: {
        dixie: { status: 'healthy' },
        loa_finn: finnHealth,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response);
  });

  return app;
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

/** Reset cache — useful for testing */
export function resetHealthCache(): void {
  cachedFinnHealth = null;
}
