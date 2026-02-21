import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createTBAAuthMiddleware } from '../../src/middleware/tba-auth.js';
import { createAgentRoutes } from '../../src/routes/agent.js';
import {
  DEFAULT_AGENT_RATE_LIMITS,
  type TBAVerification,
  type AgentQueryResponse,
  type AgentCapabilities,
} from '../../src/types/agent-api.js';
import type { FinnClient } from '../../src/proxy/finn-client.js';
import type { ConvictionResolver } from '../../src/services/conviction-resolver.js';

// --- TBA Auth Middleware Tests ---

describe('TBA auth middleware', () => {
  const mockVerification: TBAVerification = {
    tbaAddress: '0xTBA001',
    nftContract: '0xNFTContract',
    tokenId: '42',
    ownerWallet: '0xOwner',
    verifiedAt: new Date().toISOString(),
    cached: false,
  };

  function createApp(verifyResult: TBAVerification | null = mockVerification) {
    const app = new Hono();
    app.use('*', createTBAAuthMiddleware({
      cache: null,
      verifyTBA: vi.fn().mockResolvedValue(verifyResult),
    }));
    app.get('/test', (c) => c.json({
      tba: c.req.header('x-agent-tba'),
      owner: c.req.header('x-agent-owner'),
    }));
    return app;
  }

  const nowSec = () => Math.floor(Date.now() / 1000);

  it('rejects requests without x-tba-address', async () => {
    const app = createApp();
    const res = await app.request('/test');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
  });

  it('rejects requests without x-tba-signature', async () => {
    const app = createApp();
    const res = await app.request('/test', {
      headers: {
        'x-tba-address': '0xTBA001',
        'x-tba-timestamp': String(nowSec()),
      },
    });
    expect(res.status).toBe(401);
  });

  it('rejects requests without x-tba-timestamp', async () => {
    const app = createApp();
    const res = await app.request('/test', {
      headers: {
        'x-tba-address': '0xTBA001',
        'x-tba-signature': 'sig123',
      },
    });
    expect(res.status).toBe(401);
  });

  it('rejects expired timestamps (>5 minutes)', async () => {
    const app = createApp();
    const res = await app.request('/test', {
      headers: {
        'x-tba-address': '0xTBA001',
        'x-tba-signature': 'sig123',
        'x-tba-timestamp': String(nowSec() - 600), // 10 minutes ago
      },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toContain('expired');
  });

  it('passes with valid TBA headers', async () => {
    const app = createApp();
    const res = await app.request('/test', {
      headers: {
        'x-tba-address': '0xTBA001',
        'x-tba-signature': 'sig123',
        'x-tba-timestamp': String(nowSec()),
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tba).toBe('0xTBA001');
    expect(body.owner).toBe('0xOwner');
  });

  it('rejects invalid TBA signature', async () => {
    const app = createApp(null); // verifyTBA returns null
    const res = await app.request('/test', {
      headers: {
        'x-tba-address': '0xTBA001',
        'x-tba-signature': 'bad-sig',
        'x-tba-timestamp': String(nowSec()),
      },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toContain('Invalid TBA');
  });

  it('always verifies signature even with cache (Bridge high-1 fix)', async () => {
    const mockCache = {
      get: vi.fn().mockResolvedValue(mockVerification),
      set: vi.fn(),
    };
    const verifyFn = vi.fn().mockResolvedValue(mockVerification);

    const app = new Hono();
    app.use('*', createTBAAuthMiddleware({
      cache: mockCache as any,
      verifyTBA: verifyFn,
    }));
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: {
        'x-tba-address': '0xTBA001',
        'x-tba-signature': 'sig123',
        'x-tba-timestamp': String(nowSec()),
      },
    });

    expect(res.status).toBe(200);
    // Signature verification ALWAYS happens — cache does NOT bypass auth
    expect(verifyFn).toHaveBeenCalled();
  });

  it('rejects invalid signature even when TBA is cached (Bridge high-1 fix)', async () => {
    const mockCache = {
      get: vi.fn().mockResolvedValue(mockVerification),
      set: vi.fn(),
    };
    const verifyFn = vi.fn().mockResolvedValue(null); // Signature verification fails

    const app = new Hono();
    app.use('*', createTBAAuthMiddleware({
      cache: mockCache as any,
      verifyTBA: verifyFn,
    }));
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: {
        'x-tba-address': '0xTBA001',
        'x-tba-signature': 'bad-sig',
        'x-tba-timestamp': String(nowSec()),
      },
    });

    // Even though cache has this TBA, invalid signature is rejected
    expect(res.status).toBe(401);
  });

  it('caches identity resolution after successful verify', async () => {
    const mockCache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
    };

    const app = new Hono();
    app.use('*', createTBAAuthMiddleware({
      cache: mockCache as any,
      verifyTBA: vi.fn().mockResolvedValue(mockVerification),
    }));
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: {
        'x-tba-address': '0xTBA001',
        'x-tba-signature': 'sig123',
        'x-tba-timestamp': String(nowSec()),
      },
    });

    expect(res.status).toBe(200);
    // Cache stores identity info for downstream middleware (not for auth bypass)
    expect(mockCache.set).toHaveBeenCalledWith('0xTBA001', mockVerification);
  });
});

// --- Agent Routes Tests ---

describe('Agent API routes', () => {
  let mockFinnClient: FinnClient;
  let mockConvictionResolver: ConvictionResolver;

  beforeEach(() => {
    mockFinnClient = {
      request: vi.fn().mockResolvedValue({
        response: 'The Oracle speaks.',
        model: 'claude-opus-4-6',
        input_tokens: 100,
        output_tokens: 200,
        sources: [{ id: 'src-1', title: 'Knowledge Base', relevance: 0.95 }],
      }),
    } as unknown as FinnClient;

    mockConvictionResolver = {
      resolve: vi.fn().mockResolvedValue({
        tier: 'architect',
        bgtStaked: 1000,
        source: 'freeside',
      }),
    } as unknown as ConvictionResolver;
  });

  function createApp() {
    const app = new Hono();
    app.route('/api/agent', createAgentRoutes({
      finnClient: mockFinnClient,
      convictionResolver: mockConvictionResolver,
      memoryStore: null,
    }));
    return app;
  }

  describe('POST /query', () => {
    it('rejects without TBA auth', async () => {
      const app = createApp();
      const res = await app.request('/api/agent/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects without x-agent-owner (Bridge medium-6)', async () => {
      const app = createApp();
      const res = await app.request('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xTBA001',
          // No x-agent-owner
        },
        body: JSON.stringify({ query: 'test' }),
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain('x-agent-owner');
    });

    it('rejects insufficient conviction tier', async () => {
      (mockConvictionResolver.resolve as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'builder', // Need architect+
        bgtStaked: 100,
        source: 'freeside',
      });

      const app = createApp();
      const res = await app.request('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xTBA001',
          'x-agent-owner': '0xOwner',
        },
        body: JSON.stringify({ query: 'test' }),
      });
      expect(res.status).toBe(403);
    });

    it('returns agent query response with receipt', async () => {
      const app = createApp();
      const res = await app.request('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xTBA001',
          'x-agent-owner': '0xOwner',
        },
        body: JSON.stringify({ query: 'What is Berachain?' }),
      });

      expect(res.status).toBe(200);
      const body: AgentQueryResponse = await res.json();
      expect(body.response).toBe('The Oracle speaks.');
      expect(body.cost.modelUsed).toBe('claude-opus-4-6');
      expect(body.cost.inputTokens).toBe(100);
      expect(body.cost.outputTokens).toBe(200);
      expect(body.cost.costMicroUsd).toBeGreaterThan(0);
      expect(body.receipt).toBeDefined();
      expect(body.receipt!.payer).toBe('0xTBA001');
      expect(body.sources).toHaveLength(1);
    });

    it('sets economic response headers', async () => {
      const app = createApp();
      const res = await app.request('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xTBA001',
          'x-agent-owner': '0xOwner',
        },
        body: JSON.stringify({ query: 'test' }),
      });

      expect(res.headers.get('X-Cost-Micro-USD')).toBeTruthy();
      expect(res.headers.get('X-Model-Used')).toBe('claude-opus-4-6');
      expect(res.headers.get('X-Receipt-Id')).toBeTruthy();
    });

    it('rejects missing query field', async () => {
      const app = createApp();
      const res = await app.request('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xTBA001',
          'x-agent-owner': '0xOwner',
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /capabilities', () => {
    it('returns capability discovery', async () => {
      const app = createApp();
      const res = await app.request('/api/agent/capabilities', {
        headers: {
          'x-agent-tba': '0xTBA001',
          'x-agent-owner': '0xOwner',
        },
      });

      expect(res.status).toBe(200);
      const body: AgentCapabilities = await res.json();
      expect(body.oracleId).toBe('the-honey-jar-oracle');
      expect(body.knowledgeDomains.length).toBeGreaterThan(0);
      expect(body.supportedFormats).toContain('json');
      expect(body.skills.length).toBeGreaterThan(0);
      expect(body.rateLimits.requestsPerMinute).toBe(DEFAULT_AGENT_RATE_LIMITS.agentRpm);
    });

    it('rejects without TBA auth', async () => {
      const app = createApp();
      const res = await app.request('/api/agent/capabilities');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /knowledge', () => {
    it('returns knowledge metadata', async () => {
      (mockFinnClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        domains: [{ name: 'berachain', documentCount: 150, lastUpdated: '2026-02-21' }],
        totalDocuments: 150,
      });

      const app = createApp();
      const res = await app.request('/api/agent/knowledge', {
        headers: { 'x-agent-tba': '0xTBA001', 'x-agent-owner': '0xOwner' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.totalDocuments).toBe(150);
    });

    it('degrades gracefully when finn unavailable', async () => {
      (mockFinnClient.request as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('finn down'),
      );

      const app = createApp();
      const res = await app.request('/api/agent/knowledge', {
        headers: { 'x-agent-tba': '0xTBA001', 'x-agent-owner': '0xOwner' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.totalDocuments).toBe(0);
    });

    it('rejects without x-agent-owner (iter2-low-8)', async () => {
      const app = createApp();
      const res = await app.request('/api/agent/knowledge', {
        headers: { 'x-agent-tba': '0xTBA001' },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain('x-agent-owner');
    });

    it('rejects insufficient conviction tier (iter2-low-8)', async () => {
      (mockConvictionResolver.resolve as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'builder',
        bgtStaked: 100,
        source: 'freeside',
      });

      const app = createApp();
      const res = await app.request('/api/agent/knowledge', {
        headers: { 'x-agent-tba': '0xTBA001', 'x-agent-owner': '0xOwner' },
      });

      expect(res.status).toBe(403);
    });

    it('includes corpus_version in enriched response (Task 15.3)', async () => {
      (mockFinnClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        domains: [{ name: 'berachain', documentCount: 150, lastUpdated: '2026-02-21' }],
        totalDocuments: 150,
      });

      const app = createApp();
      const res = await app.request('/api/agent/knowledge', {
        headers: { 'x-agent-tba': '0xTBA001', 'x-agent-owner': '0xOwner' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.corpus_version).toBeGreaterThanOrEqual(1);
      expect(body.totalDocuments).toBe(150);
    });

    it('includes freshness counts in enriched response (Task 15.3)', async () => {
      (mockFinnClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        domains: [],
        totalDocuments: 0,
      });

      const app = createApp();
      const res = await app.request('/api/agent/knowledge', {
        headers: { 'x-agent-tba': '0xTBA001', 'x-agent-owner': '0xOwner' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.freshness).toBeDefined();
      expect(body.freshness.healthy).toBeGreaterThanOrEqual(0);
      expect(body.freshness.stale).toBeGreaterThanOrEqual(0);
      expect(body.freshness.total).toBe(body.freshness.healthy + body.freshness.stale);
    });

    it('returns local corpus metadata when finn unavailable (Task 15.3)', async () => {
      (mockFinnClient.request as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('finn down'),
      );

      const app = createApp();
      const res = await app.request('/api/agent/knowledge', {
        headers: { 'x-agent-tba': '0xTBA001', 'x-agent-owner': '0xOwner' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      // Should still have local corpus metadata even though finn is down
      expect(body.corpus_version).toBeGreaterThanOrEqual(1);
      expect(body.freshness).toBeDefined();
      expect(body.domains).toEqual([]);
      expect(body.totalDocuments).toBe(0);
    });
  });

  describe('GET /self-knowledge (Task 16.3)', () => {
    it('returns Oracle self-knowledge response', async () => {
      const app = createApp();
      const res = await app.request('/api/agent/self-knowledge', {
        headers: { 'x-agent-tba': '0xTBA001', 'x-agent-owner': '0xOwner' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.corpus_version).toBeGreaterThanOrEqual(1);
      expect(body.freshness).toBeDefined();
      expect(body.freshness.healthy).toBeGreaterThanOrEqual(0);
      expect(body.freshness.total).toBe(body.freshness.healthy + body.freshness.stale);
      expect(body.freshness.staleSources).toBeInstanceOf(Array);
      expect(body.coverage).toBeDefined();
      expect(body.coverage.repos_with_code_reality).toBeInstanceOf(Array);
      expect(body.token_utilization).toBeDefined();
      expect(body.token_utilization.budget).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(body.confidence);
    });

    it('rejects without TBA auth', async () => {
      const app = createApp();
      const res = await app.request('/api/agent/self-knowledge');
      expect(res.status).toBe(401);
    });

    it('rejects without x-agent-owner', async () => {
      const app = createApp();
      const res = await app.request('/api/agent/self-knowledge', {
        headers: { 'x-agent-tba': '0xTBA001' },
      });
      expect(res.status).toBe(401);
    });

    it('rejects insufficient conviction tier', async () => {
      (mockConvictionResolver.resolve as ReturnType<typeof vi.fn>).mockResolvedValue({
        tier: 'builder',
        bgtStaked: 100,
        source: 'freeside',
      });

      const app = createApp();
      const res = await app.request('/api/agent/self-knowledge', {
        headers: { 'x-agent-tba': '0xTBA001', 'x-agent-owner': '0xOwner' },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /schedule', () => {
    it('creates agent-initiated schedule', async () => {
      (mockFinnClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        cronId: 'agent-cron-001',
      });

      const app = createApp();
      const res = await app.request('/api/agent/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xTBA001',
          'x-agent-owner': '0xOwner',
        },
        body: JSON.stringify({
          nftId: 'nft-001',
          nlExpression: 'every morning',
          prompt: 'Check governance proposals',
        }),
      });

      expect(res.status).toBe(201);
    });

    it('rejects missing required fields', async () => {
      const app = createApp();
      const res = await app.request('/api/agent/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xTBA001',
          'x-agent-owner': '0xOwner',
        },
        body: JSON.stringify({ nftId: 'nft-001' }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Agent rate limiting', () => {
    it('enforces per-agent rate limits', async () => {
      const app = new Hono();
      app.route('/api/agent', createAgentRoutes({
        finnClient: mockFinnClient,
        convictionResolver: mockConvictionResolver,
        memoryStore: null,
        rateLimits: { agentRpm: 2, agentRpd: 100 }, // Very low for testing
      }));

      // First 2 requests should succeed
      for (let i = 0; i < 2; i++) {
        const res = await app.request('/api/agent/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-agent-tba': '0xTBA001',
            'x-agent-owner': '0xOwner',
          },
          body: JSON.stringify({ query: `test ${i}` }),
        });
        expect(res.status).toBe(200);
      }

      // 3rd request should be rate limited
      const res = await app.request('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xTBA001',
          'x-agent-owner': '0xOwner',
        },
        body: JSON.stringify({ query: 'test overflow' }),
      });
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toBe('rate_limited');
    });

    it('tracks different agents separately', async () => {
      const app = new Hono();
      app.route('/api/agent', createAgentRoutes({
        finnClient: mockFinnClient,
        convictionResolver: mockConvictionResolver,
        memoryStore: null,
        rateLimits: { agentRpm: 1, agentRpd: 100 },
      }));

      // Agent 1 uses its quota
      const res1 = await app.request('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xAgent1',
          'x-agent-owner': '0xOwner',
        },
        body: JSON.stringify({ query: 'test' }),
      });
      expect(res1.status).toBe(200);

      // Agent 2 still has its own quota
      const res2 = await app.request('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xAgent2',
          'x-agent-owner': '0xOwner',
        },
        body: JSON.stringify({ query: 'test' }),
      });
      expect(res2.status).toBe(200);
    });

    it('enforces daily RPD limit (iter2-low-1)', async () => {
      const app = new Hono();
      app.route('/api/agent', createAgentRoutes({
        finnClient: mockFinnClient,
        convictionResolver: mockConvictionResolver,
        memoryStore: null,
        rateLimits: { agentRpm: 100, agentRpd: 3 }, // High RPM, low RPD
      }));

      // First 3 requests succeed (RPD = 3)
      for (let i = 0; i < 3; i++) {
        const res = await app.request('/api/agent/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-agent-tba': '0xDailyAgent',
            'x-agent-owner': '0xOwner',
          },
          body: JSON.stringify({ query: `test ${i}` }),
        });
        expect(res.status).toBe(200);
      }

      // 4th request should be daily-limited
      const res = await app.request('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xDailyAgent',
          'x-agent-owner': '0xOwner',
        },
        body: JSON.stringify({ query: 'test overflow' }),
      });
      expect(res.status).toBe(429);
    });

    it('tracks RPD separately per agent (iter2-low-1)', async () => {
      const app = new Hono();
      app.route('/api/agent', createAgentRoutes({
        finnClient: mockFinnClient,
        convictionResolver: mockConvictionResolver,
        memoryStore: null,
        rateLimits: { agentRpm: 100, agentRpd: 1 },
      }));

      // Agent A uses its daily quota
      const resA = await app.request('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xAgentA',
          'x-agent-owner': '0xOwner',
        },
        body: JSON.stringify({ query: 'test' }),
      });
      expect(resA.status).toBe(200);

      // Agent B still has its own daily quota
      const resB = await app.request('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xAgentB',
          'x-agent-owner': '0xOwner',
        },
        body: JSON.stringify({ query: 'test' }),
      });
      expect(resB.status).toBe(200);

      // Agent A is daily-limited
      const resA2 = await app.request('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-tba': '0xAgentA',
          'x-agent-owner': '0xOwner',
        },
        body: JSON.stringify({ query: 'test' }),
      });
      expect(resA2.status).toBe(429);
    });
  });
});
