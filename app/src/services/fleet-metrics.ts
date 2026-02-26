/**
 * Fleet Metrics Collector — In-Memory Observability Counters (Prometheus-Style)
 *
 * Collects fleet orchestration metrics: spawn counts, failure counts, retry rates,
 * governor denial counts, average spawn durations, and active agent gauge.
 *
 * Counters reset on process restart (ephemeral in-memory). Designed for
 * pull-based scraping (Prometheus /metrics endpoint) or periodic snapshot export.
 *
 * See: SDD §8 (fleet observability), T-8.11
 * @since cycle-012 — Sprint 93, Task T-8.11
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Read-only snapshot of all fleet metrics at a point in time. */
export interface FleetMetrics {
  readonly activeAgents: number;
  readonly totalSpawns: number;
  readonly totalFailures: number;
  readonly retryRate: number;
  readonly avgSpawnDurationMs: number;
  readonly governorDenialCount: number;
}

// ---------------------------------------------------------------------------
// FleetMetricsCollector
// ---------------------------------------------------------------------------

/**
 * Fleet Metrics Collector — in-memory counters with Prometheus-style semantics.
 *
 * Thread-safe for single-threaded Node.js (no concurrent mutation possible).
 * All counters are monotonically increasing until reset(). The `activeAgents`
 * gauge is set directly via setActiveAgents().
 *
 * @since cycle-012 — Sprint 93
 */
export class FleetMetricsCollector {
  private _activeAgents = 0;
  private _totalSpawns = 0;
  private _totalFailures = 0;
  private _totalRetries = 0;
  private _governorDenialCount = 0;

  /** Running sum of all spawn durations for computing the average. */
  private _totalSpawnDurationMs = 0;

  // -------------------------------------------------------------------------
  // Recording Methods
  // -------------------------------------------------------------------------

  /**
   * Record a successful spawn with its duration.
   *
   * Increments totalSpawns and updates the running average of spawn durations.
   * @param durationMs — wall-clock time of the spawn operation in milliseconds
   */
  recordSpawn(durationMs: number): void {
    this._totalSpawns++;
    this._totalSpawnDurationMs += durationMs;
  }

  /** Record a task failure. Increments totalFailures counter. */
  recordFailure(): void {
    this._totalFailures++;
  }

  /**
   * Record a retry attempt. Increments the retry counter which is used
   * to compute retryRate = retries / (spawns + retries).
   */
  recordRetry(): void {
    this._totalRetries++;
  }

  /** Record a governor denial (spawn request rejected by FleetGovernor). */
  recordGovernorDenial(): void {
    this._governorDenialCount++;
  }

  /**
   * Set the current active agent count (gauge, not counter).
   * Typically called from FleetMonitor after each reconciliation cycle.
   */
  setActiveAgents(count: number): void {
    this._activeAgents = count;
  }

  // -------------------------------------------------------------------------
  // Read Methods
  // -------------------------------------------------------------------------

  /**
   * Get a read-only snapshot of all fleet metrics.
   *
   * Computed values:
   * - retryRate = totalRetries / (totalSpawns + totalRetries), or 0 if no data
   * - avgSpawnDurationMs = totalSpawnDurationMs / totalSpawns, or 0 if no spawns
   */
  getMetrics(): FleetMetrics {
    const denominator = this._totalSpawns + this._totalRetries;
    const retryRate = denominator > 0 ? this._totalRetries / denominator : 0;

    const avgSpawnDurationMs =
      this._totalSpawns > 0
        ? this._totalSpawnDurationMs / this._totalSpawns
        : 0;

    return {
      activeAgents: this._activeAgents,
      totalSpawns: this._totalSpawns,
      totalFailures: this._totalFailures,
      retryRate,
      avgSpawnDurationMs,
      governorDenialCount: this._governorDenialCount,
    };
  }

  /** Reset all counters and gauges to zero. */
  reset(): void {
    this._activeAgents = 0;
    this._totalSpawns = 0;
    this._totalFailures = 0;
    this._totalRetries = 0;
    this._governorDenialCount = 0;
    this._totalSpawnDurationMs = 0;
  }
}
