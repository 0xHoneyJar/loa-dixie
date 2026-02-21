import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createIdentityRoutes, resetIdentityCache } from '../../src/routes/identity.js';
import type { FinnClient } from '../../src/proxy/finn-client.js';

function makeMockFinnClient(overrides: Partial<FinnClient> = {}): FinnClient {
  return {
    baseUrl: 'http://localhost:4000',
    getHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    request: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as FinnClient;
}

describe('identity routes', () => {
  let app: Hono;
  let mockFinn: FinnClient;

  beforeEach(() => {
    resetIdentityCache();
  });

  it('returns oracle identity from loa-finn', async () => {
    const identity = {
      nftId: 'oracle',
      name: 'The Oracle',
      damp96_summary: { archetype: 'sage' },
      beauvoir_hash: 'sha256:abc123',
    };
    mockFinn = makeMockFinnClient({
      request: vi.fn().mockResolvedValue(identity),
    });
    app = new Hono();
    app.route('/api/identity', createIdentityRoutes(mockFinn));

    const res = await app.request('/api/identity/oracle');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.nftId).toBe('oracle');
    expect(body.name).toBe('The Oracle');
    expect(body.damp96_summary).toEqual({ archetype: 'sage' });
    expect(body.beauvoir_hash).toBe('sha256:abc123');
  });

  it('returns cached identity on subsequent requests', async () => {
    const requestFn = vi.fn().mockResolvedValue({
      nftId: 'oracle',
      name: 'The Oracle',
      damp96_summary: null,
      beauvoir_hash: null,
    });
    mockFinn = makeMockFinnClient({ request: requestFn });
    app = new Hono();
    app.route('/api/identity', createIdentityRoutes(mockFinn));

    await app.request('/api/identity/oracle');
    await app.request('/api/identity/oracle');

    // Only one request to loa-finn — second was served from cache
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it('returns fallback when loa-finn identity graph unavailable', async () => {
    mockFinn = makeMockFinnClient({
      request: vi.fn().mockRejectedValue(new Error('connection refused')),
    });
    app = new Hono();
    app.route('/api/identity', createIdentityRoutes(mockFinn));

    const res = await app.request('/api/identity/oracle');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.nftId).toBe('oracle');
    expect(body.name).toBe('The Oracle');
    expect(body.damp96_summary).toBeNull();
    expect(body.beauvoir_hash).toBeNull();
  });

  it('forwards x-request-id header to loa-finn', async () => {
    const requestFn = vi.fn().mockResolvedValue({
      nftId: 'oracle',
      name: 'The Oracle',
      damp96_summary: null,
      beauvoir_hash: null,
    });
    mockFinn = makeMockFinnClient({ request: requestFn });
    app = new Hono();
    app.route('/api/identity', createIdentityRoutes(mockFinn));

    await app.request('/api/identity/oracle', {
      headers: { 'x-request-id': 'req-test-123' },
    });

    expect(requestFn).toHaveBeenCalledWith(
      'GET',
      '/api/identity/oracle',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Request-Id': 'req-test-123' }),
      }),
    );
  });
});
