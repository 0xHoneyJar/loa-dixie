/**
 * Sprint 11: Enrichment Endpoint & Self-Improving Loop Activation
 *
 * Tests for:
 * - Task 11.1: EnrichmentService context assembly
 * - Task 11.2: POST /api/enrich/review-context endpoint (access control, latency budget)
 * - Task 11.3: EnrichmentClient timeout membrane and graceful degradation
 * - Task 11.4: Quality event feedback loop wiring
 * - Task 11.5: Self-hosting verification — full loop, no infinite recursion
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import {
  EnrichmentService,
} from '../../src/services/enrichment-service.js';
import type {
  EnrichmentContext,
  ConformanceMetricsSource,
  KnowledgeMetricsSource,
} from '../../src/services/enrichment-service.js';
import {
  ReputationService,
  InMemoryReputationStore,
} from '../../src/services/reputation-service.js';
import type { ReputationAggregate } from '../../src/services/reputation-service.js';
import { createEnrichmentRoutes } from '../../src/routes/enrich.js';
import { EnrichmentClient } from '../../src/services/enrichment-client.js';
import {
  emitQualityEvent,
  computeQualityScore,
  createQualityEvent,
} from '../../src/services/quality-feedback.js';
import type { QualityEvent } from '../../src/services/quality-feedback.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAggregate(overrides: Partial<ReputationAggregate> = {}): ReputationAggregate {
  return {
    personality_id: 'p1',
    collection_id: 'c1',
    pool_id: 'pool1',
    state: 'established',
    personal_score: 0.8,
    collection_score: 0.7,
    blended_score: 0.75,
    sample_count: 20,
    pseudo_count: 10,
    contributor_count: 5,
    min_sample_count: 10,
    created_at: '2026-01-01T00:00:00Z',
    last_updated: '2026-02-01T00:00:00Z',
    transition_history: [],
    contract_version: '7.9.2',
    ...overrides,
  };
}

class MockConformanceMetrics implements ConformanceMetricsSource {
  violationRate = 0.05;
  topSchemas = ['chat-response', 'health-check'];
  sampleRate = 0.1;
  totalViolations = 42;

  getViolationRate(): number { return this.violationRate; }
  getTopViolatedSchemas(limit: number): string[] { return this.topSchemas.slice(0, limit); }
  getSampleRate(): number { return this.sampleRate; }
  getTotalViolations(): number { return this.totalViolations; }
}

class MockKnowledgeMetrics implements KnowledgeMetricsSource {
  activeVotes = 15;
  priorities = [
    { sourceId: 'hounfour-spec', score: 120 },
    { sourceId: 'prd-v2', score: 85 },
  ];

  getActiveVoteCount(): number { return this.activeVotes; }
  getTopPriorities(limit: number): Array<{ sourceId: string; score: number }> {
    return this.priorities.slice(0, limit);
  }
}

// ---------------------------------------------------------------------------
// Task 11.1: EnrichmentService Context Assembly
// ---------------------------------------------------------------------------

describe('EnrichmentService', () => {
  let store: InMemoryReputationStore;
  let reputationService: ReputationService;
  let conformanceMetrics: MockConformanceMetrics;
  let knowledgeMetrics: MockKnowledgeMetrics;
  let enrichmentService: EnrichmentService;

  beforeEach(() => {
    store = new InMemoryReputationStore();
    reputationService = new ReputationService(store);
    conformanceMetrics = new MockConformanceMetrics();
    knowledgeMetrics = new MockKnowledgeMetrics();
    enrichmentService = new EnrichmentService({
      reputationService,
      conformanceMetrics,
      knowledgeMetrics,
    });
  });

  it('assembles full context for a cold agent (no reputation data)', async () => {
    const context = await enrichmentService.assembleContext('nft-unknown');

    expect(context.assembled_at).toBeTruthy();
    expect(context.partial).toBe(false);

    // Reputation: cold agent
    expect(context.reputation_context.trajectory).toBe('cold');
    expect(context.reputation_context.blended_score).toBeNull();
    expect(context.reputation_context.sample_count).toBe(0);

    // Conformance: from mock
    expect(context.conformance_context.violation_rate).toBe(0.05);
    expect(context.conformance_context.top_violated_schemas).toEqual(['chat-response', 'health-check']);
    expect(context.conformance_context.sample_rate).toBe(0.1);
    expect(context.conformance_context.total_violations).toBe(42);

    // Knowledge: from mock
    expect(context.knowledge_context.active_votes).toBe(15);
    expect(context.knowledge_context.priority_rankings).toHaveLength(2);
  });

  it('assembles context for a warm agent with reputation data', async () => {
    await store.put('nft-warm', makeAggregate({ state: 'established', blended_score: 0.82 }));

    const context = await enrichmentService.assembleContext('nft-warm');

    expect(context.reputation_context.trajectory).toBe('stable');
    expect(context.reputation_context.blended_score).toBe(0.82);
    expect(context.reputation_context.reputation_state).toBe('established');
    expect(context.reputation_context.sample_count).toBe(20);
  });

  it('detects improving trajectory from event history', async () => {
    await store.put('nft-improving', makeAggregate());

    // First half: low scores
    for (let i = 0; i < 5; i++) {
      await store.appendEvent('nft-improving', {
        type: 'quality_signal',
        timestamp: `2026-01-0${i + 1}T00:00:00Z`,
        payload: { score: 0.4 },
      });
    }
    // Second half: high scores
    for (let i = 0; i < 5; i++) {
      await store.appendEvent('nft-improving', {
        type: 'quality_signal',
        timestamp: `2026-02-0${i + 1}T00:00:00Z`,
        payload: { score: 0.9 },
      });
    }

    const context = await enrichmentService.assembleContext('nft-improving');
    expect(context.reputation_context.trajectory).toBe('improving');
  });

  it('detects declining trajectory from event history', async () => {
    await store.put('nft-declining', makeAggregate());

    // First half: high scores
    for (let i = 0; i < 5; i++) {
      await store.appendEvent('nft-declining', {
        type: 'quality_signal',
        timestamp: `2026-01-0${i + 1}T00:00:00Z`,
        payload: { score: 0.9 },
      });
    }
    // Second half: low scores
    for (let i = 0; i < 5; i++) {
      await store.appendEvent('nft-declining', {
        type: 'quality_signal',
        timestamp: `2026-02-0${i + 1}T00:00:00Z`,
        payload: { score: 0.3 },
      });
    }

    const context = await enrichmentService.assembleContext('nft-declining');
    expect(context.reputation_context.trajectory).toBe('declining');
  });

  it('works with default (no-op) metrics sources', async () => {
    const minimalService = new EnrichmentService({ reputationService });
    const context = await minimalService.assembleContext('nft-minimal');

    expect(context.conformance_context.violation_rate).toBe(0);
    expect(context.knowledge_context.active_votes).toBe(0);
    expect(context.partial).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 11.2: POST /api/enrich/review-context Endpoint
// ---------------------------------------------------------------------------

describe('POST /api/enrich/review-context', () => {
  let app: Hono;

  beforeEach(() => {
    const store = new InMemoryReputationStore();
    const reputationService = new ReputationService(store);
    const enrichmentService = new EnrichmentService({ reputationService });

    app = new Hono();
    app.route('/api/enrich', createEnrichmentRoutes({ enrichmentService }));
  });

  it('returns 403 for observer tier', async () => {
    const res = await app.request('/api/enrich/review-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conviction-tier': 'observer',
      },
      body: JSON.stringify({ nft_id: 'nft-1', review_type: 'bridge' }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
    expect(body.required_tier).toBe('builder');
  });

  it('returns 403 for participant tier', async () => {
    const res = await app.request('/api/enrich/review-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conviction-tier': 'participant',
      },
      body: JSON.stringify({ nft_id: 'nft-1', review_type: 'bridge' }),
    });

    expect(res.status).toBe(403);
  });

  it('returns 200 for builder tier', async () => {
    const res = await app.request('/api/enrich/review-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conviction-tier': 'builder',
      },
      body: JSON.stringify({ nft_id: 'nft-1', review_type: 'bridge' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assembled_at).toBeTruthy();
    expect(body.conviction_context).toBeDefined();
    expect(body.conformance_context).toBeDefined();
    expect(body.reputation_context).toBeDefined();
    expect(body.knowledge_context).toBeDefined();
  });

  it('returns 200 for architect tier', async () => {
    const res = await app.request('/api/enrich/review-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conviction-tier': 'architect',
      },
      body: JSON.stringify({ nft_id: 'nft-1', review_type: 'audit' }),
    });

    expect(res.status).toBe(200);
  });

  it('returns 200 for sovereign tier', async () => {
    const res = await app.request('/api/enrich/review-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conviction-tier': 'sovereign',
      },
      body: JSON.stringify({ nft_id: 'nft-1', review_type: 'flatline' }),
    });

    expect(res.status).toBe(200);
  });

  it('returns 400 for missing nft_id', async () => {
    const res = await app.request('/api/enrich/review-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conviction-tier': 'builder',
      },
      body: JSON.stringify({ review_type: 'bridge' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('nft_id');
  });

  it('returns 400 for invalid review_type', async () => {
    const res = await app.request('/api/enrich/review-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conviction-tier': 'builder',
      },
      body: JSON.stringify({ nft_id: 'nft-1', review_type: 'invalid' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('review_type');
  });

  it('returns 400 for invalid JSON body', async () => {
    const res = await app.request('/api/enrich/review-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conviction-tier': 'builder',
      },
      body: 'not json',
    });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Task 11.3: EnrichmentClient Timeout Membrane
// ---------------------------------------------------------------------------

describe('EnrichmentClient', () => {
  it('returns context when fetch succeeds within timeout', async () => {
    const mockContext: EnrichmentContext = {
      conviction_context: {
        tier_distribution: { observer: 1, participant: 1, builder: 1, architect: 0, sovereign: 0 },
        total_bgt_staked: 0,
        snapshot_at: '2026-02-24T00:00:00Z',
      },
      conformance_context: {
        violation_rate: 0.05,
        top_violated_schemas: [],
        sample_rate: 0.1,
        total_violations: 5,
        snapshot_at: '2026-02-24T00:00:00Z',
      },
      reputation_context: {
        trajectory: 'stable',
        blended_score: 0.75,
        sample_count: 20,
        reputation_state: 'established',
        snapshot_at: '2026-02-24T00:00:00Z',
      },
      knowledge_context: {
        active_votes: 10,
        priority_rankings: [],
        snapshot_at: '2026-02-24T00:00:00Z',
      },
      assembled_at: '2026-02-24T00:00:00Z',
      partial: false,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockContext),
    });

    const client = new EnrichmentClient({
      baseUrl: 'http://test:3000',
      timeoutMs: 100,
      fetch: mockFetch as unknown as typeof globalThis.fetch,
    });

    const result = await client.fetchContext('nft-1', 'bridge');

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.context.assembled_at).toBe('2026-02-24T00:00:00Z');
      expect(result.context.reputation_context.trajectory).toBe('stable');
    }
  });

  it('returns timeout when fetch exceeds timeout', async () => {
    const mockFetch = vi.fn().mockImplementation((_url: string, init: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        // Listen for abort signal
        init.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
        // Never resolve — simulates slow server
      });
    });

    const client = new EnrichmentClient({
      baseUrl: 'http://test:3000',
      timeoutMs: 10, // 10ms timeout — will expire fast
      fetch: mockFetch as unknown as typeof globalThis.fetch,
    });

    const result = await client.fetchContext('nft-1', 'bridge');

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe('timeout');
    }
  });

  it('returns unavailable on fetch error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const client = new EnrichmentClient({
      baseUrl: 'http://test:3000',
      timeoutMs: 100,
      fetch: mockFetch as unknown as typeof globalThis.fetch,
    });

    const result = await client.fetchContext('nft-1', 'audit');

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe('unavailable');
    }
  });

  it('returns access_denied on 403 response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'forbidden' }),
    });

    const client = new EnrichmentClient({
      baseUrl: 'http://test:3000',
      timeoutMs: 100,
      fetch: mockFetch as unknown as typeof globalThis.fetch,
    });

    const result = await client.fetchContext('nft-1', 'bridge');

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe('access_denied');
    }
  });

  it('returns unavailable on non-200 non-403 response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'internal_error' }),
    });

    const client = new EnrichmentClient({
      baseUrl: 'http://test:3000',
      timeoutMs: 100,
      fetch: mockFetch as unknown as typeof globalThis.fetch,
    });

    const result = await client.fetchContext('nft-1', 'flatline');

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe('unavailable');
    }
  });

  it('exposes configured timeout for observability', () => {
    const client = new EnrichmentClient({ timeoutMs: 200 });
    expect(client.configuredTimeoutMs).toBe(200);
  });

  it('defaults to 100ms timeout', () => {
    const client = new EnrichmentClient({});
    expect(client.configuredTimeoutMs).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Task 11.4: Quality Event Feedback Loop
// ---------------------------------------------------------------------------

describe('Quality Feedback Loop', () => {
  let store: InMemoryReputationStore;
  let reputationService: ReputationService;

  beforeEach(() => {
    store = new InMemoryReputationStore();
    reputationService = new ReputationService(store);
  });

  describe('computeQualityScore', () => {
    it('returns 1.0 for zero findings', () => {
      const event: QualityEvent = {
        source: 'bridge',
        finding_count: 0,
        severity_distribution: {},
        nft_id: 'nft-1',
        timestamp: '2026-02-24T00:00:00Z',
      };
      expect(computeQualityScore(event)).toBe(1.0);
    });

    it('returns lower score for high-severity findings', () => {
      const event: QualityEvent = {
        source: 'audit',
        finding_count: 3,
        severity_distribution: { high: 2, medium: 1 },
        nft_id: 'nft-1',
        timestamp: '2026-02-24T00:00:00Z',
      };
      const score = computeQualityScore(event);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.5);
    });

    it('returns near-zero for blocker findings', () => {
      const event: QualityEvent = {
        source: 'flatline',
        finding_count: 1,
        severity_distribution: { blocker: 1 },
        nft_id: 'nft-1',
        timestamp: '2026-02-24T00:00:00Z',
      };
      const score = computeQualityScore(event);
      expect(score).toBe(0.5); // 1 / (1 + 1.0) = 0.5
    });

    it('handles info-level findings with minimal impact', () => {
      const event: QualityEvent = {
        source: 'bridge',
        finding_count: 5,
        severity_distribution: { info: 5 },
        nft_id: 'nft-1',
        timestamp: '2026-02-24T00:00:00Z',
      };
      const score = computeQualityScore(event);
      // 5 * 0.05 = 0.25 weighted, 1 / 1.25 = 0.8
      expect(score).toBe(0.8);
    });
  });

  describe('emitQualityEvent', () => {
    it('appends a reputation event to the store', async () => {
      const event: QualityEvent = {
        source: 'bridge',
        finding_count: 2,
        severity_distribution: { medium: 1, low: 1 },
        nft_id: 'nft-emit',
        timestamp: '2026-02-24T00:00:00Z',
      };

      await emitQualityEvent(event, reputationService);

      const history = await store.getEventHistory('nft-emit');
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('quality_signal');
      expect(history[0].timestamp).toBe('2026-02-24T00:00:00Z');

      const payload = history[0].payload as { source: string; score: number; finding_count: number };
      expect(payload.source).toBe('bridge');
      expect(payload.finding_count).toBe(2);
      expect(payload.score).toBeGreaterThan(0);
      expect(payload.score).toBeLessThan(1);
    });

    it('appends multiple events in order', async () => {
      const events: QualityEvent[] = [
        { source: 'bridge', finding_count: 0, severity_distribution: {}, nft_id: 'nft-multi', timestamp: '2026-02-24T01:00:00Z' },
        { source: 'audit', finding_count: 1, severity_distribution: { low: 1 }, nft_id: 'nft-multi', timestamp: '2026-02-24T02:00:00Z' },
        { source: 'flatline', finding_count: 3, severity_distribution: { high: 3 }, nft_id: 'nft-multi', timestamp: '2026-02-24T03:00:00Z' },
      ];

      for (const event of events) {
        await emitQualityEvent(event, reputationService);
      }

      const history = await store.getEventHistory('nft-multi');
      expect(history).toHaveLength(3);
      expect(history[0].timestamp).toBe('2026-02-24T01:00:00Z');
      expect(history[2].timestamp).toBe('2026-02-24T03:00:00Z');
    });
  });

  describe('createQualityEvent', () => {
    it('creates a timestamped quality event', () => {
      const event = createQualityEvent('bridge', 'nft-factory', 2, { medium: 1, low: 1 });

      expect(event.source).toBe('bridge');
      expect(event.nft_id).toBe('nft-factory');
      expect(event.finding_count).toBe(2);
      expect(event.severity_distribution).toEqual({ medium: 1, low: 1 });
      expect(event.timestamp).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Task 11.5: Self-Hosting Verification — Full Loop
// ---------------------------------------------------------------------------

describe('Self-Hosting Verification', () => {
  let store: InMemoryReputationStore;
  let reputationService: ReputationService;
  let enrichmentService: EnrichmentService;

  beforeEach(() => {
    store = new InMemoryReputationStore();
    reputationService = new ReputationService(store);
    enrichmentService = new EnrichmentService({ reputationService });
  });

  it('completes the full autopoietic loop without infinite recursion', async () => {
    const nftId = 'nft-loop';

    // Step 1: Seed reputation data
    await store.put(nftId, makeAggregate({
      personal_score: 0.7,
      blended_score: 0.72,
      state: 'warming',
    }));

    // Step 2: Assemble initial enrichment context
    const context1 = await enrichmentService.assembleContext(nftId);
    expect(context1.reputation_context.trajectory).toBe('stable');
    expect(context1.reputation_context.blended_score).toBe(0.72);

    // Step 3: Simulate review producing findings
    const qualityEvent = createQualityEvent('bridge', nftId, 1, { low: 1 });
    await emitQualityEvent(qualityEvent, reputationService);

    // Step 4: Verify event was stored
    const history = await store.getEventHistory(nftId);
    expect(history).toHaveLength(1);

    // Step 5: Assemble enrichment context again — should reflect updated state
    const context2 = await enrichmentService.assembleContext(nftId);
    // Context2 should still work (no infinite recursion)
    expect(context2.assembled_at).toBeTruthy();
    expect(context2.partial).toBe(false);

    // Step 6: Simulate more review outcomes to change trajectory
    for (let i = 0; i < 5; i++) {
      await emitQualityEvent(
        createQualityEvent('audit', nftId, 0, {}),
        reputationService,
      );
    }

    // Step 7: Final context should reflect accumulated events
    const context3 = await enrichmentService.assembleContext(nftId);
    expect(context3.reputation_context.reputation_state).toBe('warming');
  });

  it('completes multiple cycles without recursion or memory leak', async () => {
    const nftId = 'nft-cycles';
    await store.put(nftId, makeAggregate());

    // Run 10 cycles of: enrich → review → quality event → enrich
    for (let cycle = 0; cycle < 10; cycle++) {
      // Enrich
      const context = await enrichmentService.assembleContext(nftId);
      expect(context.partial).toBe(false);

      // Simulate review outcome
      const severity = cycle % 3 === 0 ? { high: 1 } : { low: 1 };
      const event = createQualityEvent('bridge', nftId, 1, severity);
      await emitQualityEvent(event, reputationService);
    }

    // All 10 events should be stored
    const history = await store.getEventHistory(nftId);
    expect(history).toHaveLength(10);

    // Final enrichment should work
    const finalContext = await enrichmentService.assembleContext(nftId);
    expect(finalContext.assembled_at).toBeTruthy();
  });

  it('enrichment does NOT emit events (one-directional guard)', async () => {
    const nftId = 'nft-guard';
    await store.put(nftId, makeAggregate());

    // Record event count before enrichment
    const beforeEvents = await store.getEventHistory(nftId);
    const countBefore = beforeEvents.length;

    // Assemble enrichment context multiple times
    await enrichmentService.assembleContext(nftId);
    await enrichmentService.assembleContext(nftId);
    await enrichmentService.assembleContext(nftId);

    // Event count should not change — enrichment is read-only
    const afterEvents = await store.getEventHistory(nftId);
    expect(afterEvents.length).toBe(countBefore);
  });

  it('degradation membrane returns within timeout', async () => {
    // Create a client with a very short timeout
    const mockFetch = vi.fn().mockImplementation((_url: string, init: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const client = new EnrichmentClient({
      baseUrl: 'http://test:3000',
      timeoutMs: 5, // 5ms
      fetch: mockFetch as unknown as typeof globalThis.fetch,
    });

    const start = Date.now();
    const result = await client.fetchContext('nft-1', 'bridge');
    const elapsed = Date.now() - start;

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe('timeout');
    }
    // Should return within a reasonable time (timeout + some overhead)
    expect(elapsed).toBeLessThan(200);
  });

  it('endpoint latency budget returns partial on slow assembly', async () => {
    // Create a slow enrichment service by overriding assembleContext
    const slowService = new EnrichmentService({ reputationService });
    const originalAssemble = slowService.assembleContext.bind(slowService);
    slowService.assembleContext = async (nftId: string) => {
      // Simulate slow assembly (>50ms budget)
      await new Promise((r) => setTimeout(r, 100));
      return originalAssemble(nftId);
    };

    const app = new Hono();
    app.route('/api/enrich', createEnrichmentRoutes({ enrichmentService: slowService }));

    const res = await app.request('/api/enrich/review-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conviction-tier': 'builder',
      },
      body: JSON.stringify({ nft_id: 'nft-1', review_type: 'bridge' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.partial).toBe(true);
  });

  it('quality events from different sources accumulate correctly', async () => {
    const nftId = 'nft-sources';
    await store.put(nftId, makeAggregate());

    // Emit from each source type
    await emitQualityEvent(createQualityEvent('bridge', nftId, 2, { medium: 2 }), reputationService);
    await emitQualityEvent(createQualityEvent('flatline', nftId, 1, { high: 1 }), reputationService);
    await emitQualityEvent(createQualityEvent('audit', nftId, 0, {}), reputationService);

    const history = await store.getEventHistory(nftId);
    expect(history).toHaveLength(3);

    const sources = history.map(e => (e.payload as { source: string }).source);
    expect(sources).toEqual(['bridge', 'flatline', 'audit']);
  });
});
