import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createHealthRoutes,
  resetHealthCache,
} from '../../src/routes/health.js';
import { FinnClient } from '../../src/proxy/finn-client.js';

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

    const app = createHealthRoutes(finnClient);
    const res = await app.request('/');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.services.dixie.status).toBe('healthy');
    expect(body.services.loa_finn.status).toBe('healthy');
    expect(body.version).toBe('1.0.0');
    expect(body.uptime_seconds).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toBeTruthy();
  });

  it('returns unhealthy when finn is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('ECONNREFUSED'),
    );

    const app = createHealthRoutes(finnClient);
    const res = await app.request('/');
    const body = await res.json();

    expect(body.status).toBe('unhealthy');
    expect(body.services.loa_finn.status).toBe('unreachable');
  });

  it('caches finn health for 10 seconds', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const app = createHealthRoutes(finnClient);

    await app.request('/');
    await app.request('/');

    // Only one actual fetch because second request hits cache
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
