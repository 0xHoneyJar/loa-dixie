/**
 * CollectionScoreAggregator Tests — cycle-009 Sprint 5
 *
 * Validates:
 * - Welford's online mean & variance (Task 5.4)
 * - Pairwise covariance & Pearson's r (Task 5.5)
 * - Serialization round-trip (Task 5.5)
 */
import { describe, it, expect } from 'vitest';
import { CollectionScoreAggregator } from '../../src/services/collection-score-aggregator.js';

describe('CollectionScoreAggregator', () => {
  describe('getStats() — Welford mean & variance', () => {
    it('returns undefined for unknown dimensions', () => {
      const agg = new CollectionScoreAggregator();
      expect(agg.getStats('nonexistent')).toBeUndefined();
    });

    it('computes correct mean for a single observation', () => {
      const agg = new CollectionScoreAggregator();
      agg.update({ quality: 0.8 });

      const stats = agg.getStats('quality')!;
      expect(stats.mean).toBeCloseTo(0.8);
      expect(stats.variance).toBe(0); // n=1, variance undefined → 0
      expect(stats.count).toBe(1);
    });

    it('computes correct mean and variance for multiple observations', () => {
      const agg = new CollectionScoreAggregator();
      // Known dataset: [2, 4, 4, 4, 5, 5, 7, 9]
      // Mean = 5.0, Population variance = 4.0, Sample variance = 4.571...
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      for (const v of values) {
        agg.update({ x: v });
      }

      const stats = agg.getStats('x')!;
      expect(stats.mean).toBeCloseTo(5.0);
      expect(stats.variance).toBeCloseTo(32 / 7); // M2=32, n-1=7
      expect(stats.count).toBe(8);
    });

    it('handles multiple dimensions independently', () => {
      const agg = new CollectionScoreAggregator();
      agg.update({ a: 10, b: 100 });
      agg.update({ a: 20, b: 200 });

      const statsA = agg.getStats('a')!;
      const statsB = agg.getStats('b')!;

      expect(statsA.mean).toBeCloseTo(15);
      expect(statsB.mean).toBeCloseTo(150);
      expect(statsA.count).toBe(2);
      expect(statsB.count).toBe(2);
    });

    it('is numerically stable for large sample counts', () => {
      const agg = new CollectionScoreAggregator();
      // 10,000 observations of value 1e8 + small noise
      // Naive algorithms would accumulate catastrophic cancellation
      const n = 10_000;
      const base = 1e8;
      let sumSq = 0;
      for (let i = 0; i < n; i++) {
        const noise = (i % 10) * 0.1; // 0.0 to 0.9
        agg.update({ x: base + noise });
        sumSq += noise;
      }

      const stats = agg.getStats('x')!;
      expect(stats.count).toBe(n);
      // Mean should be base + mean(noise)
      const expectedMean = base + 0.45; // mean of 0.0, 0.1, ..., 0.9
      expect(stats.mean).toBeCloseTo(expectedMean, 5);
      // Variance should be finite and positive
      expect(stats.variance).toBeGreaterThan(0);
      expect(Number.isFinite(stats.variance)).toBe(true);
    });
  });

  describe('getCovariance() — Pairwise covariance', () => {
    it('returns undefined for unknown dimensions', () => {
      const agg = new CollectionScoreAggregator();
      expect(agg.getCovariance('a', 'b')).toBeUndefined();
    });

    it('returns zero covariance for a single observation', () => {
      const agg = new CollectionScoreAggregator();
      agg.update({ a: 1, b: 2 });

      const pair = agg.getCovariance('a', 'b')!;
      expect(pair.covariance).toBe(0);
      expect(pair.correlation).toBe(0);
      expect(pair.sample_count).toBe(1);
    });

    it('detects positive correlation', () => {
      const agg = new CollectionScoreAggregator();
      // Perfectly positively correlated: a = b
      for (let i = 1; i <= 20; i++) {
        agg.update({ a: i, b: i });
      }

      const pair = agg.getCovariance('a', 'b')!;
      expect(pair.correlation).toBeCloseTo(1.0, 5);
      expect(pair.covariance).toBeGreaterThan(0);
    });

    it('detects negative correlation', () => {
      const agg = new CollectionScoreAggregator();
      // Perfectly negatively correlated: a + b = constant
      for (let i = 1; i <= 20; i++) {
        agg.update({ a: i, b: 21 - i });
      }

      const pair = agg.getCovariance('a', 'b')!;
      expect(pair.correlation).toBeCloseTo(-1.0, 5);
      expect(pair.covariance).toBeLessThan(0);
    });

    it('shows near-zero correlation for uncorrelated data', () => {
      const agg = new CollectionScoreAggregator();
      // Orthogonal pattern: (1,0), (0,1), (-1,0), (0,-1) repeated
      const pattern = [
        { a: 1, b: 0 },
        { a: 0, b: 1 },
        { a: -1, b: 0 },
        { a: 0, b: -1 },
      ];
      for (let i = 0; i < 100; i++) {
        agg.update(pattern[i % 4]);
      }

      const pair = agg.getCovariance('a', 'b')!;
      expect(Math.abs(pair.correlation)).toBeLessThan(0.05);
    });

    it('is symmetric: getCovariance(a,b) == getCovariance(b,a)', () => {
      const agg = new CollectionScoreAggregator();
      for (let i = 0; i < 10; i++) {
        agg.update({ x: i * 2, y: i * 3 + 1 });
      }

      const ab = agg.getCovariance('x', 'y')!;
      const ba = agg.getCovariance('y', 'x')!;

      expect(ab.covariance).toBeCloseTo(ba.covariance);
      expect(ab.correlation).toBeCloseTo(ba.correlation);
    });
  });

  describe('getAllCovariances()', () => {
    it('returns all tracked pairs', () => {
      const agg = new CollectionScoreAggregator();
      agg.update({ a: 1, b: 2, c: 3 });
      agg.update({ a: 4, b: 5, c: 6 });

      const pairs = agg.getAllCovariances();
      // 3 dimensions → 3 pairs: a:b, a:c, b:c
      expect(pairs).toHaveLength(3);
      const keys = pairs.map((p) => `${p.dim_a}:${p.dim_b}`).sort();
      expect(keys).toEqual(['a:b', 'a:c', 'b:c']);
    });
  });

  describe('toJSON() / fromJSON() — Serialization', () => {
    it('round-trips perfectly', () => {
      const agg = new CollectionScoreAggregator();
      for (let i = 0; i < 50; i++) {
        agg.update({ quality: i * 0.02, latency: 100 - i, cost: i * 0.5 });
      }

      const json = agg.toJSON();
      const restored = CollectionScoreAggregator.fromJSON(json);

      // Compare stats for every dimension
      for (const dim of ['quality', 'latency', 'cost']) {
        const orig = agg.getStats(dim)!;
        const rest = restored.getStats(dim)!;
        expect(rest.mean).toBeCloseTo(orig.mean, 10);
        expect(rest.variance).toBeCloseTo(orig.variance, 10);
        expect(rest.count).toBe(orig.count);
      }

      // Compare covariances
      const origPairs = agg.getAllCovariances();
      const restPairs = restored.getAllCovariances();
      expect(restPairs).toHaveLength(origPairs.length);

      for (const op of origPairs) {
        const rp = restPairs.find(
          (p) => p.dim_a === op.dim_a && p.dim_b === op.dim_b,
        )!;
        expect(rp.covariance).toBeCloseTo(op.covariance, 10);
        expect(rp.correlation).toBeCloseTo(op.correlation, 10);
      }
    });

    it('restored aggregator can continue accumulating', () => {
      const agg = new CollectionScoreAggregator();
      for (let i = 0; i < 10; i++) {
        agg.update({ x: i });
      }

      const restored = CollectionScoreAggregator.fromJSON(agg.toJSON());
      // Add more observations to restored
      for (let i = 10; i < 20; i++) {
        restored.update({ x: i });
      }

      const stats = restored.getStats('x')!;
      expect(stats.count).toBe(20);
      // Mean of 0..19 = 9.5
      expect(stats.mean).toBeCloseTo(9.5);
    });
  });
});
