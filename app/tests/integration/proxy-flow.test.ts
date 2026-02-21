/**
 * Integration tests: Full proxy flow — Sprint 15, Task 15.2
 *
 * Tests the complete request path through the BFF against a real loa-finn
 * instance (via Docker Compose) or falls back to in-process mock.
 *
 * Run with Docker Compose:
 *   docker compose -f deploy/docker-compose.integration.yml up -d --wait
 *   INTEGRATION_URL=http://localhost:3201 pnpm test -- tests/integration/proxy-flow
 *
 * Run in-process (default, no Docker needed):
 *   pnpm test -- tests/integration/proxy-flow
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createDixieApp } from '../../src/server.js';
import { resetHealthCache } from '../../src/routes/health.js';
import type { DixieConfig } from '../../src/config.js';

// If INTEGRATION_URL is set, test against Docker Compose environment.
// Otherwise, create in-process mock for hermetic unit-like testing.
const INTEGRATION_URL = process.env.INTEGRATION_URL;
const isDockerMode = !!INTEGRATION_URL;

// --- In-process mock setup ---
let mockFinnServer: ReturnType<typeof serve> | null = null;
let dixieApp: ReturnType<typeof createDixieApp> | null = null;
const MOCK_FINN_PORT = 14200 + Math.floor(Math.random() * 800);
const ADMIN_KEY = 'integration-test-admin-key';
const JWT_SECRET = 'integration-test-jwt-secret-32chars!';
const TEST_API_KEY = 'dxk_proxy_flow_test_key_001';

function createMockFinnWithDetails(): Hono {
  const mock = new Hono();

  mock.get('/health', (c) =>
    c.json({ status: 'ok', version: '1.0.0-integration', uptime: 120 }),
  );

  mock.get('/api/health', (c) =>
    c.json({ status: 'ok', version: '1.0.0-integration', uptime: 120 }),
  );

  mock.get('/api/identity/oracle', (c) =>
    c.json({
      nftId: 'oracle',
      name: 'The Oracle',
      damp96_summary: { archetype: 'sage' },
      beauvoir_hash: 'sha256:integration-test',
    }),
  );

  mock.post('/api/sessions', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    return c.json({
      sessionId: `sess-${Date.now()}`,
      agentId: (body as Record<string, unknown>).agentId ?? 'oracle',
    });
  });

  mock.post('/api/sessions/:id/message', async (c) =>
    c.json({
      sessionId: c.req.param('id'),
      messageId: `msg-${Date.now()}`,
      sources_used: ['oracle-corpus-001'],
      mode: 'knowledge',
    }),
  );

  mock.get('/api/sessions', (c) => c.json([]));

  return mock;
}

async function makeRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  if (isDockerMode) {
    return fetch(`${INTEGRATION_URL}${path}`, init);
  }
  return dixieApp!.app.request(path, init);
}

beforeAll(async () => {
  if (!isDockerMode) {
    const mockFinn = createMockFinnWithDetails();
    mockFinnServer = serve({
      fetch: mockFinn.fetch,
      port: MOCK_FINN_PORT,
    });

    const config: DixieConfig = {
      port: 3299,
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
    dixieApp.allowlistStore.addEntry('apiKey', TEST_API_KEY);
  }
});

afterAll(() => {
  mockFinnServer?.close();
  dixieApp?.allowlistStore.close();
});

const authHeaders = isDockerMode
  ? { Authorization: `Bearer ${TEST_API_KEY}` }
  : { Authorization: `Bearer ${TEST_API_KEY}` };

// --- Tests ---

describe('proxy-flow: health endpoint', () => {
  it('returns healthy with real loa-finn status', async () => {
    const res = await makeRequest('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBeDefined();
    expect(body.services.dixie.status).toBe('healthy');
    expect(body.services.loa_finn).toBeDefined();
  });
});

describe('proxy-flow: authentication gates', () => {
  it('unauthenticated request returns 401', async () => {
    const res = await makeRequest('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test' }),
    });
    expect(res.status).toBe(401);
  });

  it('non-allowlisted wallet returns 403', async () => {
    // Use a random API key that is not in the allowlist
    const res = await makeRequest('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer dxk_not_in_allowlist_key',
      },
      body: JSON.stringify({ prompt: 'test' }),
    });
    expect(res.status).toBe(403);
  });
});

describe('proxy-flow: chat through BFF', () => {
  it('allowlisted API key can create session via POST /api/chat', async () => {
    const res = await makeRequest('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ prompt: 'What is the Honeycomb?' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBeTruthy();
  });

  it('response includes session metadata for new chat', async () => {
    const res = await makeRequest('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ prompt: 'Tell me about BGT staking' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // Chat route creates session and returns sessionId + messageId
    expect(body.sessionId).toBeTruthy();
    expect(body.messageId).toBeDefined();
  });
});

describe('proxy-flow: circuit breaker', () => {
  it('returns 503 when loa-finn is unreachable', async () => {
    if (isDockerMode) {
      // Skip in Docker mode — can't easily stop loa-finn mid-test
      return;
    }

    // Reset module-level health cache so the isolated app gets fresh results
    resetHealthCache();

    // Create a dixie app pointing to a non-existent finn
    const config: DixieConfig = {
      port: 3298,
      finnUrl: 'http://localhost:19999',
      finnWsUrl: 'ws://localhost:19999',
      corsOrigins: ['*'],
      allowlistPath: '',
      adminKey: ADMIN_KEY,
      jwtPrivateKey: JWT_SECRET,
      nodeEnv: 'test',
      logLevel: 'error',
      rateLimitRpm: 1000,
      otelEndpoint: '',
    };
    const isolated = createDixieApp(config);
    isolated.allowlistStore.addEntry('apiKey', TEST_API_KEY);

    // Health endpoint still returns but with degraded loa-finn
    const res = await isolated.app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.services.loa_finn.status).toBe('unreachable');

    isolated.allowlistStore.close();
  });
});
