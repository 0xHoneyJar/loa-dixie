/**
 * Sprint 6: Reputation Activation & Denial Code Evolution
 *
 * Tests for:
 * - Task 6.1: ReputationStore persistence layer (InMemoryReputationStore CRUD)
 * - Task 6.2: ReputationService wired to health + conviction boundary blending
 * - Task 6.3: Structured denial code mapping in translateReason
 * - Task 6.5: Reputation-gated access policy end-to-end test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ReputationService,
  InMemoryReputationStore,
} from '../../src/services/reputation-service.js';
import type {
  ReputationStore,
  ReputationAggregate,
} from '../../src/services/reputation-service.js';
import {
  evaluateEconomicBoundaryForWallet,
  getTierTrustProfile,
} from '../../src/services/conviction-boundary.js';
import type { EconomicBoundaryOptions } from '../../src/services/conviction-boundary.js';
import {
  DENIAL_CODE_MAP,
  ALLOWED_CODE_MAP,
  _translateReasonForTesting as translateReason,
  resetTranslateReasonFallbackCount,
  getTranslateReasonFallbackCount,
} from '../../src/services/memory-auth.js';
import { createHealthRoutes, resetHealthCache } from '../../src/routes/health.js';
import { FinnClient } from '../../src/proxy/finn-client.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

function makeAggregate(overrides: Partial<ReputationAggregate> = {}): ReputationAggregate {
  return {
    personality_id: 'p-test',
    collection_id: 'c-test',
    pool_id: 'pool-test',
    state: 'established',
    personal_score: 0.85,
    collection_score: 0.7,
    blended_score: 0.78,
    sample_count: 30,
    pseudo_count: 10,
    contributor_count: 8,
    min_sample_count: 10,
    created_at: '2026-01-01T00:00:00Z',
    last_updated: '2026-02-20T00:00:00Z',
    transition_history: [],
    model_cohorts: [
      { model_id: 'native', personal_score: 0.85, sample_count: 30, last_updated: '2026-02-20T00:00:00Z' },
    ],
    contract_version: '7.9.2',
    ...overrides,
  };
}

function makeColdAggregate(): ReputationAggregate {
  return makeAggregate({
    state: 'cold',
    personal_score: null,
    blended_score: 0.7,
    sample_count: 0,
    contributor_count: 0,
  });
}

// ─── Task 6.1: ReputationStore Persistence Layer ────────────────────────────

describe('Task 6.1: InMemoryReputationStore', () => {
  let store: InMemoryReputationStore;

  beforeEach(() => {
    store = new InMemoryReputationStore();
  });

  it('starts empty', () => {
    expect(store.count()).toBe(0);
    expect(store.get('nft-1')).toBeUndefined();
  });

  it('put + get round-trips an aggregate', () => {
    const agg = makeAggregate();
    store.put('nft-1', agg);
    expect(store.get('nft-1')).toBe(agg);
    expect(store.count()).toBe(1);
  });

  it('put overwrites existing aggregate', () => {
    const agg1 = makeAggregate({ personal_score: 0.5 });
    const agg2 = makeAggregate({ personal_score: 0.9 });
    store.put('nft-1', agg1);
    store.put('nft-1', agg2);
    expect(store.get('nft-1')!.personal_score).toBe(0.9);
    expect(store.count()).toBe(1);
  });

  it('stores multiple aggregates independently', () => {
    store.put('nft-1', makeAggregate({ personality_id: 'p1' }));
    store.put('nft-2', makeAggregate({ personality_id: 'p2' }));
    expect(store.count()).toBe(2);
    expect(store.get('nft-1')!.personality_id).toBe('p1');
    expect(store.get('nft-2')!.personality_id).toBe('p2');
  });

  it('listCold returns only cold aggregates', () => {
    store.put('nft-warm', makeAggregate({ state: 'warming' }));
    store.put('nft-cold-1', makeColdAggregate());
    store.put('nft-established', makeAggregate({ state: 'established' }));
    store.put('nft-cold-2', makeColdAggregate());

    const cold = store.listCold();
    expect(cold).toHaveLength(2);
    expect(cold.map(c => c.nftId).sort()).toEqual(['nft-cold-1', 'nft-cold-2']);
  });

  it('listCold returns empty array when no cold aggregates', () => {
    store.put('nft-1', makeAggregate({ state: 'established' }));
    expect(store.listCold()).toHaveLength(0);
  });

  it('clear removes all aggregates', () => {
    store.put('nft-1', makeAggregate());
    store.put('nft-2', makeAggregate());
    store.clear();
    expect(store.count()).toBe(0);
    expect(store.get('nft-1')).toBeUndefined();
  });
});

describe('Task 6.1: ReputationService with store', () => {
  it('accepts a store via constructor injection', () => {
    const store = new InMemoryReputationStore();
    const service = new ReputationService(store);
    expect(service.store).toBe(store);
  });

  it('defaults to InMemoryReputationStore when no store provided', () => {
    const service = new ReputationService();
    expect(service.store).toBeInstanceOf(InMemoryReputationStore);
    expect(service.store.count()).toBe(0);
  });

  it('preserves all existing computation methods', () => {
    const service = new ReputationService();

    // computeBlended still works
    const blended = service.computeBlended({
      personalScore: 0.9,
      collectionScore: 0.5,
      sampleCount: 10,
      pseudoCount: 10,
    });
    expect(blended).toBeCloseTo(0.7, 5);

    // isValidTransition still works
    expect(service.isValidTransition('cold', 'warming')).toBe(true);
  });

  it('implements ReputationStore interface contract', () => {
    const store = new InMemoryReputationStore();
    // Verify the store satisfies the interface
    const iface: ReputationStore = store;
    expect(typeof iface.get).toBe('function');
    expect(typeof iface.put).toBe('function');
    expect(typeof iface.listCold).toBe('function');
    expect(typeof iface.count).toBe('function');
  });
});

// ─── Task 6.2: Health Endpoint + Conviction Boundary Blending ───────────────

describe('Task 6.2: Health endpoint reputation_service status', () => {
  let finnClient: FinnClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetHealthCache();
    finnClient = new FinnClient('http://finn:4000');
  });

  it('includes reputation_service in health response when provided', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const repService = new ReputationService();
    repService.store.put('nft-1', makeAggregate());
    repService.store.put('nft-2', makeAggregate());

    const app = createHealthRoutes({ finnClient, reputationService: repService });
    const res = await app.request('/');
    const body = await res.json();

    expect(body.reputation_service).toBeDefined();
    expect(body.reputation_service.initialized).toBe(true);
    expect(body.reputation_service.aggregate_count).toBe(2);
  });

  it('omits reputation_service when not provided', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const app = createHealthRoutes({ finnClient });
    const res = await app.request('/');
    const body = await res.json();

    expect(body.reputation_service).toBeUndefined();
  });

  it('reports aggregate_count of 0 when store is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const repService = new ReputationService();
    const app = createHealthRoutes({ finnClient, reputationService: repService });
    const res = await app.request('/');
    const body = await res.json();

    expect(body.reputation_service.initialized).toBe(true);
    expect(body.reputation_service.aggregate_count).toBe(0);
  });
});

describe('Task 6.2: Conviction boundary reputation blending', () => {
  it('uses tier-based score when no reputation aggregate provided (cold start)', () => {
    const result = evaluateEconomicBoundaryForWallet('0xabc', 'builder', 100);
    const profile = getTierTrustProfile('builder');
    expect(result.trust_evaluation.actual_score).toBe(profile.blended_score);
  });

  it('blends personal score with tier prior when aggregate provided', () => {
    const aggregate = makeAggregate({
      personal_score: 0.95,
      sample_count: 50,
      pseudo_count: 10,
      state: 'authoritative',
    });

    const opts: EconomicBoundaryOptions = { reputationAggregate: aggregate };
    const result = evaluateEconomicBoundaryForWallet('0xabc', 'builder', 100, opts);

    // Builder tier score is 0.5. With personal_score=0.95, sample=50, pseudo=10:
    // blended = (10*0.5 + 50*0.95) / (10+50) = (5 + 47.5) / 60 = 52.5/60 = 0.875
    expect(result.trust_evaluation.actual_score).toBeCloseTo(0.875, 2);
    expect(result.access_decision.granted).toBe(true);
  });

  it('falls back to tier score when aggregate has null personal_score', () => {
    const coldAggregate = makeColdAggregate();
    const opts: EconomicBoundaryOptions = { reputationAggregate: coldAggregate };
    const result = evaluateEconomicBoundaryForWallet('0xabc', 'builder', 100, opts);

    const profile = getTierTrustProfile('builder');
    expect(result.trust_evaluation.actual_score).toBe(profile.blended_score);
  });

  it('falls back to tier score when aggregate is null', () => {
    const opts: EconomicBoundaryOptions = { reputationAggregate: null };
    const result = evaluateEconomicBoundaryForWallet('0xabc', 'builder', 100, opts);

    const profile = getTierTrustProfile('builder');
    expect(result.trust_evaluation.actual_score).toBe(profile.blended_score);
  });

  it('uses aggregate reputation state instead of tier state', () => {
    const aggregate = makeAggregate({
      personal_score: 0.9,
      state: 'authoritative',
      sample_count: 100,
      pseudo_count: 10,
    });

    const opts: EconomicBoundaryOptions = { reputationAggregate: aggregate };
    // participant normally has state 'warming', but aggregate overrides to 'authoritative'
    const result = evaluateEconomicBoundaryForWallet('0xabc', 'participant', 100, opts);

    // With authoritative state and high blended score, should pass
    // participant tier score is 0.2, personal is 0.9, sample=100, pseudo=10
    // blended = (10*0.2 + 100*0.9) / 110 = (2 + 90) / 110 = 0.836...
    expect(result.trust_evaluation.actual_score).toBeGreaterThan(0.8);
    expect(result.access_decision.granted).toBe(true);
  });

  it('backward compatible: direct QualificationCriteria still works', () => {
    const strictCriteria = {
      min_trust_score: 0.9,
      min_reputation_state: 'authoritative' as const,
      min_available_budget: '0',
    };
    const result = evaluateEconomicBoundaryForWallet('0xabc', 'builder', 100, strictCriteria);
    expect(result.access_decision.granted).toBe(false);
  });
});

// ─── Task 6.3: Structured Denial Code Mapping ──────────────────────────────

describe('Task 6.3: translateReason with structured denial codes', () => {
  beforeEach(() => {
    resetTranslateReasonFallbackCount();
  });

  describe('DENIAL_CODE_MAP completeness', () => {
    it('maps all expected denial codes', () => {
      expect(DENIAL_CODE_MAP).toHaveProperty('POLICY_NONE', 'access_policy_none');
      expect(DENIAL_CODE_MAP).toHaveProperty('READ_ONLY_NO_MODIFY', 'read_only_no_modify');
      expect(DENIAL_CODE_MAP).toHaveProperty('TIME_LIMITED_NO_MODIFY', 'time_limited_no_modify');
      expect(DENIAL_CODE_MAP).toHaveProperty('POLICY_EXPIRED', 'access_policy_expired');
      expect(DENIAL_CODE_MAP).toHaveProperty('NO_ROLE_PROVIDED', 'role_based_no_roles_provided');
      expect(DENIAL_CODE_MAP).toHaveProperty('ROLE_NOT_PERMITTED', 'role_based_insufficient_role');
    });

    it('maps reputation and compound denial codes', () => {
      expect(DENIAL_CODE_MAP).toHaveProperty('REPUTATION_BELOW_THRESHOLD', 'reputation_below_threshold');
      expect(DENIAL_CODE_MAP).toHaveProperty('COMPOUND_POLICY_DENIED', 'compound_policy_denied');
    });
  });

  describe('ALLOWED_CODE_MAP completeness', () => {
    it('maps all expected allowed codes', () => {
      expect(ALLOWED_CODE_MAP).toHaveProperty('READ_ONLY_PERMITTED', 'access_policy_read_only');
      expect(ALLOWED_CODE_MAP).toHaveProperty('TIME_LIMITED_PERMITTED', 'access_policy_time_limited');
      expect(ALLOWED_CODE_MAP).toHaveProperty('ROLE_BASED_PERMITTED', 'access_policy_role_based');
    });
  });

  describe('structured code path (denial_code provided)', () => {
    it('maps known denial code directly', () => {
      const result = translateReason(
        'some human-readable reason',
        false,
        'time_limited',
        'read',
        'POLICY_EXPIRED',
      );
      expect(result).toBe('access_policy_expired');
    });

    it('maps known allowed code directly', () => {
      const result = translateReason(
        'some reason',
        true,
        'read_only',
        'read',
        'READ_ONLY_PERMITTED',
      );
      expect(result).toBe('access_policy_read_only');
    });

    it('returns lowercase denial_code for unknown structured codes', () => {
      const result = translateReason(
        'some reason',
        false,
        'future_type',
        'read',
        'FUTURE_DENIAL_CODE',
      );
      expect(result).toBe('future_denial_code');
      expect(getTranslateReasonFallbackCount()).toBe(1);
    });

    it('prefers denial_code over substring matching', () => {
      // Even though reason string contains 'expired', denial_code takes precedence
      const result = translateReason(
        'Policy expired after 24h',
        false,
        'time_limited',
        'read',
        'READ_ONLY_NO_MODIFY',
      );
      // Should map via denial_code, not substring
      expect(result).toBe('read_only_no_modify');
    });
  });

  describe('legacy substring path (no denial_code)', () => {
    it('still works for none policy', () => {
      const result = translateReason('denied', false, 'none', 'read');
      expect(result).toBe('access_policy_none');
    });

    it('still works for expired time_limited', () => {
      const result = translateReason('Policy has expired', false, 'time_limited', 'read');
      expect(result).toBe('access_policy_expired');
    });

    it('still works for read_only allowed', () => {
      const result = translateReason('allowed', true, 'read_only', 'read');
      expect(result).toBe('access_policy_read_only');
    });

    it('falls back with counter increment for unrecognized reason', () => {
      const result = translateReason('completely new reason string', false, 'some_type', 'read');
      expect(result).toBe('unknown_access_policy_type');
      expect(getTranslateReasonFallbackCount()).toBe(1);
    });
  });
});

// ─── Task 6.5: End-to-End Reputation-Gated Access ──────────────────────────

describe('Task 6.5: Reputation-gated access policy end-to-end', () => {
  /**
   * Integration-style test:
   * wallet -> conviction tier -> reputation blended score ->
   * evaluateEconomicBoundary -> access decision
   */

  describe('cold start scenario (no reputation data)', () => {
    it('observer denied (cold state, 0.0 trust score)', () => {
      const result = evaluateEconomicBoundaryForWallet('0xcold', 'observer', 100);
      expect(result.access_decision.granted).toBe(false);
      expect(result.denial_codes).toContain('TRUST_SCORE_BELOW_THRESHOLD');
      expect(result.denial_codes).toContain('TRUST_STATE_BELOW_THRESHOLD');
    });

    it('builder granted (established state, 0.5 trust score)', () => {
      const result = evaluateEconomicBoundaryForWallet('0xcold', 'builder', 100);
      expect(result.access_decision.granted).toBe(true);
    });
  });

  describe('warm start scenario (established reputation aggregate)', () => {
    it('participant with high reputation upgrades to pass boundary', () => {
      // Participant normally has trust_score 0.2 and state 'warming'
      // With a strong reputation aggregate, the blended score should be high enough
      const aggregate = makeAggregate({
        personal_score: 0.9,
        state: 'established',
        sample_count: 100,
        pseudo_count: 10,
      });

      const opts: EconomicBoundaryOptions = { reputationAggregate: aggregate };
      const result = evaluateEconomicBoundaryForWallet('0xwarm', 'participant', 100, opts);

      // participant tier score = 0.2, personal = 0.9, n=100, k=10
      // blended = (10*0.2 + 100*0.9) / 110 = (2 + 90) / 110 ~ 0.836
      // state overridden to 'established' from aggregate
      // criteria: min_trust_score=0.3, min_reputation_state='warming'
      expect(result.access_decision.granted).toBe(true);
      expect(result.trust_evaluation.actual_score).toBeGreaterThan(0.3);
    });

    it('observer with moderate reputation still denied (state too low)', () => {
      // Observer has state 'cold'. Even with decent personal score,
      // if aggregate state is still 'cold', should be denied.
      const aggregate = makeAggregate({
        personal_score: 0.6,
        state: 'cold', // state hasn't transitioned yet
        sample_count: 5,
        pseudo_count: 10,
      });

      const opts: EconomicBoundaryOptions = { reputationAggregate: aggregate };
      const result = evaluateEconomicBoundaryForWallet('0xwarm', 'observer', 100, opts);

      // observer tier score = 0.0, personal = 0.6, n=5, k=10
      // blended = (10*0.0 + 5*0.6) / 15 = 3/15 = 0.2
      // state = 'cold' from aggregate
      // criteria: min_trust_score=0.3 -> blended 0.2 < 0.3 -> FAIL
      // criteria: min_reputation_state='warming' -> 'cold' < 'warming' -> FAIL
      expect(result.access_decision.granted).toBe(false);
    });
  });

  describe('transition scenario (cold -> warming -> established)', () => {
    it('tracks progression through reputation states', () => {
      const store = new InMemoryReputationStore();
      const service = new ReputationService(store);

      // Step 1: Cold start — no aggregate, use tier defaults
      const r1 = evaluateEconomicBoundaryForWallet('0xtrans', 'participant', 100);
      expect(r1.access_decision.granted).toBe(false); // participant score 0.2 < 0.3

      // Step 2: First observations — warming state, some personal data
      const warmingAgg = makeAggregate({
        state: 'warming',
        personal_score: 0.4,
        sample_count: 8,
        pseudo_count: 10,
      });
      store.put('nft-trans', warmingAgg);

      const opts2: EconomicBoundaryOptions = {
        reputationAggregate: store.get('nft-trans')!,
      };
      const r2 = evaluateEconomicBoundaryForWallet('0xtrans', 'participant', 100, opts2);
      // blended = (10*0.2 + 8*0.4) / 18 = (2 + 3.2) / 18 = 5.2/18 ~ 0.289
      // state = 'warming' (meets minimum)
      // score 0.289 < 0.3 -> still denied but closer
      expect(r2.access_decision.granted).toBe(false);

      // Step 3: Enough observations — established state, good personal score
      const establishedAgg = makeAggregate({
        state: 'established',
        personal_score: 0.8,
        sample_count: 30,
        pseudo_count: 10,
      });
      store.put('nft-trans', establishedAgg);

      const opts3: EconomicBoundaryOptions = {
        reputationAggregate: store.get('nft-trans')!,
      };
      const r3 = evaluateEconomicBoundaryForWallet('0xtrans', 'participant', 100, opts3);
      // blended = (10*0.2 + 30*0.8) / 40 = (2 + 24) / 40 = 26/40 = 0.65
      // state = 'established' (meets minimum)
      // score 0.65 > 0.3 -> granted!
      expect(r3.access_decision.granted).toBe(true);
      expect(r3.trust_evaluation.actual_score).toBeCloseTo(0.65, 2);

      // Verify store tracked the progression
      expect(store.count()).toBe(1);
      expect(store.get('nft-trans')!.state).toBe('established');
    });
  });
});
