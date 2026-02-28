/**
 * GovernedResource Canonical Migration — Type Barrel Verification
 *
 * Verifies the governed-resource.ts type-mapping barrel:
 * - Dixie types (TransitionResult, InvariantResult, GovernedResource) remain stable
 * - Canonical types re-exported with Canonical prefix
 * - toMutationContext helper produces valid MutationContext
 * - GovernedResourceBase abstract class successfully removed (no runtime impact)
 *
 * @since cycle-019 — Sprint 120, Task T5.1/T5.6
 */
import { describe, it, expect } from 'vitest';
import {
  toMutationContext,
  type TransitionResult,
  type InvariantResult,
  type GovernedResource,
  type CanonicalTransitionResult,
  type CanonicalInvariantResult,
  type CanonicalGovernedResource,
  type MutationContext,
} from '../governed-resource.js';

// ---------------------------------------------------------------------------
// T5.1: toMutationContext helper
// ---------------------------------------------------------------------------

describe('toMutationContext', () => {
  it('creates MutationContext with default actorType "system"', () => {
    const ctx = toMutationContext('agent-42');
    expect(ctx).toEqual({ actorId: 'agent-42', actorType: 'system' });
  });

  it('creates MutationContext with explicit actorType "human"', () => {
    const ctx = toMutationContext('user-1', 'human');
    expect(ctx).toEqual({ actorId: 'user-1', actorType: 'human' });
  });

  it('creates MutationContext with actorType "autonomous"', () => {
    const ctx = toMutationContext('fleet-agent-7', 'autonomous');
    expect(ctx).toEqual({ actorId: 'fleet-agent-7', actorType: 'autonomous' });
  });
});

// ---------------------------------------------------------------------------
// T5.6: Dixie type shapes remain valid (compile-time + runtime structure)
// ---------------------------------------------------------------------------

describe('Dixie TransitionResult shape', () => {
  it('success variant has state field (not newState)', () => {
    const result: TransitionResult<{ count: number }> = {
      success: true,
      state: { count: 42 },
      version: 1,
    };
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state).toEqual({ count: 42 });
      expect(result.version).toBe(1);
    }
  });

  it('failure variant has reason and code fields', () => {
    const result: TransitionResult<{ count: number }> = {
      success: false,
      reason: 'Invariant violated',
      code: 'INV_VIOLATION',
    };
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('Invariant violated');
      expect(result.code).toBe('INV_VIOLATION');
    }
  });
});

describe('Dixie InvariantResult shape', () => {
  it('has invariant_id (snake_case), satisfied, detail, checked_at', () => {
    const result: InvariantResult = {
      invariant_id: 'INV-001',
      satisfied: true,
      detail: 'All good',
      checked_at: '2026-02-28T00:00:00Z',
    };
    expect(result.invariant_id).toBe('INV-001');
    expect(result.satisfied).toBe(true);
    expect(result.detail).toBe('All good');
    expect(result.checked_at).toBe('2026-02-28T00:00:00Z');
  });
});

// ---------------------------------------------------------------------------
// Type-level assertions (compile-time only — if these compile, they pass)
// ---------------------------------------------------------------------------

describe('canonical type re-exports are accessible', () => {
  it('CanonicalTransitionResult has newState field', () => {
    // Compile-time assertion: canonical uses newState, not state
    const _result: CanonicalTransitionResult<number> = {
      success: true,
      newState: 42,
      version: 1,
    };
    expect(_result.newState).toBe(42);
  });

  it('CanonicalInvariantResult has holds field', () => {
    // Compile-time assertion: canonical uses holds, not satisfied
    const _result: CanonicalInvariantResult = {
      invariantId: 'INV-001',
      holds: true,
    };
    expect(_result.holds).toBe(true);
    expect(_result.detail).toBeUndefined(); // optional in canonical
  });

  it('MutationContext has actorId and actorType', () => {
    const ctx: MutationContext = {
      actorId: 'test',
      actorType: 'system',
    };
    expect(ctx.actorId).toBe('test');
    expect(ctx.actorType).toBe('system');
  });
});

// ---------------------------------------------------------------------------
// GovernedResourceBase removal verification
// ---------------------------------------------------------------------------

describe('GovernedResourceBase removal', () => {
  it('governed-resource.ts no longer exports GovernedResourceBase', async () => {
    const mod = await import('../governed-resource.js');
    // GovernedResourceBase was removed — should NOT be in exports
    expect('GovernedResourceBase' in mod).toBe(false);
    // toMutationContext IS a value export
    expect(typeof mod.toMutationContext).toBe('function');
  });
});
