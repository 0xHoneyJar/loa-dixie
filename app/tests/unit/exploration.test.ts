/**
 * Exploration Tests — cycle-009 Sprint 5
 *
 * Validates:
 * - Mulberry32 PRNG determinism (Task 5.1)
 * - UCB1 score computation (Task 5.2)
 * - Model selection: epsilon-greedy + UCB1 (Task 5.3)
 */
import { describe, it, expect } from 'vitest';
import {
  createPRNG,
  computeUCB1Score,
  selectModel,
  type ExplorationConfig,
  type ModelObservation,
} from '../../src/services/exploration.js';

describe('createPRNG', () => {
  it('produces deterministic sequences from the same seed', () => {
    const prng1 = createPRNG(42);
    const prng2 = createPRNG(42);

    const seq1 = Array.from({ length: 10 }, () => prng1());
    const seq2 = Array.from({ length: 10 }, () => prng2());

    expect(seq1).toEqual(seq2);
  });

  it('produces values in [0, 1)', () => {
    const prng = createPRNG(123);
    for (let i = 0; i < 1000; i++) {
      const v = prng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('produces different sequences for different seeds', () => {
    const prng1 = createPRNG(1);
    const prng2 = createPRNG(2);

    const seq1 = Array.from({ length: 5 }, () => prng1());
    const seq2 = Array.from({ length: 5 }, () => prng2());

    expect(seq1).not.toEqual(seq2);
  });
});

describe('computeUCB1Score', () => {
  it('returns Infinity for unobserved models', () => {
    const model: ModelObservation = {
      model_id: 'a',
      observation_count: 0,
      mean_quality: 0,
    };
    expect(computeUCB1Score(model, 100)).toBe(Infinity);
  });

  it('returns Infinity when totalObservations is 0', () => {
    const model: ModelObservation = {
      model_id: 'a',
      observation_count: 5,
      mean_quality: 0.8,
    };
    expect(computeUCB1Score(model, 0)).toBe(Infinity);
  });

  it('increases with higher mean quality', () => {
    const low: ModelObservation = {
      model_id: 'low',
      observation_count: 10,
      mean_quality: 0.3,
    };
    const high: ModelObservation = {
      model_id: 'high',
      observation_count: 10,
      mean_quality: 0.9,
    };

    expect(computeUCB1Score(high, 100)).toBeGreaterThan(
      computeUCB1Score(low, 100),
    );
  });

  it('gives higher bonus to less-observed models', () => {
    const lessObserved: ModelObservation = {
      model_id: 'rare',
      observation_count: 2,
      mean_quality: 0.5,
    };
    const wellObserved: ModelObservation = {
      model_id: 'common',
      observation_count: 50,
      mean_quality: 0.5,
    };

    // Same mean_quality: less-observed should score higher due to exploration bonus
    expect(computeUCB1Score(lessObserved, 100)).toBeGreaterThan(
      computeUCB1Score(wellObserved, 100),
    );
  });

  it('computes analytically correct UCB1 score', () => {
    const model: ModelObservation = {
      model_id: 'test',
      observation_count: 10,
      mean_quality: 0.7,
    };
    const total = 100;
    const c = Math.SQRT2;

    const expected = 0.7 + c * Math.sqrt(Math.log(100) / 10);
    expect(computeUCB1Score(model, total, c)).toBeCloseTo(expected, 10);
  });

  it('responds to c parameter for exploration-exploitation tradeoff', () => {
    const model: ModelObservation = {
      model_id: 'test',
      observation_count: 5,
      mean_quality: 0.5,
    };

    const lowC = computeUCB1Score(model, 50, 0.5);
    const highC = computeUCB1Score(model, 50, 2.0);

    expect(highC).toBeGreaterThan(lowC);
  });
});

describe('selectModel', () => {
  it('throws on empty model list', () => {
    const config: ExplorationConfig = { strategy: 'epsilon-greedy' };
    const prng = createPRNG(1);

    expect(() => selectModel([], config, prng)).toThrow(
      'Cannot select from empty model list',
    );
  });

  it('returns the only model when list has one entry', () => {
    const models: ModelObservation[] = [
      { model_id: 'solo', observation_count: 5, mean_quality: 0.8 },
    ];
    const config: ExplorationConfig = { strategy: 'epsilon-greedy' };
    const prng = createPRNG(1);

    expect(selectModel(models, config, prng)).toBe('solo');
  });

  describe('epsilon-greedy', () => {
    it('exploits the best model when not exploring', () => {
      const models: ModelObservation[] = [
        { model_id: 'bad', observation_count: 10, mean_quality: 0.3 },
        { model_id: 'good', observation_count: 10, mean_quality: 0.9 },
        { model_id: 'mid', observation_count: 10, mean_quality: 0.6 },
      ];
      // epsilon=0 means always exploit
      const config: ExplorationConfig = {
        strategy: 'epsilon-greedy',
        epsilon: 0,
      };
      const prng = createPRNG(42);

      // With epsilon=0, should always select the best model
      const results = new Set(
        Array.from({ length: 20 }, () => selectModel(models, config, prng)),
      );
      expect(results.size).toBe(1);
      expect(results.has('good')).toBe(true);
    });

    it('explores with epsilon=1 (always random)', () => {
      const models: ModelObservation[] = [
        { model_id: 'a', observation_count: 10, mean_quality: 0.3 },
        { model_id: 'b', observation_count: 10, mean_quality: 0.9 },
        { model_id: 'c', observation_count: 10, mean_quality: 0.6 },
      ];
      const config: ExplorationConfig = {
        strategy: 'epsilon-greedy',
        epsilon: 1.0,
      };
      const prng = createPRNG(42);

      // With epsilon=1, should eventually select different models
      const results = new Set(
        Array.from({ length: 100 }, () => selectModel(models, config, prng)),
      );
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('ucb1', () => {
    it('selects unobserved models first', () => {
      const models: ModelObservation[] = [
        { model_id: 'observed', observation_count: 10, mean_quality: 0.9 },
        { model_id: 'unobserved', observation_count: 0, mean_quality: 0 },
      ];
      const config: ExplorationConfig = { strategy: 'ucb1' };
      const prng = createPRNG(42);

      expect(selectModel(models, config, prng)).toBe('unobserved');
    });

    it('prefers high-mean models when observations are balanced', () => {
      const models: ModelObservation[] = [
        { model_id: 'low', observation_count: 50, mean_quality: 0.3 },
        { model_id: 'high', observation_count: 50, mean_quality: 0.9 },
      ];
      const config: ExplorationConfig = { strategy: 'ucb1' };
      const prng = createPRNG(42);

      // Same observation count → higher mean wins
      expect(selectModel(models, config, prng)).toBe('high');
    });

    it('respects ucb1_c configuration', () => {
      const models: ModelObservation[] = [
        // High quality but well-observed
        { model_id: 'exploit', observation_count: 100, mean_quality: 0.85 },
        // Low quality but rarely observed — high exploration bonus
        { model_id: 'explore', observation_count: 1, mean_quality: 0.5 },
      ];

      // With very high c, exploration bonus dominates
      const highC: ExplorationConfig = { strategy: 'ucb1', ucb1_c: 10.0 };
      const prng1 = createPRNG(42);
      expect(selectModel(models, highC, prng1)).toBe('explore');

      // With c=0, no exploration bonus — pure exploitation
      const noC: ExplorationConfig = { strategy: 'ucb1', ucb1_c: 0 };
      const prng2 = createPRNG(42);
      expect(selectModel(models, noC, prng2)).toBe('exploit');
    });
  });
});
