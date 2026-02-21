/**
 * Integration smoke tests — validate full request paths through the BFF.
 *
 * These tests create a real DixieApp instance with a mock loa-finn server
 * running in-process via Hono. No Docker required.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createDixieApp } from '../../src/server.js';
import type { DixieConfig } from '../../src/config.js';

// --- Mock loa-finn server ---
function createMockFinn(): Hono {
  const mock = new Hono();

  mock.get('/api/health', (c) =>
    c.json({ status: 'ok', version: '1.0.0-mock' }),
  );

  mock.get('/api/identity/oracle', (c) =>
    c.json({
      nftId: 'oracle',
      name: 'The Oracle',
      damp96_summary: { archetype: 'sage' },
      beauvoir_hash: 'sha256:mock',
    }),
  );

  mock.post('/api/sessions', async (c) => {
    const body = await c.req.json();
    return c.json({ sessionId: `sess-${Date.now()}`, agentId: body.agentId });
  });

  mock.post('/api/sessions/:id/message', async (c) => {
    return c.json({
      sessionId: c.req.param('id'),
      messageId: `msg-${Date.now()}`,
    });
  });

  mock.get('/api/sessions', (c) => c.json([]));
  mock.get('/api/sessions/:id', (c) =>
    c.json({ id: c.req.param('id'), messages: [] }),
  );

  return mock;
}

// --- Test setup ---
let mockFinnServer: ReturnType<typeof serve>;
let dixieApp: ReturnType<typeof createDixieApp>;
const MOCK_FINN_PORT = 14000 + Math.floor(Math.random() * 1000);
const ADMIN_KEY = 'integration-test-admin-key';
const JWT_SECRET = 'integration-test-jwt-secret-32chars!';
const TEST_API_KEY = 'dxk_integration_test_key_001';

beforeAll(async () => {
  // Start mock loa-finn
  const mockFinn = createMockFinn();
  mockFinnServer = serve({
    fetch: mockFinn.fetch,
    port: MOCK_FINN_PORT,
  });

  // Create Dixie app pointing to mock finn
  const config: DixieConfig = {
    port: 3099,
    finnUrl: `http://localhost:${MOCK_FINN_PORT}`,
    finnWsUrl: `ws://localhost:${MOCK_FINN_PORT}`,
    corsOrigins: ['*'],
    allowlistPath: '',
    adminKey: ADMIN_KEY,
    jwtPrivateKey: JWT_SECRET,
    nodeEnv: 'test',
    logLevel: 'error',
    rateLimitRpm: 1000,
    otelEndpoint: '',
  };
  dixieApp = createDixieApp(config);

  // Pre-seed allowlist with test API key for authenticated route tests
  dixieApp.allowlistStore.addEntry('apiKey', TEST_API_KEY);
});

afterAll(() => {
  mockFinnServer?.close();
});

/** Auth headers using the pre-seeded test API key */
const authHeaders = { Authorization: `Bearer ${TEST_API_KEY}` };

// Helper to make requests through the Dixie Hono app
async function req(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return dixieApp.app.request(path, init);
}

// --- Tests ---

describe('integration: health', () => {
  it('returns aggregated health from dixie + mock finn', async () => {
    const res = await req('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.services.dixie.status).toBe('healthy');
    expect(body.status).toBeDefined();
  });
});

describe('integration: identity', () => {
  it('fetches oracle identity through BFF → mock finn', async () => {
    const res = await req('/api/identity/oracle', {
      headers: authHeaders,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nftId).toBe('oracle');
    expect(body.name).toBe('The Oracle');
    expect(body.damp96_summary).toBeDefined();
  });

  it('rejects unauthenticated identity request', async () => {
    const res = await req('/api/identity/oracle');
    expect(res.status).toBe(401);
  });
});

describe('integration: chat flow', () => {
  it('creates session and sends message through BFF', async () => {
    // First message creates a new session
    const createRes = await req('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ prompt: 'What is the Honeycomb?' }),
    });
    expect(createRes.status).toBe(200);
    const createBody = await createRes.json();
    expect(createBody.sessionId).toBeTruthy();

    // Follow-up message to existing session
    const followUpRes = await req('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        prompt: 'Tell me more',
        sessionId: createBody.sessionId,
      }),
    });
    expect(followUpRes.status).toBe(200);
    const followUpBody = await followUpRes.json();
    expect(followUpBody.sessionId).toBe(createBody.sessionId);
  });

  it('rejects unauthenticated chat request', async () => {
    const res = await req('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'hello' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('integration: sessions', () => {
  it('lists sessions through BFF', async () => {
    const res = await req('/api/sessions', { headers: authHeaders });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('integration: admin', () => {
  it('requires admin key for admin endpoints', async () => {
    const res = await req('/api/admin/allowlist');
    expect(res.status).toBe(401);
  });

  it('allows access with valid admin key', async () => {
    const res = await req('/api/admin/allowlist', {
      headers: { Authorization: `Bearer ${ADMIN_KEY}` },
    });
    expect(res.status).toBe(200);
  });

  it('rejects wrong admin key', async () => {
    const res = await req('/api/admin/allowlist', {
      headers: { Authorization: 'Bearer wrong-key' },
    });
    expect(res.status).toBe(403);
  });
});

describe('integration: request pipeline', () => {
  it('adds X-Request-Id to responses', async () => {
    const res = await req('/api/health');
    const requestId = res.headers.get('X-Request-Id');
    expect(requestId).toBeTruthy();
  });

  it('adds X-Response-Time to responses', async () => {
    const res = await req('/api/health');
    const responseTime = res.headers.get('X-Response-Time');
    expect(responseTime).toMatch(/\d+ms/);
  });

  it('preserves provided X-Request-Id', async () => {
    const res = await req('/api/health', {
      headers: { 'X-Request-Id': 'custom-req-123' },
    });
    expect(res.headers.get('X-Request-Id')).toBe('custom-req-123');
  });
});
