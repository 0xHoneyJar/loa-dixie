/**
 * Bridge Iteration 2 — Hardening Test Suite (Sprint 58)
 *
 * Covers all Bridgebuilder findings from the PR #8 review:
 * - Task 1.1: normalizeWallet fallback observability (HIGH #2)
 * - Task 1.2: Legacy error handler deprecation warning (HIGH #1)
 * - Task 1.3: Enrichment service cardinality guard (MEDIUM #3)
 * - Task 1.4: Agent route validation constants (MEDIUM #4)
 *
 * @since Sprint 58 — Correctness & Security Hardening (Bridge Iter 2)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeWallet } from '../../src/utils/normalize-wallet.js';
import { handleRouteError } from '../../src/utils/error-handler.js';
import { BffError } from '../../src/errors.js';
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
import {
  AGENT_QUERY_MAX_LENGTH,
  AGENT_MAX_TOKENS_MIN,
  AGENT_MAX_TOKENS_MAX,
  AGENT_KNOWLEDGE_DOMAIN_MAX_LENGTH,
} from '../../src/validation.js';

// ─── Task 1.1: normalizeWallet Fallback Observability ─────────────────

describe('Task 1.1: normalizeWallet fallback observability', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('emits warning for valid-looking Ethereum address that fails checksum', () => {
    // 42-char hex address starting with 0x — looks valid but may use non-standard encoding
    const fakeValidAddress = '0x' + 'g'.repeat(40); // 'g' is not valid hex, will fail checksum
    normalizeWallet(fakeValidAddress);
    expect(warnSpy).toHaveBeenCalledWith(
      '[wallet-normalization] checksum-fallback',
      expect.objectContaining({ prefix: fakeValidAddress.slice(0, 10) }),
    );
  });

  it('stays silent for short/test addresses (expected fallback)', () => {
    normalizeWallet('0xshort');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('stays silent for non-0x addresses', () => {
    normalizeWallet('not-a-wallet');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not warn for valid checksummed addresses', () => {
    // A real Ethereum address that checksumAddress can handle
    normalizeWallet('0x0000000000000000000000000000000000000000');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

// ─── Task 1.2: Legacy Error Handler Deprecation Warning ───────────────

describe('Task 1.2: handleRouteError legacy deprecation warning', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  const mockContext = {
    json: vi.fn((data: unknown, status: number) => ({ data, status })),
  };

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockContext.json.mockClear();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('emits deprecation warning for legacy error objects', () => {
    const legacyErr = { status: 422, body: { error: 'validation', message: 'bad input' } };
    handleRouteError(mockContext, legacyErr);
    expect(warnSpy).toHaveBeenCalledWith(
      '[error-handler] legacy error pattern',
      expect.objectContaining({ status: 422 }),
    );
  });

  it('does NOT emit warning for BffError instances', () => {
    const bffErr = new BffError(400, { error: 'bad_request', message: 'test' });
    handleRouteError(mockContext, bffErr);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT emit warning for generic Error instances', () => {
    handleRouteError(mockContext, new Error('generic'));
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('legacy branch still returns correct status and body', () => {
    const legacyErr = { status: 409, body: { error: 'conflict', message: 'duplicate' } };
    handleRouteError(mockContext, legacyErr);
    expect(mockContext.json).toHaveBeenCalledWith(legacyErr.body, 409);
  });
});

// ─── Task 1.3: Enrichment Service Cardinality Guard ───────────────────

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

describe('Task 1.3: Enrichment service cardinality guard', () => {
  it('falls back to estimation when aggregates exceed MAX_SCAN_SIZE', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const store = new InMemoryReputationStore();
    // Mock listAll to return more than MAX_SCAN_SIZE entries
    const bigList = Array.from({ length: EnrichmentService.MAX_SCAN_SIZE + 1 }, (_, i) => ({
      nftId: `nft-${i}`,
      aggregate: makeAggregate({ state: 'cold' }),
    }));
    vi.spyOn(store, 'listAll').mockResolvedValue(bigList);

    const reputationService = new ReputationService(store);
    const enrichmentService = new EnrichmentService({
      reputationService,
      conformanceMetrics: stubConformance(),
      knowledgeMetrics: stubKnowledge(),
    });

    const ctx = await enrichmentService.assembleContext('nft-test');

    // Should use percentage estimation, not iterate all entries
    expect(warnSpy).toHaveBeenCalledWith(
      '[enrichment] tier-distribution scan exceeds cardinality limit',
      expect.objectContaining({ count: EnrichmentService.MAX_SCAN_SIZE + 1 }),
    );

    // Estimation should produce non-zero distribution
    const dist = ctx.conviction_context.tier_distribution;
    expect(dist.observer).toBeGreaterThan(0);
    expect(dist.participant).toBeGreaterThan(0);

    warnSpy.mockRestore();
  });

  it('MAX_SCAN_SIZE is 10000', () => {
    expect(EnrichmentService.MAX_SCAN_SIZE).toBe(10_000);
  });
});

// ─── Task 1.4: Agent Validation Constants ─────────────────────────────

describe('Task 1.4: Agent route validation constants', () => {
  it('AGENT_QUERY_MAX_LENGTH is 10000', () => {
    expect(AGENT_QUERY_MAX_LENGTH).toBe(10_000);
  });

  it('AGENT_MAX_TOKENS range is 1-4096', () => {
    expect(AGENT_MAX_TOKENS_MIN).toBe(1);
    expect(AGENT_MAX_TOKENS_MAX).toBe(4_096);
  });

  it('AGENT_KNOWLEDGE_DOMAIN_MAX_LENGTH is 100', () => {
    expect(AGENT_KNOWLEDGE_DOMAIN_MAX_LENGTH).toBe(100);
  });

  it('constants are numbers (not strings)', () => {
    expect(typeof AGENT_QUERY_MAX_LENGTH).toBe('number');
    expect(typeof AGENT_MAX_TOKENS_MIN).toBe('number');
    expect(typeof AGENT_MAX_TOKENS_MAX).toBe('number');
    expect(typeof AGENT_KNOWLEDGE_DOMAIN_MAX_LENGTH).toBe('number');
  });
});
