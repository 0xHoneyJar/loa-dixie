/**
 * Feedback Dampening Migration — Shadow Comparison Tests
 *
 * Verifies behavioral equivalence between pre-migration local implementation
 * and the new canonical-backed configurable wrapper. Tests all ramp directions,
 * cold-start strategies, and dual-track scoring.
 *
 * Evidence base for the eventual switch from ascending to descending ramp
 * (ADR-005, hounfour #40).
 *
 * @since cycle-019 — Sprint 119, Task T4.6 (P1 canonical migration)
 */
import { describe, it, expect } from 'vitest';
import {
  computeDampenedScore,
  computeDualTrackScore,
  FEEDBACK_DAMPENING_ALPHA_MIN,
  FEEDBACK_DAMPENING_ALPHA_MAX,
  DAMPENING_RAMP_SAMPLES,
  DIXIE_DAMPENING_DEFAULTS,
  type FeedbackDampeningConfig,
  type DualTrackScoreResult,
} from '../reputation-scoring-engine.js';

// ---------------------------------------------------------------------------
// Helper: pre-migration local implementation (for regression comparison)
// ---------------------------------------------------------------------------

/** Exact replica of the pre-migration local computeDampenedScore. */
function legacyComputeDampenedScore(
  oldScore: number | null,
  newScore: number,
  sampleCount: number,
): number {
  if (oldScore === null) return newScore;
  const rampFraction = Math.min(1, sampleCount / 50);
  const alpha = 0.1 + (0.5 - 0.1) * rampFraction;
  return alpha * newScore + (1 - alpha) * oldScore;
}

// ---------------------------------------------------------------------------
// T4.6-1: Regression guard — ascending + direct = exact pre-migration behavior
// ---------------------------------------------------------------------------

describe('regression guard — ascending + direct matches legacy', () => {
  const config: FeedbackDampeningConfig = { rampDirection: 'ascending', coldStartStrategy: 'direct' };

  it('cold start returns newScore directly (matches legacy)', () => {
    for (const score of [0.0, 0.1, 0.5, 0.95, 1.0]) {
      expect(computeDampenedScore(null, score, 0, config)).toBe(legacyComputeDampenedScore(null, score, 0));
    }
  });

  it('steady-state at sampleCount=0 (matches legacy)', () => {
    const result = computeDampenedScore(0.5, 1.0, 0, config);
    const legacy = legacyComputeDampenedScore(0.5, 1.0, 0);
    expect(result).toBeCloseTo(legacy, 12);
  });

  it('steady-state at sampleCount=25 (mid-ramp, matches legacy)', () => {
    const result = computeDampenedScore(0.5, 1.0, 25, config);
    const legacy = legacyComputeDampenedScore(0.5, 1.0, 25);
    expect(result).toBeCloseTo(legacy, 12);
  });

  it('steady-state at sampleCount=RAMP (matches legacy)', () => {
    const result = computeDampenedScore(0.5, 1.0, DAMPENING_RAMP_SAMPLES, config);
    const legacy = legacyComputeDampenedScore(0.5, 1.0, DAMPENING_RAMP_SAMPLES);
    expect(result).toBeCloseTo(legacy, 12);
  });

  it('steady-state beyond RAMP (matches legacy)', () => {
    const result = computeDampenedScore(0.5, 1.0, DAMPENING_RAMP_SAMPLES * 5, config);
    const legacy = legacyComputeDampenedScore(0.5, 1.0, DAMPENING_RAMP_SAMPLES * 5);
    expect(result).toBeCloseTo(legacy, 12);
  });

  it('full event sequence produces identical trajectory to legacy', () => {
    let legacyScore: number | null = null;
    let newScore: number | null = null;
    const observations = [0.8, 0.6, 0.9, 0.7, 0.85, 0.5, 0.95, 0.3, 0.7, 0.8];

    for (let i = 0; i < observations.length; i++) {
      legacyScore = legacyComputeDampenedScore(legacyScore, observations[i], i);
      newScore = computeDampenedScore(newScore, observations[i], i, config);
      expect(newScore).toBeCloseTo(legacyScore, 12);
    }
  });

  it('default config (no config arg) matches legacy', () => {
    // computeDampenedScore with 3 args should use DIXIE_DAMPENING_DEFAULTS
    let legacyScore: number | null = null;
    let newScore: number | null = null;

    for (let i = 0; i < 20; i++) {
      const obs = 0.5 + 0.3 * Math.sin(i);
      legacyScore = legacyComputeDampenedScore(legacyScore, obs, i);
      newScore = computeDampenedScore(newScore, obs, i);
      expect(newScore).toBeCloseTo(legacyScore, 12);
    }
  });
});

// ---------------------------------------------------------------------------
// T4.6-2: Descending ramp convergence behavior
// ---------------------------------------------------------------------------

describe('descending ramp — responsive-first behavior', () => {
  const config: FeedbackDampeningConfig = { rampDirection: 'descending', coldStartStrategy: 'bayesian' };

  it('cold start uses Bayesian prior (pulls toward 0.5)', () => {
    // First observation of 0.95: pseudo_count=10, effectiveSamples=1
    // weight = 10 / (10 + 1) ≈ 0.909
    // result = 0.909 * 0.5 + 0.091 * 0.95 ≈ 0.541
    const result = computeDampenedScore(null, 0.95, 0, config);
    expect(result).toBeCloseTo(0.541, 2);
    expect(result).toBeLessThan(0.95); // Bayesian pulls down
    expect(result).toBeGreaterThan(0.5); // But influenced by observation
  });

  it('at sampleCount=0, alpha is high (responsive)', () => {
    // Descending: alpha starts at ALPHA_MAX (0.5)
    const result = computeDampenedScore(0.5, 1.0, 0, config);
    // alpha = 0.1 + (0.5 - 0.1) * (1 - 0) = 0.5
    // result = 0.5 + 0.5 * (1.0 - 0.5) = 0.75
    expect(result).toBeCloseTo(0.75, 5);
  });

  it('at sampleCount=RAMP, alpha is low (conservative)', () => {
    // Descending: alpha ends at ALPHA_MIN (0.1)
    const result = computeDampenedScore(0.5, 1.0, DAMPENING_RAMP_SAMPLES, config);
    // alpha = 0.1 + (0.5 - 0.1) * (1 - 1) = 0.1
    // result = 0.5 + 0.1 * (1.0 - 0.5) = 0.55
    expect(result).toBeCloseTo(0.55, 5);
  });

  it('descending converges faster initially than ascending', () => {
    const descConfig: FeedbackDampeningConfig = { rampDirection: 'descending', coldStartStrategy: 'direct' };
    const ascConfig: FeedbackDampeningConfig = { rampDirection: 'ascending', coldStartStrategy: 'direct' };

    // Both start cold with same observation
    let descScore = computeDampenedScore(null, 0.9, 0, descConfig); // = 0.9
    let ascScore = computeDampenedScore(null, 0.9, 0, ascConfig);   // = 0.9

    // After second observation (target 0.5), descending moves more
    descScore = computeDampenedScore(descScore, 0.5, 1, descConfig);
    ascScore = computeDampenedScore(ascScore, 0.5, 1, ascConfig);

    // Descending has higher alpha at n=1, so moves more toward 0.5
    expect(descScore).toBeLessThan(ascScore);
    // Both should be between 0.5 and 0.9
    expect(descScore).toBeGreaterThan(0.5);
    expect(ascScore).toBeGreaterThan(0.5);
    expect(descScore).toBeLessThan(0.9);
    expect(ascScore).toBeLessThan(0.9);
  });
});

// ---------------------------------------------------------------------------
// T4.6-3: Bayesian prior cold-start behavior
// ---------------------------------------------------------------------------

describe('bayesian cold-start strategy', () => {
  const config: FeedbackDampeningConfig = { rampDirection: 'ascending', coldStartStrategy: 'bayesian' };

  it('first observation at 0.95 produces ≈0.541 (pseudo_count=10)', () => {
    const result = computeDampenedScore(null, 0.95, 0, config);
    // weight = 10 / (10 + 1) ≈ 0.909
    // result = 0.909 * 0.5 + 0.091 * 0.95 ≈ 0.541
    expect(result).toBeCloseTo(0.541, 2);
  });

  it('first observation at 0.0 pulls up toward 0.5', () => {
    const result = computeDampenedScore(null, 0.0, 0, config);
    // weight = 10 / 11 ≈ 0.909
    // result = 0.909 * 0.5 + 0.091 * 0.0 ≈ 0.455
    expect(result).toBeCloseTo(0.455, 2);
    expect(result).toBeGreaterThan(0.0); // Pulled up toward 0.5
    expect(result).toBeLessThan(0.5);
  });

  it('first observation at 0.5 returns exactly 0.5', () => {
    const result = computeDampenedScore(null, 0.5, 0, config);
    expect(result).toBeCloseTo(0.5, 5);
  });

  it('higher sampleCount weakens prior influence', () => {
    // At sampleCount=0 (effectiveSamples=1): heavy prior
    const atZero = computeDampenedScore(null, 0.95, 0, config);
    // At sampleCount=50 (effectiveSamples=50): weak prior
    const atFifty = computeDampenedScore(null, 0.95, 50, config);

    // Both pulled toward 0.5, but atFifty is closer to 0.95
    expect(atFifty).toBeGreaterThan(atZero);
    expect(atFifty).toBeCloseTo(0.95 * (50 / 60) + 0.5 * (10 / 60), 2);
  });
});

// ---------------------------------------------------------------------------
// T4.6-4: Dual-track strategy correctness
// ---------------------------------------------------------------------------

describe('dual-track scoring', () => {
  it('cold start produces correct dual-track result', () => {
    const result: DualTrackScoreResult = computeDualTrackScore(null, 0.95, 0);

    // Internal: Bayesian prior ≈ 0.541
    expect(result.internalScore).toBeCloseTo(0.541, 2);

    // Display: direct observed = 0.95
    expect(result.displayScore).toBe(0.95);

    // Observation count = sampleCount + 1
    expect(result.observationCount).toBe(1);
  });

  it('warm state produces converging scores', () => {
    // After multiple observations, both scores should be similar
    let internal: number | null = null;
    let display: number | null = null;

    for (let i = 0; i < 100; i++) {
      const obs = 0.8;
      const result = computeDualTrackScore(
        internal ?? null,
        obs,
        i,
      );
      // After first iteration, use the appropriate scores going forward
      if (i === 0) {
        internal = result.internalScore;
        display = result.displayScore;
      } else {
        internal = computeDampenedScore(internal!, obs, i, {
          rampDirection: 'ascending',
          coldStartStrategy: 'bayesian',
        });
        display = computeDampenedScore(display!, obs, i, {
          rampDirection: 'ascending',
          coldStartStrategy: 'direct',
        });
      }
    }

    // After 100 observations of 0.8, both should be very close to 0.8
    expect(internal!).toBeCloseTo(0.8, 1);
    expect(display!).toBeCloseTo(0.8, 1);
    // And close to each other
    expect(Math.abs(internal! - display!)).toBeLessThan(0.05);
  });

  it('observationCount increments correctly', () => {
    expect(computeDualTrackScore(null, 0.5, 0).observationCount).toBe(1);
    expect(computeDualTrackScore(0.5, 0.6, 1).observationCount).toBe(2);
    expect(computeDualTrackScore(0.5, 0.6, 99).observationCount).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// T4.6-5: Edge cases — boundaries and special values
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('sampleCount=0 with non-null old score applies correct alpha', () => {
    // Ascending at n=0: alpha = ALPHA_MIN = 0.1
    const asc = computeDampenedScore(0.5, 1.0, 0, { rampDirection: 'ascending', coldStartStrategy: 'direct' });
    expect(asc).toBeCloseTo(0.5 + 0.1 * (1.0 - 0.5), 10);

    // Descending at n=0: alpha = ALPHA_MAX = 0.5
    const desc = computeDampenedScore(0.5, 1.0, 0, { rampDirection: 'descending', coldStartStrategy: 'direct' });
    expect(desc).toBeCloseTo(0.5 + 0.5 * (1.0 - 0.5), 10);
  });

  it('score boundaries (0 and 1) are handled correctly', () => {
    // Score = 0.0
    const low = computeDampenedScore(1.0, 0.0, 25);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(low).toBeLessThanOrEqual(1);

    // Score = 1.0
    const high = computeDampenedScore(0.0, 1.0, 25);
    expect(high).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(1);
  });

  it('switching ramp direction is safe (no score corruption)', () => {
    // Start with ascending, switch to descending mid-stream
    const ascConfig: FeedbackDampeningConfig = { rampDirection: 'ascending', coldStartStrategy: 'direct' };
    const descConfig: FeedbackDampeningConfig = { rampDirection: 'descending', coldStartStrategy: 'direct' };

    let score = computeDampenedScore(null, 0.8, 0, ascConfig); // cold start = 0.8

    // 5 ascending observations
    for (let i = 1; i <= 5; i++) {
      score = computeDampenedScore(score, 0.7, i, ascConfig);
    }
    const afterAscending = score;

    // Switch to descending for 5 more
    for (let i = 6; i <= 10; i++) {
      score = computeDampenedScore(score, 0.7, i, descConfig);
    }

    // Score should still be in valid range
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
    // Should continue trending toward 0.7
    expect(Math.abs(score - 0.7)).toBeLessThan(Math.abs(afterAscending - 0.7));
  });

  it('DIXIE_DAMPENING_DEFAULTS is ascending + direct', () => {
    expect(DIXIE_DAMPENING_DEFAULTS.rampDirection).toBe('ascending');
    expect(DIXIE_DAMPENING_DEFAULTS.coldStartStrategy).toBe('direct');
  });
});
