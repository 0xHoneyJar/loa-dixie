import { Hono } from 'hono';
import type { FinnClient } from '../proxy/finn-client.js';
import type { ConvictionResolver } from '../services/conviction-resolver.js';
import type { MemoryStore } from '../services/memory-store.js';
import {
  isValidPathParam,
  getRequestContext,
  AGENT_QUERY_MAX_LENGTH,
  AGENT_MAX_TOKENS_MIN,
  AGENT_MAX_TOKENS_MAX,
  AGENT_KNOWLEDGE_DOMAIN_MAX_LENGTH,
} from '../validation.js';
import { handleRouteError } from '../utils/error-handler.js';
import { getCorpusMeta, corpusMeta } from '../services/corpus-meta.js';
import { generateDisclaimer } from '../services/freshness-disclaimer.js';
import { tierMeetsRequirement } from '../types/conviction.js';
import { buildConvictionDenialResponse } from '../services/conviction-boundary.js';
import type {
  AgentQueryRequest,
  AgentQueryResponse,
  AgentCapabilities,
  X402Receipt,
  AgentRateLimitConfig,
} from '../types/agent-api.js';
import { DEFAULT_AGENT_RATE_LIMITS } from '../types/agent-api.js';
import type { KnowledgePriorityStore } from '../services/knowledge-priority-store.js';
import { computeCost } from '../types/economic.js';

export interface AgentRouteDeps {
  finnClient: FinnClient;
  convictionResolver: ConvictionResolver;
  memoryStore: MemoryStore | null;
  rateLimits?: AgentRateLimitConfig;
  /** Task 21.4: Conviction-weighted knowledge priority voting store */
  priorityStore?: KnowledgePriorityStore;
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
  const { finnClient, convictionResolver, memoryStore, priorityStore } = deps;
  const limits = deps.rateLimits ?? DEFAULT_AGENT_RATE_LIMITS;
  const app = new Hono();

  // Agent-specific rate limiting (per-agent identity, separate from human limits)
  // Bounded to MAX_TRACKED_AGENTS entries (Bridge medium-1)
  const MAX_TRACKED_AGENTS = 1000;
  const agentRequestCounts = new Map<string, { timestamps: number[]; lastAccess: number }>();
  // Daily request counts — keyed by `${agentTba}:${YYYY-MM-DD}` for auto-rollover (Bridge iter2-low-1)
  const agentDailyCounts = new Map<string, number>();

  const cleanupStaleEntries = () => {
    const start = Date.now();
    const windowStart = start - 60_000;
    const today = new Date(start).toISOString().split('T')[0]!;
    let evicted = 0;
    for (const [key, entry] of agentRequestCounts) {
      entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
      if (entry.timestamps.length === 0) {
        agentRequestCounts.delete(key);
        evicted++;
      }
    }
    // Evict LRU if still over limit
    if (agentRequestCounts.size > MAX_TRACKED_AGENTS) {
      const sorted = [...agentRequestCounts.entries()].sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      const evictCount = agentRequestCounts.size - MAX_TRACKED_AGENTS;
      for (let i = 0; i < evictCount; i++) {
        agentRequestCounts.delete(sorted[i]![0]);
        evicted++;
      }
    }
    // Evict stale daily entries (past dates) and enforce MAX_TRACKED cap
    for (const key of agentDailyCounts.keys()) {
      if (!key.endsWith(today)) {
        agentDailyCounts.delete(key);
        evicted++;
      }
    }
    if (agentDailyCounts.size > MAX_TRACKED_AGENTS) {
      const entries = [...agentDailyCounts.entries()];
      entries.sort((a, b) => a[1] - b[1]); // evict lowest-count first
      const evictCount = agentDailyCounts.size - MAX_TRACKED_AGENTS;
      for (let i = 0; i < evictCount; i++) {
        agentDailyCounts.delete(entries[i]![0]);
        evicted++;
      }
    }
    const durationMs = Date.now() - start;
    if (evicted > 0) {
      console.debug('[rate-limit] cleanup', { evicted, durationMs });
    }
  };

  // Run cleanup on interval instead of request path (Sprint 56 — Task 2.2)
  const cleanupInterval = setInterval(cleanupStaleEntries, 60_000);
  cleanupInterval.unref(); // Don't keep process alive for cleanup

  const agentRateLimit = async (agentTba: string): Promise<{ allowed: boolean; retryAfter?: number }> => {
    const now = Date.now();
    const windowStart = now - 60_000;

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

    // Check daily limit (Bridge iter2-low-1)
    const today = new Date(now).toISOString().split('T')[0]!;
    const dailyKey = `${agentTba}:${today}`;
    const dailyCount = agentDailyCounts.get(dailyKey) ?? 0;
    if (dailyCount >= limits.agentRpd) {
      return { allowed: false, retryAfter: undefined };
    }

    entry.timestamps.push(now);
    agentDailyCounts.set(dailyKey, dailyCount + 1);
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
        buildConvictionDenialResponse(conviction.tier, 'architect', 'Architect conviction tier or higher required for agent API'),
        403,
      );
    }

    const body = await c.req.json<AgentQueryRequest>().catch(() => null);
    if (!body || !body.query) {
      return c.json({ error: 'invalid_request', message: 'query field required' }, 400);
    }

    // Input validation (Sprint 56 — Task 2.1: match chat.ts validation patterns)
    // Constants extracted to validation.ts (Sprint 58 — Task 1.4: Bridgebuilder finding #4)
    if (body.query.length > AGENT_QUERY_MAX_LENGTH) {
      return c.json({ error: 'invalid_request', message: `query exceeds maximum length of ${AGENT_QUERY_MAX_LENGTH} characters` }, 400);
    }
    if (body.maxTokens !== undefined && (!Number.isInteger(body.maxTokens) || body.maxTokens < AGENT_MAX_TOKENS_MIN || body.maxTokens > AGENT_MAX_TOKENS_MAX)) {
      return c.json({ error: 'invalid_request', message: `maxTokens must be an integer between ${AGENT_MAX_TOKENS_MIN} and ${AGENT_MAX_TOKENS_MAX}` }, 400);
    }
    if (body.sessionId !== undefined && !isValidPathParam(body.sessionId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid sessionId format' }, 400);
    }
    if (body.knowledgeDomain !== undefined && body.knowledgeDomain.length > AGENT_KNOWLEDGE_DOMAIN_MAX_LENGTH) {
      return c.json({ error: 'invalid_request', message: `knowledgeDomain exceeds maximum length of ${AGENT_KNOWLEDGE_DOMAIN_MAX_LENGTH} characters` }, 400);
    }

    // Pre-flight budget check BEFORE incurring cost (Bridge medium-8)
    if (body.maxCostMicroUsd) {
      // Estimate based on typical query: ~200 prompt + ~400 completion tokens (Bridge iter2-medium-2)
      const estimatedCost = computeCost('claude-sonnet-4-6', 200, 400);
      if (estimatedCost > body.maxCostMicroUsd) {
        return c.json(
          { error: 'budget_exceeded', message: `Estimated cost ${estimatedCost}μUSD exceeds max ${body.maxCostMicroUsd}μUSD` },
          402,
        );
      }
    }

    try {
      // Adaptive retrieval: assess knowledge confidence before querying (Task 19.5)
      const selfKnowledge = corpusMeta.getSelfKnowledge();
      const disclaimer = selfKnowledge ? generateDisclaimer(selfKnowledge) : null;
      let systemNote: string | undefined;
      if (selfKnowledge && selfKnowledge.confidence === 'low') {
        const staleList = selfKnowledge.freshness.staleSources.join(', ');
        systemNote = `Note: Knowledge freshness is degraded. Sources [${staleList}] may be outdated. Hedge appropriately and flag uncertainty in your response.`;
      } else if (selfKnowledge && selfKnowledge.confidence === 'medium') {
        const staleList = selfKnowledge.freshness.staleSources.join(', ');
        systemNote = `Note: Some knowledge sources may be outdated [${staleList}]. Consider noting this if your response draws heavily from these domains.`;
      }

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
          systemNote, // Adaptive routing: hedging instruction on low confidence
        },
      });

      // Calculate cost using model-specific pricing table (Bridge iter2-medium-2)
      const costMicroUsd = computeCost(finnResponse.model, finnResponse.input_tokens, finnResponse.output_tokens);

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
        // Task 19.3: Freshness metadata in response
        freshness: selfKnowledge ? {
          confidence: selfKnowledge.confidence,
          disclaimer: disclaimer?.message ?? null,
          staleSourceCount: selfKnowledge.freshness.stale,
        } : undefined,
      };

      // Set economic headers
      c.header('X-Cost-Micro-USD', String(costMicroUsd));
      c.header('X-Model-Used', finnResponse.model);
      c.header('X-Receipt-Id', receipt.receiptId);
      // Task 19.3: Knowledge confidence header
      if (selfKnowledge) {
        c.header('X-Knowledge-Confidence', selfKnowledge.confidence);
      }
      if (budgetWarning) {
        c.header('X-Budget-Warning', budgetWarning);
      }

      return c.json(response);
    } catch (err) {
      return handleRouteError(c, err, 'Agent query failed');
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
        buildConvictionDenialResponse(conviction.tier, 'architect', 'Architect conviction tier or higher required'),
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

    // Verify architect+ tier (Bridge iter2-low-8)
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
        buildConvictionDenialResponse(conviction.tier, 'architect', 'Architect conviction tier or higher required'),
        403,
      );
    }

    // Local corpus metadata (always available)
    const corpusMeta = getCorpusMeta();
    const localCorpus = corpusMeta
      ? {
          corpus_version: corpusMeta.corpus_version,
          freshness: {
            healthy: corpusMeta.sources - corpusMeta.stale_sources,
            stale: corpusMeta.stale_sources,
            total: corpusMeta.sources,
          },
        }
      : null;

    try {
      const knowledge = await finnClient.request<{
        domains: Array<{ name: string; documentCount: number; lastUpdated: string }>;
        totalDocuments: number;
      }>('GET', '/api/knowledge/metadata');

      // Merge finn metadata with local corpus metadata
      return c.json({
        ...knowledge,
        ...(localCorpus ?? {}),
      });
    } catch {
      // Graceful degradation — return local corpus metadata when finn unavailable
      return c.json({
        domains: [],
        totalDocuments: 0,
        ...(localCorpus ?? {}),
      });
    }
  });

  /** GET /self-knowledge — Oracle metacognition (Task 16.3, deep-review build-next-5) */
  app.get('/self-knowledge', async (c) => {
    const agentTba = c.req.header('x-agent-tba');
    if (!agentTba) {
      return c.json({ error: 'unauthorized', message: 'TBA authentication required' }, 401);
    }

    // Verify architect+ tier (same auth as /knowledge)
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
        buildConvictionDenialResponse(conviction.tier, 'architect', 'Architect conviction tier or higher required'),
        403,
      );
    }

    const selfKnowledge = corpusMeta.getSelfKnowledge();
    if (!selfKnowledge) {
      return c.json({ error: 'internal_error', message: 'Failed to compute self-knowledge' }, 500);
    }

    // Task 21.5: Enrich with community governance data
    const governance = priorityStore
      ? {
          communityPriorities: priorityStore.getAggregatedPriorities().slice(0, 10),
          totalVoters: priorityStore.getVoterCount(),
          governanceModel: 'conviction-weighted-vote' as const,
        }
      : undefined;

    return c.json({ ...selfKnowledge, governance });
  });

  /** POST /knowledge/priorities/vote — Conviction-gated priority voting (Task 21.2) */
  app.post('/knowledge/priorities/vote', async (c) => {
    const agentTba = c.req.header('x-agent-tba');
    if (!agentTba) {
      return c.json({ error: 'unauthorized', message: 'TBA authentication required' }, 401);
    }

    const ownerWallet = c.req.header('x-agent-owner');
    if (!ownerWallet) {
      return c.json(
        { error: 'unauthorized', message: 'x-agent-owner header required (set by TBA auth middleware)' },
        401,
      );
    }

    // Require participant+ tier (Ostrom Principle 3: collective-choice arrangements)
    const conviction = await convictionResolver.resolve(ownerWallet);
    if (!tierMeetsRequirement(conviction.tier, 'participant')) {
      return c.json(
        buildConvictionDenialResponse(conviction.tier, 'participant', 'Participation required to vote on knowledge priorities'),
        403,
      );
    }

    if (!priorityStore) {
      return c.json({ error: 'not_available', message: 'Knowledge priority voting not configured' }, 503);
    }

    const body = await c.req.json<{ sourceId?: string; priority?: number }>().catch(() => null);
    if (!body || !body.sourceId || body.priority == null) {
      return c.json({ error: 'invalid_request', message: 'Required: sourceId, priority' }, 400);
    }

    // Validate priority range
    if (!Number.isInteger(body.priority) || body.priority < 1 || body.priority > 5) {
      return c.json({ error: 'invalid_request', message: 'priority must be an integer 1-5' }, 400);
    }

    // Validate sourceId against canonical source list (Task 22.2: use primary config, not derived weights)
    const sourceWeights = corpusMeta.getSourceWeights();
    if (sourceWeights.size > 0 && !sourceWeights.has(body.sourceId)) {
      return c.json({ error: 'invalid_request', message: `Unknown sourceId: ${body.sourceId}` }, 400);
    }

    priorityStore.vote({
      wallet: ownerWallet,
      sourceId: body.sourceId,
      priority: body.priority,
      tier: conviction.tier,
      timestamp: new Date().toISOString(),
    });

    const aggregated = priorityStore.getAggregatedPriorities();
    const sourceAgg = aggregated.find((p) => p.sourceId === body.sourceId);

    return c.json({
      sourceId: body.sourceId,
      yourVote: body.priority,
      aggregateScore: sourceAgg?.score ?? 0,
      voteCount: sourceAgg?.voteCount ?? 0,
    });
  });

  /** GET /knowledge/priorities — Aggregated community priorities (Task 21.3) */
  app.get('/knowledge/priorities', async (c) => {
    const agentTba = c.req.header('x-agent-tba');
    if (!agentTba) {
      return c.json({ error: 'unauthorized', message: 'TBA authentication required' }, 401);
    }

    if (!priorityStore) {
      return c.json({
        priorities: [],
        totalVoters: 0,
        lastUpdated: new Date().toISOString(),
      });
    }

    // Get aggregated priorities with source tags from corpus metadata
    const priorities = priorityStore.getAggregatedPriorities();
    const selfKnowledge = corpusMeta.getSelfKnowledge();
    const sourceWeights = selfKnowledge?.source_weights ?? [];

    const enriched = priorities.map((p) => {
      const weight = sourceWeights.find((w) => w.sourceId === p.sourceId);
      return {
        sourceId: p.sourceId,
        score: p.score,
        voteCount: p.voteCount,
        tags: weight ? [...weight.tags] : [],
      };
    });

    return c.json({
      priorities: enriched,
      totalVoters: priorityStore.getVoterCount(),
      lastUpdated: new Date().toISOString(),
    });
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
        buildConvictionDenialResponse(conviction.tier, 'architect', 'Architect conviction tier or higher required'),
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
      return handleRouteError(c, err, 'Agent schedule creation failed');
    }
  });

  return app;
}
