import { describe, it, expect } from 'vitest';
import {
  evaluateEconomicBoundaryForWallet,
  buildConvictionDenialResponse,
  getTierTrustProfile,
  TIER_TRUST_PROFILES,
  DEFAULT_CRITERIA,
  CONVICTION_ACCESS_MATRIX,
  CONVICTION_ACCESS_MATRIX_ORIGIN,
} from '../../src/services/conviction-boundary.js';
import type { ConvictionTier } from '../../src/types/conviction.js';
import { TIER_ORDER } from '../../src/types/conviction.js';

describe('conviction-boundary', () => {
  describe('TIER_TRUST_PROFILES', () => {
    it('maps observer to cold/0.0', () => {
      const profile = getTierTrustProfile('observer');
      expect(profile.blended_score).toBe(0.0);
      expect(profile.reputation_state).toBe('cold');
    });

    it('maps participant to warming/0.2', () => {
      const profile = getTierTrustProfile('participant');
      expect(profile.blended_score).toBe(0.2);
      expect(profile.reputation_state).toBe('warming');
    });

    it('maps builder to established/0.5', () => {
      const profile = getTierTrustProfile('builder');
      expect(profile.blended_score).toBe(0.5);
      expect(profile.reputation_state).toBe('established');
    });

    it('maps architect to established/0.8', () => {
      const profile = getTierTrustProfile('architect');
      expect(profile.blended_score).toBe(0.8);
      expect(profile.reputation_state).toBe('established');
    });

    it('maps sovereign to authoritative/1.0', () => {
      const profile = getTierTrustProfile('sovereign');
      expect(profile.blended_score).toBe(1.0);
      expect(profile.reputation_state).toBe('authoritative');
    });

    it('covers all 5 tiers', () => {
      expect(Object.keys(TIER_TRUST_PROFILES)).toHaveLength(5);
    });
  });

  describe('evaluateEconomicBoundaryForWallet', () => {
    it('grants access for builder with sufficient trust', () => {
      const result = evaluateEconomicBoundaryForWallet('0xabc123', 'builder', 100);
      expect(result.access_decision.granted).toBe(true);
      expect(result.trust_evaluation.passed).toBe(true);
      expect(result.capital_evaluation.passed).toBe(true);
    });

    it('denies access for observer with default criteria', () => {
      const result = evaluateEconomicBoundaryForWallet('0xabc123', 'observer', 100);
      expect(result.access_decision.granted).toBe(false);
      expect(result.denial_codes).toBeDefined();
      expect(result.denial_codes).toContain('TRUST_SCORE_BELOW_THRESHOLD');
      expect(result.denial_codes).toContain('TRUST_STATE_BELOW_THRESHOLD');
    });

    it('includes boundary_id with wallet prefix', () => {
      const result = evaluateEconomicBoundaryForWallet('0xdeadbeef', 'builder', 100);
      expect(result.boundary_id).toBe('wallet:0xdeadbeef');
    });

    it('includes evaluation_gap for denied access', () => {
      const result = evaluateEconomicBoundaryForWallet('0xabc', 'observer', 100);
      expect(result.evaluation_gap).toBeDefined();
      expect(result.evaluation_gap!.trust_score_gap).toBeGreaterThan(0);
    });

    it('accepts string budget format', () => {
      const result = evaluateEconomicBoundaryForWallet('0xabc', 'builder', '1000000');
      expect(result.access_decision.granted).toBe(true);
      expect(result.capital_evaluation.actual_budget).toBe('1000000');
    });

    it('accepts custom criteria', () => {
      const strictCriteria = {
        min_trust_score: 0.9,
        min_reputation_state: 'authoritative' as const,
        min_available_budget: '0',
      };
      const result = evaluateEconomicBoundaryForWallet('0xabc', 'builder', 100, strictCriteria);
      expect(result.access_decision.granted).toBe(false);
      expect(result.criteria_used.min_trust_score).toBe(0.9);
    });

    it('sovereign passes default criteria', () => {
      const result = evaluateEconomicBoundaryForWallet('0xsov', 'sovereign', 100);
      expect(result.access_decision.granted).toBe(true);
    });

    it('participant does not pass default criteria (trust score 0.2 < 0.3 min)', () => {
      const result = evaluateEconomicBoundaryForWallet('0xpart', 'participant', 100);
      expect(result.access_decision.granted).toBe(false);
      expect(result.denial_codes).toContain('TRUST_SCORE_BELOW_THRESHOLD');
    });

    it('returns deterministic results for same inputs', () => {
      const r1 = evaluateEconomicBoundaryForWallet('0xabc', 'observer', 100);
      const r2 = evaluateEconomicBoundaryForWallet('0xabc', 'observer', 100);
      expect(r1.access_decision.granted).toBe(r2.access_decision.granted);
      expect(r1.denial_codes).toEqual(r2.denial_codes);
    });
  });

  describe('buildConvictionDenialResponse', () => {
    it('includes denial_codes for tier gap', () => {
      const response = buildConvictionDenialResponse('observer', 'architect', 'Test denial');
      expect(response.error).toBe('forbidden');
      expect(response.message).toBe('Test denial');
      expect(response.actual_tier).toBe('observer');
      expect(response.required_tier).toBe('architect');
      expect(response.denial_codes).toContain('TRUST_SCORE_BELOW_THRESHOLD');
      expect(response.denial_codes).toContain('TRUST_STATE_BELOW_THRESHOLD');
    });

    it('includes trust_score_gap in evaluation_gap', () => {
      const response = buildConvictionDenialResponse('observer', 'builder', 'Need builder');
      expect(response.evaluation_gap.trust_score_gap).toBe(0.5); // builder (0.5) - observer (0.0)
    });

    it('includes reputation_state_gap in evaluation_gap', () => {
      const response = buildConvictionDenialResponse('observer', 'sovereign', 'Need sovereign');
      // cold(0) → authoritative(3) = gap of 3
      expect(response.evaluation_gap.reputation_state_gap).toBe(3);
    });

    it('handles same-state but different score gap', () => {
      // builder (established/0.5) vs architect (established/0.8)
      const response = buildConvictionDenialResponse('builder', 'architect', 'Need architect');
      expect(response.denial_codes).toContain('TRUST_SCORE_BELOW_THRESHOLD');
      // Both are 'established', so no state gap
      expect(response.denial_codes).not.toContain('TRUST_STATE_BELOW_THRESHOLD');
      expect(response.evaluation_gap.trust_score_gap).toBeCloseTo(0.3);
    });

    it('returns empty denial_codes when tiers match trust profile', () => {
      // Theoretically if actual meets required on all dimensions
      // participant (warming/0.2) vs participant (warming/0.2) — should have no gaps
      const response = buildConvictionDenialResponse('participant', 'participant', 'Same tier');
      expect(response.denial_codes).toHaveLength(0);
    });
  });

  describe('DEFAULT_CRITERIA', () => {
    it('has expected default values', () => {
      expect(DEFAULT_CRITERIA.min_trust_score).toBe(0.3);
      expect(DEFAULT_CRITERIA.min_reputation_state).toBe('warming');
      expect(DEFAULT_CRITERIA.min_available_budget).toBe('0');
    });
  });

  // ─── Governance Annotation (Sprint 64 — Task 5.1) ─────────────────────
  describe('CONVICTION_ACCESS_MATRIX_ORIGIN', () => {
    it('has genesis origin annotation', () => {
      expect(CONVICTION_ACCESS_MATRIX_ORIGIN).toBeDefined();
      expect(CONVICTION_ACCESS_MATRIX_ORIGIN.origin).toBe('genesis');
      expect(CONVICTION_ACCESS_MATRIX_ORIGIN.enacted_at).toBeUndefined();
      expect(CONVICTION_ACCESS_MATRIX_ORIGIN.enacted_by).toBeUndefined();
    });
  });

  // ─── Matrix Conformance (Sprint 64 — Task 5.4) ────────────────────────
  // Verifies the CONVICTION_ACCESS_MATRIX is internally consistent with
  // TIER_TRUST_PROFILES and DEFAULT_CRITERIA. Guards against silent drift
  // between the matrix declaration and the actual evaluation logic.
  describe('CONVICTION_ACCESS_MATRIX conformance', () => {
    const stateOrder = ['cold', 'warming', 'established', 'authoritative'] as const;

    it.each(TIER_ORDER)('tier %s: matrix trust_score matches TIER_TRUST_PROFILES', (tier: ConvictionTier) => {
      const matrixEntry = CONVICTION_ACCESS_MATRIX[tier];
      const profile = TIER_TRUST_PROFILES[tier];
      expect(matrixEntry.trust_score).toBe(profile.blended_score);
    });

    it.each(TIER_ORDER)('tier %s: matrix reputation_state matches TIER_TRUST_PROFILES', (tier: ConvictionTier) => {
      const matrixEntry = CONVICTION_ACCESS_MATRIX[tier];
      const profile = TIER_TRUST_PROFILES[tier];
      expect(matrixEntry.reputation_state).toBe(profile.reputation_state);
    });

    it.each(TIER_ORDER)('tier %s: passes_economic_boundary matches evaluation result', (tier: ConvictionTier) => {
      const matrixEntry = CONVICTION_ACCESS_MATRIX[tier];
      const profile = TIER_TRUST_PROFILES[tier];

      // Replicate the economic boundary pass/fail logic from DEFAULT_CRITERIA
      const meetsScore = profile.blended_score >= DEFAULT_CRITERIA.min_trust_score;
      const meetsState = stateOrder.indexOf(profile.reputation_state) >=
        stateOrder.indexOf(DEFAULT_CRITERIA.min_reputation_state as typeof stateOrder[number]);
      const expectedPass = meetsScore && meetsState;

      expect(matrixEntry.passes_economic_boundary).toBe(expectedPass);
    });
  });
});
