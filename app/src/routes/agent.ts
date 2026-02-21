import { Hono } from 'hono';
import type { FinnClient } from '../proxy/finn-client.js';
import type { ConvictionResolver } from '../services/conviction-resolver.js';
import type { MemoryStore } from '../services/memory-store.js';
import { getRequestContext } from '../validation.js';
import { tierMeetsRequirement } from '../types/conviction.js';
import type {
  AgentQueryRequest,
  AgentQueryResponse,
  AgentCapabilities,
  X402Receipt,
  AgentRateLimitConfig,
} from '../types/agent-api.js';
import { DEFAULT_AGENT_RATE_LIMITS } from '../types/agent-api.js';

export interface AgentRouteDeps {
  finnClient: FinnClient;
  convictionResolver: ConvictionResolver;
  memoryStore: MemoryStore | null;
  rateLimits?: AgentRateLimitConfig;
}

/**
 * Agent API routes — organism-to-organism communication.
 *
 * All endpoints require TBA authentication (x-agent-tba header set by middleware)
 * and architect+ conviction tier.
 *
 * See: SDD §6.1.3, §7.2, PRD FR-6
 */
export function createAgentRoutes(deps: AgentRouteDeps): Hono {
  const { finnClient, convictionResolver, memoryStore } = deps;
  const limits = deps.rateLimits ?? DEFAULT_AGENT_RATE_LIMITS;
  const app = new Hono();

  // Agent-specific rate limiting (per-agent identity, separate from human limits)
  // Bounded to MAX_TRACKED_AGENTS entries (Bridge medium-1)
  const MAX_TRACKED_AGENTS = 1000;
  const agentRequestCounts = new Map<string, { timestamps: number[]; lastAccess: number }>();
  let lastCleanup = Date.now();

  const cleanupStaleEntries = (now: number) => {
    // Run cleanup every 60 seconds
    if (now - lastCleanup < 60_000) return;
    lastCleanup = now;
    const windowStart = now - 60_000;
    for (const [key, entry] of agentRequestCounts) {
      entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
      if (entry.timestamps.length === 0) {
        agentRequestCounts.delete(key);
      }
    }
    // Evict LRU if still over limit
    if (agentRequestCounts.size > MAX_TRACKED_AGENTS) {
      const sorted = [...agentRequestCounts.entries()].sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      const evictCount = agentRequestCounts.size - MAX_TRACKED_AGENTS;
      for (let i = 0; i < evictCount; i++) {
        agentRequestCounts.delete(sorted[i]![0]);
      }
    }
  };

  const agentRateLimit = async (agentTba: string): Promise<{ allowed: boolean; retryAfter?: number }> => {
    const now = Date.now();
    const windowStart = now - 60_000;

    cleanupStaleEntries(now);

    let entry = agentRequestCounts.get(agentTba);
    if (!entry) {
      entry = { timestamps: [], lastAccess: now };
      agentRequestCounts.set(agentTba, entry);
    }

    entry.lastAccess = now;
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= limits.agentRpm) {
      const oldest = entry.timestamps[0]!;
      const retryAfter = Math.ceil((oldest + 60_000 - now) / 1000);
      return { allowed: false, retryAfter };
    }

    entry.timestamps.push(now);
    return { allowed: true };
  };

  /** POST /query — Agent-to-Oracle query */
  app.post('/query', async (c) => {
    const agentTba = c.req.header('x-agent-tba');
    if (!agentTba) {
      return c.json({ error: 'unauthorized', message: 'TBA authentication required' }, 401);
    }

    // Check agent rate limit
    const rateCheck = await agentRateLimit(agentTba);
    if (!rateCheck.allowed) {
      c.header('Retry-After', String(rateCheck.retryAfter));
      return c.json(
        { error: 'rate_limited', message: 'Agent rate limit exceeded', retry_after: rateCheck.retryAfter },
        429,
      );
    }

    // Verify architect+ tier via the agent's owner wallet (Bridge medium-6: REQUIRED)
    const ownerWallet = c.req.header('x-agent-owner');
    if (!ownerWallet) {
      return c.json(
        { error: 'unauthorized', message: 'x-agent-owner header required (set by TBA auth middleware)' },
        401,
      );
    }

    const conviction = await convictionResolver.resolve(ownerWallet);
    if (!tierMeetsRequirement(conviction.tier, 'architect')) {
      return c.json(
        { error: 'forbidden', message: 'Architect conviction tier or higher required for agent API' },
        403,
      );
    }

    const body = await c.req.json<AgentQueryRequest>().catch(() => null);
    if (!body || !body.query) {
      return c.json({ error: 'invalid_request', message: 'query field required' }, 400);
    }

    // Pre-flight budget check BEFORE incurring cost (Bridge medium-8)
    if (body.maxCostMicroUsd) {
      // Estimate based on typical query: ~200 prompt + ~400 completion tokens
      const estimatedCost = Math.ceil((200 * 0.003 + 400 * 0.015) * 1000);
      if (estimatedCost > body.maxCostMicroUsd) {
        return c.json(
          { error: 'budget_exceeded', message: `Estimated cost ${estimatedCost}μUSD exceeds max ${body.maxCostMicroUsd}μUSD` },
          402,
        );
      }
    }

    try {
      // Forward to loa-finn with agent context
      const finnResponse = await finnClient.request<{
        response: string;
        model: string;
        input_tokens: number;
        output_tokens: number;
        sources?: Array<{ id: string; title: string; relevance: number }>;
      }>('POST', '/api/chat', {
        body: {
          message: body.query,
          agentTba,
          format: body.format ?? 'text',
          maxTokens: body.maxTokens,
          knowledgeDomain: body.knowledgeDomain,
          sessionId: body.sessionId,
        },
      });

      // Calculate cost (simplified — in production, use model-specific pricing)
      const costMicroUsd = Math.ceil(
        (finnResponse.input_tokens * 0.003 + finnResponse.output_tokens * 0.015) * 1000,
      );

      // Post-request budget check — warn if actual exceeds max (Bridge medium-8)
      // Pre-flight already rejected clearly over-budget requests;
      // this catches cases where actual cost exceeded the estimate
      let budgetWarning: string | null = null;
      if (body.maxCostMicroUsd && costMicroUsd > body.maxCostMicroUsd) {
        budgetWarning = `Actual cost ${costMicroUsd}μUSD exceeded max ${body.maxCostMicroUsd}μUSD`;
      }

      // Generate x402 receipt (mock — in production, settle via freeside)
      const receipt: X402Receipt = {
        receiptId: `rcpt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        payer: agentTba,
        payee: 'dixie-oracle',
        amountMicroUsd: costMicroUsd,
        timestamp: new Date().toISOString(),
      };

      const response: AgentQueryResponse = {
        response: finnResponse.response,
        format: body.format ?? 'text',
        sources: finnResponse.sources ?? [],
        cost: {
          modelUsed: finnResponse.model,
          inputTokens: finnResponse.input_tokens,
          outputTokens: finnResponse.output_tokens,
          costMicroUsd,
        },
        receipt,
        sessionId: body.sessionId,
      };

      // Set economic headers
      c.header('X-Cost-Micro-USD', String(costMicroUsd));
      c.header('X-Model-Used', finnResponse.model);
      c.header('X-Receipt-Id', receipt.receiptId);
      if (budgetWarning) {
        c.header('X-Budget-Warning', budgetWarning);
      }

      return c.json(response);
    } catch (err) {
      if (err instanceof Object && 'status' in err && 'body' in err) {
        const bffErr = err as { status: number; body: unknown };
        return c.json(bffErr.body, bffErr.status as 400);
      }
      return c.json({ error: 'internal_error', message: 'Agent query failed' }, 500);
    }
  });

  /** GET /capabilities — Discovery endpoint */
  app.get('/capabilities', async (c) => {
    const agentTba = c.req.header('x-agent-tba');
    if (!agentTba) {
      return c.json({ error: 'unauthorized', message: 'TBA authentication required' }, 401);
    }

    // Verify architect+ tier (Bridge medium-6: REQUIRED)
    const ownerWallet = c.req.header('x-agent-owner');
    if (!ownerWallet) {
      return c.json(
        { error: 'unauthorized', message: 'x-agent-owner header required (set by TBA auth middleware)' },
        401,
      );
    }

    const conviction = await convictionResolver.resolve(ownerWallet);
    if (!tierMeetsRequirement(conviction.tier, 'architect')) {
      return c.json(
        { error: 'forbidden', message: 'Architect conviction tier or higher required' },
        403,
      );
    }

    const capabilities: AgentCapabilities = {
      oracleId: 'the-honey-jar-oracle',
      knowledgeDomains: [
        'berachain',
        'defi',
        'governance',
        'honey-jar',
        'bera-ecosystem',
      ],
      supportedFormats: ['text', 'json', 'structured'],
      modelPool: c.req.header('x-model-pool') ?? 'standard',
      skills: [
        { name: 'knowledge_query', description: 'Query the Oracle knowledge corpus', costEstimateMicroUsd: 50 },
        { name: 'session_context', description: 'Multi-turn conversation with context', costEstimateMicroUsd: 100 },
        { name: 'structured_analysis', description: 'Structured JSON analysis output', costEstimateMicroUsd: 150 },
      ],
      rateLimits: {
        requestsPerMinute: limits.agentRpm,
        requestsPerDay: limits.agentRpd,
      },
      pricing: {
        baseCostMicroUsd: 10,
        perTokenMicroUsd: 3,
      },
    };

    return c.json(capabilities);
  });

  /** GET /knowledge — Knowledge corpus metadata */
  app.get('/knowledge', async (c) => {
    const agentTba = c.req.header('x-agent-tba');
    if (!agentTba) {
      return c.json({ error: 'unauthorized', message: 'TBA authentication required' }, 401);
    }

    try {
      const knowledge = await finnClient.request<{
        domains: Array<{ name: string; documentCount: number; lastUpdated: string }>;
        totalDocuments: number;
      }>('GET', '/api/knowledge/metadata');

      return c.json(knowledge);
    } catch {
      // Graceful degradation — return empty metadata
      return c.json({
        domains: [],
        totalDocuments: 0,
      });
    }
  });

  /** POST /schedule — Agent-initiated schedule creation */
  app.post('/schedule', async (c) => {
    const agentTba = c.req.header('x-agent-tba');
    if (!agentTba) {
      return c.json({ error: 'unauthorized', message: 'TBA authentication required' }, 401);
    }

    // Verify architect+ tier (Bridge medium-6: REQUIRED)
    const ownerWallet = c.req.header('x-agent-owner');
    if (!ownerWallet) {
      return c.json(
        { error: 'unauthorized', message: 'x-agent-owner header required (set by TBA auth middleware)' },
        401,
      );
    }

    const conviction = await convictionResolver.resolve(ownerWallet);
    if (!tierMeetsRequirement(conviction.tier, 'architect')) {
      return c.json(
        { error: 'forbidden', message: 'Architect conviction tier or higher required' },
        403,
      );
    }

    const body = await c.req.json().catch(() => null);
    if (!body || !body.nlExpression || !body.prompt || !body.nftId) {
      return c.json(
        { error: 'invalid_request', message: 'Required: nftId, nlExpression, prompt' },
        400,
      );
    }

    try {
      // Forward to the schedule creation API via finn
      const result = await finnClient.request('POST', '/api/cron/register', {
        body: {
          nftId: body.nftId,
          cron: body.nlExpression,
          prompt: body.prompt,
          agentTba,
        },
      });

      return c.json(result, 201);
    } catch (err) {
      if (err instanceof Object && 'status' in err && 'body' in err) {
        const bffErr = err as { status: number; body: unknown };
        return c.json(bffErr.body, bffErr.status as 400);
      }
      return c.json({ error: 'internal_error', message: 'Agent schedule creation failed' }, 500);
    }
  });

  return app;
}
