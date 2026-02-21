import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createChatRoutes } from '../../src/routes/chat.js';
import type { FinnClient } from '../../src/proxy/finn-client.js';

function makeMockFinnClient(overrides: Partial<FinnClient> = {}): FinnClient {
  return {
    baseUrl: 'http://localhost:4000',
    getHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    request: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as FinnClient;
}

describe('chat routes', () => {
  let app: Hono;
  let mockFinn: FinnClient;

  it('rejects empty prompt', async () => {
    mockFinn = makeMockFinnClient();
    app = new Hono();
    app.route('/api/chat', createChatRoutes(mockFinn));

    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_request');
  });

  it('creates new session for first message', async () => {
    const requestFn = vi.fn().mockResolvedValue({ sessionId: 'sess-001' });
    mockFinn = makeMockFinnClient({ request: requestFn });
    app = new Hono();
    app.route('/api/chat', createChatRoutes(mockFinn));

    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Who is the Oracle?' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBe('sess-001');

    expect(requestFn).toHaveBeenCalledWith(
      'POST',
      '/api/sessions',
      expect.objectContaining({
        body: expect.objectContaining({ agentId: 'oracle', prompt: 'Who is the Oracle?' }),
      }),
    );
  });

  it('sends message to existing session', async () => {
    const requestFn = vi.fn().mockResolvedValue({
      sessionId: 'sess-001',
      messageId: 'msg-001',
    });
    mockFinn = makeMockFinnClient({ request: requestFn });
    app = new Hono();
    app.route('/api/chat', createChatRoutes(mockFinn));

    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Tell me more', sessionId: 'sess-001' }),
    });
    expect(res.status).toBe(200);

    expect(requestFn).toHaveBeenCalledWith(
      'POST',
      '/api/sessions/sess-001/message',
      expect.objectContaining({
        body: { prompt: 'Tell me more' },
      }),
    );
  });

  it('returns 500 on unexpected finn error', async () => {
    mockFinn = makeMockFinnClient({
      request: vi.fn().mockRejectedValue(new Error('network error')),
    });
    app = new Hono();
    app.route('/api/chat', createChatRoutes(mockFinn));

    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'hello' }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('internal_error');
  });

  it('forwards structured finn errors', async () => {
    mockFinn = makeMockFinnClient({
      request: vi.fn().mockRejectedValue({
        status: 429,
        body: { error: 'rate_limited', message: 'Too many requests' },
      }),
    });
    app = new Hono();
    app.route('/api/chat', createChatRoutes(mockFinn));

    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'hello' }),
    });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('rate_limited');
  });
});
