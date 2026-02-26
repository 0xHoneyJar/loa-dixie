/**
 * Circulation Protocol Unit Tests
 *
 * Tests dynamic admission economics: utilization multiplier, reputation
 * discount, complexity factor, and integrated cost computation.
 * Enforces INV-023: finalCost >= floor for all inputs.
 *
 * @since cycle-013 — Sprint 97
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CirculationProtocol,
  computeUtilizationMultiplier,
  computeReputationDiscount,
  computeComplexityFactor,
} from '../circulation-protocol.js';
import type { TaskType } from '../../types/fleet.js';

// ---------------------------------------------------------------------------
// Mock Factory
// ---------------------------------------------------------------------------

function createMockPool() {
  return {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// computeUtilizationMultiplier — Pure Function Tests
// ---------------------------------------------------------------------------

describe('computeUtilizationMultiplier()', () => {
  it('returns 0.7 for utilization=0.0 (idle fleet)', () => {
    expect(computeUtilizationMultiplier(0.0)).toBe(0.7);
  });

  it('returns 0.7 for utilization=0.2 (low usage)', () => {
    expect(computeUtilizationMultiplier(0.2)).toBe(0.7);
  });

  it('returns 0.7 for utilization=0.39 (just below normal threshold)', () => {
    expect(computeUtilizationMultiplier(0.39)).toBe(0.7);
  });

  it('returns 1.0 for utilization=0.4 (normal threshold)', () => {
    expect(computeUtilizationMultiplier(0.4)).toBe(1.0);
  });

  it('returns 1.0 for utilization=0.5 (mid-range)', () => {
    expect(computeUtilizationMultiplier(0.5)).toBe(1.0);
  });

  it('returns 1.0 for utilization=0.79 (just below high threshold)', () => {
    expect(computeUtilizationMultiplier(0.79)).toBe(1.0);
  });

  it('returns 1.5 for utilization=0.8 (high threshold)', () => {
    expect(computeUtilizationMultiplier(0.8)).toBe(1.5);
  });

  it('returns 1.5 for utilization=0.94 (just below critical)', () => {
    expect(computeUtilizationMultiplier(0.94)).toBe(1.5);
  });

  it('returns 3.0 for utilization=0.95 (critical threshold)', () => {
    expect(computeUtilizationMultiplier(0.95)).toBe(3.0);
  });

  it('returns 3.0 for utilization=1.0 (fully saturated)', () => {
    expect(computeUtilizationMultiplier(1.0)).toBe(3.0);
  });
});

// ---------------------------------------------------------------------------
// computeReputationDiscount — Pure Function Tests
// ---------------------------------------------------------------------------

describe('computeReputationDiscount()', () => {
  it('returns 1.0 for reputation=0.0 (no discount)', () => {
    expect(computeReputationDiscount(0.0)).toBe(1.0);
  });

  it('returns 0.8 for reputation=0.5 (moderate discount)', () => {
    expect(computeReputationDiscount(0.5)).toBeCloseTo(0.8, 5);
  });

  it('returns 0.6 for reputation=1.0 (full weight discount)', () => {
    expect(computeReputationDiscount(1.0)).toBeCloseTo(0.6, 5);
  });

  it('clamps to 0.5 minimum for reputation > 1.0', () => {
    // reputation=2.0, weight=0.4 → 1.0 - 2.0*0.4 = 0.2 → clamped to 0.5
    expect(computeReputationDiscount(2.0)).toBe(0.5);
  });

  it('clamps to 0.5 minimum for very high reputation', () => {
    expect(computeReputationDiscount(10.0)).toBe(0.5);
  });

  it('respects custom weight parameter', () => {
    // reputation=1.0, weight=0.2 → 1.0 - 1.0*0.2 = 0.8
    expect(computeReputationDiscount(1.0, 0.2)).toBeCloseTo(0.8, 5);
  });

  it('applies default weight=0.4 when not specified', () => {
    // reputation=0.5, default weight=0.4 → 1.0 - 0.5*0.4 = 0.8
    expect(computeReputationDiscount(0.5)).toBeCloseTo(0.8, 5);
  });
});

// ---------------------------------------------------------------------------
// computeComplexityFactor — Pure Function Tests
// ---------------------------------------------------------------------------

describe('computeComplexityFactor()', () => {
  describe('base factors per task type', () => {
    it('returns 0.8 for bug_fix', () => {
      expect(computeComplexityFactor('bug_fix', 100)).toBe(0.8);
    });

    it('returns 0.9 for refactor', () => {
      expect(computeComplexityFactor('refactor', 100)).toBe(0.9);
    });

    it('returns 0.7 for docs', () => {
      expect(computeComplexityFactor('docs', 100)).toBe(0.7);
    });

    it('returns 1.0 for feature', () => {
      expect(computeComplexityFactor('feature', 100)).toBe(1.0);
    });

    it('returns 0.6 for review', () => {
      expect(computeComplexityFactor('review', 100)).toBe(0.6);
    });
  });

  describe('description length adjustments', () => {
    it('adds nothing for short descriptions (<= 500 chars)', () => {
      expect(computeComplexityFactor('feature', 0)).toBe(1.0);
      expect(computeComplexityFactor('feature', 250)).toBe(1.0);
      expect(computeComplexityFactor('feature', 500)).toBe(1.0);
    });

    it('adds 0.2 for medium descriptions (501-1000 chars)', () => {
      expect(computeComplexityFactor('feature', 501)).toBe(1.2);
      expect(computeComplexityFactor('feature', 750)).toBe(1.2);
      expect(computeComplexityFactor('feature', 1000)).toBe(1.2);
    });

    it('adds 0.4 for long descriptions (> 1000 chars)', () => {
      expect(computeComplexityFactor('feature', 1001)).toBe(1.4);
      expect(computeComplexityFactor('feature', 5000)).toBe(1.4);
    });
  });

  describe('cap at 1.5', () => {
    it('caps feature + long description at 1.5', () => {
      // feature=1.0 + 0.4 = 1.4 — under cap
      expect(computeComplexityFactor('feature', 2000)).toBe(1.4);
    });

    it('caps refactor + long description at 1.3', () => {
      // refactor=0.9 + 0.4 = 1.3 — under cap
      expect(computeComplexityFactor('refactor', 2000)).toBe(1.3);
    });

    it('would not exceed 1.5 even with highest combination', () => {
      // Highest: feature=1.0 + 0.4 = 1.4, under 1.5
      // Verify the cap exists conceptually
      const allTypes: TaskType[] = ['bug_fix', 'feature', 'refactor', 'review', 'docs'];
      for (const t of allTypes) {
        expect(computeComplexityFactor(t, 100000)).toBeLessThanOrEqual(1.5);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// CirculationProtocol — Integration Tests
// ---------------------------------------------------------------------------

describe('CirculationProtocol', () => {
  let pool: ReturnType<typeof createMockPool>;
  let protocol: CirculationProtocol;

  beforeEach(() => {
    pool = createMockPool();
    protocol = new CirculationProtocol(pool as any);
  });

  // -------------------------------------------------------------------------
  // getUtilizationSnapshot()
  // -------------------------------------------------------------------------

  describe('getUtilizationSnapshot()', () => {
    it('queries fleet_tasks and computes utilization', async () => {
      pool.query.mockResolvedValue({
        rows: [{ active_count: '3', total_capacity: '10' }],
      });

      const snapshot = await protocol.getUtilizationSnapshot();

      expect(snapshot.capacityUsed).toBe(3);
      expect(snapshot.capacityTotal).toBe(10);
      expect(snapshot.utilization).toBeCloseTo(0.3, 5);
      expect(snapshot.multiplier).toBe(0.7); // < 0.4 threshold
    });

    it('returns fallback when no pool', async () => {
      const noPoolProtocol = new CirculationProtocol();

      const snapshot = await noPoolProtocol.getUtilizationSnapshot();

      expect(snapshot.multiplier).toBe(1.0);
      expect(snapshot.utilization).toBe(0.0);
      expect(snapshot.capacityUsed).toBe(0);
      expect(snapshot.capacityTotal).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // getReputationDiscount()
  // -------------------------------------------------------------------------

  describe('getReputationDiscount()', () => {
    it('computes average reputation across identities', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { aggregateReputation: 0.8 },
          { aggregateReputation: 0.6 },
        ],
      });

      const discount = await protocol.getReputationDiscount('op-1');

      // avg = 0.7, discount = 1.0 - 0.7 * 0.4 = 0.72
      expect(discount).toBeCloseTo(0.72, 5);
    });

    it('returns 1.0 when operator has no identities', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const discount = await protocol.getReputationDiscount('unknown');

      expect(discount).toBe(1.0);
    });

    it('returns 1.0 when no pool', async () => {
      const noPoolProtocol = new CirculationProtocol();

      const discount = await noPoolProtocol.getReputationDiscount('op-1');

      expect(discount).toBe(1.0);
    });
  });

  // -------------------------------------------------------------------------
  // computeCost()
  // -------------------------------------------------------------------------

  describe('computeCost()', () => {
    it('computes normal case cost correctly', async () => {
      // Utilization: 5/10 = 0.5 → multiplier 1.0
      pool.query
        .mockResolvedValueOnce({
          rows: [{ active_count: '5', total_capacity: '10' }],
        })
        // Reputation: avg 0.5 → discount = 1.0 - 0.5*0.4 = 0.8
        .mockResolvedValueOnce({
          rows: [{ aggregateReputation: 0.5 }],
        });

      const cost = await protocol.computeCost('op-1', 'feature', 200);

      // baseCost=1.0, util=1.0, rep=0.8, complexity=1.0 → raw=0.8
      expect(cost.finalCost).toBeCloseTo(0.8, 4);
      expect(cost.baseCost).toBe(1.0);
      expect(cost.utilizationMultiplier).toBe(1.0);
      expect(cost.reputationDiscount).toBeCloseTo(0.8, 5);
      expect(cost.complexityFactor).toBe(1.0);
      expect(cost.breakdown).toBeTruthy();
    });

    it('computes best case: low util, high rep, simple docs', async () => {
      // Utilization: 1/10 = 0.1 → multiplier 0.7
      pool.query
        .mockResolvedValueOnce({
          rows: [{ active_count: '1', total_capacity: '10' }],
        })
        // Reputation: avg 1.0 → discount = 1.0 - 1.0*0.4 = 0.6
        .mockResolvedValueOnce({
          rows: [{ aggregateReputation: 1.0 }],
        });

      const cost = await protocol.computeCost('op-1', 'docs', 50);

      // baseCost=1.0, util=0.7, rep=0.6, complexity=0.7 → raw=0.294
      expect(cost.finalCost).toBeCloseTo(0.294, 3);
      // Still above floor
      expect(cost.finalCost).toBeGreaterThanOrEqual(0.1);
    });

    it('computes worst case: high util, no rep, complex feature', async () => {
      // Utilization: 10/10 = 1.0 → multiplier 3.0
      pool.query
        .mockResolvedValueOnce({
          rows: [{ active_count: '10', total_capacity: '10' }],
        })
        // Reputation: avg 0.0 → discount = 1.0 (no discount)
        .mockResolvedValueOnce({
          rows: [{ aggregateReputation: 0.0 }],
        });

      const cost = await protocol.computeCost('op-1', 'feature', 2000);

      // baseCost=1.0, util=3.0, rep=1.0, complexity=1.4 → raw=4.2
      expect(cost.finalCost).toBeCloseTo(4.2, 4);
      expect(cost.utilizationMultiplier).toBe(3.0);
      expect(cost.reputationDiscount).toBe(1.0);
      expect(cost.complexityFactor).toBe(1.4);
    });

    it('enforces floor (INV-023): even best case >= 0.1', async () => {
      // Set up extreme best case with custom low baseCost
      const cheapProtocol = new CirculationProtocol(pool as any, {
        baseCost: 0.01,
        costFloor: 0.1,
      });

      // Utilization: 0/1 = 0.0 → multiplier 0.7
      pool.query
        .mockResolvedValueOnce({
          rows: [{ active_count: '0', total_capacity: '1' }],
        })
        // Reputation: avg 1.0 → discount = 0.6
        .mockResolvedValueOnce({
          rows: [{ aggregateReputation: 1.0 }],
        });

      const cost = await cheapProtocol.computeCost('op-1', 'review', 10);

      // baseCost=0.01, util=0.7, rep=0.6, complexity=0.6 → raw=0.00252
      // Floor enforced: max(0.1, 0.00252) = 0.1
      expect(cost.finalCost).toBe(0.1);
    });

    it('produces a non-empty breakdown string', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ active_count: '5', total_capacity: '10' }],
        })
        .mockResolvedValueOnce({
          rows: [{ aggregateReputation: 0.5 }],
        });

      const cost = await protocol.computeCost('op-1', 'feature', 200);

      expect(cost.breakdown).toContain('base=');
      expect(cost.breakdown).toContain('utilization=');
      expect(cost.breakdown).toContain('reputation=');
      expect(cost.breakdown).toContain('complexity=');
      expect(cost.breakdown).toContain('final=');
    });

    it('uses fallback multipliers without pool', async () => {
      const noPoolProtocol = new CirculationProtocol();

      const cost = await noPoolProtocol.computeCost('op-1', 'feature', 200);

      // baseCost=1.0, util=1.0 (fallback), rep=1.0 (fallback), complexity=1.0
      expect(cost.utilizationMultiplier).toBe(1.0);
      expect(cost.reputationDiscount).toBe(1.0);
      expect(cost.finalCost).toBeCloseTo(1.0, 4);
    });

    it('respects custom config values', async () => {
      const customProtocol = new CirculationProtocol(pool as any, {
        baseCost: 2.0,
        costFloor: 0.5,
        reputationWeight: 0.2,
      });

      // Utilization: 5/10 = 0.5 → multiplier 1.0
      pool.query
        .mockResolvedValueOnce({
          rows: [{ active_count: '5', total_capacity: '10' }],
        })
        // Reputation: avg 1.0, weight=0.2 → discount = 1.0 - 1.0*0.2 = 0.8
        .mockResolvedValueOnce({
          rows: [{ aggregateReputation: 1.0 }],
        });

      const cost = await customProtocol.computeCost('op-1', 'feature', 200);

      // baseCost=2.0, util=1.0, rep=0.8, complexity=1.0 → raw=1.6
      expect(cost.baseCost).toBe(2.0);
      expect(cost.finalCost).toBeCloseTo(1.6, 4);
    });
  });

  // -------------------------------------------------------------------------
  // Property-based: INV-023 — finalCost >= floor
  // -------------------------------------------------------------------------

  describe('INV-023: finalCost >= floor (property-based)', () => {
    const taskTypes: TaskType[] = ['bug_fix', 'feature', 'refactor', 'review', 'docs'];

    it('holds for 100 random inputs', async () => {
      const floor = 0.1;
      const noPoolProtocol = new CirculationProtocol(undefined, { costFloor: floor });

      for (let i = 0; i < 100; i++) {
        const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
        const descriptionLength = Math.floor(Math.random() * 3000);

        const cost = await noPoolProtocol.computeCost(
          `op-${i}`,
          taskType,
          descriptionLength,
        );

        expect(cost.finalCost).toBeGreaterThanOrEqual(floor);
      }
    });

    it('holds for 100 random inputs with mock pool', async () => {
      const floor = 0.1;

      for (let i = 0; i < 100; i++) {
        const mockPool = createMockPool();
        const randomProtocol = new CirculationProtocol(mockPool as any, { costFloor: floor });

        const activeCount = Math.floor(Math.random() * 20);
        const totalCapacity = Math.max(1, Math.floor(Math.random() * 20));
        const reputation = Math.random() * 1.5; // Can exceed 1.0

        mockPool.query
          .mockResolvedValueOnce({
            rows: [{ active_count: String(activeCount), total_capacity: String(totalCapacity) }],
          })
          .mockResolvedValueOnce({
            rows: [{ aggregateReputation: reputation }],
          });

        const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
        const descriptionLength = Math.floor(Math.random() * 3000);

        const cost = await randomProtocol.computeCost(
          `op-${i}`,
          taskType,
          descriptionLength,
        );

        expect(cost.finalCost).toBeGreaterThanOrEqual(floor);
      }
    });
  });
});
