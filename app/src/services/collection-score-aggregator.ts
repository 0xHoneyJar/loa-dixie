/**
 * CollectionScoreAggregator — Streaming Dimension Statistics.
 *
 * Uses Welford's online algorithm for numerically stable running mean
 * and variance. Extended to pairwise covariance for dimension correlation.
 *
 * Welford's algorithm:
 *   delta = x - mean
 *   mean += delta / n
 *   delta2 = x - mean  (note: uses updated mean)
 *   M2 += delta * delta2
 *   variance = M2 / (n - 1)  (Bessel's correction)
 *
 * Pairwise covariance extension:
 *   delta_a = x_a - mean_a
 *   (update mean_a)
 *   delta_b = x_b - mean_b
 *   (update mean_b)
 *   co_M2_ab += delta_a * (x_b - mean_b)
 *   covariance_ab = co_M2_ab / (n - 1)
 *
 * @since cycle-009 Sprint 5 — Tasks 5.4, 5.5 (FR-10)
 */

export interface DimensionStats {
  mean: number;
  variance: number;
  count: number;
}

export interface DimensionPair {
  dim_a: string;
  dim_b: string;
  covariance: number;
  correlation: number; // Pearson's r
  sample_count: number;
}

/**
 * Key for co-moment map: alphabetically ordered pair.
 */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export class CollectionScoreAggregator {
  private readonly means = new Map<string, number>();
  private readonly m2s = new Map<string, number>();
  private readonly co_m2s = new Map<string, number>();
  private readonly counts = new Map<string, number>();
  private globalCount = 0;

  /**
   * Update with a new observation across multiple dimensions.
   * Complexity: O(d^2) per call where d = number of dimensions.
   */
  update(observation: Record<string, number>): void {
    this.globalCount++;
    const n = this.globalCount;
    const dims = Object.keys(observation);

    // Store old means for covariance update
    const oldMeans = new Map<string, number>();
    for (const dim of dims) {
      oldMeans.set(dim, this.means.get(dim) ?? 0);
    }

    // Phase 1: Update individual dimension statistics (Welford's)
    for (const dim of dims) {
      const x = observation[dim];
      const oldMean = this.means.get(dim) ?? 0;
      const oldM2 = this.m2s.get(dim) ?? 0;
      const count = (this.counts.get(dim) ?? 0) + 1;

      const delta = x - oldMean;
      const newMean = oldMean + delta / count;
      const delta2 = x - newMean;
      const newM2 = oldM2 + delta * delta2;

      this.means.set(dim, newMean);
      this.m2s.set(dim, newM2);
      this.counts.set(dim, count);
    }

    // Phase 2: Update pairwise co-moments
    for (let i = 0; i < dims.length; i++) {
      for (let j = i + 1; j < dims.length; j++) {
        const a = dims[i];
        const b = dims[j];
        const key = pairKey(a, b);

        const delta_a = observation[a] - (oldMeans.get(a) ?? 0);
        const new_mean_b = this.means.get(b) ?? 0;
        const old_co_m2 = this.co_m2s.get(key) ?? 0;

        // co_M2 += delta_a * (x_b - new_mean_b)
        this.co_m2s.set(
          key,
          old_co_m2 + delta_a * (observation[b] - new_mean_b),
        );
      }
    }
  }

  /**
   * Get current mean and variance for a dimension.
   * Variance uses Bessel's correction: M2 / (n - 1).
   */
  getStats(dimension: string): DimensionStats | undefined {
    const count = this.counts.get(dimension);
    if (count === undefined) return undefined;

    const mean = this.means.get(dimension) ?? 0;
    const m2 = this.m2s.get(dimension) ?? 0;
    const variance = count > 1 ? m2 / (count - 1) : 0;

    return { mean, variance, count };
  }

  /**
   * Get pairwise covariance between two dimensions.
   * Returns Pearson's r correlation coefficient.
   */
  getCovariance(dimA: string, dimB: string): DimensionPair | undefined {
    const countA = this.counts.get(dimA);
    const countB = this.counts.get(dimB);
    if (countA === undefined || countB === undefined) return undefined;

    const count = Math.min(countA, countB);
    if (count < 2) {
      return {
        dim_a: dimA,
        dim_b: dimB,
        covariance: 0,
        correlation: 0,
        sample_count: count,
      };
    }

    const key = pairKey(dimA, dimB);
    const coM2 = this.co_m2s.get(key) ?? 0;
    const covariance = coM2 / (count - 1);

    // Pearson's r = cov(A,B) / (std_A * std_B)
    const m2A = this.m2s.get(dimA) ?? 0;
    const m2B = this.m2s.get(dimB) ?? 0;
    const stdA = Math.sqrt(m2A / (count - 1));
    const stdB = Math.sqrt(m2B / (count - 1));

    const correlation =
      stdA > 0 && stdB > 0 ? covariance / (stdA * stdB) : 0;

    return {
      dim_a: dimA,
      dim_b: dimB,
      covariance,
      correlation,
      sample_count: count,
    };
  }

  /**
   * Get all pairwise covariances.
   */
  getAllCovariances(): DimensionPair[] {
    const pairs: DimensionPair[] = [];
    for (const key of this.co_m2s.keys()) {
      const [a, b] = key.split(':');
      const pair = this.getCovariance(a, b);
      if (pair) pairs.push(pair);
    }
    return pairs;
  }

  /**
   * Serialize complete aggregator state for persistence.
   */
  toJSON(): Record<string, unknown> {
    return {
      means: Object.fromEntries(this.means),
      m2s: Object.fromEntries(this.m2s),
      co_m2s: Object.fromEntries(this.co_m2s),
      counts: Object.fromEntries(this.counts),
      globalCount: this.globalCount,
    };
  }

  /**
   * Restore aggregator from serialized state.
   */
  static fromJSON(data: Record<string, unknown>): CollectionScoreAggregator {
    const agg = new CollectionScoreAggregator();
    const d = data as {
      means: Record<string, number>;
      m2s: Record<string, number>;
      co_m2s: Record<string, number>;
      counts: Record<string, number>;
      globalCount: number;
    };

    for (const [k, v] of Object.entries(d.means)) agg.means.set(k, v);
    for (const [k, v] of Object.entries(d.m2s)) agg.m2s.set(k, v);
    for (const [k, v] of Object.entries(d.co_m2s)) agg.co_m2s.set(k, v);
    for (const [k, v] of Object.entries(d.counts)) agg.counts.set(k, v);
    agg.globalCount = d.globalCount;

    return agg;
  }
}
