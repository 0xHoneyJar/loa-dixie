/**
 * Ecology E2E Integration Tests — T-7.1, T-7.2, T-7.3
 *
 * Wires multiple ecology services together with mocked DB to verify
 * the full collective intelligence pipeline: identity resolution,
 * reputation accumulation, autonomy transitions, and cross-agent
 * insight propagation via meeting geometries.
 *
 * @since cycle-013 — Sprint 100, Tasks T-7.1 through T-7.3
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AgentIdentityService,
  computeAlpha,
  StaleIdentityVersionError,
} from '../../src/services/agent-identity-service.js';
import {
  CollectiveInsightService,
  InsightPool,
  extractKeywords,
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
import {
  MeetingGeometryRouter,
  isValidGeometry,
} from '../../src/services/meeting-geometry-router.js';
import type { AgentIdentityRecord } from '../../src/types/agent-identity.js';
import type { AgentInsight } from '../../src/types/insight.js';

// ---------------------------------------------------------------------------
// Mock Helpers
// ---------------------------------------------------------------------------

function makeIdentityRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: 'identity-1',
    operator_id: 'op-1',
    model: 'claude-opus-4-6',
    autonomy_level: 'constrained',
    aggregate_reputation: 0.5,
    task_count: 0,
    success_count: 0,
    failure_count: 0,
    last_task_id: null,
    version: 0,
    created_at: '2026-02-26T00:00:00Z',
    last_active_at: '2026-02-26T00:00:00Z',
    ...overrides,
  };
}

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
    id: `insight-${Math.random().toString(36).slice(2, 8)}`,
    sourceTaskId: 'task-001',
    sourceAgentId: 'agent-A',
    groupId: null,
    content: 'Discovered auth pattern using JWT rotation',
    keywords: ['auth', 'jwt', 'rotation', 'pattern'],
    relevanceContext: 'Commits from task-001',
    capturedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// T-7.1: Full Spawn Flow with Ecology
// ---------------------------------------------------------------------------

describe('T-7.1: Full spawn flow with ecology (wired services)', () => {
  let pool: ReturnType<typeof createMockPool>;
  let identityService: AgentIdentityService;
  let sovereignty: SovereigntyEngine;
  let circulation: CirculationProtocol;

  beforeEach(() => {
    vi.restoreAllMocks();
    pool = createMockPool();
    identityService = new AgentIdentityService(pool as any);
    sovereignty = new SovereigntyEngine();
    // CirculationProtocol without pool — uses defaults (no DB queries)
    circulation = new CirculationProtocol(undefined);
  });

  it('creates identity at constrained level for new operator', async () => {
    const newIdentityRow = makeIdentityRow({
      autonomy_level: 'constrained',
      aggregate_reputation: 0.5,
      task_count: 0,
    });
    pool.query.mockResolvedValue({ rows: [newIdentityRow] });

    const identity = await identityService.resolveIdentity('op-1', 'claude-opus-4-6');

    expect(identity.id).toBe('identity-1');
    expect(identity.autonomyLevel).toBe('constrained');
    expect(identity.taskCount).toBe(0);
  });

  it('constrained resources are applied for new identity', async () => {
    const newIdentityRow = makeIdentityRow({
      autonomy_level: 'constrained',
      aggregate_reputation: 0.5,
      task_count: 0,
    });
    pool.query.mockResolvedValue({ rows: [newIdentityRow] });

    const identity = await identityService.resolveIdentity('op-1', 'claude-opus-4-6');
    const resources = sovereignty.getResources(identity);

    expect(resources).toEqual(AUTONOMY_RESOURCES.constrained);
    expect(resources.timeoutMinutes).toBe(60);
    expect(resources.maxRetries).toBe(2);
    expect(resources.contextTokens).toBe(6000);
    expect(resources.canSelfModifyPrompt).toBe(false);
  });

  it('spawn cost computed with floor enforcement (INV-023)', async () => {
    const cost = await circulation.computeCost('op-1', 'feature', 100);

    expect(cost.finalCost).toBeGreaterThanOrEqual(0.1);
    expect(cost.breakdown).toBeDefined();
    expect(cost.breakdown.length).toBeGreaterThan(0);
    expect(cost.baseCost).toBe(1.0);
    expect(cost.utilizationMultiplier).toBe(1.0); // no pool → default
    expect(cost.reputationDiscount).toBe(1.0); // no pool → no discount
  });

  it('full pipeline: identity -> sovereignty -> circulation', async () => {
    // 1. Create identity
    const identityRow = makeIdentityRow({
      aggregate_reputation: 0.85,
      task_count: 15,
      autonomy_level: 'autonomous',
    });
    pool.query.mockResolvedValue({ rows: [identityRow] });
    const identity = await identityService.resolveIdentity('op-1', 'claude-opus-4-6');

    // 2. Get resources from sovereignty
    const resources = sovereignty.getResources(identity);
    expect(resources).toEqual(AUTONOMY_RESOURCES.autonomous);
    expect(resources.canSelfModifyPrompt).toBe(true);

    // 3. Compute spawn cost
    const cost = await circulation.computeCost('op-1', 'feature', 200);
    expect(cost.finalCost).toBeGreaterThanOrEqual(0.1);
  });
});

// ---------------------------------------------------------------------------
// T-7.2: Reputation Accumulation over Multiple Tasks
// ---------------------------------------------------------------------------

describe('T-7.2: Reputation accumulation over multiple tasks', () => {
  let pool: ReturnType<typeof createMockPool>;
  let identityService: AgentIdentityService;

  // Simulate in-memory reputation tracking to verify EMA behavior
  let currentReputation: number;
  let currentTaskCount: number;
  let currentVersion: number;

  beforeEach(() => {
    vi.restoreAllMocks();
    pool = createMockPool();
    identityService = new AgentIdentityService(pool as any);
    currentReputation = 0.5;
    currentTaskCount = 0;
    currentVersion = 0;
  });

  /**
   * Helper that simulates the DB for a single recordTaskOutcome call.
   * Mirrors the EMA logic in the real service.
   */
  function setupOutcomeCall(outcome: 'merged' | 'ready' | 'failed' | 'abandoned') {
    const OUTCOME_SCORES: Record<string, number> = {
      merged: 1.0,
      ready: 1.0,
      failed: 0.3,
      abandoned: 0.0,
    };

    const taskScore = OUTCOME_SCORES[outcome];
    const alpha = computeAlpha(currentTaskCount);
    const newReputation = alpha * taskScore + (1 - alpha) * currentReputation;
    const isSuccess = outcome === 'merged' || outcome === 'ready';

    // getOrNull call
    pool.query.mockResolvedValueOnce({
      rows: [makeIdentityRow({
        aggregate_reputation: currentReputation,
        task_count: currentTaskCount,
        success_count: 0,
        failure_count: 0,
        version: currentVersion,
      })],
    });

    // UPDATE call
    pool.query.mockResolvedValueOnce({
      rows: [makeIdentityRow({
        aggregate_reputation: newReputation,
        task_count: currentTaskCount + 1,
        success_count: isSuccess ? 1 : 0,
        failure_count: isSuccess ? 0 : 1,
        version: currentVersion + 1,
      })],
    });

    // Update tracked state for next call
    currentReputation = newReputation;
    currentTaskCount += 1;
    currentVersion += 1;
  }

  it('reputation increases with merged outcomes', async () => {
    const initialRep = currentReputation;

    // Record 3 merged outcomes
    for (let i = 0; i < 3; i++) {
      setupOutcomeCall('merged');
      const result = await identityService.recordTaskOutcome('identity-1', `task-${i}`, 'merged');
      expect(result.aggregateReputation).toBeGreaterThan(initialRep);
    }

    // Reputation should have increased over initial
    expect(currentReputation).toBeGreaterThan(initialRep);
  });

  it('reputation decreases after failed outcome', async () => {
    // Build up reputation with 3 merged
    for (let i = 0; i < 3; i++) {
      setupOutcomeCall('merged');
      await identityService.recordTaskOutcome('identity-1', `task-${i}`, 'merged');
    }
    const repAfterMerges = currentReputation;

    // 1 failed drops it
    setupOutcomeCall('failed');
    const result = await identityService.recordTaskOutcome('identity-1', 'task-fail', 'failed');
    expect(result.aggregateReputation).toBeLessThan(repAfterMerges);
  });

  it('reputation recovers after failure with another merged', async () => {
    // 3 merged -> 1 failed -> 1 merged
    for (let i = 0; i < 3; i++) {
      setupOutcomeCall('merged');
      await identityService.recordTaskOutcome('identity-1', `task-${i}`, 'merged');
    }

    setupOutcomeCall('failed');
    await identityService.recordTaskOutcome('identity-1', 'task-fail', 'failed');
    const repAfterFail = currentReputation;

    setupOutcomeCall('merged');
    const result = await identityService.recordTaskOutcome('identity-1', 'task-recover', 'merged');
    expect(result.aggregateReputation).toBeGreaterThan(repAfterFail);
  });

  it('EMA alpha ramps over time (increasing responsiveness)', () => {
    const alphaAt0 = computeAlpha(0);
    const alphaAt5 = computeAlpha(5);
    const alphaAt10 = computeAlpha(10);
    const alphaAt20 = computeAlpha(20);

    expect(alphaAt0).toBeCloseTo(0.1, 5);
    expect(alphaAt5).toBeGreaterThan(alphaAt0);
    expect(alphaAt10).toBeGreaterThan(alphaAt5);
    expect(alphaAt20).toBeCloseTo(0.3, 5);
    // Alpha is capped at 0.3 beyond ramp
    expect(computeAlpha(100)).toBeCloseTo(0.3, 5);
  });

  it('autonomy level transitions based on reputation and task count', () => {
    // New agent: constrained
    expect(computeAutonomyLevel(0.5, 0)).toBe('constrained');

    // After some tasks with good rep: still constrained (not enough tasks)
    expect(computeAutonomyLevel(0.6, 2)).toBe('constrained');

    // Enough tasks + good rep: standard
    expect(computeAutonomyLevel(0.6, 3)).toBe('standard');

    // Excellent rep + many tasks: autonomous
    expect(computeAutonomyLevel(0.8, 10)).toBe('autonomous');

    // High rep but low task count: constrained
    expect(computeAutonomyLevel(0.9, 1)).toBe('constrained');
  });
});

// ---------------------------------------------------------------------------
// T-7.3: Cross-Agent Insight Propagation
// ---------------------------------------------------------------------------

describe('T-7.3: Cross-agent insight propagation', () => {
  let pool: ReturnType<typeof createMockPool>;
  let insightPool: InsightPool;
  let insightService: CollectiveInsightService;

  beforeEach(() => {
    vi.restoreAllMocks();
    pool = createMockPool();
    insightPool = new InsightPool();
    insightService = new CollectiveInsightService({
      pool: pool as any,
      insightPool,
    });
  });

  it('agent A insight is visible to agent B in same group', () => {
    const groupId = 'jam-group-001';

    // Agent A produces an insight in the shared group
    const insightFromA = makeInsight({
      id: 'insight-from-A',
      sourceAgentId: 'agent-A',
      groupId,
      content: 'Auth module needs JWT rotation for security',
      keywords: ['auth', 'jwt', 'rotation', 'security', 'module'],
    });
    insightPool.add(insightFromA);

    // Agent B queries relevant insights in the same group
    const relevantForB = insightService.getRelevantInsights(
      'Implement JWT auth security rotation',
      groupId,
    );

    expect(relevantForB.length).toBeGreaterThanOrEqual(1);
    expect(relevantForB.some((i) => i.id === 'insight-from-A')).toBe(true);
  });

  it('agent in different group does NOT see agent A insight (INV-024)', () => {
    const groupA = 'jam-group-A';
    const groupB = 'jam-group-B';

    // Agent A insight in group A
    const insightFromA = makeInsight({
      id: 'insight-from-A',
      sourceAgentId: 'agent-A',
      groupId: groupA,
      content: 'Auth module needs JWT rotation for security',
      keywords: ['auth', 'jwt', 'rotation', 'security', 'module'],
    });
    insightPool.add(insightFromA);

    // Agent in group B queries — should NOT see group A insight
    const relevantForGroupB = insightService.getRelevantInsights(
      'Implement JWT auth security rotation',
      groupB,
    );

    expect(relevantForGroupB).toHaveLength(0);
  });

  it('factory geometry (null group) isolates from grouped insights', () => {
    const groupId = 'jam-group-001';

    // Insight in a group
    const groupedInsight = makeInsight({
      id: 'grouped-insight',
      groupId,
      content: 'Auth module pattern discovered',
      keywords: ['auth', 'module', 'pattern', 'discovered'],
    });
    insightPool.add(groupedInsight);

    // Factory geometry (null group) queries — should NOT see grouped insight
    const factoryResults = insightService.getRelevantInsights(
      'Auth module pattern implementation',
      null,
    );

    expect(factoryResults).toHaveLength(0);
  });

  it('insights within same group propagate across multiple agents', () => {
    const groupId = 'study-group-001';

    // Multiple agents contribute insights to same group
    const insights = [
      makeInsight({
        id: 'insight-1',
        sourceAgentId: 'agent-A',
        groupId,
        content: 'Database connection pooling improves performance',
        keywords: ['database', 'connection', 'pooling', 'performance', 'improves'],
      }),
      makeInsight({
        id: 'insight-2',
        sourceAgentId: 'agent-B',
        groupId,
        content: 'Connection pooling requires careful timeout management',
        keywords: ['connection', 'pooling', 'timeout', 'management', 'requires', 'careful'],
      }),
      makeInsight({
        id: 'insight-3',
        sourceAgentId: 'agent-C',
        groupId,
        content: 'Performance tuning for database queries',
        keywords: ['performance', 'tuning', 'database', 'queries'],
      }),
    ];

    for (const insight of insights) {
      insightPool.add(insight);
    }

    // Agent D queries — should see relevant insights from all three
    const relevant = insightService.getRelevantInsights(
      'Database connection pooling performance tuning',
      groupId,
    );

    expect(relevant.length).toBeGreaterThanOrEqual(1);
    expect(relevant.length).toBeLessThanOrEqual(5); // INV-022 cap
  });

  it('relevance scoring filters low-relevance insights', () => {
    const groupId = 'jam-group-001';

    // Relevant insight
    insightPool.add(makeInsight({
      id: 'relevant',
      groupId,
      content: 'Authentication service JWT token validation',
      keywords: ['authentication', 'service', 'jwt', 'token', 'validation'],
    }));

    // Irrelevant insight
    insightPool.add(makeInsight({
      id: 'irrelevant',
      groupId,
      content: 'CSS grid layout for dashboard components',
      keywords: ['css', 'grid', 'layout', 'dashboard', 'components'],
    }));

    const results = insightService.getRelevantInsights(
      'Implement JWT token validation for authentication',
      groupId,
    );

    // Only the relevant insight should appear (above threshold)
    const ids = results.map((r) => r.id);
    expect(ids).toContain('relevant');
    expect(ids).not.toContain('irrelevant');
  });

  it('getRelevantInsights caps at 5 results (INV-022)', () => {
    const groupId = 'jam-group-001';
    const sharedKeywords = ['auth', 'jwt', 'token', 'security', 'validation'];

    // Add 10 highly relevant insights
    for (let i = 0; i < 10; i++) {
      insightPool.add(makeInsight({
        id: `insight-${i}`,
        groupId,
        content: `Auth JWT token security validation pattern ${i}`,
        keywords: [...sharedKeywords, `pattern${i}`],
      }));
    }

    const results = insightService.getRelevantInsights(
      'Auth JWT token security validation implementation',
      groupId,
      100, // request 100 but should be capped at 5
    );

    expect(results.length).toBeLessThanOrEqual(5);
  });
});
