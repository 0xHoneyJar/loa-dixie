/**
 * Ecology Stress Tests — T-7.6, T-7.7
 *
 * T-7.6: InsightPool stress test — 5000 rapid additions, FIFO eviction,
 *         relevance scoring performance.
 * T-7.7: CirculationProtocol property-based test — 1000 random input
 *         combinations validating INV-023 (cost floor).
 *
 * @since cycle-013 — Sprint 100, Tasks T-7.6, T-7.7
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CollectiveInsightService,
  InsightPool,
} from '../../src/services/collective-insight-service.js';
import {
  CirculationProtocol,
  computeUtilizationMultiplier,
  computeReputationDiscount,
  computeComplexityFactor,
} from '../../src/services/circulation-protocol.js';
import type { AgentInsight } from '../../src/types/insight.js';
import type { TaskType } from '../../src/types/fleet.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockPool() {
  return {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  };
}

function makeInsight(overrides: Partial<AgentInsight> = {}): AgentInsight {
  const now = new Date();
  return {
    id: `insight-${Math.random().toString(36).slice(2, 10)}`,
    sourceTaskId: 'task-001',
    sourceAgentId: 'agent-A',
    groupId: null,
    content: 'Test insight content',
    keywords: ['test', 'insight'],
    relevanceContext: 'test context',
    capturedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

// Simple seeded PRNG for reproducible randomness
function createRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// ---------------------------------------------------------------------------
// T-7.6: InsightPool Stress Test
// ---------------------------------------------------------------------------

describe('T-7.6: InsightPool stress test', () => {
  it('pool.size <= 1000 at all times when adding 5000 insights rapidly', () => {
    const pool = new InsightPool(1000);

    for (let i = 0; i < 5000; i++) {
      pool.add(makeInsight({
        id: `stress-${i}`,
        capturedAt: new Date(Date.now() + i).toISOString(),
      }));

      // Invariant must hold at EVERY insertion
      expect(pool.size).toBeLessThanOrEqual(1000);
    }

    // Final state
    expect(pool.size).toBe(1000);
  });

  it('eviction is FIFO (oldest by capturedAt removed first)', () => {
    const pool = new InsightPool(100);
    const baseTime = Date.now();

    // Fill pool with 100 insights, ordered by time
    for (let i = 0; i < 100; i++) {
      pool.add(makeInsight({
        id: `ordered-${i}`,
        capturedAt: new Date(baseTime + i * 1000).toISOString(),
      }));
    }

    // Add 50 more — should evict the first 50
    for (let i = 100; i < 150; i++) {
      pool.add(makeInsight({
        id: `ordered-${i}`,
        capturedAt: new Date(baseTime + i * 1000).toISOString(),
      }));
    }

    expect(pool.size).toBe(100);

    // First 50 should be evicted
    for (let i = 0; i < 50; i++) {
      expect(pool.get(`ordered-${i}`)).toBeNull();
    }

    // Last 100 (50-149) should remain
    for (let i = 50; i < 150; i++) {
      expect(pool.get(`ordered-${i}`)).not.toBeNull();
    }
  });

  it('relevance scoring for 1000 insights completes under 50ms', () => {
    const pool = new InsightPool(1000);
    const mockPool = createMockPool();
    const service = new CollectiveInsightService({
      pool: mockPool as any,
      insightPool: pool,
    });

    // Fill with 1000 insights with varied keywords
    const categories = ['auth', 'database', 'api', 'cache', 'queue', 'metrics'];
    for (let i = 0; i < 1000; i++) {
      const category = categories[i % categories.length];
      pool.add(makeInsight({
        id: `perf-${i}`,
        content: `${category} service implementation pattern ${i} with optimization`,
        keywords: [category, 'service', 'implementation', 'pattern', 'optimization', `item${i}`],
        groupId: null,
      }));
    }

    // Measure relevance scoring time
    const start = performance.now();
    const results = service.getRelevantInsights(
      'Auth service implementation pattern with caching optimization',
      null,
    );
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50); // Must complete under 50ms
    expect(results.length).toBeLessThanOrEqual(5); // INV-022
  });

  it('pool handles duplicate IDs (replace, no capacity growth)', () => {
    const pool = new InsightPool(10);

    // Add 5 unique insights
    for (let i = 0; i < 5; i++) {
      pool.add(makeInsight({ id: `dup-${i}` }));
    }
    expect(pool.size).toBe(5);

    // Re-add same 5 — size should stay at 5
    for (let i = 0; i < 5; i++) {
      pool.add(makeInsight({
        id: `dup-${i}`,
        content: 'updated content',
      }));
    }
    expect(pool.size).toBe(5);

    // Verify content was updated
    const entry = pool.get('dup-0');
    expect(entry).not.toBeNull();
    expect(entry!.content).toBe('updated content');
  });
});

// ---------------------------------------------------------------------------
// T-7.7: CirculationProtocol Property-Based Test
// ---------------------------------------------------------------------------

describe('T-7.7: CirculationProtocol property-based test (1000 random combos)', () => {
  const TASK_TYPES: TaskType[] = ['bug_fix', 'feature', 'refactor', 'review', 'docs'];
  const rng = createRng(42); // deterministic seed

  it('finalCost >= 0.1 for 1000 random input combinations (INV-023)', async () => {
    const circulation = new CirculationProtocol(undefined);

    for (let i = 0; i < 1000; i++) {
      const operatorId = `op-${Math.floor(rng() * 100)}`;
      const taskType = TASK_TYPES[Math.floor(rng() * TASK_TYPES.length)];
      const descriptionLength = Math.floor(rng() * 5000); // 0 to 5000 chars

      const cost = await circulation.computeCost(operatorId, taskType, descriptionLength);

      // INV-023: finalCost must always be >= floor
      expect(cost.finalCost).toBeGreaterThanOrEqual(0.1);
    }
  });

  it('all sub-components are non-negative for random inputs', () => {
    const rngLocal = createRng(123);

    for (let i = 0; i < 1000; i++) {
      const utilization = rngLocal(); // 0 to 1
      const reputation = rngLocal(); // 0 to 1
      const taskType = TASK_TYPES[Math.floor(rngLocal() * TASK_TYPES.length)];
      const descLength = Math.floor(rngLocal() * 3000);

      const utilMult = computeUtilizationMultiplier(utilization);
      const repDiscount = computeReputationDiscount(reputation);
      const complexity = computeComplexityFactor(taskType, descLength);

      expect(utilMult).toBeGreaterThanOrEqual(0);
      expect(repDiscount).toBeGreaterThanOrEqual(0);
      expect(complexity).toBeGreaterThanOrEqual(0);

      // Computed raw cost is non-negative
      const rawCost = 1.0 * utilMult * repDiscount * complexity;
      expect(rawCost).toBeGreaterThanOrEqual(0);
    }
  });

  it('breakdown string is non-empty for all random inputs', async () => {
    const circulation = new CirculationProtocol(undefined);
    const rngLocal = createRng(999);

    for (let i = 0; i < 100; i++) {
      const taskType = TASK_TYPES[Math.floor(rngLocal() * TASK_TYPES.length)];
      const descLength = Math.floor(rngLocal() * 2000);

      const cost = await circulation.computeCost(`op-${i}`, taskType, descLength);

      expect(cost.breakdown).toBeDefined();
      expect(cost.breakdown.length).toBeGreaterThan(0);
      expect(cost.breakdown).toContain('base=');
      expect(cost.breakdown).toContain('final=');
    }
  });

  it('utilization multiplier tiers are correctly bounded', () => {
    // Test boundary conditions
    expect(computeUtilizationMultiplier(0.0)).toBe(0.7);
    expect(computeUtilizationMultiplier(0.39)).toBe(0.7);
    expect(computeUtilizationMultiplier(0.4)).toBe(1.0);
    expect(computeUtilizationMultiplier(0.79)).toBe(1.0);
    expect(computeUtilizationMultiplier(0.8)).toBe(1.5);
    expect(computeUtilizationMultiplier(0.94)).toBe(1.5);
    expect(computeUtilizationMultiplier(0.95)).toBe(3.0);
    expect(computeUtilizationMultiplier(1.0)).toBe(3.0);
  });

  it('reputation discount is clamped to [0.5, 1.0]', () => {
    const rngLocal = createRng(777);

    for (let i = 0; i < 500; i++) {
      const reputation = rngLocal();
      const weight = rngLocal();
      const discount = computeReputationDiscount(reputation, weight);

      expect(discount).toBeGreaterThanOrEqual(0.5);
      expect(discount).toBeLessThanOrEqual(1.0);
    }
  });

  it('complexity factor is capped at 1.5', () => {
    for (const taskType of TASK_TYPES) {
      for (const descLen of [0, 100, 500, 501, 1000, 1001, 5000]) {
        const factor = computeComplexityFactor(taskType, descLen);
        expect(factor).toBeLessThanOrEqual(1.5);
        expect(factor).toBeGreaterThan(0);
      }
    }
  });

  it('extreme inputs: all factors at minimum still produce cost >= floor', async () => {
    // Minimum utilization (0.7x), maximum reputation discount, minimum complexity
    // baseCost * 0.7 * 0.5 * 0.6 = 0.21 — above 0.1 floor
    // But with lower baseCost, floor should kick in
    const circulation = new CirculationProtocol(undefined, {
      baseCost: 0.01,
      costFloor: 0.1,
    });

    const cost = await circulation.computeCost('op-extreme', 'review', 0);

    // Even with very low inputs, floor enforced
    expect(cost.finalCost).toBeGreaterThanOrEqual(0.1);
  });
});
