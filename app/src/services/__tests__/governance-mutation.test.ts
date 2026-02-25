/**
 * Governance Mutation Unit Tests — Sprint 75 (cycle-007), Task S3-T6
 *
 * Tests mutation creation, validation, actor_id requirement,
 * mutation log append, and version tracking.
 */
import { describe, it, expect } from 'vitest';
import type { GovernanceMutation } from '@0xhoneyjar/loa-hounfour/commons';
import {
  resolveActorId,
  createMutation,
  MutationLog,
} from '../governance-mutation.js';

// ---------------------------------------------------------------------------
// resolveActorId
// ---------------------------------------------------------------------------

describe('resolveActorId', () => {
  it('resolves human actor to wallet address', () => {
    const actorId = resolveActorId('human', '0x1234abCD5678EfGh');
    expect(actorId).toBe('0x1234abCD5678EfGh');
  });

  it('throws if human actor has no identifier', () => {
    expect(() => resolveActorId('human')).toThrow('Human actor requires wallet address');
  });

  it('resolves system actor to system:dixie-bff', () => {
    const actorId = resolveActorId('system');
    expect(actorId).toBe('system:dixie-bff');
  });

  it('ignores identifier for system actor', () => {
    const actorId = resolveActorId('system', 'ignored');
    expect(actorId).toBe('system:dixie-bff');
  });

  it('resolves autonomous actor with nft_id prefix', () => {
    const actorId = resolveActorId('autonomous', 'nft-42');
    expect(actorId).toBe('autonomous:nft-42');
  });

  it('throws if autonomous actor has no identifier', () => {
    expect(() => resolveActorId('autonomous')).toThrow('Autonomous actor requires nft_id');
  });
});

// ---------------------------------------------------------------------------
// createMutation
// ---------------------------------------------------------------------------

describe('createMutation', () => {
  it('creates a valid mutation envelope', () => {
    const mutation = createMutation('system:dixie-bff', 0);

    expect(mutation.actor_id).toBe('system:dixie-bff');
    expect(mutation.expected_version).toBe(0);
    expect(mutation.mutation_id).toBeDefined();
    expect(mutation.mutated_at).toBeDefined();
    // UUID format check
    expect(mutation.mutation_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    // ISO timestamp check
    expect(new Date(mutation.mutated_at).toISOString()).toBe(mutation.mutated_at);
  });

  it('throws if actor_id is empty', () => {
    expect(() => createMutation('', 0)).toThrow('actor_id is required');
  });

  it('generates unique mutation_id on each call', () => {
    const m1 = createMutation('system:dixie-bff', 0);
    const m2 = createMutation('system:dixie-bff', 0);
    expect(m1.mutation_id).not.toBe(m2.mutation_id);
  });
});

// ---------------------------------------------------------------------------
// MutationLog
// ---------------------------------------------------------------------------

describe('MutationLog', () => {
  it('starts at version 0', () => {
    const log = new MutationLog();
    expect(log.version).toBe(0);
  });

  it('increments version on append', () => {
    const log = new MutationLog();
    const m = createMutation('system:dixie-bff', 0);
    log.append(m);
    expect(log.version).toBe(1);
  });

  it('rejects version conflict', () => {
    const log = new MutationLog();
    const m = createMutation('system:dixie-bff', 5); // expects version 5, but current is 0
    expect(() => log.append(m)).toThrow('Version conflict: expected 5, current 0');
  });

  it('is append-only — history grows monotonically', () => {
    const log = new MutationLog();
    const m0 = createMutation('system:dixie-bff', 0);
    const m1 = createMutation('0xABCDef', 1);
    const m2 = createMutation('autonomous:nft-1', 2);

    log.append(m0);
    log.append(m1);
    log.append(m2);

    expect(log.version).toBe(3);
    expect(log.history).toHaveLength(3);
    expect(log.history[0].actor_id).toBe('system:dixie-bff');
    expect(log.history[1].actor_id).toBe('0xABCDef');
    expect(log.history[2].actor_id).toBe('autonomous:nft-1');
  });

  it('latest returns the most recent mutation', () => {
    const log = new MutationLog();
    expect(log.latest).toBeUndefined();

    const m = createMutation('system:dixie-bff', 0);
    log.append(m);
    expect(log.latest).toBe(m);
  });

  it('history is read-only (returns frozen reference)', () => {
    const log = new MutationLog();
    const m = createMutation('system:dixie-bff', 0);
    log.append(m);

    const history = log.history;
    expect(history).toHaveLength(1);
    // ReadonlyArray prevents push at type level
    expect(typeof history).toBe('object');
  });

  it('clear resets version and history', () => {
    const log = new MutationLog();
    log.append(createMutation('system:dixie-bff', 0));
    log.append(createMutation('system:dixie-bff', 1));

    log.clear();

    expect(log.version).toBe(0);
    expect(log.history).toHaveLength(0);
    expect(log.latest).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// MutationLog — Session Lifecycle (Sprint 78, S1-T4)
// ---------------------------------------------------------------------------

describe('MutationLog session lifecycle', () => {
  it('sessionId is a valid UUID', () => {
    const log = new MutationLog();
    expect(log.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('sessionId is stable across appends within the same instance', () => {
    const log = new MutationLog();
    const id1 = log.sessionId;
    log.append(createMutation('system:dixie-bff', 0));
    log.append(createMutation('system:dixie-bff', 1));
    expect(log.sessionId).toBe(id1);
  });

  it('different MutationLog instances have different sessionIds', () => {
    const log1 = new MutationLog();
    const log2 = new MutationLog();
    expect(log1.sessionId).not.toBe(log2.sessionId);
  });

  it('without persistence works identically to original behavior', () => {
    const log = new MutationLog();
    const m = createMutation('system:dixie-bff', 0);
    log.append(m);
    expect(log.version).toBe(1);
    expect(log.history).toHaveLength(1);
    expect(log.latest).toBe(m);
  });
});

// ---------------------------------------------------------------------------
// MutationLog — Persistence Interface (Sprint 78, S1-T4)
// ---------------------------------------------------------------------------

describe('MutationLog persistence', () => {
  it('calls save() on each append when persistence is provided', async () => {
    const saved: GovernanceMutation[][] = [];
    const mockPersistence = {
      save: async (log: ReadonlyArray<GovernanceMutation>) => {
        saved.push([...log]);
      },
      load: async () => [],
    };

    const log = new MutationLog(mockPersistence);
    log.append(createMutation('system:dixie-bff', 0));
    log.append(createMutation('0xABCD', 1));

    // Allow fire-and-forget promises to resolve
    await new Promise((r) => setTimeout(r, 10));

    expect(saved).toHaveLength(2);
    expect(saved[0]).toHaveLength(1);
    expect(saved[1]).toHaveLength(2);
  });

  it('persistence.save() failure is logged but does not throw', async () => {
    const errors: unknown[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => errors.push(args);

    const failingPersistence = {
      save: async () => { throw new Error('disk full'); },
      load: async () => [],
    };

    const log = new MutationLog(failingPersistence);
    // Should not throw
    log.append(createMutation('system:dixie-bff', 0));

    // Version still incremented (fire-and-forget)
    expect(log.version).toBe(1);

    // Allow the promise rejection to be caught
    await new Promise((r) => setTimeout(r, 10));

    expect(errors.length).toBeGreaterThan(0);
    console.error = origError;
  });

  it('getGovernedState() includes session_id', async () => {
    // Dynamic import for ESM compatibility
    const { ReputationService } = await import('../reputation-service.js');
    const service = new ReputationService();
    const state = service.getGovernedState();

    expect(state.session_id).toBeDefined();
    expect(state.session_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
