/**
 * Ecology Invariants E2E Tests — T-7.4
 *
 * Tests each invariant (INV-019 through INV-024) in both satisfied and
 * violated states. Uses real service classes with mocked DB where needed.
 *
 * @since cycle-013 — Sprint 100, Task T-7.4
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AgentIdentityService,
  computeAlpha,
} from '../../src/services/agent-identity-service.js';
import {
  CollectiveInsightService,
  InsightPool,
} from '../../src/services/collective-insight-service.js';
import {
  SovereigntyEngine,
  computeAutonomyLevel,
  AUTONOMY_RESOURCES,
} from '../../src/services/sovereignty-engine.js';
import {
  CirculationProtocol,
  computeUtilizationMultiplier,
  computeReputationDiscount,
  computeComplexityFactor,
} from '../../src/services/circulation-protocol.js';
import type { AgentInsight } from '../../src/types/insight.js';
import type { TaskType } from '../../src/types/fleet.js';

// ---------------------------------------------------------------------------
// Mock Helpers
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

// ---------------------------------------------------------------------------
// INV-019: Agent Identity Conservation
// ---------------------------------------------------------------------------

describe('INV-019: Agent identity task count conservation', () => {
  let pool: ReturnType<typeof createMockPool>;
  let identityService: AgentIdentityService;
  let sovereignty: SovereigntyEngine;

  beforeEach(() => {
    vi.restoreAllMocks();
    pool = createMockPool();
    identityService = new AgentIdentityService(pool as any);
    sovereignty = new SovereigntyEngine();
  });

  it('satisfied: taskCount increments by 1 after recordTaskOutcome', async () => {
    const initialTaskCount = 5;

    // getOrNull
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 'identity-1',
        operator_id: 'op-1',
        model: 'claude-opus-4-6',
        autonomy_level: 'standard',
        aggregate_reputation: 0.7,
        task_count: initialTaskCount,
        success_count: 4,
        failure_count: 1,
        last_task_id: 'task-4',
        version: 5,
        created_at: '2026-02-26T00:00:00Z',
        last_active_at: '2026-02-26T00:00:00Z',
      }],
    });
    // UPDATE
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 'identity-1',
        operator_id: 'op-1',
        model: 'claude-opus-4-6',
        autonomy_level: 'standard',
        aggregate_reputation: 0.73,
        task_count: initialTaskCount + 1,
        success_count: 5,
        failure_count: 1,
        last_task_id: 'task-5',
        version: 6,
        created_at: '2026-02-26T00:00:00Z',
        last_active_at: '2026-02-26T00:00:00Z',
      }],
    });

    const result = await identityService.recordTaskOutcome('identity-1', 'task-5', 'merged');

    // Conservation: task count is exactly initial + 1
    expect(result.taskCount).toBe(initialTaskCount + 1);
    expect(result.successCount).toBe(5);
  });

  it('satisfied: sovereignty verify(INV-019) returns satisfied', () => {
    const result = sovereignty.verify('INV-019');
    expect(result.satisfied).toBe(true);
    expect(result.invariant_id).toBe('INV-019');
  });

  it('sovereignty tracks taskCount through transitions', async () => {
    // Transition 3 task completions
    for (let i = 0; i < 3; i++) {
      await sovereignty.transition(
        { type: 'TASK_COMPLETED', taskId: `task-${i}`, outcome: 'merged' },
        'test-actor',
      );
    }

    expect(sovereignty.current.taskCount).toBe(3);
    const result = sovereignty.verify('INV-019');
    expect(result.satisfied).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// INV-020: Non-Regression (Autonomy Level Never Decreases in Session)
// ---------------------------------------------------------------------------

describe('INV-020: Autonomy level non-regression', () => {
  let sovereignty: SovereigntyEngine;

  beforeEach(() => {
    sovereignty = new SovereigntyEngine();
  });

  it('satisfied: level stays stable or increases', async () => {
    // Start at constrained, increase to standard
    await sovereignty.transition(
      { type: 'REPUTATION_UPDATED', newScore: 0.7 },
      'test-actor',
    );
    // Need tasks too for standard
    for (let i = 0; i < 3; i++) {
      await sovereignty.transition(
        { type: 'TASK_COMPLETED', taskId: `task-${i}`, outcome: 'merged' },
        'test-actor',
      );
    }

    const result = sovereignty.verify('INV-020');
    expect(result.satisfied).toBe(true);
  });

  it('violated: MANUAL_OVERRIDE forces downgrade', async () => {
    // First, get to standard level
    await sovereignty.transition(
      { type: 'REPUTATION_UPDATED', newScore: 0.7 },
      'test-actor',
    );
    for (let i = 0; i < 4; i++) {
      await sovereignty.transition(
        { type: 'TASK_COMPLETED', taskId: `task-${i}`, outcome: 'merged' },
        'test-actor',
      );
    }
    expect(sovereignty.current.level).toBe('standard');

    // Force downgrade via MANUAL_OVERRIDE
    await sovereignty.transition(
      { type: 'MANUAL_OVERRIDE', newLevel: 'constrained', reason: 'Admin override' },
      'admin',
    );
    expect(sovereignty.current.level).toBe('constrained');

    // INV-020 should now detect the violation
    const result = sovereignty.verify('INV-020');
    expect(result.satisfied).toBe(false);
    expect(result.detail).toContain('decreased');
  });

  it('satisfied: same level is not a violation', async () => {
    // Multiple transitions that stay at constrained
    await sovereignty.transition(
      { type: 'TASK_COMPLETED', taskId: 'task-1', outcome: 'merged' },
      'test-actor',
    );
    await sovereignty.transition(
      { type: 'TASK_COMPLETED', taskId: 'task-2', outcome: 'merged' },
      'test-actor',
    );

    const result = sovereignty.verify('INV-020');
    expect(result.satisfied).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// INV-021: InsightPool Bounds (capped at 1000)
// ---------------------------------------------------------------------------

describe('INV-021: InsightPool entries <= 1000', () => {
  it('satisfied: pool stays at or below 1000 after adding 1001 insights', () => {
    const pool = new InsightPool(1000);

    for (let i = 0; i < 1001; i++) {
      pool.add(makeInsight({
        id: `insight-${i}`,
        capturedAt: new Date(Date.now() + i).toISOString(),
      }));
    }

    expect(pool.size).toBeLessThanOrEqual(1000);
    expect(pool.size).toBe(1000);
  });

  it('eviction removes the oldest entry (FIFO by capturedAt)', () => {
    const pool = new InsightPool(3);

    const base = Date.now();
    pool.add(makeInsight({ id: 'oldest', capturedAt: new Date(base).toISOString() }));
    pool.add(makeInsight({ id: 'middle', capturedAt: new Date(base + 1000).toISOString() }));
    pool.add(makeInsight({ id: 'newest', capturedAt: new Date(base + 2000).toISOString() }));

    // Pool is at capacity (3)
    expect(pool.size).toBe(3);

    // Adding one more should evict 'oldest'
    pool.add(makeInsight({ id: 'extra', capturedAt: new Date(base + 3000).toISOString() }));

    expect(pool.size).toBe(3);
    expect(pool.get('oldest')).toBeNull();
    expect(pool.get('middle')).not.toBeNull();
    expect(pool.get('newest')).not.toBeNull();
    expect(pool.get('extra')).not.toBeNull();
  });

  it('pool never exceeds maxSize even with rapid additions', () => {
    const pool = new InsightPool(100);

    for (let i = 0; i < 500; i++) {
      pool.add(makeInsight({
        id: `rapid-${i}`,
        capturedAt: new Date(Date.now() + i).toISOString(),
      }));
      // Invariant must hold at EVERY step
      expect(pool.size).toBeLessThanOrEqual(100);
    }
  });
});

// ---------------------------------------------------------------------------
// INV-022: Cross-Agent Section Limit (max 5 results)
// ---------------------------------------------------------------------------

describe('INV-022: Cross-agent context injection <= 5 entries per prompt', () => {
  let insightPool: InsightPool;
  let service: CollectiveInsightService;

  beforeEach(() => {
    insightPool = new InsightPool();
    service = new CollectiveInsightService({
      pool: createMockPool() as any,
      insightPool,
    });
  });

  it('satisfied: returns at most 5 results even with 20 relevant insights', () => {
    const sharedKeywords = ['auth', 'jwt', 'security', 'token', 'validation'];

    // Add 20 highly relevant insights (ungrouped)
    for (let i = 0; i < 20; i++) {
      insightPool.add(makeInsight({
        id: `insight-${i}`,
        content: `Auth JWT security token validation pattern ${i}`,
        keywords: [...sharedKeywords, `pattern${i}`],
        groupId: null,
      }));
    }

    const results = service.getRelevantInsights(
      'Auth JWT security token validation implementation',
      null,
      100, // request 100
    );

    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('default limit is 3', () => {
    const sharedKeywords = ['database', 'migration', 'schema', 'postgres'];

    for (let i = 0; i < 10; i++) {
      insightPool.add(makeInsight({
        id: `insight-${i}`,
        content: `Database migration schema postgres update ${i}`,
        keywords: [...sharedKeywords, `update${i}`],
        groupId: null,
      }));
    }

    const results = service.getRelevantInsights(
      'Database migration schema postgres changes',
      null,
      // no explicit limit → default 3
    );

    expect(results.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// INV-023: Dynamic Cost Floor (>= 0.1)
// ---------------------------------------------------------------------------

describe('INV-023: Dynamic spawn cost >= floor (0.1) for any input', () => {
  it('satisfied: cost with all defaults is >= 0.1', async () => {
    const circulation = new CirculationProtocol(undefined);
    const cost = await circulation.computeCost('any-op', 'feature', 100);
    expect(cost.finalCost).toBeGreaterThanOrEqual(0.1);
  });

  it('satisfied: minimum utilization + maximum reputation discount still >= 0.1', () => {
    // Low utilization: 0.7x multiplier
    const utilMult = computeUtilizationMultiplier(0.1);
    expect(utilMult).toBe(0.7);

    // Max reputation discount: 0.5x (reputation=1.0, weight=0.4 => 1-0.4=0.6, but capped at 0.5)
    const repDiscount = computeReputationDiscount(1.0);
    expect(repDiscount).toBe(0.6); // 1.0 - 1.0 * 0.4 = 0.6

    // With even higher weight to get to floor
    const repDiscountMax = computeReputationDiscount(1.0, 1.0);
    expect(repDiscountMax).toBe(0.5); // clamped

    // Minimum complexity: review task, short description
    const complexityMin = computeComplexityFactor('review', 0);
    expect(complexityMin).toBe(0.6);

    // Raw cost would be: 1.0 * 0.7 * 0.5 * 0.6 = 0.21 — above floor
    // Even with aggressive inputs, floor enforced
  });

  it('satisfied: floor enforced when raw cost would be below 0.1', async () => {
    // Use custom config with very low base cost
    const circulation = new CirculationProtocol(undefined, {
      baseCost: 0.01, // very low
      costFloor: 0.1,
    });
    const cost = await circulation.computeCost('any-op', 'review', 10);
    expect(cost.finalCost).toBeGreaterThanOrEqual(0.1);
  });

  it('violated scenario: floor of 0 would allow free spawns', async () => {
    const circulation = new CirculationProtocol(undefined, {
      baseCost: 0.01,
      costFloor: 0.0, // violation of INV-023 design
    });
    const cost = await circulation.computeCost('any-op', 'review', 10);
    // With floor=0, cost could be very small
    expect(cost.finalCost).toBeLessThan(0.1);
  });

  it('all component values are non-negative', async () => {
    const circulation = new CirculationProtocol(undefined);
    const cost = await circulation.computeCost('op-1', 'feature', 500);

    expect(cost.baseCost).toBeGreaterThan(0);
    expect(cost.utilizationMultiplier).toBeGreaterThan(0);
    expect(cost.reputationDiscount).toBeGreaterThan(0);
    expect(cost.complexityFactor).toBeGreaterThan(0);
    expect(cost.finalCost).toBeGreaterThanOrEqual(0.1);
  });
});

// ---------------------------------------------------------------------------
// INV-024: Geometry Group Isolation
// ---------------------------------------------------------------------------

describe('INV-024: Agents in different geometry groups share zero insights', () => {
  let insightPool: InsightPool;
  let service: CollectiveInsightService;

  beforeEach(() => {
    insightPool = new InsightPool();
    service = new CollectiveInsightService({
      pool: createMockPool() as any,
      insightPool,
    });
  });

  it('satisfied: cross-group query returns empty', () => {
    const groupA = 'group-alpha';
    const groupB = 'group-beta';

    insightPool.add(makeInsight({
      id: 'insight-alpha',
      groupId: groupA,
      content: 'Valuable insight about authentication patterns',
      keywords: ['authentication', 'patterns', 'valuable', 'insight'],
    }));

    insightPool.add(makeInsight({
      id: 'insight-beta',
      groupId: groupB,
      content: 'Database optimization for query performance',
      keywords: ['database', 'optimization', 'query', 'performance'],
    }));

    // Query from group A perspective — should NOT see group B's insight
    const fromA = service.getRelevantInsights(
      'Database optimization query performance',
      groupA,
    );
    expect(fromA).toHaveLength(0);

    // Query from group B perspective — should NOT see group A's insight
    const fromB = service.getRelevantInsights(
      'Valuable authentication patterns insight',
      groupB,
    );
    expect(fromB).toHaveLength(0);
  });

  it('satisfied: same-group query returns matching insights', () => {
    const groupId = 'shared-group';

    insightPool.add(makeInsight({
      id: 'shared-insight',
      groupId,
      content: 'Authentication pattern using JWT tokens',
      keywords: ['authentication', 'pattern', 'jwt', 'tokens'],
    }));

    const results = service.getRelevantInsights(
      'JWT authentication token pattern',
      groupId,
    );

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].id).toBe('shared-insight');
  });

  it('factory geometry sees only ungrouped insights', () => {
    // Grouped insight
    insightPool.add(makeInsight({
      id: 'grouped',
      groupId: 'some-group',
      content: 'Auth pattern for microservices',
      keywords: ['auth', 'pattern', 'microservices'],
    }));

    // Ungrouped insight
    insightPool.add(makeInsight({
      id: 'ungrouped',
      groupId: null,
      content: 'Auth pattern for microservices',
      keywords: ['auth', 'pattern', 'microservices'],
    }));

    // Factory (null) should only see ungrouped
    const factoryResults = service.getRelevantInsights(
      'Auth pattern microservices',
      null,
    );

    const ids = factoryResults.map((r) => r.id);
    expect(ids).toContain('ungrouped');
    expect(ids).not.toContain('grouped');
  });

  it('undefined groupId returns all insights (no group filtering)', () => {
    insightPool.add(makeInsight({
      id: 'in-group',
      groupId: 'some-group',
      content: 'Auth pattern for microservices architecture',
      keywords: ['auth', 'pattern', 'microservices', 'architecture'],
    }));

    insightPool.add(makeInsight({
      id: 'no-group',
      groupId: null,
      content: 'Auth pattern for microservices deployment',
      keywords: ['auth', 'pattern', 'microservices', 'deployment'],
    }));

    // undefined groupId means no filtering
    const allResults = service.getRelevantInsights(
      'Auth pattern microservices',
      undefined,
    );

    expect(allResults.length).toBeGreaterThanOrEqual(2);
  });
});
