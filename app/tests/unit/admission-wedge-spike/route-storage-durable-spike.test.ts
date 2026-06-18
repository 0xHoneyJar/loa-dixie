// Phase 47A — dev/operator-only Admission Wedge ROUTE-STORAGE DURABLE (Mode 2)
// spike. Unit proof.
//
// Authorized NARROWLY by Phase 46Z
// (docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md
// §8–§15). This suite proves the DURABLE store's semantics directly:
//
//   * config validation fails closed (missing/empty dir, non-`.json` file name, a
//     path-separator file name, unbounded/malformed durable cap, AND a malformed
//     inner cap delegated to the wrapped Mode-1 engine);
//   * DURABILITY: a second store over the SAME dir HYDRATES the prior synthetic
//     state — the inverse of Mode 1's "a second instance shares no state" — proving
//     the spike's defining Mode-2 property (survives a process-restart analogue);
//   * the on-disk artifact is a `.json` file (NEVER `.sql`) off the migration path,
//     and carries NO raw payload (only synthetic bounded labels);
//   * tenant / estate / ACTOR isolation, idempotent replay (NOT re-persisted),
//     conflict fail-closed (NOT persisted), supersession — all inherited from the
//     wrapped Phase 46V engine and re-proven through the durable wrapper, including
//     across a hydrate;
//   * bounded durable capacity (bounded REJECTION at the cap, never eviction) +
//     bounded inner caps;
//   * reversible cleanup: purgeDurableState removes the snapshot so a fresh store
//     hydrates EMPTY;
//   * fail-closed on a corrupt / unreadable / inconsistent snapshot at construction;
//   * the private durable artifact / audit surfaces never carry public-leak shapes;
//   * the actor-id snapshot / TOCTOU discipline is preserved through the wrapper.
//
// All ids/labels are SYNTHETIC and public-safe. Each test uses an isolated temp
// directory and cleans it up.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createRouteStorageDurableSpikeStore,
  RouteStorageDurableSpikeInvalidConfigError,
  RouteStorageDurableSpikeCorruptStateError,
  RouteStorageDurableSpikeCapacityError,
  RouteStorageDurableSpikeDegradedError,
  RouteStorageSpikeInvalidConfigError,
  RouteStorageSpikeInvalidActorError,
  RouteStorageSpikeActorScopeError,
  RouteStorageSpikeActorCapExceededError,
  findAdmissionPublicLeaks,
  type RouteStorageDurableSpikeConfig,
  type RouteStorageDurableSpikeStore,
  type RouteStorageSpikeScope,
} from '../../../src/services/admission-wedge-spike/index.js';
import type { SyntheticAdmissionTransition } from '../../../src/services/admission-wedge-spike/index.js';

const TENANT = 'tenant-synthetic-dev';
const ESTATE = 'estate-synthetic-dev';
const ACTOR_A = 'actor-synthetic-a';
const ACTOR_B = 'actor-synthetic-b';

const SNAPSHOT_FILE = 'admission-wedge-route-storage-durable-spike.json';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'aw-durable-spike-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function baseConfig(over?: Partial<RouteStorageDurableSpikeConfig>): RouteStorageDurableSpikeConfig {
  return {
    dir,
    maxActors: 8,
    maxAssertionsPerEstate: 32,
    maxAssertionBytesPerEstate: 100_000,
    maxDurableEntries: 64,
    ...over,
  };
}

function makeStore(over?: Partial<RouteStorageDurableSpikeConfig>): RouteStorageDurableSpikeStore {
  return createRouteStorageDurableSpikeStore(baseConfig(over));
}

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

function snapshotPath(): string {
  return join(dir, SNAPSHOT_FILE);
}

// ── Config validation (fail closed at creation) ───────────────────────────────

describe('Phase 47A durable spike — durable config validation fails closed', () => {
  const badDurable: Array<[string, Partial<RouteStorageDurableSpikeConfig>]> = [
    ['empty dir', { dir: '' }],
    ['non-string dir', { dir: 123 as unknown as string }],
    ['maxDurableEntries zero', { maxDurableEntries: 0 }],
    ['maxDurableEntries negative', { maxDurableEntries: -1 }],
    ['maxDurableEntries Infinity', { maxDurableEntries: Infinity }],
    ['maxDurableEntries NaN', { maxDurableEntries: NaN }],
    ['maxDurableEntries fractional', { maxDurableEntries: 1.5 }],
    ['maxDurableEntries over ceiling', { maxDurableEntries: 1_000_001 }],
    ['fileName not .json', { fileName: 'snapshot.sql' }],
    ['fileName no extension', { fileName: 'snapshot' }],
    ['fileName with path separator', { fileName: '../escape.json' }],
    ['fileName empty', { fileName: '' }],
  ];
  for (const [name, over] of badDurable) {
    it(`rejects ${name} at creation`, () => {
      expect(() => createRouteStorageDurableSpikeStore(baseConfig(over))).toThrow(
        RouteStorageDurableSpikeInvalidConfigError,
      );
    });
  }

  it('a `.sql` file name is rejected with reason bad_extension (production-isolation guarantee)', () => {
    try {
      createRouteStorageDurableSpikeStore(baseConfig({ fileName: 'aw_records.sql' }));
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(RouteStorageDurableSpikeInvalidConfigError);
      expect((err as RouteStorageDurableSpikeInvalidConfigError).reason).toBe('bad_extension');
    }
  });

  it('delegates inner cap validation to the wrapped Mode-1 engine (fails closed)', () => {
    expect(() => createRouteStorageDurableSpikeStore(baseConfig({ maxActors: 0 }))).toThrow(
      RouteStorageSpikeInvalidConfigError,
    );
    expect(() =>
      createRouteStorageDurableSpikeStore(baseConfig({ maxAssertionsPerEstate: Infinity })),
    ).toThrow(RouteStorageSpikeInvalidConfigError);
  });

  it('a valid config constructs an empty store and writes nothing until a mutation', () => {
    const store = makeStore();
    expect(store.actorCount()).toBe(0);
    expect(store.durableEntryCount()).toBe(0);
    // No mutation yet → no snapshot file created.
    expect(existsSync(snapshotPath())).toBe(false);
  });
});

// ── Synthetic-only actor discipline (delegated; fail closed, no residue/echo) ──

describe('Phase 47A durable spike — actor label must be a bounded synthetic label', () => {
  const badActors: Array<[string, unknown]> = [
    ['empty', ''],
    ['whitespace', 'actor dev'],
    ['uppercase', 'ActorDev'],
    ['unsafe_marker substring', 'actor-unsafe_marker'],
    ['secret substring', 'actor-secret-1'],
    ['non-string', 123 as unknown],
  ];
  for (const [name, actor] of badActors) {
    it(`rejects ${name} on seedScope with no value echo and no durable write`, () => {
      const store = makeStore();
      expect(() => store.seedScope(scope({ actor_id: actor as string }))).toThrow(
        RouteStorageSpikeInvalidActorError,
      );
      expect(store.actorCount()).toBe(0);
      expect(store.durableEntryCount()).toBe(0);
      expect(existsSync(snapshotPath())).toBe(false);
    });
  }
});

// ── Durability / hydration (the defining Mode-2 property) ─────────────────────

describe('Phase 47A durable spike — survives a process-restart analogue (hydration)', () => {
  it('a SECOND store over the same dir hydrates the prior synthetic state', () => {
    const a = makeStore();
    a.seedScope(scope());
    expect(a.record(scope(), admitTransition()).outcome).toBe('recorded');
    expect(a.inspectScope(scope()).assertions).toBe(1);
    expect(a.projectRecall(scope()).includes).toEqual(['assn-active-synthetic-dev']);

    // A fresh store over the SAME directory — the restart analogue. Unlike Mode 1
    // (where a second instance is empty), the durable store reconstructs the state.
    const b = makeStore();
    expect(b.actorCount()).toBe(1);
    expect(b.inspectScope(scope()).assertions).toBe(1);
    expect(b.projectRecall(scope()).includes).toEqual(['assn-active-synthetic-dev']);
    expect(b.durableEntryCount()).toBe(2); // seed + record
  });

  it('hydration replays supersession (recall repointed; prior excluded) deterministically', () => {
    const a = makeStore();
    a.seedScope(scope());
    a.record(scope(), admitTransition());
    a.record(scope(), supersedeTransition());
    expect(a.projectRecall(scope())).toEqual({
      includes: ['assn-corrected-synthetic-dev'],
      excludes: ['assn-active-synthetic-dev'],
    });

    const b = makeStore();
    expect(b.projectRecall(scope())).toEqual({
      includes: ['assn-corrected-synthetic-dev'],
      excludes: ['assn-active-synthetic-dev'],
    });
    expect(b.inspectScope(scope()).assertions).toBe(2);
  });

  it('hydration preserves a tombstone (a tombstoned actor stays not-recallable after restart)', () => {
    const a = makeStore();
    a.seedScope(scope());
    a.record(scope(), admitTransition());
    a.tombstoneActor(scope());
    expect(a.isActorTombstoned(scope())).toBe(true);

    const b = makeStore();
    expect(b.isActorTombstoned(scope())).toBe(true);
    expect(b.projectRecall(scope())).toEqual({ includes: [], excludes: [] });
    expect(b.inspectScope(scope())).toEqual({ assertions: 0, bytes: 0 });
    // A write into the hydrated-tombstoned actor still fails closed.
    expect(() => b.record(scope(), admitTransition())).toThrow(RouteStorageSpikeActorScopeError);
  });

  it('hydrated actor isolation holds (a second actor is independent across restart)', () => {
    const a = makeStore();
    a.seedScope(scope({ actor_id: ACTOR_A }));
    a.seedScope(scope({ actor_id: ACTOR_B }));
    a.record(scope({ actor_id: ACTOR_A }), admitTransition());

    const b = makeStore();
    expect(b.inspectScope(scope({ actor_id: ACTOR_A })).assertions).toBe(1);
    // ACTOR_B was seeded but never recorded into → still empty, still isolated.
    expect(b.inspectScope(scope({ actor_id: ACTOR_B }))).toEqual({ assertions: 0, bytes: 0 });
    expect(b.projectRecall(scope({ actor_id: ACTOR_B }))).toEqual({ includes: [], excludes: [] });
  });
});

// ── On-disk artifact: `.json` only, off the migration path, no raw payload ────

describe('Phase 47A durable spike — on-disk artifact is an isolated `.json` snapshot', () => {
  it('writes ONLY a `.json` file (never a `.sql`) and no `_down`/migration-shaped file', () => {
    const store = makeStore();
    store.seedScope(scope());
    store.record(scope(), admitTransition());

    const files = readdirSync(dir);
    expect(files).toContain(SNAPSHOT_FILE);
    // The dev artifact directory contains NO `.sql` file the production migration
    // runner could ever discover, and nothing shaped like a migration.
    expect(files.some((f) => f.endsWith('.sql'))).toBe(false);
    expect(files.some((f) => f.includes('_down'))).toBe(false);
    // Every file is the JSON snapshot (or its transient temp sibling, already
    // renamed away by the time we read).
    for (const f of files) {
      expect(f.endsWith('.json')).toBe(true);
    }
  });

  it('the snapshot is valid JSON carrying only synthetic labels — no raw payload key', () => {
    const store = makeStore();
    store.seedScope(scope());
    store.record(scope(), admitTransition());

    const raw = readFileSync(snapshotPath(), 'utf8');
    const parsed = JSON.parse(raw) as { version: number; entries: unknown[] };
    expect(parsed.version).toBe(1);
    expect(Array.isArray(parsed.entries)).toBe(true);
    // No raw-candidate-payload field name appears anywhere in the artifact.
    expect(raw).not.toContain('candidate_payload');
    expect(raw).not.toContain('raw_reason');
    expect(raw).not.toContain('source_material');
  });
});

// ── Idempotency / replay / conflict (through the durable wrapper) ─────────────

describe('Phase 47A durable spike — idempotency / replay / conflict (durable-aware)', () => {
  it('an identical replay returns the prior result and is NOT persisted again', () => {
    const store = makeStore();
    store.seedScope(scope());
    const r1 = store.record(scope(), admitTransition());
    const entriesAfterFirst = store.durableEntryCount();
    const r2 = store.record(scope(), admitTransition());
    expect(r1.outcome).toBe('recorded');
    expect(r2.outcome).toBe('replayed');
    // The replay minted no duplicate AND advanced no durable entry.
    expect(store.inspectScope(scope()).assertions).toBe(1);
    expect(store.durableEntryCount()).toBe(entriesAfterFirst);

    // A fresh hydrate confirms exactly one record entry survived (no duplicate).
    const b = makeStore();
    expect(b.inspectScope(scope()).assertions).toBe(1);
  });

  it('a same-key / different-content conflict fails closed and is NOT persisted', () => {
    const store = makeStore();
    store.seedScope(scope());
    store.record(scope(), admitTransition());
    const before = store.durableEntryCount();
    expect(() =>
      store.record(scope(), admitTransition({ admitted_assertion_id: 'assn-other-synthetic-dev' })),
    ).toThrow();
    expect(store.durableEntryCount()).toBe(before); // conflict not persisted
    expect(store.inspectScope(scope()).assertions).toBe(1);

    // The rejected write left no residue on disk either.
    const b = makeStore();
    expect(b.inspectScope(scope()).assertions).toBe(1);
    expect(b.projectRecall(scope()).includes).toEqual(['assn-active-synthetic-dev']);
  });
});

// ── Tenant / estate / actor isolation ────────────────────────────────────────

describe('Phase 47A durable spike — tenant/estate/actor isolation', () => {
  it('the SAME idempotency key in two actors does NOT collide (and both persist)', () => {
    const store = makeStore();
    store.seedScope(scope({ actor_id: ACTOR_A }));
    store.seedScope(scope({ actor_id: ACTOR_B }));
    expect(store.record(scope({ actor_id: ACTOR_A }), admitTransition()).outcome).toBe('recorded');
    expect(store.record(scope({ actor_id: ACTOR_B }), admitTransition()).outcome).toBe('recorded');
    expect(store.inspectScope(scope({ actor_id: ACTOR_A })).assertions).toBe(1);
    expect(store.inspectScope(scope({ actor_id: ACTOR_B })).assertions).toBe(1);
  });

  it('a cross-actor / cross-tenant / cross-estate read returns empty', () => {
    const store = makeStore();
    store.seedScope(scope());
    store.record(scope(), admitTransition());
    expect(store.projectRecall(scope({ actor_id: ACTOR_B }))).toEqual({ includes: [], excludes: [] });
    expect(store.projectRecall(scope({ tenant_id: 'tenant-other-dev' }))).toEqual({ includes: [], excludes: [] });
    expect(store.projectRecall(scope({ estate_id: 'estate-other-dev' }))).toEqual({ includes: [], excludes: [] });
  });

  it('a cross-actor write fails closed (unseeded actor cannot be written or persisted)', () => {
    const store = makeStore();
    store.seedScope(scope({ actor_id: ACTOR_A }));
    const before = store.durableEntryCount();
    expect(() => store.record(scope({ actor_id: ACTOR_B }), admitTransition())).toThrow(
      RouteStorageSpikeActorScopeError,
    );
    expect(store.durableEntryCount()).toBe(before);
  });
});

// ── Capacity bounds (durable cap + inner caps; bounded rejection) ─────────────

describe('Phase 47A durable spike — bounded capacity (rejection, never eviction)', () => {
  it('appending beyond maxDurableEntries fails closed (no eviction of prior entries)', () => {
    // Cap the durable log at exactly the seed (1) + one record (2).
    const store = makeStore({ maxDurableEntries: 2 });
    store.seedScope(scope());
    store.record(scope(), admitTransition());
    expect(store.durableEntryCount()).toBe(2);
    // A second distinct record would be entry #3 → rejected.
    expect(() =>
      store.record(
        scope(),
        admitTransition({
          admitted_assertion_id: 'assn-second-synthetic-dev',
          replay_key: 'admit:cand-second',
          source_candidate_id: 'cand-second-dev',
        }),
      ),
    ).toThrow(RouteStorageDurableSpikeCapacityError);
    // The prior entries are untouched (no eviction).
    expect(store.durableEntryCount()).toBe(2);
    expect(store.inspectScope(scope()).assertions).toBe(1);
  });

  it('the per-store actor cap is delegated to the wrapped engine (bounded rejection)', () => {
    const store = makeStore({ maxActors: 2 });
    store.seedScope(scope({ actor_id: 'actor-1' }));
    store.seedScope(scope({ actor_id: 'actor-2' }));
    expect(() => store.seedScope(scope({ actor_id: 'actor-3' }))).toThrow(
      RouteStorageSpikeActorCapExceededError,
    );
    expect(store.actorCount()).toBe(2);
  });

  it('a hydrate of a snapshot larger than the cap fails closed', () => {
    // Build a snapshot with two records, then hydrate under a cap of 2 (seed+1).
    const a = makeStore({ maxDurableEntries: 64 });
    a.seedScope(scope());
    a.record(scope(), admitTransition());
    a.record(
      scope(),
      admitTransition({
        admitted_assertion_id: 'assn-second-synthetic-dev',
        replay_key: 'admit:cand-second',
        source_candidate_id: 'cand-second-dev',
      }),
    );
    // 3 durable entries on disk; hydrate under a cap of 2 → fail closed.
    expect(() => makeStore({ maxDurableEntries: 2 })).toThrow(RouteStorageDurableSpikeCapacityError);
  });
});

// ── Reversible cleanup (Phase 46Z A.7) ────────────────────────────────────────

describe('Phase 47A durable spike — reversible cleanup (purge → fresh store hydrates empty)', () => {
  it('purgeDurableState removes the snapshot; a fresh store hydrates EMPTY', () => {
    const a = makeStore();
    a.seedScope(scope());
    a.record(scope(), admitTransition());
    expect(existsSync(snapshotPath())).toBe(true);

    a.purgeDurableState();
    expect(existsSync(snapshotPath())).toBe(false);
    expect(a.durableEntryCount()).toBe(0);

    const b = makeStore();
    expect(b.actorCount()).toBe(0);
    expect(b.projectRecall(scope())).toEqual({ includes: [], excludes: [] });
  });

  it('purgeDurableState is idempotent (a no-op when no snapshot exists)', () => {
    const store = makeStore();
    expect(() => store.purgeDurableState()).not.toThrow();
    expect(() => store.purgeDurableState()).not.toThrow();
  });
});

// ── Fail-closed on a corrupt / inconsistent snapshot at construction ──────────

describe('Phase 47A durable spike — corrupt snapshot fails closed at construction', () => {
  it('a non-JSON snapshot fails closed (reason not_json)', () => {
    writeFileSync(snapshotPath(), 'this is not json {{{', 'utf8');
    try {
      makeStore();
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(RouteStorageDurableSpikeCorruptStateError);
      expect((err as RouteStorageDurableSpikeCorruptStateError).reason).toBe('not_json');
    }
  });

  it('a JSON snapshot of the wrong shape fails closed (reason bad_shape)', () => {
    writeFileSync(snapshotPath(), JSON.stringify({ version: 1, entries: 'not-an-array' }), 'utf8');
    try {
      makeStore();
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(RouteStorageDurableSpikeCorruptStateError);
      expect((err as RouteStorageDurableSpikeCorruptStateError).reason).toBe('bad_shape');
    }
  });

  it('a snapshot whose entries do not replay consistently fails closed (reason replay_failed)', () => {
    // A record entry that references an unseeded actor — the inner engine throws on
    // replay, so the snapshot is not internally consistent.
    const inconsistent = {
      version: 1,
      entries: [
        {
          op: 'record',
          scope: { tenant_id: TENANT, estate_id: ESTATE, actor_id: 'actor-never-seeded' },
          transition: admitTransition(),
        },
      ],
    };
    writeFileSync(snapshotPath(), JSON.stringify(inconsistent), 'utf8');
    try {
      makeStore();
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(RouteStorageDurableSpikeCorruptStateError);
      expect((err as RouteStorageDurableSpikeCorruptStateError).reason).toBe('replay_failed');
    }
  });

  it('a snapshot carrying an UNSAFE actor label fails closed at hydrate (no slot created)', () => {
    // The inner engine validates every actor label on replay; an unsafe label is
    // rejected, so a tampered snapshot cannot smuggle an unsafe-labelled actor in.
    const tampered = {
      version: 1,
      entries: [{ op: 'seed', scope: { tenant_id: TENANT, estate_id: ESTATE, actor_id: 'actor-secret-injected' } }],
    };
    writeFileSync(snapshotPath(), JSON.stringify(tampered), 'utf8');
    expect(() => makeStore()).toThrow(RouteStorageDurableSpikeCorruptStateError);
  });
});

// ── Hydrate EXACTNESS / data-minimization (unsupported version, unknown keys, ──
//    tampered private/raw extras) — fails closed and never survives a rewrite ──

describe('Phase 47A durable spike — hydrate enforces exact shape (data-minimization)', () => {
  const CLEAN_SCOPE = { tenant_id: TENANT, estate_id: ESTATE, actor_id: ACTOR_A };
  // Each tampered snapshot is paired with the EXACT structural check it should
  // trip. Where the offending field is on a transition (or a record's scope), a
  // preceding clean `seed` makes the actor writable — so if the relevant exact-key
  // check were removed, the entry WOULD otherwise hydrate and the extra would be
  // laundered. That makes each case a meaningful guard, not an incidental reject.
  const tampered: Array<[string, unknown]> = [
    ['unsupported snapshot version (999)', { version: 999, entries: [] }],
    ['unsupported snapshot version (0)', { version: 0, entries: [] }],
    ['string snapshot version', { version: '1', entries: [] }],
    ['extra top-level envelope field', { version: 1, entries: [], note: 'extra-envelope' }],
    [
      'extra own field on an entry',
      { version: 1, entries: [{ op: 'seed', scope: CLEAN_SCOPE, extra_entry_field: 'x' }] },
    ],
    [
      'extra own field on a scope (candidate_payload)',
      {
        version: 1,
        entries: [{ op: 'seed', scope: { ...CLEAN_SCOPE, candidate_payload: 'private-extra' } }],
      },
    ],
    [
      'extra own field on a scope (source_material)',
      {
        version: 1,
        entries: [{ op: 'seed', scope: { ...CLEAN_SCOPE, source_material: 'private-extra' } }],
      },
    ],
    [
      'extra own field on a transition (raw_reason)',
      {
        version: 1,
        entries: [
          { op: 'seed', scope: CLEAN_SCOPE },
          { op: 'record', scope: CLEAN_SCOPE, transition: { ...admitTransition(), raw_reason: 'private-extra' } },
        ],
      },
    ],
    [
      'extra own field on a transition (candidate_payload)',
      {
        version: 1,
        entries: [
          { op: 'seed', scope: CLEAN_SCOPE },
          { op: 'record', scope: CLEAN_SCOPE, transition: { ...admitTransition(), candidate_payload: 'private-extra' } },
        ],
      },
    ],
    ['unknown entry op', { version: 1, entries: [{ op: 'purge', scope: CLEAN_SCOPE }] }],
    ['entry missing op', { version: 1, entries: [{ scope: CLEAN_SCOPE }] }],
    ['scope is not an object', { version: 1, entries: [{ op: 'seed', scope: 'not-an-object' }] }],
  ];
  for (const [name, snapshot] of tampered) {
    it(`rejects ${name} (fails closed, bad_shape)`, () => {
      writeFileSync(snapshotPath(), JSON.stringify(snapshot), 'utf8');
      try {
        makeStore();
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(RouteStorageDurableSpikeCorruptStateError);
        expect((err as RouteStorageDurableSpikeCorruptStateError).reason).toBe('bad_shape');
      }
    });
  }

  it('a tampered private/raw extra fails closed at hydrate and is never laundered into a clean rewrite', () => {
    // The Codex probe: a seed scope carrying `candidate_payload: "private-extra"`
    // previously hydrated and SURVIVED the next rewrite. It must now fail closed.
    const tamperedSnapshot = {
      version: 1,
      entries: [{ op: 'seed', scope: { ...CLEAN_SCOPE, candidate_payload: 'private-extra' } }],
    };
    writeFileSync(snapshotPath(), JSON.stringify(tamperedSnapshot), 'utf8');

    // (1) Cannot hydrate: construction fails closed, so no usable store ever wraps
    //     the tampered entry — there is no instance to perform a "next rewrite".
    expect(() => makeStore()).toThrow(RouteStorageDurableSpikeCorruptStateError);

    // (2) Hydrate is READ-ONLY: the failed construction never rewrote a "blessed"
    //     clean copy, so the tamper was not laundered — the raw file is untouched,
    //     inert, and still cannot produce a store on a retry.
    expect(readFileSync(snapshotPath(), 'utf8')).toContain('private-extra');
    expect(() => makeStore()).toThrow(RouteStorageDurableSpikeCorruptStateError);
  });

  it('hydrate + rewrite re-serializes ONLY declared fields (no extras carried forward)', () => {
    // A clean snapshot written by the live path (seed + admit + supersede — the
    // supersede exercises the optional supersedes_assertion_id field).
    const a = makeStore();
    a.seedScope(scope());
    a.record(scope(), admitTransition());
    a.record(scope(), supersedeTransition());

    // Hydrate into a fresh store, then trigger a REWRITE by recording a NEW entry
    // (a second actor) — this re-serializes every hydrated entry back to disk.
    const b = makeStore();
    b.seedScope(scope({ actor_id: ACTOR_B }));
    b.record(scope({ actor_id: ACTOR_B }), admitTransition());

    const parsed = JSON.parse(readFileSync(snapshotPath(), 'utf8')) as {
      version: number;
      entries: Array<Record<string, unknown>>;
    };
    expect(parsed.version).toBe(1);
    const ALLOWED_TRANSITION_KEYS = [
      'kind',
      'source_candidate_id',
      'admission_transition_id',
      'admitted_assertion_id',
      'assertion_class',
      'replay_key',
      'supersedes_assertion_id',
    ];
    for (const entry of parsed.entries) {
      const allowedEntryKeys = entry.op === 'record' ? ['op', 'scope', 'transition'] : ['op', 'scope'];
      expect(Object.keys(entry).sort()).toEqual([...allowedEntryKeys].sort());
      expect(Object.keys(entry.scope as object).sort()).toEqual(['actor_id', 'estate_id', 'tenant_id']);
      if (entry.op === 'record') {
        for (const k of Object.keys(entry.transition as object)) {
          expect(ALLOWED_TRANSITION_KEYS).toContain(k);
        }
      }
    }
  });

  it('a good snapshot still hydrates after the hardening (recovery unbroken)', () => {
    // Belt-and-suspenders alongside the durability suite: a clean, in-shape
    // snapshot at the supported version still restores the prior synthetic state.
    const a = makeStore();
    a.seedScope(scope());
    a.record(scope(), admitTransition());
    a.tombstoneActor(scope({ actor_id: ACTOR_B })); // no-op (unseeded) — no entry
    a.seedScope(scope({ actor_id: ACTOR_B }));
    a.record(scope({ actor_id: ACTOR_B }), admitTransition());

    const b = makeStore();
    expect(b.actorCount()).toBe(2);
    expect(b.projectRecall(scope()).includes).toEqual(['assn-active-synthetic-dev']);
    expect(b.projectRecall(scope({ actor_id: ACTOR_B })).includes).toEqual(['assn-active-synthetic-dev']);
    expect(b.inspectScope(scope()).assertions).toBe(1);
  });
});

// ── Private durable / audit surfaces carry no public-leak shapes ──────────────

describe('Phase 47A durable spike — private surfaces never carry public-leak shapes', () => {
  it('the public-facing recall projection and footprint are leak-clean', () => {
    const store = makeStore();
    store.seedScope(scope());
    store.record(scope(), admitTransition());
    store.record(scope(), supersedeTransition());
    // projectRecall / inspectScope are the surfaces that gate public recall; they
    // must carry no forbidden public key/value shape.
    expect(findAdmissionPublicLeaks(store.projectRecall(scope()))).toEqual([]);
    expect(findAdmissionPublicLeaks(store.inspectScope(scope()))).toEqual([]);
    // The cross-actor empty surfaces are also clean.
    expect(findAdmissionPublicLeaks(store.projectRecall(scope({ actor_id: ACTOR_B })))).toEqual([]);
  });

  it('a durable-config error message echoes no path and trips no leak detector', () => {
    let message = '';
    try {
      createRouteStorageDurableSpikeStore(baseConfig({ fileName: 'bad.sql' }));
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).not.toContain(dir);
    expect(message).not.toContain('bad.sql');
    expect(findAdmissionPublicLeaks(message)).toEqual([]);
  });
});

// ── Actor-id snapshot / TOCTOU discipline preserved through the wrapper ───────

describe('Phase 47A durable spike — a shifting TRANSITION-field getter cannot diverge applied vs persisted', () => {
  /** Build a transition whose ONE named field is an accessor returning `v1` on the
   *  first read and `v2` on every read after. The store must snapshot the field once
   *  so the inner apply AND the on-disk snapshot both observe `v1`. */
  function shiftingFieldTransition(field: keyof SyntheticAdmissionTransition, v1: string, v2: string): SyntheticAdmissionTransition {
    let count = 0;
    const base: Record<string, unknown> = {
      kind: 'admit',
      source_candidate_id: 'cand-synthetic-dev',
      admission_transition_id: 'txn-admit-synthetic-dev',
      admitted_assertion_id: 'assn-active-synthetic-dev',
      assertion_class: 'preference',
      replay_key: 'admit:cand-synthetic-dev',
    };
    Object.defineProperty(base, field, {
      enumerable: true,
      configurable: true,
      get() {
        const v = count === 0 ? v1 : v2;
        count += 1;
        return v;
      },
    });
    return base as SyntheticAdmissionTransition;
  }

  it('a shifting admitted_assertion_id getter persists the SAME value it applied (no hydrate divergence)', () => {
    const store = makeStore();
    store.seedScope(scope());
    // First read = the applied value; later reads = a different value. With the
    // snapshot fix the persisted/hydrated id equals the applied id.
    store.record(scope(), shiftingFieldTransition('admitted_assertion_id', 'assn-active-synthetic-dev', 'assn-shifted-other-dev'));
    const liveIncludes = store.projectRecall(scope()).includes;

    const b = makeStore(); // hydrate
    expect(b.projectRecall(scope()).includes).toEqual(liveIncludes);
    expect(b.projectRecall(scope()).includes).toEqual(['assn-active-synthetic-dev']);
    // The shifted value never reached the artifact.
    expect(readFileSync(snapshotPath(), 'utf8')).not.toContain('assn-shifted-other-dev');
  });

  it('a shifting assertion_class getter cannot smuggle an unsafe marker into the artifact', () => {
    const store = makeStore();
    store.seedScope(scope());
    // Read #1 is a safe value the inner engine validates; a naive re-read at persist
    // would write the unsafe value. The inner engine validates the snapshot, so a
    // truly-unsafe first read is rejected; here we prove the PERSISTED value is the
    // validated first read, never a shifted second read.
    store.record(scope(), shiftingFieldTransition('assertion_class', 'preference', 'candidate_payload_LEAKED'));
    const raw = readFileSync(snapshotPath(), 'utf8');
    expect(raw).not.toContain('candidate_payload_LEAKED');
    // And a fresh hydrate succeeds (the artifact was not poisoned) and matches live.
    const b = makeStore();
    expect(b.inspectScope(scope()).assertions).toBe(1);
  });
});

describe('Phase 47A durable spike — a persist fault latches DEGRADED and fails closed', () => {
  it('a write fault after a successful inner mutation latches degraded; reads + writes then fail closed', () => {
    const store = makeStore();
    store.seedScope(scope());
    expect(store.record(scope(), admitTransition()).outcome).toBe('recorded');

    // Force the NEXT persist to fail by making the durable dir read-only, so
    // writeFileSync(tmp) throws AFTER the inner engine has applied the next op.
    chmodSync(dir, 0o500);
    let threw = false;
    try {
      store.record(
        scope(),
        admitTransition({
          admitted_assertion_id: 'assn-second-synthetic-dev',
          replay_key: 'admit:cand-second',
          source_candidate_id: 'cand-second-dev',
        }),
      );
    } catch {
      threw = true;
    }
    // Restore perms so afterEach cleanup (and the read assertions) work.
    chmodSync(dir, 0o700);

    if (!threw) {
      // Some environments (e.g. running as root) ignore dir perms; skip the rest.
      return;
    }

    // The store latched degraded: every read AND write now fails closed, so the
    // inner engine's un-persisted op can never be observed.
    expect(() => store.projectRecall(scope())).toThrow(RouteStorageDurableSpikeDegradedError);
    expect(() => store.inspectScope(scope())).toThrow(RouteStorageDurableSpikeDegradedError);
    expect(() => store.record(scope(), admitTransition())).toThrow(RouteStorageDurableSpikeDegradedError);
    expect(() => store.seedScope(scope())).toThrow(RouteStorageDurableSpikeDegradedError);

    // The error carries no path / payload.
    let message = '';
    try {
      store.projectRecall(scope());
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).not.toContain(dir);
    expect(findAdmissionPublicLeaks(message)).toEqual([]);

    // Self-heals across a restart: a fresh store over the same dir hydrates ONLY the
    // persisted state (the un-persisted second op is absent — no residue).
    const b = makeStore();
    expect(b.inspectScope(scope()).assertions).toBe(1); // only the first record survived
    expect(b.projectRecall(scope()).includes).toEqual(['assn-active-synthetic-dev']);
  });
});

describe('Phase 47A durable spike — actor-id snapshot/TOCTOU discipline is preserved', () => {
  it('a shifting actor_id getter cannot divert a durable write across actor isolation', () => {
    const store = makeStore();
    store.seedScope(scope({ actor_id: ACTOR_A }));
    store.record(scope({ actor_id: ACTOR_A }), admitTransition());
    store.tombstoneActor(scope({ actor_id: ACTOR_A }));
    store.seedScope(scope({ actor_id: ACTOR_B }));
    store.record(scope({ actor_id: ACTOR_B }), admitTransition());

    // The durable wrapper normalizes the scope (reading actor_id once into a local)
    // before it touches the inner engine OR persists, so a getter that shifts
    // A → B cannot apply to one actor and persist as another.
    let count = 0;
    const target: Record<string, unknown> = { tenant_id: TENANT, estate_id: ESTATE };
    Object.defineProperty(target, 'actor_id', {
      enumerable: true,
      configurable: true,
      get() {
        const v = count === 0 ? ACTOR_A : ACTOR_B;
        count += 1;
        return v;
      },
    });
    const before = store.durableEntryCount();
    expect(() => store.record(target as RouteStorageSpikeScope, admitTransition())).toThrow(
      RouteStorageSpikeActorScopeError,
    );
    // The resolved actor was A (tombstoned) → fail closed; nothing persisted.
    expect(store.durableEntryCount()).toBe(before);
    // Live ACTOR_B received nothing.
    expect(store.inspectScope(scope({ actor_id: ACTOR_B })).assertions).toBe(1);

    // And the on-disk truth confirms B was not written through the shifting scope.
    const b = makeStore();
    expect(b.inspectScope(scope({ actor_id: ACTOR_B })).assertions).toBe(1);
  });
});
