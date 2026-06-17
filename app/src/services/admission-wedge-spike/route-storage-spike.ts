// Phase 46V — dev/operator-only Admission Wedge ROUTE-STORAGE spike
// (Storage Mode 1: no-migration, bounded-synthetic, in-process).
//
// Authorized NARROWLY by the Phase 46U route-storage spike authorization gate
// (docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md §3–§16), which
// AUTHORIZED a disabled-by-default, dev/operator-only, reversible,
// NON-PRODUCTION route-storage spike and PREFERRED Mode 1 (§6) — reuse the Phase
// 33Q bounded synthetic ledger shape, persist nothing durable, add no migration.
// Mode 2 (durable + Lane-1 `aw_*` migrations) was NOT selected: the Phase 33N
// scope guards (tests/unit/admission-wedge-spike/scope-guards.test.ts) forbid any
// durable-write / SQL / migration token and any production-store import in the
// spike path, and the repo's global migration runner would adopt any new
// migration into the PRODUCTION set — so Mode 2 cannot be added narrowly without
// weakening an existing security guard. Mode 1 proves the route-owned storage
// semantics with the lowest blast radius (46U §6 / §7).
//
// WHAT THIS ADDS over Phase 33Q. The Phase 33Q ledger
// (`admitted-assertion-ledger.ts`) is `(tenant_id, estate_id)`-scoped. Phase 46U
// §10 requires tenant / estate / ACTOR isolation. This module adds the THIRD
// scope dimension by holding ONE INDEPENDENT Phase 33Q ledger per synthetic
// actor: an actor's synthetic state lives in its own factory closure, so one
// actor's records are STRUCTURALLY unreachable from another actor (cross-actor
// isolation is not a runtime check that could be bypassed — it is separate
// closures). Within an actor, the wrapped ledger enforces the proven 33Q
// guarantees: tenant+estate scoping, idempotent replay, conflict fail-closed,
// supersession, per-estate capacity bounds, synthetic-only label validation, and
// no raw-payload persistence.
//
// PRECEDENT, NOT REUSE-OF-RECALL. Like Phase 33Q, this mirrors ONLY the
// operational properties of a bounded process-local store. It opens NO database
// connection, NO file handle, NO socket, NO timer; runs NO background task;
// performs NO durable write and NO migration. Its entire state is JS Maps in a
// factory closure, so a process restart leaves NO recallable residue. It imports
// ONLY the Phase 33Q ledger; it imports nothing from Recall, nothing from
// `@loa/straylight`, and nothing from Freeside. It freezes NO schema and decides
// NO final idempotency / signer / authority / tenant-estate-actor binding
// semantics — those remain UNRESOLVED (46U §9 / §10 / §13). The synthetic actor
// binding here is a SPIKE isolation mechanism, NOT the final production binding.
//
// Filename note: `*-spike.ts`, deliberately NOT `*-store.ts`. The Phase 33N
// scope guards reject any spike-path import specifier matching `/-store(.js)?$/`
// as a forbidden production-storage import; a `-spike` name stays inside the
// authorized envelope without weakening that guard.

import {
  createAdmittedAssertionLedger,
  type AdmittedAssertionLedger,
  type AdmittedScope,
  type EstateFootprint,
  type RecallProjection,
  type RecordOutcome,
  type SyntheticAdmissionTransition,
  type SyntheticAuditRecord,
} from './admitted-assertion-ledger.js';

/** A (tenant_id, estate_id, actor_id) scope. EVERY access is bound to all three:
 *  cross-tenant and cross-estate isolation is enforced by the wrapped Phase 33Q
 *  ledger; cross-actor isolation is enforced structurally by one ledger per
 *  actor. All three ids must be bounded synthetic labels (validated before use). */
export interface RouteStorageSpikeScope {
  tenant_id: string;
  estate_id: string;
  actor_id: string;
}

/** Per-store capacity bounds. `maxActors` bounds the number of DISTINCT synthetic
 *  actors ever seeded (bounded REJECTION beyond the cap — the store never evicts
 *  and never grows unbounded). The two per-estate bounds are passed straight
 *  through to each per-actor Phase 33Q ledger. All three are validated at
 *  creation; a malformed/unbounded config fails closed at construction. */
export interface RouteStorageSpikeConfig {
  maxActors: number;
  maxAssertionsPerEstate: number;
  maxAssertionBytesPerEstate: number;
}

/** A bounded, process-local, NON-DURABLE, tenant/estate/actor-scoped, fail-closed
 *  route-owned store. Reads on a valid-but-unseeded/tombstoned actor return empty
 *  (fail closed without throwing); writes fail closed (throw). */
export interface RouteStorageSpikeStore {
  /** Establish a synthetic actor slot and seed its (tenant, estate). Idempotent
   *  for the SAME (tenant, estate, actor). Fails closed on a malformed scope, a
   *  tombstoned actor, an over-capacity new actor, or (delegated) an estate
   *  re-homed to a different tenant within the actor's ledger. */
  seedScope(scope: RouteStorageSpikeScope): void;
  /** Record a synthetic admit/supersede transition into a seeded, non-tombstoned
   *  actor's (tenant, estate). Delegates idempotency / conflict / capacity /
   *  scope to the wrapped Phase 33Q ledger. Fails closed (throws) on a malformed
   *  scope, an unseeded actor, a tombstoned actor, or any ledger violation. */
  record(scope: RouteStorageSpikeScope, transition: SyntheticAdmissionTransition): RecordOutcome;
  /** Internal recall-eligibility projection for a seeded, non-tombstoned actor
   *  (empty for an unseeded/tombstoned actor — reads fail closed without throwing). */
  projectRecall(scope: RouteStorageSpikeScope): RecallProjection;
  /** Per-(estate, actor) synthetic footprint (zeros for an unseeded/tombstoned actor). */
  inspectScope(scope: RouteStorageSpikeScope): EstateFootprint;
  /** Private synthetic audit trail for a seeded, non-tombstoned actor (empty for
   *  an unseeded/tombstoned actor). */
  auditTrail(scope: RouteStorageSpikeScope): readonly SyntheticAuditRecord[];
  /** Reversible kill/cleanup path: mark a synthetic actor tombstoned, releasing
   *  its synthetic state. After this, the actor is not recallable (empty
   *  projection / zero footprint / empty audit) and further writes fail closed —
   *  no recallable residue (46U §11). Idempotent; a no-op for an unseeded actor. */
  tombstoneActor(scope: RouteStorageSpikeScope): void;
  /** True iff the actor has been tombstoned. */
  isActorTombstoned(scope: RouteStorageSpikeScope): boolean;
  /** Number of distinct synthetic actors ever seeded (tombstoned actors still
   *  counted — bounded, no eviction). Diagnostic only; never public. */
  actorCount(): number;
}

/** Thrown at store CREATION when a capacity bound is not a finite positive
 *  integer within the dev/test ceiling. Carries only the field name + a short
 *  reason — never a payload. */
export class RouteStorageSpikeInvalidConfigError extends Error {
  readonly field: 'maxActors' | 'maxAssertionsPerEstate' | 'maxAssertionBytesPerEstate';
  readonly reason: 'not_a_number' | 'not_finite' | 'not_integer' | 'not_positive' | 'exceeds_dev_ceiling';
  constructor(opts: {
    field: 'maxActors' | 'maxAssertionsPerEstate' | 'maxAssertionBytesPerEstate';
    reason: 'not_a_number' | 'not_finite' | 'not_integer' | 'not_positive' | 'exceeds_dev_ceiling';
  }) {
    super(`route-storage spike invalid config [${opts.reason}]`);
    this.name = 'RouteStorageSpikeInvalidConfigError';
    this.field = opts.field;
    this.reason = opts.reason;
  }
}

/** Thrown BEFORE any mutation when `actor_id` is not a bounded synthetic label.
 *  Never echoes the rejected value, so a rejected unsafe actor leaves zero
 *  residue. (tenant_id / estate_id and the transition fields are validated by the
 *  wrapped Phase 33Q ledger.) */
export class RouteStorageSpikeInvalidActorError extends Error {
  readonly reason: 'not_a_string' | 'empty' | 'too_long' | 'invalid_format' | 'unsafe_value';
  constructor(opts: { reason: 'not_a_string' | 'empty' | 'too_long' | 'invalid_format' | 'unsafe_value' }) {
    super(`route-storage spike invalid actor [${opts.reason}]`);
    this.name = 'RouteStorageSpikeInvalidActorError';
    this.reason = opts.reason;
  }
}

/** Thrown when a write targets an actor that is not in a writable state: an
 *  unseeded actor (`unseeded_actor`) or a tombstoned actor (`tombstoned_actor`).
 *  Carries the safe reason only — never the actor id. */
export class RouteStorageSpikeActorScopeError extends Error {
  readonly reason: 'unseeded_actor' | 'tombstoned_actor';
  constructor(opts: { reason: 'unseeded_actor' | 'tombstoned_actor' }) {
    super(`route-storage spike actor scope violation [${opts.reason}]`);
    this.name = 'RouteStorageSpikeActorScopeError';
    this.reason = opts.reason;
  }
}

/** Thrown when seeding a NEW actor would exceed `maxActors` (bounded REJECTION,
 *  46U §11 capacity bullet — never an eviction). */
export class RouteStorageSpikeActorCapExceededError extends Error {
  readonly cap: number;
  readonly observed: number;
  constructor(opts: { cap: number; observed: number }) {
    super('route-storage spike actor capacity exceeded [actor_count]');
    this.name = 'RouteStorageSpikeActorCapExceededError';
    this.cap = opts.cap;
    this.observed = opts.observed;
  }
}

/** Max length for the actor label (mirrors the ledger's MAX_FIELD_LEN). */
const MAX_ACTOR_LEN = 128;

/** Actor label shape: lowercase snake/kebab plus digits — narrow and synthetic,
 *  deliberately excluding whitespace, uppercase, and free-form punctuation that
 *  could carry raw material. Linear-time (no backtracking). Mirrors the ledger's
 *  SYNTH_LABEL_RE. */
const SYNTH_ACTOR_RE = /^[a-z0-9][a-z0-9_-]*$/;

/** Raw-material / unsafe-marker substrings rejected in the actor label
 *  (defense-in-depth; mirrors the ledger's intent). Checked case-insensitively. */
const UNSAFE_ACTOR_SUBSTRINGS = [
  'unsafe_marker',
  'candidate_payload',
  'source_material',
  'source_ref',
  'raw_candidate',
  'raw_reason',
  'policy_reason',
  'sentinel',
  'secret',
  'token',
];

/** Dev/test ceiling for the actor cap — generous for every spike/test config,
 *  far below any production scale. */
const MAX_ACTORS_CEILING = 100_000;

/** Validate the actor label to a bounded synthetic shape BEFORE any mutation.
 *  Order: type → emptiness → length → unsafe-substring → shape. Throws
 *  `RouteStorageSpikeInvalidActorError` without echoing the value. */
function assertSyntheticActor(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new RouteStorageSpikeInvalidActorError({ reason: 'not_a_string' });
  }
  if (value.length === 0) {
    throw new RouteStorageSpikeInvalidActorError({ reason: 'empty' });
  }
  if (value.length > MAX_ACTOR_LEN) {
    throw new RouteStorageSpikeInvalidActorError({ reason: 'too_long' });
  }
  const lower = value.toLowerCase();
  for (const marker of UNSAFE_ACTOR_SUBSTRINGS) {
    if (lower.includes(marker)) {
      throw new RouteStorageSpikeInvalidActorError({ reason: 'unsafe_value' });
    }
  }
  if (!SYNTH_ACTOR_RE.test(value)) {
    throw new RouteStorageSpikeInvalidActorError({ reason: 'invalid_format' });
  }
}

/** A FROZEN, closure-owned copy of the validated caps. Once built at creation
 *  these are the only caps ever read — the caller-owned config is never read
 *  again, so mutating it afterward cannot widen a cap (mirrors the ledger's
 *  Codex-blocker-2 hardening). */
interface ValidatedStoreCaps {
  readonly maxActors: number;
  readonly maxAssertionsPerEstate: number;
  readonly maxAssertionBytesPerEstate: number;
}

function validateStoreConfig(config: RouteStorageSpikeConfig): ValidatedStoreCaps {
  const rawActors: unknown = config.maxActors;
  const rawAssertions: unknown = config.maxAssertionsPerEstate;
  const rawBytes: unknown = config.maxAssertionBytesPerEstate;
  const checks: Array<['maxActors' | 'maxAssertionsPerEstate' | 'maxAssertionBytesPerEstate', unknown, number]> = [
    ['maxActors', rawActors, MAX_ACTORS_CEILING],
    // The per-estate ceilings are re-validated by the wrapped ledger at first
    // seed; here we only enforce the same positive-integer floor so a malformed
    // config fails closed at store creation rather than at first write.
    ['maxAssertionsPerEstate', rawAssertions, Number.MAX_SAFE_INTEGER],
    ['maxAssertionBytesPerEstate', rawBytes, Number.MAX_SAFE_INTEGER],
  ];
  for (const [field, raw, ceiling] of checks) {
    if (typeof raw !== 'number') {
      throw new RouteStorageSpikeInvalidConfigError({ field, reason: 'not_a_number' });
    }
    if (!Number.isFinite(raw)) {
      throw new RouteStorageSpikeInvalidConfigError({ field, reason: 'not_finite' });
    }
    if (!Number.isInteger(raw)) {
      throw new RouteStorageSpikeInvalidConfigError({ field, reason: 'not_integer' });
    }
    if (raw <= 0) {
      throw new RouteStorageSpikeInvalidConfigError({ field, reason: 'not_positive' });
    }
    if (raw > ceiling) {
      throw new RouteStorageSpikeInvalidConfigError({ field, reason: 'exceeds_dev_ceiling' });
    }
  }
  return Object.freeze({
    maxActors: rawActors as number,
    maxAssertionsPerEstate: rawAssertions as number,
    maxAssertionBytesPerEstate: rawBytes as number,
  });
}

/** One per-actor slot. A live actor holds its own Phase 33Q ledger; a tombstoned
 *  actor holds none (its synthetic state has been released for GC). */
interface ActorSlot {
  tombstoned: boolean;
  ledger: AdmittedAssertionLedger | null;
}

/** Project a (tenant, estate, actor) scope onto the wrapped ledger's
 *  (tenant, estate) scope. */
function ledgerScope(scope: RouteStorageSpikeScope): AdmittedScope {
  return { tenant_id: scope.tenant_id, estate_id: scope.estate_id };
}

/** Read `scope.actor_id` EXACTLY ONCE into a local, validate that local to a
 *  bounded synthetic label, and return it. Every `actors.get` / `actors.set`,
 *  tombstone check, error-reason classification, and ledger selection in an
 *  operation then reads ONLY this returned local — NEVER `scope.actor_id` again —
 *  so a caller-owned accessor getter cannot validate as one actor and then
 *  map/set as another (TOCTOU). A tombstoned actor therefore cannot be silently
 *  revived, and a write/read cannot be diverted across actor isolation, by a
 *  shifting getter. Mirrors the Phase 33Q ledger's `snapshotScope` discipline
 *  (admitted-assertion-ledger.ts), which snapshots tenant/estate once for the
 *  same reason. Does NOT weaken actor-label validation: the same
 *  `assertSyntheticActor` runs, exactly once. */
function snapshotActorId(scope: RouteStorageSpikeScope): string {
  const actor_id = scope.actor_id;
  assertSyntheticActor(actor_id);
  return actor_id;
}

const EMPTY_PROJECTION: RecallProjection = Object.freeze({
  includes: Object.freeze([]),
  excludes: Object.freeze([]),
});
const EMPTY_FOOTPRINT: EstateFootprint = Object.freeze({ assertions: 0, bytes: 0 });
const EMPTY_AUDIT: readonly SyntheticAuditRecord[] = Object.freeze([]);

/**
 * Create a bounded, process-local, tenant/estate/actor-scoped, NON-DURABLE
 * route-storage spike store. The capacity config is validated immediately, so an
 * unbounded/malformed config fails closed at construction. All state lives in the
 * Map below, captured in this closure — a second call yields a fresh, empty
 * store, which is exactly how "process restart leaves no recallable residue" is
 * proven (46U §6 / §11). Mode 1: NO durable write, NO migration.
 */
export function createRouteStorageSpikeStore(config: RouteStorageSpikeConfig): RouteStorageSpikeStore {
  const caps = validateStoreConfig(config);

  /** Keyed by actor_id. Each actor owns an independent Phase 33Q ledger, so one
   *  actor's synthetic state is structurally unreachable from another's. */
  const actors = new Map<string, ActorSlot>();

  function liveLedgerFor(scope: RouteStorageSpikeScope, forWrite: boolean): AdmittedAssertionLedger | null {
    // Snapshot + validate the actor id ONCE, then key the lookup off the local —
    // a shifting `actor_id` getter cannot validate as one actor and resolve to a
    // different actor's slot (TOCTOU; cross-actor isolation bypass).
    const actorId = snapshotActorId(scope);
    const slot = actors.get(actorId);
    if (!slot) {
      if (forWrite) throw new RouteStorageSpikeActorScopeError({ reason: 'unseeded_actor' });
      return null;
    }
    if (slot.tombstoned || slot.ledger === null) {
      if (forWrite) throw new RouteStorageSpikeActorScopeError({ reason: 'tombstoned_actor' });
      return null;
    }
    return slot.ledger;
  }

  return {
    seedScope(scope) {
      // Snapshot + validate the actor id ONCE. The tombstone check, the
      // `actors.get`, and the `actors.set` below ALL key off this local — never
      // `scope.actor_id` — so a shifting getter cannot validate/get as an unseeded
      // decoy actor (skipping the tombstone branch) and then SET a live ledger
      // onto a tombstoned actor's key, silently reviving it (TOCTOU). The wrapped
      // tenant/estate validation still runs inside `seedEstate` (unchanged).
      const actorId = snapshotActorId(scope);
      const existing = actors.get(actorId);
      if (existing) {
        if (existing.tombstoned || existing.ledger === null) {
          // A tombstoned actor cannot be silently revived — fail closed.
          throw new RouteStorageSpikeActorScopeError({ reason: 'tombstoned_actor' });
        }
        // Delegate (idempotent for same tenant/estate; throws on a tenant
        // conflict within the actor's ledger).
        existing.ledger.seedEstate(ledgerScope(scope));
        return;
      }
      // A new actor must fit the bound (bounded REJECTION; never eviction).
      if (actors.size + 1 > caps.maxActors) {
        throw new RouteStorageSpikeActorCapExceededError({ cap: caps.maxActors, observed: actors.size + 1 });
      }
      const ledger = createAdmittedAssertionLedger({
        maxAssertionsPerEstate: caps.maxAssertionsPerEstate,
        maxAssertionBytesPerEstate: caps.maxAssertionBytesPerEstate,
      });
      ledger.seedEstate(ledgerScope(scope));
      actors.set(actorId, { tombstoned: false, ledger });
    },

    record(scope, transition) {
      const ledger = liveLedgerFor(scope, /*forWrite*/ true)!;
      return ledger.record(ledgerScope(scope), transition);
    },

    projectRecall(scope) {
      const ledger = liveLedgerFor(scope, /*forWrite*/ false);
      return ledger ? ledger.projectRecall(ledgerScope(scope)) : EMPTY_PROJECTION;
    },

    inspectScope(scope) {
      const ledger = liveLedgerFor(scope, /*forWrite*/ false);
      return ledger ? ledger.inspectEstate(ledgerScope(scope)) : EMPTY_FOOTPRINT;
    },

    auditTrail(scope) {
      const ledger = liveLedgerFor(scope, /*forWrite*/ false);
      return ledger ? ledger.auditTrail(ledgerScope(scope)) : EMPTY_AUDIT;
    },

    tombstoneActor(scope) {
      // Snapshot + validate ONCE; the `actors.get` (existence check) and the
      // `actors.set` (tombstone mark) below both key off this local, so a shifting
      // getter cannot tombstone an actor other than the one validated.
      const actorId = snapshotActorId(scope);
      const slot = actors.get(actorId);
      if (!slot) return; // nothing seeded → nothing to tombstone (idempotent)
      // Mark tombstoned and release the ledger reference (its synthetic state
      // becomes unreachable / GC-eligible) WITHOUT physically evicting the slot,
      // so the actor stays counted against the bound and cannot be silently
      // revived. After this the actor is not recallable and writes fail closed.
      actors.set(actorId, { tombstoned: true, ledger: null });
    },

    isActorTombstoned(scope) {
      // Snapshot + validate ONCE; the lookup keys off the local, so the answer
      // reflects the actor that was validated, not one a getter shifts to after.
      const actorId = snapshotActorId(scope);
      const slot = actors.get(actorId);
      return slot ? slot.tombstoned || slot.ledger === null : false;
    },

    actorCount() {
      return actors.size;
    },
  };
}
