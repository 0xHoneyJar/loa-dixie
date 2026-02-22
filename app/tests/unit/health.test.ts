import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createHealthRoutes,
  resetHealthCache,
} from '../../src/routes/health.js';
import { FinnClient } from '../../src/proxy/finn-client.js';
import { GovernorRegistry, governorRegistry } from '../../src/services/governor-registry.js';
import { corpusMeta } from '../../src/services/corpus-meta.js';

describe('health routes', () => {
  let finnClient: FinnClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetHealthCache();
    finnClient = new FinnClient('http://finn:4000');
  });

  it('returns healthy when finn is healthy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const app = createHealthRoutes({ finnClient });
    const res = await app.request('/');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.services.dixie.status).toBe('healthy');
    expect(body.services.loa_finn.status).toBe('healthy');
    expect(body.version).toBe('2.0.0');
    expect(body.uptime_seconds).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toBeTruthy();
  });

  it('returns unhealthy when finn is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('ECONNREFUSED'),
    );

    const app = createHealthRoutes({ finnClient });
    const res = await app.request('/');
    const body = await res.json();

    expect(body.status).toBe('unhealthy');
    expect(body.services.loa_finn.status).toBe('unreachable');
  });

  it('caches finn health for 10 seconds', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const app = createHealthRoutes({ finnClient });

    await app.request('/');
    await app.request('/');

    // Only one actual fetch because second request hits cache
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('returns degraded when PostgreSQL is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const mockPool = {
      connect: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    } as any;

    const app = createHealthRoutes({ finnClient, dbPool: mockPool });
    const res = await app.request('/');
    const body = await res.json();

    expect(body.status).toBe('degraded');
    expect(body.infrastructure.postgresql.status).toBe('unreachable');
  });

  it('includes infrastructure health when configured', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const mockClient = { query: vi.fn().mockResolvedValue({}), release: vi.fn() };
    const mockPool = { connect: vi.fn().mockResolvedValue(mockClient) } as any;

    const mockRedis = {
      ping: vi.fn().mockResolvedValue('PONG'),
    } as any;

    const app = createHealthRoutes({
      finnClient,
      dbPool: mockPool,
      redisClient: mockRedis,
    });
    const res = await app.request('/');
    const body = await res.json();

    expect(body.status).toBe('healthy');
    expect(body.infrastructure.postgresql.status).toBe('healthy');
    expect(body.infrastructure.redis.status).toBe('healthy');
  });

  it('omits infrastructure when no infra services configured', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const app = createHealthRoutes({ finnClient });
    const res = await app.request('/');
    const body = await res.json();

    expect(body.infrastructure).toBeUndefined();
  });

  it('includes knowledge_corpus metadata with corpus_version', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const app = createHealthRoutes({ finnClient });
    const res = await app.request('/');
    const body = await res.json();

    expect(body.services.knowledge_corpus).toBeDefined();
    expect(body.services.knowledge_corpus.corpus_version).toBeGreaterThanOrEqual(1);
    expect(body.services.knowledge_corpus.sources).toBeGreaterThanOrEqual(20);
    expect(body.services.knowledge_corpus.status).toMatch(/^(healthy|degraded)$/);
  });

  it('knowledge_corpus reports correct source count', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const app = createHealthRoutes({ finnClient });
    const res = await app.request('/');
    const body = await res.json();

    expect(body.services.knowledge_corpus.sources).toBe(20);
    expect(typeof body.services.knowledge_corpus.stale_sources).toBe('number');
  });

  it('knowledge_corpus stale count reflects freshness state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const app = createHealthRoutes({ finnClient });
    const res = await app.request('/');
    const body = await res.json();

    // After fresh corpus update, stale count should be 0 or very low
    expect(body.services.knowledge_corpus.stale_sources).toBeLessThanOrEqual(
      body.services.knowledge_corpus.sources,
    );
  });
});

describe('GET /governance (Task 20.4, Task 22.3)', () => {
  let finnClient: FinnClient;
  const testAdminKey = 'test-admin-key-secret';

  beforeEach(() => {
    vi.restoreAllMocks();
    resetHealthCache();
    finnClient = new FinnClient('http://finn:4000');
    // Clear and re-register for test isolation
    governorRegistry.clear();
  });

  it('returns governance snapshot with admin auth', async () => {
    governorRegistry.register(corpusMeta);

    const app = createHealthRoutes({ finnClient, adminKey: testAdminKey });
    const res = await app.request('/governance', {
      headers: { Authorization: `Bearer ${testAdminKey}` },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.governors).toBeInstanceOf(Array);
    expect(body.governors.length).toBeGreaterThanOrEqual(1);
    expect(body.totalResources).toBeGreaterThanOrEqual(1);
    expect(typeof body.degradedResources).toBe('number');
    expect(body.timestamp).toBeTruthy();
  });

  it('includes knowledge_corpus governor in snapshot', async () => {
    governorRegistry.register(corpusMeta);

    const app = createHealthRoutes({ finnClient, adminKey: testAdminKey });
    const res = await app.request('/governance', {
      headers: { Authorization: `Bearer ${testAdminKey}` },
    });
    const body = await res.json();

    const corpusGov = body.governors.find(
      (g: any) => g.resourceType === 'knowledge_corpus',
    );
    expect(corpusGov).toBeDefined();
    expect(corpusGov.health).not.toBeNull();
    expect(corpusGov.health.status).toMatch(/^(healthy|degraded)$/);
    expect(corpusGov.health.totalItems).toBeGreaterThanOrEqual(15);
    expect(corpusGov.health.version).toBeGreaterThanOrEqual(1);
  });

  it('returns empty list when no governors registered', async () => {
    const app = createHealthRoutes({ finnClient, adminKey: testAdminKey });
    const res = await app.request('/governance', {
      headers: { Authorization: `Bearer ${testAdminKey}` },
    });
    const body = await res.json();

    expect(body.governors).toEqual([]);
    expect(body.totalResources).toBe(0);
    expect(body.degradedResources).toBe(0);
  });

  it('rejects unauthenticated requests when adminKey is set (Task 22.3)', async () => {
    const app = createHealthRoutes({ finnClient, adminKey: testAdminKey });
    const res = await app.request('/governance');

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
  });

  it('rejects invalid admin key (Task 22.3)', async () => {
    const app = createHealthRoutes({ finnClient, adminKey: testAdminKey });
    const res = await app.request('/governance', {
      headers: { Authorization: 'Bearer wrong-key' },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
  });

  it('allows unauthenticated access when no adminKey configured', async () => {
    governorRegistry.register(corpusMeta);

    const app = createHealthRoutes({ finnClient });
    const res = await app.request('/governance');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.governors.length).toBeGreaterThanOrEqual(1);
  });
});
