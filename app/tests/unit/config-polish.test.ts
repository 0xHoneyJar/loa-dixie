// Sprint-organized test file. When sprint structure stabilizes, consider
// consolidating into domain-organized files (e.g., config.test.ts,
// enrichment.test.ts) for cross-sprint coverage of the same domain.
/**
 * Configuration & Protocol Polish Test Suite — Sprint 57 (Global)
 *
 * Covers:
 * - Task 3.1: Autonomous permission TTL configuration
 * - Task 3.3: CircuitState protocol mapping in health responses
 * - Task 3.4: Tier distribution accuracy from reputation store scan
 *
 * @since Sprint 57 — Configuration Consolidation & Protocol Polish
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config.js';
import {
  createHealthRoutes,
  resetHealthCache,
} from '../../src/routes/health.js';
import { FinnClient } from '../../src/proxy/finn-client.js';
import { toProtocolCircuitState, fromProtocolCircuitState } from '../../src/types.js';
import {
  EnrichmentService,
} from '../../src/services/enrichment-service.js';
import type {
  ConformanceMetricsSource,
  KnowledgeMetricsSource,
} from '../../src/services/enrichment-service.js';
import {
  ReputationService,
  InMemoryReputationStore,
} from '../../src/services/reputation-service.js';
import type { ReputationAggregate } from '../../src/services/reputation-service.js';

// ─── Task 3.1: Autonomous Permission TTL Configuration ───────────────

describe('Task 3.1: Autonomous permission TTL configuration', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
    process.env.FINN_URL = 'http://localhost:4000';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = original;
  });

  it('defaults autonomousPermissionTtlSec to 300', () => {
    const config = loadConfig();
    expect(config.autonomousPermissionTtlSec).toBe(300);
  });

  it('reads DIXIE_AUTONOMOUS_PERMISSION_TTL from env', () => {
    process.env.DIXIE_AUTONOMOUS_PERMISSION_TTL = '120';
    const config = loadConfig();
    expect(config.autonomousPermissionTtlSec).toBe(120);
  });

  it('autonomousPermissionTtlSec is independent from convictionTierTtlSec', () => {
    process.env.DIXIE_CONVICTION_TIER_TTL = '600';
    process.env.DIXIE_AUTONOMOUS_PERMISSION_TTL = '60';
    const config = loadConfig();
    expect(config.convictionTierTtlSec).toBe(600);
    expect(config.autonomousPermissionTtlSec).toBe(60);
  });
});

// ─── Task 3.3: CircuitState Protocol Mapping ─────────────────────────

describe('Task 3.3: CircuitState protocol mapping', () => {
  it('toProtocolCircuitState maps half-open to half_open', () => {
    expect(toProtocolCircuitState('half-open')).toBe('half_open');
  });

  it('toProtocolCircuitState passes through closed', () => {
    expect(toProtocolCircuitState('closed')).toBe('closed');
  });

  it('toProtocolCircuitState passes through open', () => {
    expect(toProtocolCircuitState('open')).toBe('open');
  });

  it('fromProtocolCircuitState reverses half_open to half-open', () => {
    expect(fromProtocolCircuitState('half_open')).toBe('half-open');
  });

  it('health response includes circuit_state in snake_case', async () => {
    resetHealthCache();
    const finnClient = new FinnClient('http://finn:4000');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const app = createHealthRoutes({ finnClient });
    const res = await app.request('/');
    const body = await res.json();

    expect(res.status).toBe(200);
    // Circuit state should be present and use snake_case (protocol format)
    expect(body.services.loa_finn.circuit_state).toBe('closed');
    // Verify it's not kebab-case
    expect(body.services.loa_finn.circuit_state).not.toBe('half-open');
  });
});

// ─── Task 3.4: Tier Distribution Accuracy ────────────────────────────

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
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function stubConformance(): ConformanceMetricsSource {
  return {
    getViolationRate: () => 0,
    getTopViolatedSchemas: () => [],
    getSampleRate: () => 1,
    getTotalViolations: () => 0,
  };
}

function stubKnowledge(): KnowledgeMetricsSource {
  return {
    getActiveVoteCount: () => 0,
    getTopPriorities: () => [],
  };
}

describe('Task 3.4: Tier distribution accuracy', () => {
  let store: InMemoryReputationStore;
  let reputationService: ReputationService;
  let enrichmentService: EnrichmentService;

  beforeEach(() => {
    store = new InMemoryReputationStore();
    reputationService = new ReputationService(store);
    enrichmentService = new EnrichmentService({
      reputationService,
      conformanceMetrics: stubConformance(),
      knowledgeMetrics: stubKnowledge(),
    });
  });

  it('returns zero distribution when store is empty', async () => {
    const ctx = await enrichmentService.assembleContext('nft-test');
    expect(ctx.conviction_context.tier_distribution.observer).toBe(0);
    expect(ctx.conviction_context.tier_distribution.sovereign).toBe(0);
  });

  it('maps cold aggregates to observer tier', async () => {
    await store.put('nft-1', makeAggregate({ state: 'cold' }));
    await store.put('nft-2', makeAggregate({ state: 'cold' }));

    const ctx = await enrichmentService.assembleContext('nft-test');
    expect(ctx.conviction_context.tier_distribution.observer).toBe(2);
    expect(ctx.conviction_context.tier_distribution.participant).toBe(0);
  });

  it('maps warming aggregates to participant tier', async () => {
    await store.put('nft-1', makeAggregate({ state: 'warming' }));

    const ctx = await enrichmentService.assembleContext('nft-test');
    expect(ctx.conviction_context.tier_distribution.participant).toBe(1);
  });

  it('maps established aggregates to builder or architect by blended score', async () => {
    await store.put('nft-1', makeAggregate({ state: 'established', blended_score: 0.5 }));
    await store.put('nft-2', makeAggregate({ state: 'established', blended_score: 0.8 }));

    const ctx = await enrichmentService.assembleContext('nft-test');
    expect(ctx.conviction_context.tier_distribution.builder).toBe(1);
    expect(ctx.conviction_context.tier_distribution.architect).toBe(1);
  });

  it('maps authoritative aggregates to sovereign tier', async () => {
    await store.put('nft-1', makeAggregate({ state: 'authoritative' }));

    const ctx = await enrichmentService.assembleContext('nft-test');
    expect(ctx.conviction_context.tier_distribution.sovereign).toBe(1);
  });

  it('caches distribution for 5 minutes', async () => {
    await store.put('nft-1', makeAggregate({ state: 'cold' }));

    const ctx1 = await enrichmentService.assembleContext('nft-test');
    expect(ctx1.conviction_context.tier_distribution.observer).toBe(1);

    // Add more aggregates — should still return cached value
    await store.put('nft-2', makeAggregate({ state: 'warming' }));

    const ctx2 = await enrichmentService.assembleContext('nft-test');
    // Cached — participant should still be 0
    expect(ctx2.conviction_context.tier_distribution.participant).toBe(0);
  });
});
