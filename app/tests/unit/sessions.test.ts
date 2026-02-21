import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { createSessionRoutes } from '../../src/routes/sessions.js';
import type { FinnClient } from '../../src/proxy/finn-client.js';

function makeMockFinnClient(overrides: Partial<FinnClient> = {}): FinnClient {
  return {
    baseUrl: 'http://localhost:4000',
    getHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    request: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as FinnClient;
}

describe('session routes', () => {
  it('lists sessions', async () => {
    const sessions = [{ id: 'sess-1' }, { id: 'sess-2' }];
    const mockFinn = makeMockFinnClient({
      request: vi.fn().mockResolvedValue(sessions),
    });
    const app = new Hono();
    app.route('/api/sessions', createSessionRoutes(mockFinn));

    const res = await app.request('/api/sessions');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('gets session by id', async () => {
    const session = { id: 'sess-1', messages: [] };
    const requestFn = vi.fn().mockResolvedValue(session);
    const mockFinn = makeMockFinnClient({ request: requestFn });
    const app = new Hono();
    app.route('/api/sessions', createSessionRoutes(mockFinn));

    const res = await app.request('/api/sessions/sess-1');
    expect(res.status).toBe(200);

    expect(requestFn).toHaveBeenCalledWith(
      'GET',
      '/api/sessions/sess-1',
      expect.any(Object),
    );
  });

  it('forwards wallet header on list', async () => {
    const requestFn = vi.fn().mockResolvedValue([]);
    const mockFinn = makeMockFinnClient({ request: requestFn });
    const app = new Hono();
    app.route('/api/sessions', createSessionRoutes(mockFinn));

    await app.request('/api/sessions', {
      headers: { 'x-wallet-address': '0xabc' },
    });

    expect(requestFn).toHaveBeenCalledWith(
      'GET',
      '/api/sessions',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Wallet-Address': '0xabc' }),
      }),
    );
  });

  it('returns 500 on unexpected error', async () => {
    const mockFinn = makeMockFinnClient({
      request: vi.fn().mockRejectedValue(new Error('fail')),
    });
    const app = new Hono();
    app.route('/api/sessions', createSessionRoutes(mockFinn));

    const res = await app.request('/api/sessions');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('internal_error');
  });
});
