// Phase 46V — dev/operator-only Admission Wedge ROUTE-STORAGE spike
// (Storage Mode 1: no-migration, bounded-synthetic, in-process). Unit proof.
//
// Authorized NARROWLY by Phase 46U
// (docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md §3–§16). This
// suite proves the route-owned store's semantics directly (the route-level
// proofs — persisted/replayed no-leak, default-off, degraded fail-closed, recall
// lifecycle, gate AND-ing — live in the integration suite):
//
//   * config validation fails closed (unbounded/malformed caps rejected);
//   * tenant / estate / ACTOR isolation — the THIRD dimension Phase 46V adds:
//     same idempotency key in different actors does not collide; cross-actor /
//     cross-tenant / cross-estate reads return empty (fail closed); cross-scope
//     writes fail closed;
//   * idempotency / replay / conflict (delegated to the proven Phase 33Q ledger
//     but re-proven through the actor-scoped wrapper): identical replay returns
//     the prior result and mints no duplicate; same-key/different-content fails
//     closed;
//   * capacity bounds — per-estate (delegated) AND the new per-store actor cap
//     (bounded REJECTION, never eviction);
//   * rollback / tombstone / cleanup — a tombstoned actor is not recallable,
//     leaves no residue, cannot be revived or written to (fail closed);
//   * synthetic-only discipline — a raw/unsafe actor label fails closed with no
//     residue and no value echo;
//   * non-durability — a second store is empty (process-restart analogue).
//
// All ids/labels are SYNTHETIC and public-safe.

import { describe, expect, it } from 'vitest';
import {
  createRouteStorageSpikeStore,
  RouteStorageSpikeInvalidConfigError,
  RouteStorageSpikeInvalidActorError,
  RouteStorageSpikeActorScopeError,
  RouteStorageSpikeActorCapExceededError,
  findAdmissionPublicLeaks,
  type RouteStorageSpikeScope,
  type RouteStorageSpikeStore,
} from '../../../src/services/admission-wedge-spike/index.js';
import type { SyntheticAdmissionTransition } from '../../../src/services/admission-wedge-spike/index.js';

const CONFIG = { maxActors: 8, maxAssertionsPerEstate: 32, maxAssertionBytesPerEstate: 100_000 };

const TENANT = 'tenant-synthetic-dev';
const ESTATE = 'estate-synthetic-dev';
const ACTOR_A = 'actor-synthetic-a';
const ACTOR_B = 'actor-synthetic-b';

function scope(over?: Partial<RouteStorageSpikeScope>): RouteStorageSpikeScope {
  return { tenant_id: TENANT, estate_id: ESTATE, actor_id: ACTOR_A, ...over };
}

function admitTransition(over?: Partial<SyntheticAdmissionTransition>): SyntheticAdmissionTransition {
  return {
    kind: 'admit',
    source_candidate_id: 'cand-synthetic-dev',
    admission_transition_id: 'txn-admit-synthetic-dev',
    admitted_assertion_id: 'assn-active-synthetic-dev',
    assertion_class: 'preference',
    replay_key: 'admit:cand-synthetic-dev',
    ...over,
  };
}

function supersedeTransition(over?: Partial<SyntheticAdmissionTransition>): SyntheticAdmissionTransition {
  return {
    kind: 'supersede',
    source_candidate_id: 'cand-synthetic-dev',
    admission_transition_id: 'txn-supersede-synthetic-dev',
    admitted_assertion_id: 'assn-corrected-synthetic-dev',
    assertion_class: 'preference',
    replay_key: 'supersede:cand-synthetic-dev',
    supersedes_assertion_id: 'assn-active-synthetic-dev',
    ...over,
  };
}

function seededStore(): RouteStorageSpikeStore {
  const store = createRouteStorageSpikeStore(CONFIG);
  store.seedScope(scope());
  return store;
}

// ── Config validation (fail closed at creation) ───────────────────────────────

describe('Phase 46V route-storage spike — config validation fails closed', () => {
  const badCaps: Array<[string, Partial<typeof CONFIG>]> = [
    ['maxActors Infinity', { maxActors: Infinity }],
    ['maxActors NaN', { maxActors: NaN }],
    ['maxActors zero', { maxActors: 0 }],
    ['maxActors negative', { maxActors: -1 }],
    ['maxActors fractional', { maxActors: 1.5 }],
    ['maxActors over ceiling', { maxActors: 100_001 }],
    ['maxAssertionsPerEstate zero', { maxAssertionsPerEstate: 0 }],
    ['maxAssertionsPerEstate Infinity', { maxAssertionsPerEstate: Infinity }],
    ['maxAssertionBytesPerEstate negative', { maxAssertionBytesPerEstate: -10 }],
  ];
  for (const [name, over] of badCaps) {
    it(`rejects ${name} at creation`, () => {
      expect(() => createRouteStorageSpikeStore({ ...CONFIG, ...over })).toThrow(
        RouteStorageSpikeInvalidConfigError,
      );
    });
  }

  it('a valid config constructs an empty store', () => {
    const store = createRouteStorageSpikeStore(CONFIG);
    expect(store.actorCount()).toBe(0);
  });

  it('a config mutated AFTER construction cannot widen the actor cap', () => {
    const cfg = { ...CONFIG, maxActors: 1 };
    const store = createRouteStorageSpikeStore(cfg);
    store.seedScope(scope({ actor_id: ACTOR_A }));
    // Mutating the caller-owned config must not widen the frozen closure cap.
    cfg.maxActors = 999;
    expect(() => store.seedScope(scope({ actor_id: ACTOR_B }))).toThrow(
      RouteStorageSpikeActorCapExceededError,
    );
  });
});

// ── Synthetic-only actor discipline (fail closed, no residue/echo) ─────────────

describe('Phase 46V route-storage spike — actor label must be a bounded synthetic label', () => {
  const badActors: Array<[string, unknown]> = [
    ['empty', ''],
    ['whitespace', 'actor dev'],
    ['uppercase', 'ActorDev'],
    ['unsafe_marker substring', 'actor-unsafe_marker'],
    ['candidate_payload substring', 'candidate_payload-actor'],
    ['secret substring', 'actor-secret-1'],
    ['token substring', 'actor-token'],
    ['non-string', 123 as unknown],
    ['too long', 'a'.repeat(129)],
  ];
  for (const [name, actor] of badActors) {
    it(`rejects ${name} on seedScope with no value echo`, () => {
      const store = createRouteStorageSpikeStore(CONFIG);
      try {
        store.seedScope(scope({ actor_id: actor as string }));
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(RouteStorageSpikeInvalidActorError);
        // The rejected value is NEVER echoed onto the error message.
        if (typeof actor === 'string' && actor.length > 0) {
          expect((err as Error).message).not.toContain(actor);
        }
      }
      // Nothing was seeded.
      expect(store.actorCount()).toBe(0);
    });
  }

  it('a record into an unsafe-labelled actor fails closed before any mutation', () => {
    const store = createRouteStorageSpikeStore(CONFIG);
    expect(() => store.record(scope({ actor_id: 'actor-secret' }), admitTransition())).toThrow(
      RouteStorageSpikeInvalidActorError,
    );
  });
});

// ── Tenant / estate / ACTOR isolation (Phase 46U §10) ─────────────────────────

describe('Phase 46V route-storage spike — tenant/estate/actor isolation', () => {
  it('the SAME idempotency key in two different actors does NOT collide', () => {
    const store = createRouteStorageSpikeStore(CONFIG);
    store.seedScope(scope({ actor_id: ACTOR_A }));
    store.seedScope(scope({ actor_id: ACTOR_B }));

    // Identical transition (same replay key, same ids) recorded under each actor.
    const rA = store.record(scope({ actor_id: ACTOR_A }), admitTransition());
    const rB = store.record(scope({ actor_id: ACTOR_B }), admitTransition());
    expect(rA.outcome).toBe('recorded');
    expect(rB.outcome).toBe('recorded'); // NOT 'replayed' — different actor, no collision

    // Each actor independently has exactly one assertion.
    expect(store.inspectScope(scope({ actor_id: ACTOR_A })).assertions).toBe(1);
    expect(store.inspectScope(scope({ actor_id: ACTOR_B })).assertions).toBe(1);
    expect(store.projectRecall(scope({ actor_id: ACTOR_A })).includes).toEqual([
      'assn-active-synthetic-dev',
    ]);
    expect(store.projectRecall(scope({ actor_id: ACTOR_B })).includes).toEqual([
      'assn-active-synthetic-dev',
    ]);
  });

  it('a cross-ACTOR read returns empty (an unseeded actor sees nothing)', () => {
    const store = seededStore();
    store.record(scope({ actor_id: ACTOR_A }), admitTransition());
    // ACTOR_B was never seeded → reads fail closed to empty (no cross-actor read).
    expect(store.projectRecall(scope({ actor_id: ACTOR_B }))).toEqual({ includes: [], excludes: [] });
    expect(store.inspectScope(scope({ actor_id: ACTOR_B }))).toEqual({ assertions: 0, bytes: 0 });
    expect(store.auditTrail(scope({ actor_id: ACTOR_B }))).toEqual([]);
  });

  it('a cross-ACTOR write fails closed (unseeded actor cannot be written)', () => {
    const store = seededStore(); // only ACTOR_A seeded
    expect(() => store.record(scope({ actor_id: ACTOR_B }), admitTransition())).toThrow(
      RouteStorageSpikeActorScopeError,
    );
  });

  it('a cross-TENANT read of the same actor/estate returns empty (delegated 33Q scoping)', () => {
    const store = seededStore();
    store.record(scope(), admitTransition());
    // Same actor + estate, DIFFERENT tenant → the wrapped ledger fails closed
    // (foreign tenant sees nothing).
    expect(store.projectRecall(scope({ tenant_id: 'tenant-other-dev' }))).toEqual({
      includes: [],
      excludes: [],
    });
    expect(store.inspectScope(scope({ tenant_id: 'tenant-other-dev' }))).toEqual({
      assertions: 0,
      bytes: 0,
    });
  });

  it('a cross-ESTATE read of the same actor returns empty', () => {
    const store = seededStore();
    store.record(scope(), admitTransition());
    expect(store.projectRecall(scope({ estate_id: 'estate-other-dev' }))).toEqual({
      includes: [],
      excludes: [],
    });
  });
});

// ── Idempotency / replay / conflict (through the actor wrapper) ────────────────

describe('Phase 46V route-storage spike — idempotency / replay / conflict', () => {
  it('an identical replay returns the prior result and mints no duplicate', () => {
    const store = seededStore();
    const r1 = store.record(scope(), admitTransition());
    const r2 = store.record(scope(), admitTransition());
    expect(r1.outcome).toBe('recorded');
    expect(r2.outcome).toBe('replayed');
    expect(r2.admitted_assertion_id).toBe(r1.admitted_assertion_id);
    expect(store.inspectScope(scope()).assertions).toBe(1); // no duplicate
  });

  it('a same-key / different-content replay fails closed (no overwrite)', () => {
    const store = seededStore();
    store.record(scope(), admitTransition());
    // Same replay_key, different assertion id → conflict, fail closed.
    expect(() =>
      store.record(scope(), admitTransition({ admitted_assertion_id: 'assn-other-synthetic-dev' })),
    ).toThrow();
    // Original state preserved, no fork.
    expect(store.inspectScope(scope()).assertions).toBe(1);
    expect(store.projectRecall(scope()).includes).toEqual(['assn-active-synthetic-dev']);
  });

  it('supersede repoints recall to the corrected active; prior preserved/excluded', () => {
    const store = seededStore();
    store.record(scope(), admitTransition());
    const r = store.record(scope(), supersedeTransition());
    expect(r.outcome).toBe('recorded');
    expect(store.projectRecall(scope())).toEqual({
      includes: ['assn-corrected-synthetic-dev'],
      excludes: ['assn-active-synthetic-dev'],
    });
    expect(store.inspectScope(scope()).assertions).toBe(2);
  });
});

// ── Capacity bounds (per-estate delegated + per-store actor cap) ───────────────

describe('Phase 46V route-storage spike — capacity bounds (bounded rejection)', () => {
  it('seeding more than maxActors distinct actors fails closed (no eviction)', () => {
    const store = createRouteStorageSpikeStore({ ...CONFIG, maxActors: 2 });
    store.seedScope(scope({ actor_id: 'actor-1' }));
    store.seedScope(scope({ actor_id: 'actor-2' }));
    expect(() => store.seedScope(scope({ actor_id: 'actor-3' }))).toThrow(
      RouteStorageSpikeActorCapExceededError,
    );
    // The two existing actors are untouched (no eviction).
    expect(store.actorCount()).toBe(2);
  });

  it('per-estate assertion cap is enforced (delegated to the wrapped ledger)', () => {
    const store = createRouteStorageSpikeStore({ ...CONFIG, maxAssertionsPerEstate: 1 });
    store.seedScope(scope());
    store.record(scope(), admitTransition());
    // A second, distinct admit (new id + new key) into the same estate overflows.
    expect(() =>
      store.record(
        scope(),
        admitTransition({
          admitted_assertion_id: 'assn-second-synthetic-dev',
          replay_key: 'admit:cand-second',
          source_candidate_id: 'cand-second-dev',
        }),
      ),
    ).toThrow();
    expect(store.inspectScope(scope()).assertions).toBe(1);
  });
});

// ── Rollback / tombstone / cleanup (Phase 46U §11) ─────────────────────────────

describe('Phase 46V route-storage spike — tombstone / cleanup is reversible & residue-free', () => {
  it('tombstoning an actor leaves no recallable residue', () => {
    const store = seededStore();
    store.record(scope(), admitTransition());
    expect(store.projectRecall(scope()).includes).toEqual(['assn-active-synthetic-dev']);

    store.tombstoneActor(scope());
    expect(store.isActorTombstoned(scope())).toBe(true);
    // Not recallable; zero footprint; empty audit.
    expect(store.projectRecall(scope())).toEqual({ includes: [], excludes: [] });
    expect(store.inspectScope(scope())).toEqual({ assertions: 0, bytes: 0 });
    expect(store.auditTrail(scope())).toEqual([]);
  });

  it('a tombstoned actor cannot be written to (fail closed)', () => {
    const store = seededStore();
    store.tombstoneActor(scope());
    expect(() => store.record(scope(), admitTransition())).toThrow(RouteStorageSpikeActorScopeError);
  });

  it('a tombstoned actor cannot be silently revived by re-seeding (fail closed)', () => {
    const store = seededStore();
    store.tombstoneActor(scope());
    expect(() => store.seedScope(scope())).toThrow(RouteStorageSpikeActorScopeError);
    // Still counted (no silent revival, no eviction).
    expect(store.actorCount()).toBe(1);
  });

  it('tombstoneActor is idempotent and a no-op for an unseeded actor', () => {
    const store = seededStore();
    store.tombstoneActor(scope());
    expect(() => store.tombstoneActor(scope())).not.toThrow();
    // No-op for a never-seeded actor.
    expect(() => store.tombstoneActor(scope({ actor_id: 'actor-never' }))).not.toThrow();
    expect(store.isActorTombstoned(scope({ actor_id: 'actor-never' }))).toBe(false);
  });
});

// ── Non-durability (process-restart analogue) ─────────────────────────────────

describe('Phase 46V route-storage spike — non-durable (no residue across instances)', () => {
  it('a fresh store is empty — a second instance shares no state (restart analogue)', () => {
    const a = seededStore();
    a.record(scope(), admitTransition());
    expect(a.inspectScope(scope()).assertions).toBe(1);

    const b = createRouteStorageSpikeStore(CONFIG);
    // No durable backend: the new instance knows nothing of the first.
    expect(b.actorCount()).toBe(0);
    expect(b.projectRecall(scope())).toEqual({ includes: [], excludes: [] });
  });
});

// ── Actor-id snapshot / TOCTOU discipline (Codex Phase 46V blocker) ────────────
//
// The store reads `scope.actor_id` EXACTLY ONCE per operation (snapshot-and-
// validate), then keys every `actors.get`/`actors.set`, tombstone check, error
// classification, and ledger selection off that immutable local. A caller-owned
// accessor (`get actor_id()`) that returns DIFFERENT values across reads must
// therefore be unable to: validate as a benign/unseeded actor and then map/set
// onto a tombstoned actor (silent revival); validate as one actor and operate on
// another (cross-actor isolation bypass); or smuggle an unsafe label past
// validation. These tests build such shifting accessors and prove the snapshot
// holds. Against the pre-fix validate-then-reread implementation they fail (the
// getter is read 2–3×, so a tombstoned actor is revived / another actor is hit);
// against the snapshot fix they pass (the getter is read exactly once).

const ACTOR_DECOY = 'actor-synthetic-decoy';

/** Build a scope whose `actor_id` is an accessor that returns `values[0]` on the
 *  first read, `values[1]` on the second, …, repeating the LAST value for every
 *  subsequent read. `tenant_id` / `estate_id` are stable plain values (only the
 *  actor dimension shifts). `reads()` exposes how many times `actor_id` was read
 *  — a snapshot-correct operation reads it exactly once. */
function shiftingActorScope(
  values: string[],
  over?: { tenant_id?: string; estate_id?: string },
): { scope: RouteStorageSpikeScope; reads: () => number } {
  let count = 0;
  const target: Record<string, unknown> = {
    tenant_id: over?.tenant_id ?? TENANT,
    estate_id: over?.estate_id ?? ESTATE,
  };
  Object.defineProperty(target, 'actor_id', {
    enumerable: true,
    configurable: true,
    get() {
      const v = values[Math.min(count, values.length - 1)];
      count += 1;
      return v;
    },
  });
  return { scope: target as RouteStorageSpikeScope, reads: () => count };
}

describe('Phase 46V route-storage spike — actor-id snapshot defeats shifting-accessor TOCTOU', () => {
  it('seedScope: a shifting getter cannot silently revive a tombstoned actor', () => {
    const store = seededStore(); // ACTOR_A seeded
    store.record(scope({ actor_id: ACTOR_A }), admitTransition());
    store.tombstoneActor(scope({ actor_id: ACTOR_A }));
    expect(store.isActorTombstoned(scope({ actor_id: ACTOR_A }))).toBe(true);

    // The pre-fix exploit: reads 1 & 2 (validate + actors.get) see an UNSEEDED
    // decoy, so the new-actor branch is taken and the tombstone check is skipped;
    // read 3 (actors.set) sees the TOMBSTONED ACTOR_A, overwriting its tombstone
    // with a fresh live ledger → silent revival. The snapshot fix reads once.
    const { scope: shifting, reads } = shiftingActorScope([ACTOR_DECOY, ACTOR_DECOY, ACTOR_A]);
    store.seedScope(shifting);

    // Snapshot discipline: actor_id was read EXACTLY once (pre-fix path read 3×).
    expect(reads()).toBe(1);
    // ACTOR_A was NOT revived — still tombstoned, not recallable, zero residue.
    expect(store.isActorTombstoned(scope({ actor_id: ACTOR_A }))).toBe(true);
    expect(store.projectRecall(scope({ actor_id: ACTOR_A }))).toEqual({ includes: [], excludes: [] });
    expect(store.inspectScope(scope({ actor_id: ACTOR_A }))).toEqual({ assertions: 0, bytes: 0 });
    expect(store.auditTrail(scope({ actor_id: ACTOR_A }))).toEqual([]);
    // A write into tombstoned ACTOR_A still fails closed.
    expect(() => store.record(scope({ actor_id: ACTOR_A }), admitTransition())).toThrow(
      RouteStorageSpikeActorScopeError,
    );

    // Only the VALIDATED first-read actor (the decoy) was seeded, as its own
    // independent, live, isolated slot — proving the operation acted on the
    // snapshotted id, not the shifted one.
    expect(store.isActorTombstoned(scope({ actor_id: ACTOR_DECOY }))).toBe(false);
    expect(store.record(scope({ actor_id: ACTOR_DECOY }), admitTransition()).outcome).toBe('recorded');
    // The decoy's data does not bleed into ACTOR_A (isolation intact).
    expect(store.projectRecall(scope({ actor_id: ACTOR_A }))).toEqual({ includes: [], excludes: [] });
  });

  it('record: a shifting getter cannot write nominally-as-a-tombstoned-actor into a live actor', () => {
    const store = createRouteStorageSpikeStore(CONFIG);
    // ACTOR_A: seeded then tombstoned. ACTOR_B: seeded and live with one assertion.
    store.seedScope(scope({ actor_id: ACTOR_A }));
    store.record(scope({ actor_id: ACTOR_A }), admitTransition());
    store.tombstoneActor(scope({ actor_id: ACTOR_A }));
    store.seedScope(scope({ actor_id: ACTOR_B }));
    store.record(scope({ actor_id: ACTOR_B }), admitTransition());

    // Getter: read 1 (validate) = tombstoned ACTOR_A (validation is label-only and
    // passes); read 2 (actors.get / ledger selection) = live ACTOR_B. The pre-fix
    // path would select B's ledger and commit a write "as A" into B (tombstone
    // bypass + cross-actor write). The snapshot fix resolves the single read to A,
    // finds it tombstoned, and fails closed.
    const crossWrite = admitTransition({
      admitted_assertion_id: 'assn-cross-actor-dev',
      replay_key: 'admit:cand-cross',
      source_candidate_id: 'cand-cross-dev',
    });
    const { scope: shifting, reads } = shiftingActorScope([ACTOR_A, ACTOR_B]);

    let reason: string | undefined;
    expect(() => {
      try {
        store.record(shifting, crossWrite);
      } catch (err) {
        if (err instanceof RouteStorageSpikeActorScopeError) reason = err.reason;
        throw err;
      }
    }).toThrow(RouteStorageSpikeActorScopeError);
    expect(reason).toBe('tombstoned_actor'); // resolved to A (snapshot), not B
    expect(reads()).toBe(1);

    // Live ACTOR_B received NOTHING — no cross-actor write landed.
    expect(store.inspectScope(scope({ actor_id: ACTOR_B })).assertions).toBe(1);
    expect(store.projectRecall(scope({ actor_id: ACTOR_B })).includes).toEqual([
      'assn-active-synthetic-dev',
    ]);
    // Tombstoned ACTOR_A stays empty.
    expect(store.projectRecall(scope({ actor_id: ACTOR_A }))).toEqual({ includes: [], excludes: [] });
  });

  it('reads: a shifting getter cannot read another (live) actor through a tombstoned scope', () => {
    const store = createRouteStorageSpikeStore(CONFIG);
    // ACTOR_A: seeded then tombstoned. ACTOR_B: live with recallable data.
    store.seedScope(scope({ actor_id: ACTOR_A }));
    store.record(scope({ actor_id: ACTOR_A }), admitTransition());
    store.tombstoneActor(scope({ actor_id: ACTOR_A }));
    store.seedScope(scope({ actor_id: ACTOR_B }));
    store.record(scope({ actor_id: ACTOR_B }), admitTransition());

    // Each read API is given a FRESH shifting scope (read 1 = tombstoned ACTOR_A,
    // read 2 = live ACTOR_B). The pre-fix path validates A then selects B's ledger
    // → leaks B's data through a scope that names A. The snapshot fix resolves the
    // single read to tombstoned A → empty (no cross-actor read, no tombstone leak).
    const proj = shiftingActorScope([ACTOR_A, ACTOR_B]);
    expect(store.projectRecall(proj.scope)).toEqual({ includes: [], excludes: [] });
    expect(proj.reads()).toBe(1);

    const insp = shiftingActorScope([ACTOR_A, ACTOR_B]);
    expect(store.inspectScope(insp.scope)).toEqual({ assertions: 0, bytes: 0 });
    expect(insp.reads()).toBe(1);

    const aud = shiftingActorScope([ACTOR_A, ACTOR_B]);
    expect(store.auditTrail(aud.scope)).toEqual([]);
    expect(aud.reads()).toBe(1);

    // ACTOR_B's own (correctly-scoped) view is unchanged and still isolated.
    expect(store.projectRecall(scope({ actor_id: ACTOR_B })).includes).toEqual([
      'assn-active-synthetic-dev',
    ]);
  });

  it('a shifting getter introduces no public/private leak and echoes no actor value', () => {
    const store = createRouteStorageSpikeStore(CONFIG);
    store.seedScope(scope({ actor_id: ACTOR_A }));
    store.record(scope({ actor_id: ACTOR_A }), admitTransition());
    store.tombstoneActor(scope({ actor_id: ACTOR_A }));
    store.seedScope(scope({ actor_id: ACTOR_B }));
    store.record(scope({ actor_id: ACTOR_B }), admitTransition());

    // The fail-closed error from a TOCTOU write attempt carries no actor value and
    // trips no leak detector.
    let message = '';
    const { scope: shifting } = shiftingActorScope([ACTOR_A, ACTOR_B]);
    try {
      store.record(shifting, admitTransition());
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).not.toContain(ACTOR_A);
    expect(message).not.toContain(ACTOR_B);
    expect(findAdmissionPublicLeaks(message)).toEqual([]);

    // The tombstoned victim (ACTOR_A) surfaces NOTHING after the exploit attempt —
    // empty projection / zero footprint / empty audit. (The store's own audit
    // trail is an intentionally PRIVATE surface carrying private keys, so the
    // public-leak detector is applied only to surfaces that must be empty for the
    // victim and to the public-facing recall projection.)
    const leakFreeSurfaces: unknown[] = [
      store.projectRecall(scope({ actor_id: ACTOR_A })),
      store.inspectScope(scope({ actor_id: ACTOR_A })),
      store.auditTrail(scope({ actor_id: ACTOR_A })),
      store.projectRecall(scope({ actor_id: ACTOR_B })),
    ];
    for (const surface of leakFreeSurfaces) {
      expect(findAdmissionPublicLeaks(surface)).toEqual([]);
    }
    // Victim ACTOR_A genuinely has no residue.
    expect(store.projectRecall(scope({ actor_id: ACTOR_A }))).toEqual({ includes: [], excludes: [] });
    expect(store.inspectScope(scope({ actor_id: ACTOR_A }))).toEqual({ assertions: 0, bytes: 0 });
    expect(store.auditTrail(scope({ actor_id: ACTOR_A }))).toEqual([]);
  });

  it('seedScope: a shifting getter cannot smuggle an unsafe label past validation', () => {
    const store = createRouteStorageSpikeStore(CONFIG);
    // Read 1 (validate + use) = a SAFE decoy; later reads = an UNSAFE label the
    // pre-fix path would map/set under (creating an unsafe-labelled actor slot).
    // The snapshot fix reads once, so the unsafe value is NEVER observed.
    const { scope: shifting, reads } = shiftingActorScope([ACTOR_DECOY, 'actor-secret-injected']);
    store.seedScope(shifting);

    expect(reads()).toBe(1); // the unsafe second value is never read
    expect(store.actorCount()).toBe(1);
    // The SAFE decoy is the actor that was seeded — live, isolated, writable.
    expect(store.isActorTombstoned(scope({ actor_id: ACTOR_DECOY }))).toBe(false);
    expect(store.record(scope({ actor_id: ACTOR_DECOY }), admitTransition()).outcome).toBe('recorded');
  });
});
