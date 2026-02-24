import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHealthRoutes, resetHealthCache } from '../../src/routes/health.js';
import { FinnClient } from '../../src/proxy/finn-client.js';
import { ReputationService, InMemoryReputationStore } from '../../src/services/reputation-service.js';
import { PostgresReputationStore } from '../../src/db/pg-reputation-store.js';

describe('health routes — reputation service reporting', () => {
  let finnClient: FinnClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetHealthCache();
    finnClient = new FinnClient('http://finn:4000');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );
  });

  it('reports memory store type for InMemoryReputationStore', async () => {
    const store = new InMemoryReputationStore();
    const reputationService = new ReputationService(store);
    const app = createHealthRoutes({ finnClient, reputationService });

    const res = await app.request('/');
    const body = await res.json();

    expect(body.reputation_service).toBeDefined();
    expect(body.reputation_service.store_type).toBe('memory');
    expect(body.reputation_service.initialized).toBe(true);
    expect(body.reputation_service.aggregate_count).toBe(0);
  });

  it('reports postgres store type with pool metrics', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [{ count: 5 }] }),
      totalCount: 10,
      idleCount: 8,
      waitingCount: 0,
    };
    const store = new PostgresReputationStore(mockPool as any);
    const reputationService = new ReputationService(store);
    const app = createHealthRoutes({ finnClient, reputationService, dbPool: mockPool as any });

    const res = await app.request('/');
    const body = await res.json();

    expect(body.reputation_service.store_type).toBe('postgres');
    expect(body.reputation_service.aggregate_count).toBe(5);
    expect(body.reputation_service.pool_total).toBe(10);
    expect(body.reputation_service.pool_idle).toBe(8);
    expect(body.reputation_service.pool_waiting).toBe(0);
  });

  it('omits reputation_service when not provided', async () => {
    const app = createHealthRoutes({ finnClient });

    const res = await app.request('/');
    const body = await res.json();

    expect(body.reputation_service).toBeUndefined();
  });
});
