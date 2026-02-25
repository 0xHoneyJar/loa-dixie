/**
 * Feedback Dampening Unit Tests — Sprint 78 (cycle-007), Task S1-T6
 *
 * Tests for computeDampenedScore and the EMA dampening behavior
 * that prevents runaway convergence in the autopoietic feedback loop.
 *
 * @since cycle-007 — Sprint 78, Task S1-T6 (Bridgebuilder F1)
 */
import { describe, it, expect } from 'vitest';
import {
  computeDampenedScore,
  FEEDBACK_DAMPENING_ALPHA_MIN,
  FEEDBACK_DAMPENING_ALPHA_MAX,
  DAMPENING_RAMP_SAMPLES,
} from '../reputation-service.js';

describe('computeDampenedScore', () => {
  it('cold start (null old score) returns new score unmodified', () => {
    expect(computeDampenedScore(null, 0.8, 0)).toBe(0.8);
    expect(computeDampenedScore(null, 0.0, 0)).toBe(0.0);
    expect(computeDampenedScore(null, 1.0, 100)).toBe(1.0);
  });

  it('low sample count produces conservative alpha (close to ALPHA_MIN)', () => {
    const oldScore = 0.5;
    const newScore = 1.0;
    const sampleCount = 1; // very few samples

    const dampened = computeDampenedScore(oldScore, newScore, sampleCount);
    // With low alpha (~0.1), the result should be close to oldScore
    // alpha = 0.1 + 0.4 * (1/50) = 0.108
    // dampened = 0.108 * 1.0 + 0.892 * 0.5 = 0.554
    expect(dampened).toBeGreaterThan(oldScore);
    expect(dampened).toBeLessThan(oldScore + 0.15); // didn't jump much
  });

  it('high sample count (>= DAMPENING_RAMP_SAMPLES) produces responsive alpha', () => {
    const oldScore = 0.5;
    const newScore = 1.0;
    const sampleCount = DAMPENING_RAMP_SAMPLES;

    const dampened = computeDampenedScore(oldScore, newScore, sampleCount);
    // With max alpha (0.5), result should be exactly midpoint
    // dampened = 0.5 * 1.0 + 0.5 * 0.5 = 0.75
    expect(dampened).toBe(0.75);
  });

  it('sample count beyond ramp cap does not exceed ALPHA_MAX', () => {
    const oldScore = 0.5;
    const newScore = 1.0;

    const atRamp = computeDampenedScore(oldScore, newScore, DAMPENING_RAMP_SAMPLES);
    const beyondRamp = computeDampenedScore(oldScore, newScore, DAMPENING_RAMP_SAMPLES * 10);

    // Both should produce the same result (alpha capped at MAX)
    expect(beyondRamp).toBe(atRamp);
  });

  it('dampened score is always between old and new score (weighted average property)', () => {
    const cases = [
      { old: 0.2, new: 0.8, samples: 5 },
      { old: 0.9, new: 0.1, samples: 25 },
      { old: 0.5, new: 0.5, samples: 10 },
      { old: 0.0, new: 1.0, samples: 50 },
      { old: 1.0, new: 0.0, samples: 1 },
    ];

    for (const { old: oldScore, new: newScore, samples } of cases) {
      const dampened = computeDampenedScore(oldScore, newScore, samples);
      const lo = Math.min(oldScore, newScore);
      const hi = Math.max(oldScore, newScore);
      expect(dampened).toBeGreaterThanOrEqual(lo);
      expect(dampened).toBeLessThanOrEqual(hi);
    }
  });

  it('repeated identical observations converge to that value', () => {
    let score = 0.5;
    const target = 0.9;

    // Simulate 200 identical observations
    for (let i = 0; i < 200; i++) {
      score = computeDampenedScore(score, target, i);
    }

    // Should have converged very close to target
    expect(Math.abs(score - target)).toBeLessThan(0.01);
  });

  it('single outlier observation is dampened (does not dominate immediately)', () => {
    // Start with an established score
    let score = 0.7;
    const sampleCount = 30; // moderate history

    // Single outlier
    const dampened = computeDampenedScore(score, 0.0, sampleCount);

    // Should not have crashed to near-zero
    expect(dampened).toBeGreaterThan(0.4);
  });

  it('EMA property — order of observations matters', () => {
    // Sequence A: low then high
    let scoreA: number | null = null;
    scoreA = computeDampenedScore(scoreA, 0.2, 0); // first = 0.2 (cold start)
    scoreA = computeDampenedScore(scoreA, 0.8, 1); // second = blend toward 0.8

    // Sequence B: high then low
    let scoreB: number | null = null;
    scoreB = computeDampenedScore(scoreB, 0.8, 0); // first = 0.8 (cold start)
    scoreB = computeDampenedScore(scoreB, 0.2, 1); // second = blend toward 0.2

    // Different ordering produces different results — ordering matters
    expect(scoreA).not.toBe(scoreB);

    // With low alpha at sample 1, the FIRST (cold start) observation dominates.
    // A started at 0.2, blended slightly toward 0.8 → still < 0.5
    // B started at 0.8, blended slightly toward 0.2 → still > 0.5
    expect(scoreB).toBeGreaterThan(scoreA);
  });
});

describe('dampening constants', () => {
  it('ALPHA_MIN < ALPHA_MAX', () => {
    expect(FEEDBACK_DAMPENING_ALPHA_MIN).toBeLessThan(FEEDBACK_DAMPENING_ALPHA_MAX);
  });

  it('ALPHA_MIN > 0 (always some responsiveness)', () => {
    expect(FEEDBACK_DAMPENING_ALPHA_MIN).toBeGreaterThan(0);
  });

  it('ALPHA_MAX <= 1 (never overshoots)', () => {
    expect(FEEDBACK_DAMPENING_ALPHA_MAX).toBeLessThanOrEqual(1);
  });

  it('DAMPENING_RAMP_SAMPLES > 0', () => {
    expect(DAMPENING_RAMP_SAMPLES).toBeGreaterThan(0);
  });
});
