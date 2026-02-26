import { describe, it, expect } from 'vitest';
import {
  computeDampenedScore,
  computeDimensionalBlended,
  computeTaskAwareCrossModelScore,
  CollectionScoreAggregator,
  FEEDBACK_DAMPENING_ALPHA_MIN,
  FEEDBACK_DAMPENING_ALPHA_MAX,
  DAMPENING_RAMP_SAMPLES,
  DEFAULT_PSEUDO_COUNT,
  DEFAULT_COLLECTION_SCORE,
  TASK_MATCH_WEIGHT_MULTIPLIER,
} from '../reputation-scoring-engine.js';

/**
 * Dedicated unit tests for reputation-scoring-engine.ts — extracted per BB-DEEP-03.
 * Covers edge cases, boundary conditions, and NaN/Infinity guards.
 * @since cycle-014 Sprint 105 — S5-F10
 */

describe('computeDampenedScore — edge cases', () => {
  it('cold start (null old score) returns newScore directly', () => {
    expect(computeDampenedScore(null, 0.7, 0)).toBe(0.7);
    expect(computeDampenedScore(null, 0.0, 0)).toBe(0.0);
    expect(computeDampenedScore(null, 1.0, 0)).toBe(1.0);
  });

  it('same old and new score returns that score', () => {
    const score = computeDampenedScore(0.5, 0.5, 10);
    expect(score).toBe(0.5);
  });

  it('alpha ramps from MIN to MAX over DAMPENING_RAMP_SAMPLES', () => {
    // At sampleCount=0, alpha = ALPHA_MIN
    const atZero = computeDampenedScore(0.5, 1.0, 0);
    const expectedZero = FEEDBACK_DAMPENING_ALPHA_MIN * 1.0 + (1 - FEEDBACK_DAMPENING_ALPHA_MIN) * 0.5;
    expect(atZero).toBeCloseTo(expectedZero, 10);

    // At sampleCount=DAMPENING_RAMP_SAMPLES, alpha = ALPHA_MAX
    const atRamp = computeDampenedScore(0.5, 1.0, DAMPENING_RAMP_SAMPLES);
    const expectedRamp = FEEDBACK_DAMPENING_ALPHA_MAX * 1.0 + (1 - FEEDBACK_DAMPENING_ALPHA_MAX) * 0.5;
    expect(atRamp).toBeCloseTo(expectedRamp, 10);
  });

  it('sample count beyond ramp cap does not exceed ALPHA_MAX', () => {
    const atRamp = computeDampenedScore(0.5, 1.0, DAMPENING_RAMP_SAMPLES);
    const beyond = computeDampenedScore(0.5, 1.0, DAMPENING_RAMP_SAMPLES * 10);
    expect(beyond).toBe(atRamp);
  });

  it('result is always between old and new scores', () => {
    for (const sampleCount of [0, 5, 25, 50, 100]) {
      const result = computeDampenedScore(0.3, 0.8, sampleCount);
      expect(result).toBeGreaterThanOrEqual(0.3);
      expect(result).toBeLessThanOrEqual(0.8);
    }
  });
});

describe('computeDimensionalBlended', () => {
  it('handles empty dimensions', () => {
    const result = computeDimensionalBlended({}, undefined, 0, 0.5, 10);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('creates new dimensions when no existing', () => {
    const result = computeDimensionalBlended(
      { accuracy: 0.8, coherence: 0.9 },
      undefined,
      0,
      0.5,
      10,
    );
    expect(result.accuracy).toBeDefined();
    expect(result.coherence).toBeDefined();
    expect(result.accuracy).toBeGreaterThan(0);
    expect(result.coherence).toBeGreaterThan(0);
  });

  it('carries forward existing dimensions not in new observation (BB-008-003)', () => {
    const existing = { accuracy: 0.7, coherence: 0.8 };
    const result = computeDimensionalBlended(
      { accuracy: 0.9 }, // only accuracy, no coherence
      existing,
      5,
      0.5,
      10,
    );
    // coherence should be carried forward from existing
    expect(result.coherence).toBe(0.8);
    // accuracy should be updated
    expect(result.accuracy).not.toBe(0.7);
  });
});

describe('computeTaskAwareCrossModelScore', () => {
  it('returns null for empty cohorts', () => {
    expect(computeTaskAwareCrossModelScore([], 'code_review')).toBeNull();
  });

  it('returns null for all-null cohorts', () => {
    const cohorts = [
      { personal_score: null, sample_count: 0, task_type: 'code_review' },
      { personal_score: null, sample_count: 0, task_type: 'reasoning' },
    ];
    expect(computeTaskAwareCrossModelScore(cohorts, 'code_review')).toBeNull();
  });

  it('applies task match weight multiplier', () => {
    const cohorts = [
      { personal_score: 0.9, sample_count: 10, task_type: 'code_review' },
      { personal_score: 0.5, sample_count: 10, task_type: 'reasoning' },
    ];
    const score = computeTaskAwareCrossModelScore(cohorts, 'code_review');
    expect(score).not.toBeNull();
    // With task match boost, code_review weight = 10 * 3.0 = 30, reasoning = 10
    // Expected: (0.9 * 30 + 0.5 * 10) / 40 = (27 + 5) / 40 = 0.8
    expect(score!).toBeCloseTo(0.8, 5);
  });

  it('falls back to standard cross-model scoring when no taskType', () => {
    const cohorts = [
      { personal_score: 0.9, sample_count: 10, task_type: 'code_review' },
      { personal_score: 0.5, sample_count: 10, task_type: 'reasoning' },
    ];
    const score = computeTaskAwareCrossModelScore(cohorts);
    expect(score).not.toBeNull();
    // Without task boost: simple weighted average by sample_count
    // (0.9 * 10 + 0.5 * 10) / 20 = 14 / 20 = 0.7
    expect(score!).toBeCloseTo(0.7, 5);
  });
});

describe('CollectionScoreAggregator', () => {
  it('returns DEFAULT_COLLECTION_SCORE when empty', () => {
    const agg = new CollectionScoreAggregator();
    expect(agg.mean).toBe(DEFAULT_COLLECTION_SCORE);
    expect(agg.populationSize).toBe(0);
    expect(agg.variance).toBe(0);
  });

  it('computes correct mean for single observation', () => {
    const agg = new CollectionScoreAggregator();
    agg.update(0.8);
    expect(agg.mean).toBeCloseTo(0.8, 10);
    expect(agg.populationSize).toBe(1);
  });

  it('computes correct mean and variance for multiple observations', () => {
    const agg = new CollectionScoreAggregator();
    const values = [0.2, 0.4, 0.6, 0.8];
    for (const v of values) agg.update(v);
    expect(agg.mean).toBeCloseTo(0.5, 10);
    expect(agg.populationSize).toBe(4);
    // Variance of [0.2, 0.4, 0.6, 0.8] = 0.05
    expect(agg.variance).toBeCloseTo(0.05, 10);
  });

  it('serializes and deserializes correctly', () => {
    const agg = new CollectionScoreAggregator();
    agg.update(0.3);
    agg.update(0.7);
    const json = agg.toJSON();
    const restored = CollectionScoreAggregator.fromJSON(json);
    expect(restored.mean).toBeCloseTo(agg.mean, 10);
    expect(restored.populationSize).toBe(agg.populationSize);
    expect(restored.variance).toBeCloseTo(agg.variance, 10);
  });

  it('restore() rejects invalid data', () => {
    const agg = new CollectionScoreAggregator();
    agg.update(0.5);

    // Invalid count
    agg.restore({ count: -1, mean: 0.5, m2: 0 });
    expect(agg.populationSize).toBe(1); // unchanged

    // NaN mean
    agg.restore({ count: 5, mean: NaN, m2: 0 });
    expect(agg.populationSize).toBe(1); // unchanged

    // Negative m2
    agg.restore({ count: 5, mean: 0.5, m2: -1 });
    expect(agg.populationSize).toBe(1); // unchanged
  });

  it('restore() accepts valid data', () => {
    const agg = new CollectionScoreAggregator();
    agg.restore({ count: 100, mean: 0.65, m2: 2.5 });
    expect(agg.populationSize).toBe(100);
    expect(agg.mean).toBeCloseTo(0.65, 10);
  });
});

describe('constants sanity', () => {
  it('ALPHA range is valid', () => {
    expect(FEEDBACK_DAMPENING_ALPHA_MIN).toBeGreaterThan(0);
    expect(FEEDBACK_DAMPENING_ALPHA_MAX).toBeLessThanOrEqual(1);
    expect(FEEDBACK_DAMPENING_ALPHA_MIN).toBeLessThan(FEEDBACK_DAMPENING_ALPHA_MAX);
  });

  it('pseudo count is positive', () => {
    expect(DEFAULT_PSEUDO_COUNT).toBeGreaterThan(0);
  });

  it('collection score is in [0, 1]', () => {
    expect(DEFAULT_COLLECTION_SCORE).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_COLLECTION_SCORE).toBeLessThanOrEqual(1);
  });

  it('task match weight multiplier is > 1', () => {
    expect(TASK_MATCH_WEIGHT_MULTIPLIER).toBeGreaterThan(1);
  });

  it('dampening ramp samples is positive', () => {
    expect(DAMPENING_RAMP_SAMPLES).toBeGreaterThan(0);
  });
});
