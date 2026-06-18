// Phase 47A — dev/operator-only Admission Wedge ROUTE-STORAGE spike
// (Storage Mode 2: DURABLE, bounded-synthetic, route-owned; disabled-by-default,
// NON-PRODUCTION).
//
// Authorized NARROWLY by the Phase 46Z Mode 2 implementation-authorization
// checklist gate
// (docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md
// §7–§15), which authorized a SEPARATE-PR, bounded, dev/operator-only,
// disabled-by-default, NON-PRODUCTION Mode 2 implementation spike, acceptance-gated
// on the §8–§15 checklist and MODE-CONTINGENT (the 46U → 46V precedent: a spike may
// fall back if Mode 2 cannot satisfy migration isolation without weakening the
// production posture). This module is that spike.
//
// WHAT "MODE 2" MEANS HERE, AND WHY FILE-BACKED. Phase 46V chose Mode 1 (in-process,
// no durable write) because the only DURABLE substrate it considered was Lane-1
// `aw_*` SQL placed in the shared `src/db/migrations/` directory — which the
// whole-directory migration runner (`src/db/migrate.ts` discoverMigrations) and the
// `.sql`-only build packager (`scripts/copy-migrations.mjs`) would auto-adopt into
// the PRODUCTION migration set, and which the Phase 33N scope guards forbid by token
// (INSERT / UPDATE / DELETE / CREATE TABLE / pg / postgres / migrate / … ). Mode 2's
// DEFINING property over Mode 1 is DURABILITY — synthetic route-owned state that
// survives a process restart. The LOWEST-blast-radius way to deliver that durability
// is a JSON-SNAPSHOT FILE store, NOT SQL:
//
//   * it adds NO SQL and NO `aw_*` schema material, so there is literally nothing
//     for the production migration runner to discover or execute (checklist A.1 /
//     A.2 hold by construction — no material exists to adopt);
//   * it persists ONLY a `.json` snapshot. The production runner adopts only
//     `f.endsWith('.sql') && !f.includes('_down')` and the packager copies only
//     `.sql`; a `.json` artifact can NEVER join the production migration set even
//     if it were co-located (A.4). The `.json` extension is the isolation guarantee
//     and is ENFORCED below (a non-`.json` file name fails closed at construction);
//   * it writes to an EXPLICIT operator-provided directory (no default location), so
//     durable state is never written without a deliberate operator choice, and never
//     into the production migration directory or the build output (A.3 / A.5 / A.6);
//   * it touches NO migration runner, NO packager, and NO scope guard — so no
//     existing production guard is weakened (checklist B.1: refined narrowly / not
//     weakened broadly — here NOTHING is weakened because the file store needs none
//     of the forbidden tokens).
//
// WHAT THIS ADDS over Phase 46V Mode 1. It WRAPS the proven Phase 46V Mode-1 engine
// (`createRouteStorageSpikeStore`) — inheriting, verbatim, its tenant/estate/actor
// isolation (one Phase 33Q ledger per synthetic actor), idempotent replay, conflict
// fail-closed, supersession, per-estate + per-store capacity bounds, synthetic-only
// label validation (no raw payload), and the actor-id snapshot / TOCTOU discipline —
// and layers a thin DURABLE persistence/hydration log on top:
//
//   * every ACCEPTED seed / record / tombstone is appended to an in-memory ordered
//     log and the whole log is rewritten to disk as a single atomic JSON snapshot
//     (write-temp + rename), so the on-disk file is always a complete, consistent
//     state;
//   * on construction the store HYDRATES by replaying the snapshot's entries, in
//     order, through a fresh Mode-1 engine — deterministic and idempotent, so the
//     exact prior synthetic state is reconstructed (this is how "survives restart"
//     is proven, the inverse of Mode 1's "a second instance shares no state");
//   * the durable log is itself BOUNDED (bounded REJECTION at the cap, never
//     eviction) so the on-disk artifact cannot grow unbounded;
//   * `purgeDurableState()` removes the on-disk snapshot (reversible cleanup; a
//     subsequent fresh store in the same directory hydrates EMPTY — checklist A.7).
//
// PRIVATE DURABLE ARTIFACT. The on-disk snapshot is a PRIVATE dev/operator artifact
// (it holds synthetic assertion / transition / receipt-ref labels). It is NEVER a
// public surface and is NEVER serialized onto the wire — the route still builds the
// deterministic public-safe body and deep-walks it through the runtime no-leak guard
// (the public envelope is unchanged; the public no-leak 114-key parity is untouched).
//
// FAIL-CLOSED. A durable write fault (disk error) makes `record` / `seedScope` /
// `tombstoneActor` throw, which collapses the route to the SAME stable public-safe
// refusal as any partial failure (no internal error or partial state on the wire).
// A corrupt / unreadable snapshot fails closed at CONSTRUCTION (the store throws so
// a dev process refuses to start on a damaged store rather than silently serving a
// half-loaded one).
//
// THIS DOES NOT, AND DOES NOT CLAIM TO: implement production storage, production DB
// writes, a production durable substrate, or a Lane-2 canonical Straylight-store
// migration; open a database connection; execute a migration; change the migration
// runner / packager; weaken a scope guard; expand the public response; persist a raw
// candidate payload; freeze the route contract or the final schema; integrate
// Freeside; or discharge the operative Straylight-side ADR-022E gate #8. It is a
// dev/operator-only, disabled-by-default, NON-PRODUCTION spike.
//
// Filename note: `*-durable-spike.ts`, deliberately ending in `-spike` (never
// `-store`). The Phase 33N scope guards reject any spike-path import specifier
// matching `/-store(\.js)?$/`; a `-spike` name stays inside the authorized envelope
// without weakening that guard.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import {
  createRouteStorageSpikeStore,
  type RouteStorageSpikeScope,
  type RouteStorageSpikeStore,
} from './route-storage-spike.js';
import type {
  RecordOutcome,
  SyntheticAdmissionTransition,
} from './admitted-assertion-ledger.js';

/** Config for the durable (Mode 2) route-storage spike. The three per-engine caps
 *  are delegated to the wrapped Phase 46V Mode-1 engine (validated there). The
 *  durable-specific fields (`dir`, `fileName`, `maxDurableEntries`) are validated
 *  here; a malformed/unbounded config fails closed at construction. */
export interface RouteStorageDurableSpikeConfig {
  /** Explicit dev/operator directory the durable JSON snapshot lives in. REQUIRED
   *  and non-empty — there is NO default location, so durable state is never
   *  written without a deliberate operator choice (fail closed). */
  dir: string;
  /** Optional snapshot file name; MUST end in `.json` (enforced). Defaults to a
   *  fixed `.json` name. The `.json` extension is the production-isolation
   *  guarantee: the production runner/packager adopt only `.sql`, so a `.json`
   *  artifact can never join the production set even if co-located. */
  fileName?: string;
  /** Max distinct synthetic actors (delegated to the wrapped Mode-1 engine). */
  maxActors: number;
  /** Per-estate synthetic assertion cap (delegated). */
  maxAssertionsPerEstate: number;
  /** Per-estate synthetic byte budget (delegated). */
  maxAssertionBytesPerEstate: number;
  /** Max durable snapshot entries — bounded REJECTION at the cap (never eviction),
   *  so the on-disk artifact cannot grow unbounded. */
  maxDurableEntries: number;
}

/** A bounded, DURABLE, tenant/estate/actor-scoped, fail-closed, route-owned store.
 *  Implements the SAME interface as the Phase 46V Mode-1 store (so the route is
 *  unchanged) plus a reversible durable-cleanup path and a durable diagnostic. */
export interface RouteStorageDurableSpikeStore extends RouteStorageSpikeStore {
  /** Reversible cleanup (A.7): remove the on-disk synthetic snapshot so a
   *  subsequent fresh store in the same directory hydrates EMPTY. Intended to be
   *  followed by a restart for a full reset (the in-process engine state clears on
   *  process exit — it is non-durable by nature). Idempotent. */
  purgeDurableState(): void;
  /** Number of durable snapshot entries currently persisted. Diagnostic only;
   *  never public. */
  durableEntryCount(): number;
}

/** Thrown at construction when a durable-specific config field is malformed.
 *  Carries only the field name + a short reason — never a path or payload. */
export class RouteStorageDurableSpikeInvalidConfigError extends Error {
  readonly field: 'dir' | 'fileName' | 'maxDurableEntries';
  readonly reason:
    | 'not_a_string'
    | 'empty'
    | 'too_long'
    | 'bad_extension'
    | 'path_separator'
    | 'not_a_number'
    | 'not_finite'
    | 'not_integer'
    | 'not_positive'
    | 'exceeds_dev_ceiling';
  constructor(opts: {
    field: 'dir' | 'fileName' | 'maxDurableEntries';
    reason:
      | 'not_a_string'
      | 'empty'
      | 'too_long'
      | 'bad_extension'
      | 'path_separator'
      | 'not_a_number'
      | 'not_finite'
      | 'not_integer'
      | 'not_positive'
      | 'exceeds_dev_ceiling';
  }) {
    super(`route-storage durable spike invalid config [${opts.reason}]`);
    this.name = 'RouteStorageDurableSpikeInvalidConfigError';
    this.field = opts.field;
    this.reason = opts.reason;
  }
}

/** Thrown at construction when the on-disk snapshot exists but cannot be parsed or
 *  replayed into a consistent state. Fail closed: a dev process refuses to start on
 *  a damaged store. Carries only a short safe reason — never the file contents. */
export class RouteStorageDurableSpikeCorruptStateError extends Error {
  readonly reason: 'unreadable' | 'not_json' | 'bad_shape' | 'replay_failed';
  constructor(opts: { reason: 'unreadable' | 'not_json' | 'bad_shape' | 'replay_failed' }) {
    super(`route-storage durable spike corrupt state [${opts.reason}]`);
    this.name = 'RouteStorageDurableSpikeCorruptStateError';
    this.reason = opts.reason;
  }
}

/** Thrown when appending a durable entry would exceed `maxDurableEntries` (bounded
 *  REJECTION, never eviction), or when a hydrated snapshot already exceeds it. */
export class RouteStorageDurableSpikeCapacityError extends Error {
  readonly cap: number;
  readonly observed: number;
  constructor(opts: { cap: number; observed: number }) {
    super('route-storage durable spike capacity exceeded [durable_entries]');
    this.name = 'RouteStorageDurableSpikeCapacityError';
    this.cap = opts.cap;
    this.observed = opts.observed;
  }
}

/** Thrown by EVERY store method once a durable persist fault has put the store into
 *  a one-way DEGRADED state. A persist fault can leave the in-process inner engine
 *  one mutation ahead of the on-disk snapshot; rather than let that divergence be
 *  observed (a partially-admitted / recallable residue with no durable backing), the
 *  store latches degraded and fails closed on all subsequent reads AND writes — the
 *  same fail-closed posture as a corrupt snapshot at construction. The diverged inner
 *  state is therefore never observable; a restart hydrates from the durable snapshot
 *  (which never saw the un-persisted op), so no residue survives. Carries only a
 *  short safe reason — never a path or payload. */
export class RouteStorageDurableSpikeDegradedError extends Error {
  readonly reason: 'persist_failed';
  constructor() {
    super('route-storage durable spike degraded [persist_failed]');
    this.name = 'RouteStorageDurableSpikeDegradedError';
    this.reason = 'persist_failed';
  }
}

/** Default snapshot file name. Always `.json` — never `.sql` (the production
 *  isolation guarantee). */
const DEFAULT_SNAPSHOT_FILE = 'admission-wedge-route-storage-durable-spike.json';

/** Snapshot format version — lets a future reader reject an unknown layout. */
const SNAPSHOT_FORMAT_VERSION = 1;

/** Dev/test ceiling for the durable entry cap — generous for every spike/test,
 *  far below any production scale. */
const MAX_DURABLE_ENTRIES_CEILING = 1_000_000;

/** Bound on the directory path and file name lengths (defense-in-depth). */
const MAX_DIR_LEN = 4_096;
const MAX_FILE_NAME_LEN = 256;

/** One ordered, ACCEPTED durable operation. The snapshot is the ordered array of
 *  these; replaying them through a fresh Mode-1 engine reconstructs the state. */
type DurableEntry =
  | { op: 'seed'; scope: RouteStorageSpikeScope }
  | { op: 'record'; scope: RouteStorageSpikeScope; transition: SyntheticAdmissionTransition }
  | { op: 'tombstone'; scope: RouteStorageSpikeScope };

/** On-disk snapshot envelope. */
interface DurableSnapshot {
  version: number;
  entries: DurableEntry[];
}

/** Read tenant / estate / actor ONCE into locals and return a plain, stable scope.
 *  This defeats a caller-owned shifting accessor at the durable-wrapper boundary
 *  (the normalized scope is a plain object, so the inner engine, the persisted
 *  entry, and the seeded-key all see the identical values — no TOCTOU divergence
 *  between what is applied and what is persisted). The inner engine ALSO snapshots
 *  internally; this normalization makes the durable layer consistent with it. */
function normalizeScope(scope: RouteStorageSpikeScope): RouteStorageSpikeScope {
  return {
    tenant_id: scope.tenant_id,
    estate_id: scope.estate_id,
    actor_id: scope.actor_id,
  };
}

/** A stable dedup key for a (tenant, estate, actor) triple. The separator is a
 *  space, which is never a valid synthetic-label character (the inner engine
 *  validates every id against `/^[a-z0-9][a-z0-9_-]*$/`), so distinct triples can
 *  never collide through the separator. */
function scopeKey(scope: RouteStorageSpikeScope): string {
  return `${scope.tenant_id} ${scope.estate_id} ${scope.actor_id}`;
}

/** Read each KNOWN transition field EXACTLY ONCE into a local and return a frozen
 *  plain object built from those reads. This is the transition analogue of
 *  `normalizeScope`: it defeats a caller-owned shifting accessor (`get
 *  admitted_assertion_id()`, etc.) at the durable-wrapper boundary by ensuring the
 *  inner engine AND the persisted entry observe the IDENTICAL field values — so a
 *  getter cannot return one value to the inner apply (read #1) and a different value
 *  to `JSON.stringify` at persist time (read #2). Without this freeze a shifting
 *  getter could (a) silently diverge applied-vs-persisted/hydrated state, or (b)
 *  write a value PAST the inner engine's no-raw-payload validation into the on-disk
 *  artifact (poisoning every future hydrate). Only the declared
 *  `SyntheticAdmissionTransition` fields are copied, so a payload-shaped EXTRA field
 *  cannot ride along into the snapshot either. The inner engine independently
 *  validates these values; this freeze only guarantees what-is-applied ===
 *  what-is-persisted. */
function snapshotTransition(transition: SyntheticAdmissionTransition): SyntheticAdmissionTransition {
  const kind = transition.kind;
  const source_candidate_id = transition.source_candidate_id;
  const admission_transition_id = transition.admission_transition_id;
  const admitted_assertion_id = transition.admitted_assertion_id;
  const assertion_class = transition.assertion_class;
  const replay_key = transition.replay_key;
  const supersedes_assertion_id = transition.supersedes_assertion_id;
  const snap: SyntheticAdmissionTransition = {
    kind,
    source_candidate_id,
    admission_transition_id,
    admitted_assertion_id,
    assertion_class,
    replay_key,
  };
  // Attach the optional prior-ref only when present (the inner validator rejects an
  // `admit` that carries supersedes_assertion_id, so an absent field must stay absent).
  if (supersedes_assertion_id !== undefined) {
    snap.supersedes_assertion_id = supersedes_assertion_id;
  }
  return Object.freeze(snap);
}

// ── Hydrate exactness (data-minimization) ─────────────────────────────────────
//
// A snapshot read from disk is UNTRUSTED input. Hydrate must enforce the EXACT
// declared shape — supported version, exact envelope/entry/scope/transition key
// sets, no unknown own fields — and must NORMALIZE every hydrated structure into
// a freshly-constructed object carrying ONLY declared fields BEFORE replaying it
// or pushing it into the durable log. This closes a data-minimization gap: a
// tampered private/raw EXTRA field on a snapshot (one off the declared shape)
// must never be (a) accepted at construction, nor (b) carried back to disk by the
// next rewrite. The approach is a positive ALLOWLIST of declared keys (reject
// anything else), which is strictly stronger than naming forbidden fields — an
// unknown extra of any name fails closed. The inner Phase 46V engine independently
// validates every VALUE (bounded synthetic-label shape, no raw payload); these
// helpers add the structural exactness around it.

/** The EXACT own-key sets permitted on each hydrated structure. Any own key not
 *  in the relevant set is an unknown/extra field and fails the snapshot closed. */
const SNAPSHOT_ENVELOPE_KEYS: ReadonlySet<string> = new Set(['version', 'entries']);
const SNAPSHOT_SCOPE_KEYS: ReadonlySet<string> = new Set(['tenant_id', 'estate_id', 'actor_id']);
const SEED_ENTRY_KEYS: ReadonlySet<string> = new Set(['op', 'scope']);
const RECORD_ENTRY_KEYS: ReadonlySet<string> = new Set(['op', 'scope', 'transition']);
const TOMBSTONE_ENTRY_KEYS: ReadonlySet<string> = new Set(['op', 'scope']);
const ADMIT_TRANSITION_KEYS: ReadonlySet<string> = new Set([
  'kind',
  'source_candidate_id',
  'admission_transition_id',
  'admitted_assertion_id',
  'assertion_class',
  'replay_key',
]);
const SUPERSEDE_TRANSITION_KEYS: ReadonlySet<string> = new Set([
  ...ADMIT_TRANSITION_KEYS,
  'supersedes_assertion_id',
]);

/** True only for a direct, non-array object — the only shape `JSON.parse` yields
 *  for a snapshot envelope / entry / scope / transition. Rejects null, arrays,
 *  and primitives up front so a malformed node fails closed before any key read. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Fail the snapshot closed (`bad_shape`) unless EVERY own key of `record` is in
 *  `allowed`. Uses `Reflect.ownKeys` so a symbol-keyed extra is also rejected
 *  (parsed JSON never carries one, but this stays strict as defense-in-depth).
 *  The offending key is never echoed onto the error — a tampered field leaves no
 *  residue, not even in the error message. */
function assertExactKeys(record: Record<string, unknown>, allowed: ReadonlySet<string>): void {
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key === 'symbol' || !allowed.has(key)) {
      throw new RouteStorageDurableSpikeCorruptStateError({ reason: 'bad_shape' });
    }
  }
}

/** Validate the parsed value is an EXACT `{ version, entries }` envelope at the
 *  supported version with `entries` an array, and return that (still element-wise
 *  untrusted) array. An unsupported version, an unknown envelope field, a
 *  non-object, or a non-array `entries` fails closed (`bad_shape`) — a future /
 *  foreign / tampered layout is never partially replayed. */
function normalizeSnapshotEnvelope(parsed: unknown): unknown[] {
  if (!isPlainObject(parsed)) {
    throw new RouteStorageDurableSpikeCorruptStateError({ reason: 'bad_shape' });
  }
  assertExactKeys(parsed, SNAPSHOT_ENVELOPE_KEYS);
  if (parsed.version !== SNAPSHOT_FORMAT_VERSION) {
    throw new RouteStorageDurableSpikeCorruptStateError({ reason: 'bad_shape' });
  }
  if (!Array.isArray(parsed.entries)) {
    throw new RouteStorageDurableSpikeCorruptStateError({ reason: 'bad_shape' });
  }
  return parsed.entries;
}

/** Validate a hydrated scope is an EXACT `{ tenant_id, estate_id, actor_id }`
 *  object and return a FRESHLY-constructed scope carrying ONLY those three
 *  declared fields. A tampered extra (a private/raw field of any name) is an
 *  unknown own key → fails closed; it can therefore never ride along into the
 *  durable log even structurally. Values are validated for the bounded
 *  synthetic-label shape by the inner engine on replay. */
function normalizeSnapshotScope(raw: unknown): RouteStorageSpikeScope {
  if (!isPlainObject(raw)) {
    throw new RouteStorageDurableSpikeCorruptStateError({ reason: 'bad_shape' });
  }
  assertExactKeys(raw, SNAPSHOT_SCOPE_KEYS);
  return {
    tenant_id: raw.tenant_id as string,
    estate_id: raw.estate_id as string,
    actor_id: raw.actor_id as string,
  };
}

/** Validate a hydrated transition is an EXACT per-kind object and return a
 *  FRESHLY-constructed, frozen transition carrying ONLY declared fields, built by
 *  the SAME `snapshotTransition` freeze the live path uses — so a hydrated entry
 *  is byte-for-byte the shape the live path persists. A bad/absent `kind`, or any
 *  unknown own field (a payload-shaped extra), fails closed. Values are validated
 *  for the bounded synthetic-label shape (no raw payload) by the inner engine on
 *  replay. */
function normalizeSnapshotTransition(raw: unknown): SyntheticAdmissionTransition {
  if (!isPlainObject(raw)) {
    throw new RouteStorageDurableSpikeCorruptStateError({ reason: 'bad_shape' });
  }
  const kind = raw.kind;
  if (kind !== 'admit' && kind !== 'supersede') {
    throw new RouteStorageDurableSpikeCorruptStateError({ reason: 'bad_shape' });
  }
  assertExactKeys(raw, kind === 'supersede' ? SUPERSEDE_TRANSITION_KEYS : ADMIT_TRANSITION_KEYS);
  const built: SyntheticAdmissionTransition = {
    kind,
    source_candidate_id: raw.source_candidate_id as string,
    admission_transition_id: raw.admission_transition_id as string,
    admitted_assertion_id: raw.admitted_assertion_id as string,
    assertion_class: raw.assertion_class as string,
    replay_key: raw.replay_key as string,
  };
  if (kind === 'supersede') {
    built.supersedes_assertion_id = raw.supersedes_assertion_id as string;
  }
  // Re-freeze through the live-path helper so the persisted/hydrated transition
  // shape has a single source of truth (only declared fields, frozen).
  return snapshotTransition(built);
}

/** Validate a hydrated entry is an EXACT per-op object and return a
 *  FRESHLY-constructed, declared-fields-only `DurableEntry`. An unknown `op`, or
 *  any unknown own field on the entry (or, transitively, on its scope/transition),
 *  fails the snapshot closed — a tampered extra never reaches the durable log. */
function normalizeLogEntry(raw: unknown): DurableEntry {
  if (!isPlainObject(raw)) {
    throw new RouteStorageDurableSpikeCorruptStateError({ reason: 'bad_shape' });
  }
  const op = raw.op;
  if (op === 'seed') {
    assertExactKeys(raw, SEED_ENTRY_KEYS);
    return { op: 'seed', scope: normalizeSnapshotScope(raw.scope) };
  }
  if (op === 'record') {
    assertExactKeys(raw, RECORD_ENTRY_KEYS);
    return {
      op: 'record',
      scope: normalizeSnapshotScope(raw.scope),
      transition: normalizeSnapshotTransition(raw.transition),
    };
  }
  if (op === 'tombstone') {
    assertExactKeys(raw, TOMBSTONE_ENTRY_KEYS);
    return { op: 'tombstone', scope: normalizeSnapshotScope(raw.scope) };
  }
  throw new RouteStorageDurableSpikeCorruptStateError({ reason: 'bad_shape' });
}

function validateDurableConfig(config: RouteStorageDurableSpikeConfig): {
  filePath: string;
  maxDurableEntries: number;
} {
  // dir — required, non-empty string, bounded length.
  const dir: unknown = config.dir;
  if (typeof dir !== 'string') {
    throw new RouteStorageDurableSpikeInvalidConfigError({ field: 'dir', reason: 'not_a_string' });
  }
  if (dir.length === 0) {
    throw new RouteStorageDurableSpikeInvalidConfigError({ field: 'dir', reason: 'empty' });
  }
  if (dir.length > MAX_DIR_LEN) {
    throw new RouteStorageDurableSpikeInvalidConfigError({ field: 'dir', reason: 'too_long' });
  }

  // fileName — optional; if provided it must be a bare `.json` file name with no
  // path separators (so it cannot escape the configured dir) and bounded length.
  const rawName: unknown = config.fileName;
  let fileName = DEFAULT_SNAPSHOT_FILE;
  if (rawName !== undefined) {
    if (typeof rawName !== 'string') {
      throw new RouteStorageDurableSpikeInvalidConfigError({ field: 'fileName', reason: 'not_a_string' });
    }
    if (rawName.length === 0) {
      throw new RouteStorageDurableSpikeInvalidConfigError({ field: 'fileName', reason: 'empty' });
    }
    if (rawName.length > MAX_FILE_NAME_LEN) {
      throw new RouteStorageDurableSpikeInvalidConfigError({ field: 'fileName', reason: 'too_long' });
    }
    if (rawName.includes('/') || rawName.includes('\\')) {
      throw new RouteStorageDurableSpikeInvalidConfigError({ field: 'fileName', reason: 'path_separator' });
    }
    // The `.json` extension is the production-isolation guarantee — refuse anything
    // else (in particular, never a `.sql` file the production runner could adopt).
    if (!rawName.endsWith('.json')) {
      throw new RouteStorageDurableSpikeInvalidConfigError({ field: 'fileName', reason: 'bad_extension' });
    }
    fileName = rawName;
  }

  // maxDurableEntries — finite positive integer within the dev ceiling.
  const rawCap: unknown = config.maxDurableEntries;
  if (typeof rawCap !== 'number') {
    throw new RouteStorageDurableSpikeInvalidConfigError({ field: 'maxDurableEntries', reason: 'not_a_number' });
  }
  if (!Number.isFinite(rawCap)) {
    throw new RouteStorageDurableSpikeInvalidConfigError({ field: 'maxDurableEntries', reason: 'not_finite' });
  }
  if (!Number.isInteger(rawCap)) {
    throw new RouteStorageDurableSpikeInvalidConfigError({ field: 'maxDurableEntries', reason: 'not_integer' });
  }
  if (rawCap <= 0) {
    throw new RouteStorageDurableSpikeInvalidConfigError({ field: 'maxDurableEntries', reason: 'not_positive' });
  }
  if (rawCap > MAX_DURABLE_ENTRIES_CEILING) {
    throw new RouteStorageDurableSpikeInvalidConfigError({ field: 'maxDurableEntries', reason: 'exceeds_dev_ceiling' });
  }

  return { filePath: join(resolve(dir), fileName), maxDurableEntries: rawCap };
}

/**
 * Create a bounded, DURABLE, tenant/estate/actor-scoped, route-owned spike store
 * (Storage Mode 2). The durable-specific config is validated immediately, so a
 * malformed/unbounded config fails closed at construction. If the configured
 * snapshot exists it is hydrated (replayed) into a fresh wrapped Mode-1 engine;
 * a corrupt/unreadable snapshot fails closed (throws). Every accepted mutation is
 * persisted as a single atomic JSON snapshot. NO SQL, NO database connection, NO
 * migration — durability is a `.json` file off the production migration path.
 */
export function createRouteStorageDurableSpikeStore(
  config: RouteStorageDurableSpikeConfig,
): RouteStorageDurableSpikeStore {
  const { filePath, maxDurableEntries } = validateDurableConfig(config);

  // The wrapped Phase 46V Mode-1 engine validates its three caps and throws
  // RouteStorageSpikeInvalidConfigError on a malformed/unbounded value.
  const inner = createRouteStorageSpikeStore({
    maxActors: config.maxActors,
    maxAssertionsPerEstate: config.maxAssertionsPerEstate,
    maxAssertionBytesPerEstate: config.maxAssertionBytesPerEstate,
  });

  /** The ordered, accepted durable operations = the snapshot content. */
  const log: DurableEntry[] = [];
  /** Scope triples already represented by a 'seed' entry — so an idempotent
   *  re-seed is not logged twice (and hydration never needs a duplicate). */
  const seededKeys = new Set<string>();
  /** One-way DEGRADED latch. Set when a durable persist fault leaves the inner
   *  engine potentially ahead of the on-disk snapshot. Once set, EVERY method fails
   *  closed (see `assertNotDegraded`), so the diverged inner state is never
   *  observable; a restart recovers cleanly from the durable snapshot. */
  let degraded = false;

  /** Fail closed on every method once the store has latched degraded. */
  function assertNotDegraded(): void {
    if (degraded) throw new RouteStorageDurableSpikeDegradedError();
  }

  /** Ensure the configured directory exists (created on first use). */
  function ensureDir(): void {
    mkdirSync(resolve(config.dir), { recursive: true });
  }

  /** Rewrite the whole snapshot atomically: write a temp sibling then rename over
   *  the target (rename is atomic on a single filesystem), so a reader never sees a
   *  partial file. Any filesystem fault throws → the calling mutation throws →
   *  the route fails closed. */
  function rewriteSnapshotFile(): void {
    ensureDir();
    const snapshot: DurableSnapshot = { version: SNAPSHOT_FORMAT_VERSION, entries: log };
    const tmpPath = `${filePath}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(snapshot), 'utf8');
    renameSync(tmpPath, filePath);
  }

  /** Bounded-capacity PRE-CHECK, called BEFORE the inner engine is mutated for any
   *  operation that may append a durable entry. Pre-checking (rather than checking
   *  only inside appendAndPersist, after the inner mutation) preserves the
   *  "store unchanged on a rejected write" atomicity property: a durable-capacity
   *  rejection throws before `inner.record` / `inner.seedScope` / `inner.tombstoneActor`
   *  runs, so the in-process engine and the on-disk snapshot never diverge. A single
   *  operation appends at most one entry, so room for one entry guarantees the
   *  subsequent append cannot overflow. NOTE: when the durable log is exactly at the
   *  cap, even an idempotent replay (which would append nothing) is rejected
   *  fail-closed — a deliberate bounded-dev-spike conservatism. This never occurs in
   *  route usage: the route persists one seed + at most a couple of distinct records,
   *  so the durable log stays far below the cap. */
  function assertDurableRoom(): void {
    if (log.length + 1 > maxDurableEntries) {
      throw new RouteStorageDurableSpikeCapacityError({ cap: maxDurableEntries, observed: log.length + 1 });
    }
  }

  /** Append one accepted entry under the bound, then persist. Bounded REJECTION:
   *  if the cap would be exceeded the entry is rejected (the durable artifact never
   *  grows past the cap and never evicts). Reached only after `assertDurableRoom`
   *  has already confirmed room, so the cap check here is defense-in-depth. */
  function appendAndPersist(entry: DurableEntry): void {
    if (log.length + 1 > maxDurableEntries) {
      throw new RouteStorageDurableSpikeCapacityError({ cap: maxDurableEntries, observed: log.length + 1 });
    }
    log.push(entry);
    try {
      rewriteSnapshotFile();
    } catch (err) {
      // Persist failed AFTER the in-memory push. Undo the push so the in-memory log
      // matches the (unchanged) on-disk snapshot — BUT the wrapped inner engine
      // mutation for this op has ALREADY been applied and cannot be cleanly undone
      // through the inner API, so the inner engine is now one op ahead of disk. To
      // prevent that divergence from EVER being observed (a partially-admitted /
      // recallable residue with no durable backing), latch the store DEGRADED: every
      // subsequent read and write fails closed (assertNotDegraded), exactly like a
      // corrupt snapshot at construction. A restart hydrates from the on-disk
      // snapshot (the durable source of truth), which never saw the un-persisted op,
      // so no residue survives the restart.
      degraded = true;
      log.pop();
      throw err;
    }
  }

  /** Replay a snapshot's entries, in order, through the fresh inner engine — this
   *  reconstructs the prior synthetic state. Hydrate treats the on-disk file as
   *  UNTRUSTED input and enforces EXACT structural shape (supported version, exact
   *  envelope/entry/scope/transition key sets, no unknown own fields) and
   *  NORMALIZES every entry into a freshly-constructed, declared-fields-only object
   *  BEFORE replaying it or pushing it into the durable log — so a tampered
   *  private/raw extra field can neither be accepted nor carried back to disk by a
   *  later rewrite (data-minimization). A structurally bad / unsupported / tampered
   *  snapshot fails closed (`bad_shape`); an internally-inconsistent-but-well-shaped
   *  one fails closed (`replay_failed`). */
  function hydrateFromDisk(): void {
    if (!existsSync(filePath)) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch {
      throw new RouteStorageDurableSpikeCorruptStateError({ reason: 'not_json' });
    }
    // Envelope: exact `{ version, entries }`, supported version, array entries.
    // An unsupported version / unknown envelope field / non-array entries fails
    // closed here (bad_shape) — a future/foreign/tampered layout is never replayed.
    const rawEntries = normalizeSnapshotEnvelope(parsed);
    if (rawEntries.length > maxDurableEntries) {
      throw new RouteStorageDurableSpikeCapacityError({ cap: maxDurableEntries, observed: rawEntries.length });
    }
    for (const rawEntry of rawEntries) {
      // (1) Normalize FIRST: validate the exact entry/scope/transition shape and
      // build a fresh object carrying ONLY declared fields. Any unknown own field
      // (a tampered private/raw extra of any name) throws bad_shape here, BEFORE
      // any replay or any push — so it can never enter the durable log and can
      // never survive a later rewrite. normalizeLogEntry throws
      // RouteStorageDurableSpikeCorruptStateError, which is re-thrown as-is below.
      const entry = normalizeLogEntry(rawEntry);
      // (2) Replay the NORMALIZED entry through the inner engine (which validates
      // every VALUE: bounded synthetic-label shape, no raw payload, scope/idempotency
      // /conflict). An inner throw means the snapshot is not internally consistent.
      try {
        if (entry.op === 'seed') {
          inner.seedScope(entry.scope);
          seededKeys.add(scopeKey(entry.scope));
        } else if (entry.op === 'record') {
          inner.record(entry.scope, entry.transition);
        } else {
          inner.tombstoneActor(entry.scope);
        }
      } catch (err) {
        if (err instanceof RouteStorageDurableSpikeCorruptStateError) throw err;
        // Any inner throw (or unexpected error) during replay means the snapshot is
        // not internally consistent — fail closed at construction.
        throw new RouteStorageDurableSpikeCorruptStateError({ reason: 'replay_failed' });
      }
      // (3) Push ONLY the sanitized, normalized entry — never the raw parsed object.
      // A subsequent rewriteSnapshotFile() therefore writes only declared fields.
      log.push(entry);
    }
  }

  hydrateFromDisk();

  return {
    seedScope(scope) {
      assertNotDegraded();
      const s = normalizeScope(scope);
      const key = scopeKey(s);
      // Durable-capacity PRE-CHECK before any inner mutation, but ONLY for a seed
      // that will actually append (a NEW scope key). An idempotent re-seed of an
      // already-logged scope appends nothing, so it must not be rejected by the cap.
      if (!seededKeys.has(key)) assertDurableRoom();
      // Inner validates the actor + tenant/estate and throws on a malformed scope,
      // a tombstoned actor, an over-capacity new actor, or a tenant conflict — so
      // nothing is persisted for a rejected seed.
      inner.seedScope(s);
      if (!seededKeys.has(key)) {
        // Persist FIRST, mark the dedup key ONLY after a successful persist. If the
        // persist throws, the key stays unmarked so a later retry re-attempts the
        // seed log — and we never need a set-removal token (the scope-guard denylist
        // forbids `delete` even as `Set.prototype.delete`).
        appendAndPersist({ op: 'seed', scope: s });
        seededKeys.add(key);
      }
    },

    record(scope, transition) {
      assertNotDegraded();
      const s = normalizeScope(scope);
      // Snapshot the transition fields ONCE (read each exactly once, freeze) BEFORE
      // the inner apply, then use the SAME frozen snapshot for both the inner apply
      // and the persisted entry — so a caller-owned shifting getter cannot diverge
      // what-is-applied from what-is-persisted/hydrated, nor smuggle a value past the
      // inner no-raw-payload validation into the on-disk artifact.
      const snap = snapshotTransition(transition);
      // Durable-capacity PRE-CHECK before the inner mutation. A 'recorded' outcome
      // would append exactly one entry; whether the outcome is 'recorded' or
      // 'replayed' is only known AFTER inner.record, so we reserve room first. This
      // keeps the inner engine and the on-disk snapshot from diverging on a capacity
      // rejection (the inner mutation never runs if there is no room). The cost is
      // that a replay at exactly the cap is rejected fail-closed; this never occurs
      // in route usage (the cap is far above the route's seed + few records).
      assertDurableRoom();
      // Inner enforces every Phase 33Q / 46V invariant (scope, idempotency,
      // conflict, capacity, synthetic-only) BEFORE returning — it throws on any
      // violation, so nothing is persisted for a rejected write.
      const outcome: RecordOutcome = inner.record(s, snap);
      // Only a genuinely NEW assertion advances the durable state; an idempotent
      // replay returns the prior result and mints nothing, so it is NOT persisted.
      if (outcome.outcome === 'recorded') {
        appendAndPersist({ op: 'record', scope: s, transition: snap });
      }
      return outcome;
    },

    projectRecall(scope) {
      assertNotDegraded();
      return inner.projectRecall(normalizeScope(scope));
    },

    inspectScope(scope) {
      assertNotDegraded();
      return inner.inspectScope(normalizeScope(scope));
    },

    auditTrail(scope) {
      assertNotDegraded();
      return inner.auditTrail(normalizeScope(scope));
    },

    tombstoneActor(scope) {
      assertNotDegraded();
      const s = normalizeScope(scope);
      const wasTombstoned = inner.isActorTombstoned(s);
      // Durable-capacity PRE-CHECK before the inner mutation, but ONLY when this will
      // actually append (a live actor transitioning into tombstoned). A repeated
      // tombstone, or a tombstone of an unseeded/already-tombstoned actor, appends
      // nothing, so it must not be rejected by the cap. `actorCount` cannot tell us
      // whether the actor is live without reading state we already have: a non-
      // tombstoned, seeded actor is the only case that appends — approximated here as
      // "not already tombstoned". (A tombstone of an unseeded actor is a no-op below,
      // and reserving a slot we will not use is harmless — the next real append still
      // sees the cap.)
      if (!wasTombstoned) assertDurableRoom();
      // Idempotent; a no-op for an unseeded actor (inner does not tombstone it).
      inner.tombstoneActor(s);
      // Log the tombstone only on the transition into tombstoned (so a repeated
      // tombstone, or a tombstone of an unseeded actor, is not persisted twice).
      if (!wasTombstoned && inner.isActorTombstoned(s)) {
        appendAndPersist({ op: 'tombstone', scope: s });
      }
    },

    isActorTombstoned(scope) {
      assertNotDegraded();
      return inner.isActorTombstoned(normalizeScope(scope));
    },

    actorCount() {
      assertNotDegraded();
      return inner.actorCount();
    },

    purgeDurableState() {
      // Deliberately NOT gated by assertNotDegraded: purge is the recovery path. It
      // removes the on-disk snapshot so a subsequent fresh store (after restart)
      // hydrates empty. `force: true` makes this a no-op when the file is already
      // absent (idempotent). The in-process engine state is not reset here — a
      // restart after purge yields a fully empty store (the engine is non-durable).
      // The degraded latch is left set: the CURRENT process's inner engine may still
      // hold a diverged op, so reads stay failed-closed until the process restarts.
      rmSync(filePath, { force: true });
      log.length = 0;
      seededKeys.clear();
    },

    durableEntryCount() {
      assertNotDegraded();
      return log.length;
    },
  };
}
