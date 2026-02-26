/**
 * Sovereignty Engine Unit Tests — Reputation-Driven Agent Autonomy
 *
 * Tests computeAutonomyLevel pure function, AUTONOMY_RESOURCES constants,
 * GovernedResource transitions, invariant verification, and getResources.
 *
 * @since cycle-013 — Sprint 96
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SovereigntyEngine,
  computeAutonomyLevel,
  AUTONOMY_RESOURCES,
} from '../sovereignty-engine.js';
import type { AgentAutonomy } from '../sovereignty-engine.js';
import type {
  AutonomyEvent,
  AutonomyLevel,
  AgentIdentityRecord,
} from '../../types/agent-identity.js';

// ---------------------------------------------------------------------------
// Mock EventBus
// ---------------------------------------------------------------------------

function createMockEventBus() {
  return {
    emit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    removeAllHandlers: vi.fn(),
    get handlerCount() {
      return 0;
    },
  };
}

// ---------------------------------------------------------------------------
// Identity Factory
// ---------------------------------------------------------------------------

function makeIdentity(
  overrides: Partial<AgentIdentityRecord> = {},
): AgentIdentityRecord {
  return {
    id: 'identity-1',
    operatorId: 'operator-1',
    model: 'claude-opus-4-6',
    autonomyLevel: 'constrained',
    aggregateReputation: 0.5,
    taskCount: 0,
    successCount: 0,
    failureCount: 0,
    lastTaskId: null,
    createdAt: '2026-02-26T00:00:00Z',
    lastActiveAt: '2026-02-26T00:00:00Z',
    version: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeAutonomyLevel', () => {
  it('returns standard when reputation below 0.8 threshold but above 0.6 (rep=0.79, tasks=10)', () => {
    // rep=0.79 < 0.8 → not autonomous, but 0.79 >= 0.6 AND tasks=10 >= 3 → standard
    expect(computeAutonomyLevel(0.79, 10)).toBe('standard');
  });

  it('returns standard when tasks below 10 for autonomous but meets standard (rep=0.8, tasks=9)', () => {
    expect(computeAutonomyLevel(0.8, 9)).toBe('standard');
  });

  it('returns autonomous when both thresholds met (rep=0.8, tasks=10)', () => {
    expect(computeAutonomyLevel(0.8, 10)).toBe('autonomous');
  });

  it('returns standard at exact standard thresholds (rep=0.6, tasks=3)', () => {
    expect(computeAutonomyLevel(0.6, 3)).toBe('standard');
  });

  it('returns constrained when reputation just below standard (rep=0.59, tasks=100)', () => {
    expect(computeAutonomyLevel(0.59, 100)).toBe('constrained');
  });

  it('returns constrained for zero reputation (rep=0.0)', () => {
    expect(computeAutonomyLevel(0.0, 0)).toBe('constrained');
  });

  it('returns constrained for perfect reputation but insufficient tasks (rep=1.0, tasks=1)', () => {
    expect(computeAutonomyLevel(1.0, 1)).toBe('constrained');
  });

  it('returns autonomous for perfect reputation with enough tasks (rep=1.0, tasks=10)', () => {
    expect(computeAutonomyLevel(1.0, 10)).toBe('autonomous');
  });

  it('returns constrained when tasks below standard threshold (rep=0.6, tasks=2)', () => {
    expect(computeAutonomyLevel(0.6, 2)).toBe('constrained');
  });

  it('returns standard for mid-range reputation with moderate tasks (rep=0.7, tasks=5)', () => {
    expect(computeAutonomyLevel(0.7, 5)).toBe('standard');
  });

  it('returns standard for exactly 0.6 reputation at boundary (rep=0.6, tasks=100)', () => {
    expect(computeAutonomyLevel(0.6, 100)).toBe('standard');
  });

  it('returns autonomous at exact autonomous boundary (rep=0.8, tasks=10)', () => {
    expect(computeAutonomyLevel(0.8, 10)).toBe('autonomous');
  });
});

// ---------------------------------------------------------------------------
// AUTONOMY_RESOURCES
// ---------------------------------------------------------------------------

describe('AUTONOMY_RESOURCES', () => {
  it('constrained < standard < autonomous for timeoutMinutes', () => {
    expect(AUTONOMY_RESOURCES.constrained.timeoutMinutes).toBeLessThan(
      AUTONOMY_RESOURCES.standard.timeoutMinutes,
    );
    expect(AUTONOMY_RESOURCES.standard.timeoutMinutes).toBeLessThan(
      AUTONOMY_RESOURCES.autonomous.timeoutMinutes,
    );
  });

  it('constrained < standard < autonomous for maxRetries', () => {
    expect(AUTONOMY_RESOURCES.constrained.maxRetries).toBeLessThan(
      AUTONOMY_RESOURCES.standard.maxRetries,
    );
    expect(AUTONOMY_RESOURCES.standard.maxRetries).toBeLessThan(
      AUTONOMY_RESOURCES.autonomous.maxRetries,
    );
  });

  it('constrained < standard < autonomous for contextTokens', () => {
    expect(AUTONOMY_RESOURCES.constrained.contextTokens).toBeLessThan(
      AUTONOMY_RESOURCES.standard.contextTokens,
    );
    expect(AUTONOMY_RESOURCES.standard.contextTokens).toBeLessThan(
      AUTONOMY_RESOURCES.autonomous.contextTokens,
    );
  });

  it('only autonomous has canSelfModifyPrompt=true', () => {
    expect(AUTONOMY_RESOURCES.constrained.canSelfModifyPrompt).toBe(false);
    expect(AUTONOMY_RESOURCES.standard.canSelfModifyPrompt).toBe(false);
    expect(AUTONOMY_RESOURCES.autonomous.canSelfModifyPrompt).toBe(true);
  });

  it('has correct constrained values', () => {
    expect(AUTONOMY_RESOURCES.constrained).toEqual({
      timeoutMinutes: 60,
      maxRetries: 2,
      contextTokens: 6000,
      canSelfModifyPrompt: false,
    });
  });

  it('has correct standard values', () => {
    expect(AUTONOMY_RESOURCES.standard).toEqual({
      timeoutMinutes: 120,
      maxRetries: 3,
      contextTokens: 8000,
      canSelfModifyPrompt: false,
    });
  });

  it('has correct autonomous values', () => {
    expect(AUTONOMY_RESOURCES.autonomous).toEqual({
      timeoutMinutes: 240,
      maxRetries: 5,
      contextTokens: 12000,
      canSelfModifyPrompt: true,
    });
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(AUTONOMY_RESOURCES)).toBe(true);
    expect(Object.isFrozen(AUTONOMY_RESOURCES.constrained)).toBe(true);
    expect(Object.isFrozen(AUTONOMY_RESOURCES.standard)).toBe(true);
    expect(Object.isFrozen(AUTONOMY_RESOURCES.autonomous)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SovereigntyEngine — GovernedResource Interface
// ---------------------------------------------------------------------------

describe('SovereigntyEngine', () => {
  let engine: SovereigntyEngine;
  let mockBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockBus = createMockEventBus();
    engine = new SovereigntyEngine(
      mockBus as unknown as import('../cross-governor-event-bus.js').CrossGovernorEventBus,
    );
  });

  // -------------------------------------------------------------------------
  // GovernedResource interface properties
  // -------------------------------------------------------------------------

  describe('GovernedResource interface', () => {
    it('has correct resourceId and resourceType', () => {
      expect(engine.resourceId).toBe('sovereignty-engine-singleton');
      expect(engine.resourceType).toBe('sovereignty-engine');
    });

    it('provides auditTrail', () => {
      expect(engine.auditTrail).toBeDefined();
      expect(engine.auditTrail.entries).toEqual([]);
    });

    it('provides mutationLog', () => {
      expect(engine.mutationLog).toBeDefined();
      expect(engine.mutationLog).toEqual([]);
    });

    it('initial state is constrained with zero reputation and taskCount', () => {
      expect(engine.current.identityId).toBe('');
      expect(engine.current.level).toBe('constrained');
      expect(engine.current.reputation).toBe(0);
      expect(engine.current.taskCount).toBe(0);
      expect(engine.current.resources).toEqual(AUTONOMY_RESOURCES.constrained);
    });

    it('initial version is 0', () => {
      expect(engine.version).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // transition — TASK_COMPLETED
  // -------------------------------------------------------------------------

  describe('transition — TASK_COMPLETED', () => {
    it('increments taskCount on TASK_COMPLETED', async () => {
      const event: AutonomyEvent = {
        type: 'TASK_COMPLETED',
        taskId: 'task-1',
        outcome: 'merged',
      };

      const result = await engine.transition(event, 'actor-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.taskCount).toBe(1);
      }
    });

    it('upgrades level when thresholds crossed via task completion', async () => {
      // Set up: give the engine high reputation and 9 tasks (needs 10 for autonomous)
      await engine.transition(
        { type: 'REPUTATION_UPDATED', newScore: 0.9 },
        'actor-1',
      );

      // Complete 9 tasks to get to taskCount=9
      for (let i = 0; i < 9; i++) {
        await engine.transition(
          { type: 'TASK_COMPLETED', taskId: `task-${i}`, outcome: 'merged' },
          'actor-1',
        );
      }
      // At taskCount=9, rep=0.9 → standard (not enough tasks for autonomous)
      expect(engine.current.level).toBe('standard');

      // 10th task crosses the threshold
      const result = await engine.transition(
        { type: 'TASK_COMPLETED', taskId: 'task-10', outcome: 'merged' },
        'actor-1',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.level).toBe('autonomous');
        expect(result.state.taskCount).toBe(10);
        expect(result.state.resources).toEqual(AUTONOMY_RESOURCES.autonomous);
      }
    });

    it('emits level-change event on eventBus when level changes', async () => {
      // Set up: reputation 0.9
      await engine.transition(
        { type: 'REPUTATION_UPDATED', newScore: 0.9 },
        'actor-1',
      );
      mockBus.emit.mockClear();

      // Complete 3 tasks to cross standard threshold (rep=0.9, tasks=3)
      for (let i = 0; i < 2; i++) {
        await engine.transition(
          { type: 'TASK_COMPLETED', taskId: `task-${i}`, outcome: 'merged' },
          'actor-1',
        );
      }
      // Level is still constrained at taskCount=2
      expect(engine.current.level).toBe('constrained');
      mockBus.emit.mockClear();

      // 3rd task crosses standard threshold
      await engine.transition(
        { type: 'TASK_COMPLETED', taskId: 'task-3', outcome: 'merged' },
        'actor-1',
      );
      expect(engine.current.level).toBe('standard');

      // EventBus should have been called
      expect(mockBus.emit).toHaveBeenCalledOnce();
      const emittedEvent = mockBus.emit.mock.calls[0][0];
      expect(emittedEvent.metadata).toMatchObject({
        eventKind: 'AUTONOMY_LEVEL_CHANGED',
        previousLevel: 'constrained',
        newLevel: 'standard',
      });
    });

    it('does not emit event when level stays the same', async () => {
      mockBus.emit.mockClear();

      await engine.transition(
        { type: 'TASK_COMPLETED', taskId: 'task-1', outcome: 'merged' },
        'actor-1',
      );

      // Level stays constrained (rep=0, tasks=1)
      expect(engine.current.level).toBe('constrained');
      expect(mockBus.emit).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // transition — TASK_FAILED
  // -------------------------------------------------------------------------

  describe('transition — TASK_FAILED', () => {
    it('increments taskCount on TASK_FAILED', async () => {
      const event: AutonomyEvent = {
        type: 'TASK_FAILED',
        taskId: 'task-1',
        outcome: 'failed',
      };

      const result = await engine.transition(event, 'actor-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.taskCount).toBe(1);
      }
    });

    it('does not upgrade level when only task count increases (no reputation)', async () => {
      // Complete 10 failed tasks — rep stays at 0, so level stays constrained
      for (let i = 0; i < 10; i++) {
        await engine.transition(
          { type: 'TASK_FAILED', taskId: `task-${i}`, outcome: 'failed' },
          'actor-1',
        );
      }

      expect(engine.current.level).toBe('constrained');
      expect(engine.current.taskCount).toBe(10);
    });
  });

  // -------------------------------------------------------------------------
  // transition — REPUTATION_UPDATED
  // -------------------------------------------------------------------------

  describe('transition — REPUTATION_UPDATED', () => {
    it('updates reputation and recomputes level', async () => {
      // First get enough tasks for standard
      for (let i = 0; i < 3; i++) {
        await engine.transition(
          { type: 'TASK_COMPLETED', taskId: `task-${i}`, outcome: 'merged' },
          'actor-1',
        );
      }
      expect(engine.current.level).toBe('constrained'); // rep still 0

      // Now update reputation to cross standard threshold
      const result = await engine.transition(
        { type: 'REPUTATION_UPDATED', newScore: 0.7 },
        'actor-1',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.reputation).toBe(0.7);
        expect(result.state.level).toBe('standard');
        expect(result.state.resources).toEqual(AUTONOMY_RESOURCES.standard);
      }
    });

    it('downgrades level when reputation drops', async () => {
      // Set up: standard level (rep=0.7, tasks=5)
      for (let i = 0; i < 5; i++) {
        await engine.transition(
          { type: 'TASK_COMPLETED', taskId: `task-${i}`, outcome: 'merged' },
          'actor-1',
        );
      }
      await engine.transition(
        { type: 'REPUTATION_UPDATED', newScore: 0.7 },
        'actor-1',
      );
      expect(engine.current.level).toBe('standard');

      // Drop reputation below standard threshold
      const result = await engine.transition(
        { type: 'REPUTATION_UPDATED', newScore: 0.3 },
        'actor-1',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.level).toBe('constrained');
        expect(result.state.resources).toEqual(AUTONOMY_RESOURCES.constrained);
      }
    });
  });

  // -------------------------------------------------------------------------
  // transition — MANUAL_OVERRIDE
  // -------------------------------------------------------------------------

  describe('transition — MANUAL_OVERRIDE', () => {
    it('sets level directly regardless of reputation/taskCount', async () => {
      const result = await engine.transition(
        {
          type: 'MANUAL_OVERRIDE',
          newLevel: 'autonomous',
          reason: 'admin override for testing',
        },
        'admin-1',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.level).toBe('autonomous');
        expect(result.state.resources).toEqual(AUTONOMY_RESOURCES.autonomous);
        // reputation and taskCount remain unchanged
        expect(result.state.reputation).toBe(0);
        expect(result.state.taskCount).toBe(0);
      }
    });

    it('can downgrade via manual override', async () => {
      // Start at autonomous via manual
      await engine.transition(
        { type: 'MANUAL_OVERRIDE', newLevel: 'autonomous', reason: 'test' },
        'admin-1',
      );
      expect(engine.current.level).toBe('autonomous');

      // Downgrade to constrained via manual
      const result = await engine.transition(
        { type: 'MANUAL_OVERRIDE', newLevel: 'constrained', reason: 'demotion' },
        'admin-1',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.level).toBe('constrained');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Version tracking
  // -------------------------------------------------------------------------

  describe('version tracking', () => {
    it('increments version on each successful transition', async () => {
      expect(engine.version).toBe(0);

      await engine.transition(
        { type: 'TASK_COMPLETED', taskId: 'task-1', outcome: 'merged' },
        'actor-1',
      );
      expect(engine.version).toBe(1);

      await engine.transition(
        { type: 'REPUTATION_UPDATED', newScore: 0.5 },
        'actor-1',
      );
      expect(engine.version).toBe(2);

      await engine.transition(
        { type: 'TASK_FAILED', taskId: 'task-2', outcome: 'failed' },
        'actor-1',
      );
      expect(engine.version).toBe(3);

      await engine.transition(
        { type: 'MANUAL_OVERRIDE', newLevel: 'standard', reason: 'test' },
        'admin-1',
      );
      expect(engine.version).toBe(4);
    });
  });

  // -------------------------------------------------------------------------
  // Invariant Verification — INV-019
  // -------------------------------------------------------------------------

  describe('verify — INV-019', () => {
    it('returns satisfied with note about external verification', () => {
      const result = engine.verify('INV-019');

      expect(result.invariant_id).toBe('INV-019');
      expect(result.satisfied).toBe(true);
      expect(result.detail).toContain('taskCount=0');
      expect(result.detail).toContain('external verification');
      expect(result.checked_at).toBeDefined();
    });

    it('reflects current taskCount in detail', async () => {
      await engine.transition(
        { type: 'TASK_COMPLETED', taskId: 'task-1', outcome: 'merged' },
        'actor-1',
      );

      const result = engine.verify('INV-019');
      expect(result.detail).toContain('taskCount=1');
    });
  });

  // -------------------------------------------------------------------------
  // Invariant Verification — INV-020
  // -------------------------------------------------------------------------

  describe('verify — INV-020', () => {
    it('satisfied when level is stable (no transition)', () => {
      const result = engine.verify('INV-020');

      expect(result.invariant_id).toBe('INV-020');
      expect(result.satisfied).toBe(true);
      expect(result.detail).toContain('stable or increasing');
      expect(result.checked_at).toBeDefined();
    });

    it('satisfied when level increases', async () => {
      // Go from constrained to standard
      for (let i = 0; i < 3; i++) {
        await engine.transition(
          { type: 'TASK_COMPLETED', taskId: `task-${i}`, outcome: 'merged' },
          'actor-1',
        );
      }
      await engine.transition(
        { type: 'REPUTATION_UPDATED', newScore: 0.7 },
        'actor-1',
      );
      expect(engine.current.level).toBe('standard');

      const result = engine.verify('INV-020');
      expect(result.satisfied).toBe(true);
      expect(result.detail).toContain('constrained');
      expect(result.detail).toContain('standard');
    });

    it('not satisfied when level decreases via MANUAL_OVERRIDE', async () => {
      // Start at autonomous
      await engine.transition(
        { type: 'MANUAL_OVERRIDE', newLevel: 'autonomous', reason: 'test' },
        'admin-1',
      );

      // Downgrade to constrained
      await engine.transition(
        { type: 'MANUAL_OVERRIDE', newLevel: 'constrained', reason: 'test' },
        'admin-1',
      );

      const result = engine.verify('INV-020');
      expect(result.invariant_id).toBe('INV-020');
      expect(result.satisfied).toBe(false);
      expect(result.detail).toContain('decreased');
      expect(result.detail).toContain('autonomous');
      expect(result.detail).toContain('constrained');
    });

    it('not satisfied when level decreases via reputation drop', async () => {
      // Build up to standard
      for (let i = 0; i < 5; i++) {
        await engine.transition(
          { type: 'TASK_COMPLETED', taskId: `task-${i}`, outcome: 'merged' },
          'actor-1',
        );
      }
      await engine.transition(
        { type: 'REPUTATION_UPDATED', newScore: 0.7 },
        'actor-1',
      );
      expect(engine.current.level).toBe('standard');

      // Drop reputation below threshold
      await engine.transition(
        { type: 'REPUTATION_UPDATED', newScore: 0.2 },
        'actor-1',
      );
      expect(engine.current.level).toBe('constrained');

      const result = engine.verify('INV-020');
      expect(result.satisfied).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // verifyAll
  // -------------------------------------------------------------------------

  describe('verifyAll', () => {
    it('returns results for both INV-019 and INV-020', () => {
      const results = engine.verifyAll();
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.invariant_id)).toEqual(['INV-019', 'INV-020']);
    });

    it('all satisfied on fresh engine', () => {
      const results = engine.verifyAll();
      expect(results.every((r) => r.satisfied)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getResources
  // -------------------------------------------------------------------------

  describe('getResources', () => {
    it('returns constrained resources for null identity', () => {
      const resources = engine.getResources(null);
      expect(resources).toEqual(AUTONOMY_RESOURCES.constrained);
    });

    it('returns autonomous resources for high rep + many tasks', () => {
      const identity = makeIdentity({
        aggregateReputation: 0.95,
        taskCount: 20,
      });

      const resources = engine.getResources(identity);
      expect(resources).toEqual(AUTONOMY_RESOURCES.autonomous);
    });

    it('returns standard resources for mid rep + some tasks', () => {
      const identity = makeIdentity({
        aggregateReputation: 0.65,
        taskCount: 5,
      });

      const resources = engine.getResources(identity);
      expect(resources).toEqual(AUTONOMY_RESOURCES.standard);
    });

    it('returns constrained resources for low reputation', () => {
      const identity = makeIdentity({
        aggregateReputation: 0.3,
        taskCount: 100,
      });

      const resources = engine.getResources(identity);
      expect(resources).toEqual(AUTONOMY_RESOURCES.constrained);
    });

    it('returns constrained resources for high rep but no tasks', () => {
      const identity = makeIdentity({
        aggregateReputation: 1.0,
        taskCount: 0,
      });

      const resources = engine.getResources(identity);
      expect(resources).toEqual(AUTONOMY_RESOURCES.constrained);
    });

    it('returns standard at exact boundary (rep=0.8, tasks=3)', () => {
      const identity = makeIdentity({
        aggregateReputation: 0.8,
        taskCount: 3,
      });

      const resources = engine.getResources(identity);
      // rep=0.8 >= 0.8 AND taskCount=3 < 10 → standard (not autonomous)
      expect(resources).toEqual(AUTONOMY_RESOURCES.standard);
    });

    it('returns autonomous at exact boundary (rep=0.8, tasks=10)', () => {
      const identity = makeIdentity({
        aggregateReputation: 0.8,
        taskCount: 10,
      });

      const resources = engine.getResources(identity);
      expect(resources).toEqual(AUTONOMY_RESOURCES.autonomous);
    });
  });

  // -------------------------------------------------------------------------
  // Constructor without eventBus
  // -------------------------------------------------------------------------

  describe('constructor without eventBus', () => {
    it('works without eventBus (no-op on level change)', async () => {
      const engineNobus = new SovereigntyEngine();

      // Build up to trigger a level change
      for (let i = 0; i < 3; i++) {
        await engineNobus.transition(
          { type: 'TASK_COMPLETED', taskId: `task-${i}`, outcome: 'merged' },
          'actor-1',
        );
      }
      await engineNobus.transition(
        { type: 'REPUTATION_UPDATED', newScore: 0.7 },
        'actor-1',
      );

      // Should not throw despite no eventBus
      expect(engineNobus.current.level).toBe('standard');
    });
  });
});
