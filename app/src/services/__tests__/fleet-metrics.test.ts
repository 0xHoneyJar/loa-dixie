/**
 * Fleet Metrics Collector Unit Tests
 *
 * Tests all recording methods, computed metrics (retryRate, avgSpawnDurationMs),
 * the reset() lifecycle, and edge cases (zero-division safety).
 *
 * @since cycle-012 — Sprint 93, Task T-8.11
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { FleetMetricsCollector } from '../fleet-metrics.js';
import type { FleetMetrics } from '../fleet-metrics.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FleetMetricsCollector', () => {
  let collector: FleetMetricsCollector;

  beforeEach(() => {
    collector = new FleetMetricsCollector();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('all metrics are zero on construction', () => {
      const metrics = collector.getMetrics();

      expect(metrics.activeAgents).toBe(0);
      expect(metrics.totalSpawns).toBe(0);
      expect(metrics.totalFailures).toBe(0);
      expect(metrics.retryRate).toBe(0);
      expect(metrics.avgSpawnDurationMs).toBe(0);
      expect(metrics.governorDenialCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // recordSpawn
  // -------------------------------------------------------------------------

  describe('recordSpawn()', () => {
    it('increments totalSpawns', () => {
      collector.recordSpawn(100);
      collector.recordSpawn(200);

      expect(collector.getMetrics().totalSpawns).toBe(2);
    });

    it('updates avgSpawnDurationMs correctly', () => {
      collector.recordSpawn(100);
      collector.recordSpawn(300);

      // Average of 100 and 300 = 200
      expect(collector.getMetrics().avgSpawnDurationMs).toBe(200);
    });

    it('computes running average across many spawns', () => {
      collector.recordSpawn(100);
      collector.recordSpawn(200);
      collector.recordSpawn(300);
      collector.recordSpawn(400);

      // Average: (100 + 200 + 300 + 400) / 4 = 250
      expect(collector.getMetrics().avgSpawnDurationMs).toBe(250);
    });

    it('handles a single spawn', () => {
      collector.recordSpawn(42);

      expect(collector.getMetrics().totalSpawns).toBe(1);
      expect(collector.getMetrics().avgSpawnDurationMs).toBe(42);
    });
  });

  // -------------------------------------------------------------------------
  // recordFailure
  // -------------------------------------------------------------------------

  describe('recordFailure()', () => {
    it('increments totalFailures', () => {
      collector.recordFailure();
      collector.recordFailure();
      collector.recordFailure();

      expect(collector.getMetrics().totalFailures).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // recordRetry
  // -------------------------------------------------------------------------

  describe('recordRetry()', () => {
    it('increments and updates retryRate', () => {
      // 2 spawns, 1 retry => retryRate = 1 / (2 + 1) = 0.333...
      collector.recordSpawn(100);
      collector.recordSpawn(100);
      collector.recordRetry();

      const metrics = collector.getMetrics();
      expect(metrics.retryRate).toBeCloseTo(1 / 3, 10);
    });

    it('retryRate is 1.0 when all activity is retries (no spawns)', () => {
      collector.recordRetry();
      collector.recordRetry();

      // retryRate = 2 / (0 + 2) = 1.0
      expect(collector.getMetrics().retryRate).toBe(1);
    });

    it('retryRate is 0 when no retries', () => {
      collector.recordSpawn(100);
      collector.recordSpawn(200);

      // retryRate = 0 / (2 + 0) = 0
      expect(collector.getMetrics().retryRate).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // retryRate formula verification
  // -------------------------------------------------------------------------

  describe('retryRate computation', () => {
    it('is computed as retries / (spawns + retries)', () => {
      // 5 spawns, 3 retries => 3 / (5 + 3) = 0.375
      for (let i = 0; i < 5; i++) collector.recordSpawn(100);
      for (let i = 0; i < 3; i++) collector.recordRetry();

      expect(collector.getMetrics().retryRate).toBeCloseTo(3 / 8, 10);
    });

    it('is 0 when both spawns and retries are zero', () => {
      expect(collector.getMetrics().retryRate).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // recordGovernorDenial
  // -------------------------------------------------------------------------

  describe('recordGovernorDenial()', () => {
    it('increments governorDenialCount', () => {
      collector.recordGovernorDenial();
      collector.recordGovernorDenial();

      expect(collector.getMetrics().governorDenialCount).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // setActiveAgents
  // -------------------------------------------------------------------------

  describe('setActiveAgents()', () => {
    it('updates activeAgents gauge', () => {
      collector.setActiveAgents(5);
      expect(collector.getMetrics().activeAgents).toBe(5);
    });

    it('can be set to zero', () => {
      collector.setActiveAgents(10);
      collector.setActiveAgents(0);
      expect(collector.getMetrics().activeAgents).toBe(0);
    });

    it('overwrites previous value (gauge semantics)', () => {
      collector.setActiveAgents(3);
      collector.setActiveAgents(7);
      expect(collector.getMetrics().activeAgents).toBe(7);
    });
  });

  // -------------------------------------------------------------------------
  // getMetrics — all values
  // -------------------------------------------------------------------------

  describe('getMetrics()', () => {
    it('returns all values reflecting recorded activity', () => {
      collector.recordSpawn(100);
      collector.recordSpawn(200);
      collector.recordSpawn(300);
      collector.recordFailure();
      collector.recordFailure();
      collector.recordRetry();
      collector.recordGovernorDenial();
      collector.recordGovernorDenial();
      collector.recordGovernorDenial();
      collector.setActiveAgents(4);

      const metrics = collector.getMetrics();

      expect(metrics.activeAgents).toBe(4);
      expect(metrics.totalSpawns).toBe(3);
      expect(metrics.totalFailures).toBe(2);
      expect(metrics.retryRate).toBeCloseTo(1 / 4, 10); // 1 / (3 + 1)
      expect(metrics.avgSpawnDurationMs).toBe(200); // (100 + 200 + 300) / 3
      expect(metrics.governorDenialCount).toBe(3);
    });

    it('returns a readonly snapshot (interface check)', () => {
      const metrics: FleetMetrics = collector.getMetrics();
      // TypeScript readonly ensures no mutation at compile time.
      // Runtime check: the object has the expected shape.
      expect(typeof metrics.activeAgents).toBe('number');
      expect(typeof metrics.totalSpawns).toBe('number');
      expect(typeof metrics.totalFailures).toBe('number');
      expect(typeof metrics.retryRate).toBe('number');
      expect(typeof metrics.avgSpawnDurationMs).toBe('number');
      expect(typeof metrics.governorDenialCount).toBe('number');
    });
  });

  // -------------------------------------------------------------------------
  // reset
  // -------------------------------------------------------------------------

  describe('reset()', () => {
    it('clears all counters and gauges to zero', () => {
      // Record various activity
      collector.recordSpawn(100);
      collector.recordSpawn(200);
      collector.recordFailure();
      collector.recordRetry();
      collector.recordGovernorDenial();
      collector.setActiveAgents(5);

      // Verify non-zero before reset
      const before = collector.getMetrics();
      expect(before.totalSpawns).toBe(2);
      expect(before.totalFailures).toBe(1);
      expect(before.governorDenialCount).toBe(1);
      expect(before.activeAgents).toBe(5);

      // Reset
      collector.reset();

      // All zero after reset
      const after = collector.getMetrics();
      expect(after.activeAgents).toBe(0);
      expect(after.totalSpawns).toBe(0);
      expect(after.totalFailures).toBe(0);
      expect(after.retryRate).toBe(0);
      expect(after.avgSpawnDurationMs).toBe(0);
      expect(after.governorDenialCount).toBe(0);
    });

    it('allows recording new data after reset', () => {
      collector.recordSpawn(500);
      collector.reset();
      collector.recordSpawn(100);

      expect(collector.getMetrics().totalSpawns).toBe(1);
      expect(collector.getMetrics().avgSpawnDurationMs).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // avgSpawnDurationMs edge cases
  // -------------------------------------------------------------------------

  describe('avgSpawnDurationMs — running average', () => {
    it('is 0 when no spawns recorded', () => {
      expect(collector.getMetrics().avgSpawnDurationMs).toBe(0);
    });

    it('is exact for a single spawn', () => {
      collector.recordSpawn(1234);
      expect(collector.getMetrics().avgSpawnDurationMs).toBe(1234);
    });

    it('correctly averages heterogeneous durations', () => {
      collector.recordSpawn(10);
      collector.recordSpawn(20);
      collector.recordSpawn(30);

      // (10 + 20 + 30) / 3 = 20
      expect(collector.getMetrics().avgSpawnDurationMs).toBe(20);
    });

    it('handles zero-duration spawns', () => {
      collector.recordSpawn(0);
      collector.recordSpawn(0);

      expect(collector.getMetrics().avgSpawnDurationMs).toBe(0);
    });
  });
});
