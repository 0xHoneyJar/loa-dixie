// Phase 33Q — dev/operator-only Admission Wedge: bounded, process-local,
// SYNTHETIC admitted-assertion ledger.
//
// Authorized NARROWLY by the Phase 33P storage/receipt hardening decision gate
// (docs/ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md §7–§12), which selected
// Option B: a dev-only, disabled-by-default, NON-PRODUCTION, bounded SYNTHETIC
// admitted-assertion store, and explicitly REJECTED production-like durable
// storage (Option D).
//
// This module is an in-process, capacity-bounded, tenant+estate-scoped,
// NON-DURABLE, fail-closed instrument for proving the candidate →
// admitted-assertion → recall transition's STATEFUL effect against SYNTHETIC,
// VALIDATED material only. Its safety is SPIKE-SCOPED and validation-enforced —
// it is NOT a production-safety guarantee. It:
//   * accepts only SYNTHETIC, bounded-label identity/status/provenance/
//     receipt-like-audit references that are validated BEFORE any mutation. The
//     validation rejects (fail closed) anything that is not a narrow synthetic
//     label — whitespace, uppercase, or free-form-punctuated values (which is
//     the shape real raw payloads / source material / raw reasons take), plus
//     over-long values, payload-shaped EXTRA fields, and a named unsafe-marker /
//     payload-shaped substring denylist (`unsafe_marker`, `candidate_payload`,
//     `source_material`, `raw_reason`, …). It does NOT claim to recognize every
//     conceivable raw string: a deliberately snake-cased short token off the
//     denylist would pass the shape check. This is sufficient here because the
//     ONLY caller (the route) builds transitions from fixed synthetic constants,
//     never request material (33P §8); the validation is a defense-in-depth
//     floor, not an exhaustive raw-material classifier;
//   * opens NO database connection, NO file handle, NO socket, NO timer, and runs
//     NO background task — its entire state is JS Maps captured in a factory
//     closure, so a process restart leaves NO durable admitted-assertion residue;
//   * performs NO durable write and NO migration of any kind;
//   * is bound to a (tenant_id, estate_id) pair on every access: one tenant's
//     synthetic estate is structurally unreachable from another tenant, and an
//     estate_id can be owned by exactly one tenant for the life of the process.
//
// PRECEDENT, NOT REUSE. This mirrors ONLY the OPERATIONAL PROPERTIES of the
// Recall-path bounded estate store (process-local, capacity-bounded,
// tenant-scoped, non-durable, fail-closed, testable without production storage —
// 33P §6). It reuses NO Recall code, type, adapter, or schema, imports NOTHING
// from `straylight-recall-intake/`, and inherits NO Recall semantics. The
// identity / status / provenance / receipt semantics here remain governed by the
// still-unresolved Straylight primitive review (A–O); this ledger freezes NO
// schema and decides NO final idempotency / signer / authority / tenant-estate-
// actor binding semantics (33P §8, §12). The tenant+estate binding here is a
// SPIKE isolation mechanism, NOT the final production binding semantics.
//
// Filename note: this file is deliberately named `*-ledger.ts`, NOT `*-store.ts`.
// The Phase 33N scope guards reject any spike-path import specifier matching
// `/-store(.js)?$/` as a forbidden production-storage import; a `-ledger` name
// stays inside the authorized envelope without weakening that guard.

/** Per-estate capacity bounds. Inserts beyond either dimension fail closed by
 *  throwing — the ledger never grows unbounded and never evicts existing
 *  synthetic state (bounded REJECTION, 33P §9 case-8 capacity bullet).
 *
 *  Both bounds are validated at ledger creation (see `validateCapConfig`): each
 *  must be a finite, positive INTEGER within a dev/test ceiling. `Infinity`,
 *  `NaN`, zero, negative, fractional, and non-number values are rejected, so the
 *  ledger cannot be configured to grow unbounded. */
export interface AdmittedAssertionLedgerConfig {
  /** Max synthetic admitted assertions per estate. */
  maxAssertionsPerEstate: number;
  /** Max JSON byte budget of synthetic records per estate. This budget accounts
   *  for ALL retained synthetic metadata — assertions, audit records, AND the
   *  retained replay-de-dup metadata (replay keys + fingerprints). */
  maxAssertionBytesPerEstate: number;
}

/** A (tenant_id, estate_id) scope. EVERY read and write is bound to a scope: an
 *  estate is reachable ONLY by the tenant that owns it. Both ids must be bounded
 *  synthetic labels (validated before use). */
export interface AdmittedScope {
  tenant_id: string;
  estate_id: string;
}

/**
 * A SYNTHETIC admitted-assertion record. Carries synthetic identity / status /
 * provenance references ONLY. There is no field NAMED for a raw payload, AND
 * every string written here is validated to a bounded synthetic-label shape
 * before mutation, so a raw candidate payload, source material, or raw reason is
 * rejected (not merely undeclared) (33P §8 no-raw-payload prohibition; §9 case-8
 * final bullet: identity/status/provenance observable WITHOUT raw payload
 * persistence).
 *
 * `assertion_status` is canonical-aligned: `active` (or `superseded`), NEVER a
 * coined `admitted` status (33P §9.1 / probe note: admission is the canonical
 * `admit_assertion` transition; the resulting STATUS is canonical `active`).
 */
export interface SyntheticAdmittedAssertion {
  // Readonly at the type level: internal assertion records are never mutated in
  // place (a supersession replaces the map entry with a fresh object) and are
  // never handed out as live references (Codex blocker 3).
  readonly admitted_assertion_id: string;
  readonly tenant_id: string;
  readonly estate_id: string;
  readonly source_candidate_id: string;
  readonly admission_transition_id: string;
  readonly assertion_class: string;
  readonly assertion_status: 'active' | 'superseded';
  readonly recall_eligible: boolean;
  /** Set on the corrected assertion of a supersession; points at the prior. */
  readonly supersedes_assertion_id?: string;
  /** Set on the prior assertion once superseded; points at the corrected. */
  readonly superseded_by_assertion_id?: string;
  /** Private synthetic receipt-like reference (short label, never public). */
  readonly receipt_ref: string;
}

/**
 * A SYNTHETIC, explicitly NON-FINAL audit record. It EXPLAINS what synthetic
 * transition occurred without claiming to be — or becoming — a production
 * receipt (33P §9 case 9, §10). Both privacy markers are carried so the
 * public/private split (33K §6.6/§6.7) is provable: `audit_private: true` AND
 * `public_audit_detail: false`. This record is NEVER serialized to a public
 * response, and (because every accepted field is validated synthetic) it can
 * never carry a raw payload or unsafe marker.
 */
export interface SyntheticAuditRecord {
  // All fields are readonly: an audit record returned by `auditTrail()` is a
  // detached, frozen copy, and readonly at the type level reflects (and helps
  // enforce) that callers must not mutate it (Codex blocker 3).
  readonly audit_event: 'assertion_admitted' | 'assertion_superseded';
  readonly admission_transition_id: string;
  readonly source_candidate_id: string;
  readonly admitted_assertion_id: string;
  readonly receipt_ref: string;
  readonly audit_private: true;
  readonly public_audit_detail: false;
}

/**
 * The SYNTHETIC transition the route derives from a classified scenario and
 * fixed synthetic constants — NEVER from request-controlled material (the spike
 * request body carries only `spike` + `transition_intent`). It carries NO
 * candidate payload. Every string field is validated to a bounded synthetic
 * label before any mutation; payload-shaped EXTRA fields are rejected.
 */
export interface SyntheticAdmissionTransition {
  /** `admit` mints one active assertion; `supersede` corrects a prior one. */
  kind: 'admit' | 'supersede';
  source_candidate_id: string;
  admission_transition_id: string;
  /** The synthetic id to mint as the (corrected) active assertion. */
  admitted_assertion_id: string;
  assertion_class: string;
  /** Spike-scoped de-duplication key. Synthetic; NOT request-derived; bounded in
   *  length and shape (validated before use), and ACCOUNTED for in the per-estate
   *  byte budget. Final production idempotency semantics remain UNRESOLVED
   *  (33P §12). */
  replay_key: string;
  /** Required for `supersede`: the prior assertion this transition corrects. */
  supersedes_assertion_id?: string;
}

/** Outcome of a `record` call. `replayed` means a prior idempotent result was
 *  returned and NO second assertion was minted (33P §9 case-8 replay bullet). */
export interface RecordOutcome {
  outcome: 'recorded' | 'replayed';
  admitted_assertion_id: string;
  assertion_status: 'active';
  superseded_assertion_id?: string;
}

/** Read-only, estate-scoped footprint snapshot (synthetic counts only). The
 *  returned value is a freshly-built, frozen object (Codex blocker 3). */
export interface EstateFootprint {
  readonly assertions: number;
  readonly bytes: number;
}

/** Internal recall-eligibility projection over the estate's synthetic state.
 *  `includes` are ordinarily-recallable active assertion ids; `excludes` are
 *  superseded (audit/provenance-only) ids. This is an INTERNAL observability
 *  surface — it is NEVER placed in a public response (the public
 *  `recall_projection` is built separately, from fixed placeholders). */
export interface RecallProjection {
  // Freshly-built, frozen arrays of synthetic ids — never internal references
  // (Codex blocker 3).
  readonly includes: readonly string[];
  readonly excludes: readonly string[];
}

/** A view bound to ONE (tenant, estate) pair at construction. It can only
 *  observe (and record into) its own tenant's estate — it cannot reach another
 *  tenant's or another estate's synthetic state. */
export interface ScopedAdmittedView {
  readonly tenant_id: string;
  readonly estate_id: string;
  record(transition: SyntheticAdmissionTransition): RecordOutcome;
  projectRecall(): RecallProjection;
  inspectEstate(): EstateFootprint;
  auditTrail(): readonly SyntheticAuditRecord[];
}

export interface AdmittedAssertionLedger {
  /** Establish a synthetic estate slot owned by a tenant. Idempotent for the
   *  SAME (tenant, estate) pair (never destroys synthetic state). Re-seeding the
   *  same estate_id under a DIFFERENT tenant_id fails closed
   *  (`AdmittedAssertionTenantConflictError`) — an estate cannot be silently
   *  re-homed to another tenant. */
  seedEstate(scope: AdmittedScope): void;
  /** Record a synthetic admit/supersede transition into a seeded estate owned by
   *  the scope's tenant. Validates the transition (exact keys, bounded synthetic
   *  labels, no unsafe markers / payload-shaped fields) BEFORE any mutation, then
   *  fails closed (throws) on unseeded/foreign estate, capacity overflow,
   *  missing/invalid prior, or conflicting replay. Idempotent on a matching
   *  replay key. */
  record(scope: AdmittedScope, transition: SyntheticAdmissionTransition): RecordOutcome;
  /** Tenant+estate-scoped view bound at construction time. */
  forEstate(scope: AdmittedScope): ScopedAdmittedView;
  /** Internal recall-eligibility projection for a tenant's seeded estate (empty
   *  for an unseeded estate OR a foreign tenant — reads fail closed without
   *  throwing). */
  projectRecall(scope: AdmittedScope): RecallProjection;
  /** Per-estate synthetic footprint for the owning tenant (zeros for an
   *  unseeded estate or a foreign tenant). */
  inspectEstate(scope: AdmittedScope): EstateFootprint;
  /** Private synthetic audit trail for a tenant's seeded estate (empty for an
   *  unseeded estate or a foreign tenant). */
  auditTrail(scope: AdmittedScope): readonly SyntheticAuditRecord[];
}

/** Thrown when a per-estate capacity bound would be exceeded. Carries only
 *  short synthetic fields — NO long opaque id, UUID, or payload — so the message
 *  stays public-safe even if it were ever surfaced. */
export class AdmittedAssertionCapExceededError extends Error {
  readonly estate_id: string;
  readonly dimension: 'assertion_count' | 'byte_budget';
  readonly cap: number;
  readonly observed: number;
  constructor(opts: {
    estate_id: string;
    dimension: 'assertion_count' | 'byte_budget';
    cap: number;
    observed: number;
  }) {
    super(`admitted-assertion ledger capacity exceeded [${opts.dimension}]`);
    this.name = 'AdmittedAssertionCapExceededError';
    this.estate_id = opts.estate_id;
    this.dimension = opts.dimension;
    this.cap = opts.cap;
    this.observed = opts.observed;
  }
}

/** Thrown when a write targets an estate that is not in the caller's scope: an
 *  unseeded estate, an estate owned by a DIFFERENT tenant (foreign_tenant), or a
 *  supersession whose prior assertion is not in the target estate (one estate
 *  cannot reach into another's synthetic state). */
export class AdmittedAssertionScopeViolationError extends Error {
  readonly estate_id: string;
  readonly reason: 'unseeded_estate' | 'prior_not_in_estate' | 'foreign_tenant';
  constructor(opts: {
    estate_id: string;
    reason: 'unseeded_estate' | 'prior_not_in_estate' | 'foreign_tenant';
  }) {
    super(`admitted-assertion ledger scope violation [${opts.reason}]`);
    this.name = 'AdmittedAssertionScopeViolationError';
    this.estate_id = opts.estate_id;
    this.reason = opts.reason;
  }
}

/** Thrown when a replay CONFLICTS with prior synthetic state: a reused replay
 *  key with different synthetic content, a synthetic id collision, or a
 *  supersession of an already-superseded prior. The ledger fails closed rather
 *  than overwrite, fork, or corrupt existing synthetic state (33P §9 case-8
 *  conflicting-replay bullet). */
export class AdmittedAssertionReplayConflictError extends Error {
  readonly estate_id: string;
  readonly reason: 'replay_key_content_mismatch' | 'assertion_id_collision' | 'prior_not_active';
  constructor(opts: {
    estate_id: string;
    reason: 'replay_key_content_mismatch' | 'assertion_id_collision' | 'prior_not_active';
  }) {
    super(`admitted-assertion ledger replay conflict [${opts.reason}]`);
    this.name = 'AdmittedAssertionReplayConflictError';
    this.estate_id = opts.estate_id;
    this.reason = opts.reason;
  }
}

/** Thrown at ledger CREATION when a capacity bound is not a finite positive
 *  integer within the dev/test ceiling. Rejects `Infinity`, `NaN`, zero,
 *  negative, fractional, non-number, and out-of-range values. Carries only the
 *  config field name and a short reason — never a payload. */
export class AdmittedAssertionInvalidConfigError extends Error {
  readonly field: 'maxAssertionsPerEstate' | 'maxAssertionBytesPerEstate';
  readonly reason:
    | 'not_a_number'
    | 'not_finite'
    | 'not_integer'
    | 'not_positive'
    | 'exceeds_dev_ceiling';
  constructor(opts: {
    field: 'maxAssertionsPerEstate' | 'maxAssertionBytesPerEstate';
    reason:
      | 'not_a_number'
      | 'not_finite'
      | 'not_integer'
      | 'not_positive'
      | 'exceeds_dev_ceiling';
  }) {
    super(`admitted-assertion ledger invalid config [${opts.reason}]`);
    this.name = 'AdmittedAssertionInvalidConfigError';
    this.field = opts.field;
    this.reason = opts.reason;
  }
}

/** Thrown BEFORE any mutation when a scope or transition carries non-synthetic
 *  material: a non-string/empty/over-long field, an out-of-shape (non-bounded-
 *  synthetic-label) value, a payload-shaped EXTRA field, an unsafe marker /
 *  raw-material substring, or an invalid transition kind. The error carries a
 *  fixed (safe) field token and a short reason — it NEVER echoes the rejected
 *  value, so a rejected unsafe transition leaves zero residue (no ledger / audit
 *  / recall / error-message trace of the raw material). */
export class AdmittedAssertionInvalidInputError extends Error {
  readonly field: string;
  readonly reason:
    | 'not_an_object'
    | 'invalid_kind'
    | 'extra_field'
    | 'not_a_string'
    | 'empty'
    | 'too_long'
    | 'invalid_format'
    | 'unsafe_value';
  constructor(opts: {
    field: string;
    reason:
      | 'not_an_object'
      | 'invalid_kind'
      | 'extra_field'
      | 'not_a_string'
      | 'empty'
      | 'too_long'
      | 'invalid_format'
      | 'unsafe_value';
  }) {
    super(`admitted-assertion ledger invalid input [${opts.reason}]`);
    this.name = 'AdmittedAssertionInvalidInputError';
    this.field = opts.field;
    this.reason = opts.reason;
  }
}

/** Thrown by `seedEstate` when an estate_id already owned by one tenant is
 *  re-seeded under a DIFFERENT tenant. Prevents an estate being silently
 *  re-homed across tenants (Codex blocker 1). */
export class AdmittedAssertionTenantConflictError extends Error {
  readonly estate_id: string;
  constructor(opts: { estate_id: string }) {
    super('admitted-assertion ledger tenant conflict [estate_owned_by_other_tenant]');
    this.name = 'AdmittedAssertionTenantConflictError';
    this.estate_id = opts.estate_id;
  }
}

interface EstateSlot {
  tenant_id: string;
  estate_id: string;
  assertions: Map<string, SyntheticAdmittedAssertion>;
  audit: SyntheticAuditRecord[];
  /** replay_key → { assertion_id, fingerprint } for spike-scoped de-dup. Both
   *  the keys and the values are accounted for in `bytes` (see below). */
  replays: Map<string, { admitted_assertion_id: string; fingerprint: string }>;
  bytes: number;
}

// ── Bounded synthetic-label discipline (Codex blocker 3) ──────────────────────

/** Max length for any externally supplied string-like field. Bounds the replay
 *  key and every identity/provenance label so a 1 MB key (or any over-long
 *  value) is rejected before it can be retained or accounted (Codex blocker 2). */
const MAX_FIELD_LEN = 128;

/** Identity/provenance label shape: lowercase snake/kebab plus digits. Narrow
 *  and synthetic — deliberately excludes whitespace, uppercase, `:`, and any
 *  punctuation that could carry raw/free-form material. Linear-time (no
 *  backtracking). */
const SYNTH_LABEL_RE = /^[a-z0-9][a-z0-9_-]*$/;

/** Replay-key shape: as above, additionally allowing `:` so a synthetic replay
 *  key composed of labels (e.g. `admit:cand-synth-1`) is accepted. Still narrow
 *  and synthetic; still length-bounded. */
const SYNTH_REPLAY_RE = /^[a-z0-9][a-z0-9_:-]*$/;

/** Raw-material / unsafe-marker substrings rejected in EVERY accepted string
 *  field (defense-in-depth, mirroring the no-leak intent WITHOUT importing the
 *  no-leak module). These catch payload-shaped values that would otherwise slip
 *  past the label shape (e.g. `candidate_payload` is all-lowercase-snake and
 *  would match `SYNTH_LABEL_RE`), and unsafe markers in `replay_key` (where `:`
 *  is allowed by shape). Checked case-insensitively. */
const UNSAFE_FIELD_SUBSTRINGS = [
  'unsafe_marker',
  'candidate_payload',
  'corrected_candidate_payload',
  'source_material',
  'source_ref',
  'raw_candidate',
  'raw_reason',
  'policy_reason',
  'sentinel',
  'secret',
  'token',
];

/** Dev/test ceilings — a config above these is rejected as not bounded for
 *  dev/test use. Generous enough for every spike/test config, far below any
 *  production scale. */
const MAX_ASSERTIONS_CEILING = 100_000;
const MAX_BYTES_CEILING = 10_000_000;

/** Validate one externally supplied string-like field to a bounded synthetic
 *  shape BEFORE any mutation. Order: type → emptiness → length (short-circuits
 *  before scanning an over-long value) → unsafe-marker substring → label shape.
 *  Throws `AdmittedAssertionInvalidInputError` (never echoing the value). */
function assertSyntheticField(
  value: unknown,
  field: string,
  kind: 'label' | 'replay',
): asserts value is string {
  if (typeof value !== 'string') {
    throw new AdmittedAssertionInvalidInputError({ field, reason: 'not_a_string' });
  }
  if (value.length === 0) {
    throw new AdmittedAssertionInvalidInputError({ field, reason: 'empty' });
  }
  if (value.length > MAX_FIELD_LEN) {
    throw new AdmittedAssertionInvalidInputError({ field, reason: 'too_long' });
  }
  const lower = value.toLowerCase();
  for (const marker of UNSAFE_FIELD_SUBSTRINGS) {
    if (lower.includes(marker)) {
      throw new AdmittedAssertionInvalidInputError({ field, reason: 'unsafe_value' });
    }
  }
  const re = kind === 'replay' ? SYNTH_REPLAY_RE : SYNTH_LABEL_RE;
  if (!re.test(value)) {
    throw new AdmittedAssertionInvalidInputError({ field, reason: 'invalid_format' });
  }
}

/** The exact transition keys accepted for each kind. Any other key is a
 *  payload-shaped EXTRA field and is rejected before mutation. */
const ADMIT_TRANSITION_KEYS = new Set<string>([
  'kind',
  'source_candidate_id',
  'admission_transition_id',
  'admitted_assertion_id',
  'assertion_class',
  'replay_key',
]);
const SUPERSEDE_TRANSITION_KEYS = new Set<string>([
  ...ADMIT_TRANSITION_KEYS,
  'supersedes_assertion_id',
]);

/** True only for a PLAIN record: a direct object whose prototype is exactly
 *  `Object.prototype` or `null`. Rejects arrays, class instances, `Date`, `Map`,
 *  `Set`, `RegExp`, boxed primitives, and any object carrying a non-standard
 *  prototype — so a `candidate_payload` (or any unexpected field) reachable only
 *  through an inherited prototype is rejected outright, never read (Codex
 *  blocker 4). */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Reflect.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Reject any own key (string OR symbol, enumerable OR not) that is not in the
 *  allowed set. Uses `Reflect.ownKeys` — NOT `Object.keys` — so a non-enumerable
 *  or symbol-keyed `candidate_payload` (or any payload-shaped extra field) is
 *  caught and rejected before any mutation, leaving zero residue (Codex
 *  blocker 4). Symbols are never an allowed key, so any symbol own key is an
 *  extra field. The offending key is never echoed onto the error. */
function assertExactOwnKeys(record: Record<string, unknown>, allowed: ReadonlySet<string>): void {
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key === 'symbol' || !allowed.has(key)) {
      throw new AdmittedAssertionInvalidInputError({ field: 'transition', reason: 'extra_field' });
    }
  }
}

/** Validate a transition's plain-record shape, EXACT own-key set (enumerable,
 *  non-enumerable, AND symbol), kind, and every string field BEFORE any mutation
 *  or replay lookup, then return a FROZEN, closure-owned SNAPSHOT built from the
 *  values read exactly once during validation.
 *
 *  Returning a snapshot (rather than asserting over the caller's object) closes
 *  two bypasses at once:
 *    * non-plain / inherited / non-enumerable / symbol-keyed payload tricks are
 *      rejected up front (Codex blocker 4); and
 *    * downstream code (fingerprint, capacity, commit) reads ONLY this frozen
 *      snapshot, so a caller-owned accessor getter cannot return one value at
 *      validation and a different value at commit (TOCTOU). Pure (no state). */
function validateTransition(transition: unknown): SyntheticAdmissionTransition {
  if (!isPlainRecord(transition)) {
    throw new AdmittedAssertionInvalidInputError({ field: 'transition', reason: 'not_an_object' });
  }
  // Read `kind` exactly once.
  const kind = transition.kind;
  if (kind !== 'admit' && kind !== 'supersede') {
    throw new AdmittedAssertionInvalidInputError({ field: 'kind', reason: 'invalid_kind' });
  }
  const allowed = kind === 'supersede' ? SUPERSEDE_TRANSITION_KEYS : ADMIT_TRANSITION_KEYS;
  assertExactOwnKeys(transition, allowed);

  // Read every field exactly once, validate, then snapshot from the read value —
  // never re-read the caller-owned object after this point.
  const source_candidate_id = transition.source_candidate_id;
  assertSyntheticField(source_candidate_id, 'source_candidate_id', 'label');
  const admission_transition_id = transition.admission_transition_id;
  assertSyntheticField(admission_transition_id, 'admission_transition_id', 'label');
  const admitted_assertion_id = transition.admitted_assertion_id;
  assertSyntheticField(admitted_assertion_id, 'admitted_assertion_id', 'label');
  const assertion_class = transition.assertion_class;
  assertSyntheticField(assertion_class, 'assertion_class', 'label');
  const replay_key = transition.replay_key;
  assertSyntheticField(replay_key, 'replay_key', 'replay');

  if (kind === 'supersede') {
    const supersedes_assertion_id = transition.supersedes_assertion_id;
    assertSyntheticField(supersedes_assertion_id, 'supersedes_assertion_id', 'label');
    return Object.freeze({
      kind,
      source_candidate_id,
      admission_transition_id,
      admitted_assertion_id,
      assertion_class,
      replay_key,
      supersedes_assertion_id,
    });
  }
  return Object.freeze({
    kind,
    source_candidate_id,
    admission_transition_id,
    admitted_assertion_id,
    assertion_class,
    replay_key,
  });
}

/** A validated, frozen, closure-owned copy of the capacity limits. Once built at
 *  ledger creation, these numbers are the ONLY caps the ledger ever reads — the
 *  caller-owned config object is never read again, so mutating it (e.g. to
 *  `Infinity`) after construction cannot widen a configured cap (Codex
 *  blocker 2). */
interface ValidatedCaps {
  readonly maxAssertionsPerEstate: number;
  readonly maxAssertionBytesPerEstate: number;
}

/** Validate the capacity config at ledger creation: each bound must be a finite,
 *  positive INTEGER within the dev/test ceiling. Rejects Infinity, NaN, zero,
 *  negative, fractional, non-number, and out-of-range values. Returns a FROZEN
 *  copy of the validated numeric limits — the values are read exactly once here
 *  and never re-read from the caller-owned config afterward (Codex blocker 2). */
function validateCapConfig(config: AdmittedAssertionLedgerConfig): ValidatedCaps {
  // Read each bound exactly once, into a local, before validating it — so even a
  // caller-owned accessor getter is observed a single time and the validated
  // value is the same one frozen into the closure-owned caps below.
  const rawAssertions: unknown = config.maxAssertionsPerEstate;
  const rawBytes: unknown = config.maxAssertionBytesPerEstate;
  const checks: Array<[
    'maxAssertionsPerEstate' | 'maxAssertionBytesPerEstate',
    unknown,
    number,
  ]> = [
    ['maxAssertionsPerEstate', rawAssertions, MAX_ASSERTIONS_CEILING],
    ['maxAssertionBytesPerEstate', rawBytes, MAX_BYTES_CEILING],
  ];
  for (const [field, raw, ceiling] of checks) {
    if (typeof raw !== 'number') {
      throw new AdmittedAssertionInvalidConfigError({ field, reason: 'not_a_number' });
    }
    if (!Number.isFinite(raw)) {
      // Catches Infinity, -Infinity, and NaN.
      throw new AdmittedAssertionInvalidConfigError({ field, reason: 'not_finite' });
    }
    if (!Number.isInteger(raw)) {
      throw new AdmittedAssertionInvalidConfigError({ field, reason: 'not_integer' });
    }
    if (raw <= 0) {
      throw new AdmittedAssertionInvalidConfigError({ field, reason: 'not_positive' });
    }
    if (raw > ceiling) {
      throw new AdmittedAssertionInvalidConfigError({ field, reason: 'exceeds_dev_ceiling' });
    }
  }
  return Object.freeze({
    maxAssertionsPerEstate: rawAssertions as number,
    maxAssertionBytesPerEstate: rawBytes as number,
  });
}

/** Local synthetic byte accounting. Reimplemented here on purpose — it does NOT
 *  reuse any Recall byte-accounting helper (33P §8 no-code-reuse boundary). */
function syntheticBytes(record: unknown): number {
  return Buffer.byteLength(JSON.stringify(record) ?? '', 'utf8');
}

/** Stable content fingerprint over a transition's identity-defining synthetic
 *  fields. Used to decide whether a reused replay key is an idempotent retry
 *  (same fingerprint) or a conflict (different fingerprint). Bounded in length
 *  because every input field is length-validated before this is computed. */
function transitionFingerprint(t: SyntheticAdmissionTransition): string {
  return [
    t.kind,
    t.source_candidate_id,
    t.admission_transition_id,
    t.admitted_assertion_id,
    t.assertion_class,
    t.supersedes_assertion_id ?? '',
  ].join('|');
}

/** Byte footprint of one retained replay-de-dup entry: the replay key PLUS the
 *  retained value (assertion id + fingerprint). Counting this closes the Codex
 *  blocker-2 gap where a large replay key was retained but excluded from byte
 *  accounting. */
function replayEntryBytes(replay_key: string, admitted_assertion_id: string, fingerprint: string): number {
  return syntheticBytes({ replay_key, admitted_assertion_id, fingerprint });
}

/** Validate a caller-owned scope and return a FROZEN, closure-owned SNAPSHOT of
 *  the validated ids. Each id is read EXACTLY ONCE (into a local) before
 *  validation, so a caller-owned accessor getter is observed a single time and
 *  the value validated is the value frozen. Callers that retain this snapshot
 *  (e.g. `forEstate`) are immune to later mutation of the original scope object:
 *  mutating the caller's object after construction cannot re-home the binding to
 *  a different tenant/estate (Codex blocker 1). */
function snapshotScope(scope: AdmittedScope): AdmittedScope {
  const tenant_id = scope.tenant_id;
  assertSyntheticField(tenant_id, 'tenant_id', 'label');
  const estate_id = scope.estate_id;
  assertSyntheticField(estate_id, 'estate_id', 'label');
  return Object.freeze({ tenant_id, estate_id });
}

/** Build a FROZEN, detached copy of one audit record. Every field is a primitive
 *  (string / boolean literal), so a shallow copy fully detaches the result from
 *  the internal record — a caller mutating the returned copy cannot reach the
 *  ledger's own audit state (Codex blocker 3). */
function detachAuditRecord(record: SyntheticAuditRecord): SyntheticAuditRecord {
  return Object.freeze({
    audit_event: record.audit_event,
    admission_transition_id: record.admission_transition_id,
    source_candidate_id: record.source_candidate_id,
    admitted_assertion_id: record.admitted_assertion_id,
    receipt_ref: record.receipt_ref,
    audit_private: record.audit_private,
    public_audit_detail: record.public_audit_detail,
  });
}

/**
 * Create a bounded, process-local, synthetic admitted-assertion ledger.
 *
 * The capacity config is validated immediately (see `validateCapConfig`), so an
 * unbounded / malformed config fails closed at construction rather than at first
 * write.
 *
 * All state lives in the Maps below, captured in this closure. There is no
 * durable backend: a second `createAdmittedAssertionLedger(...)` call yields a
 * fresh, empty ledger, which is exactly how "process restart leaves no durable
 * admitted-assertion residue" is proven (33P §9 case-8 ephemerality/restart
 * bullets).
 */
export function createAdmittedAssertionLedger(
  config: AdmittedAssertionLedgerConfig,
): AdmittedAssertionLedger {
  // Validate once, then copy the validated numeric limits into a frozen,
  // closure-owned constant. The caller-owned `config` object is NEVER read again
  // after this line — mutating it afterward (e.g. setting either cap to
  // `Infinity`) cannot change the bounds the ledger enforces (Codex blocker 2).
  const caps = validateCapConfig(config);

  /** Keyed by estate_id; each slot records the OWNING tenant_id. An estate_id is
   *  owned by exactly one tenant for the life of the process (enforced in
   *  `seedEstate`); every access checks the scope's tenant against the slot. */
  const estates = new Map<string, EstateSlot>();

  /**
   * Resolve the slot the scope is entitled to. Validates both scope labels
   * first (fail closed on malformed input). Then:
   *   * unseeded estate → write throws `unseeded_estate`; read returns null
   *     (caller maps null to an empty projection / zero footprint);
   *   * estate owned by a DIFFERENT tenant → write throws `foreign_tenant`; read
   *     returns null (a foreign tenant sees NOTHING — no cross-tenant read).
   */
  function resolveOwnedSlot(scope: AdmittedScope, forWrite: boolean): EstateSlot | null {
    // Snapshot the validated scope ONCE, then read ONLY the snapshot below — a
    // caller-owned accessor getter cannot return one tenant/estate at validation
    // and a different one at lookup (TOCTOU; Codex blocker 1).
    const { tenant_id, estate_id } = snapshotScope(scope);
    const slot = estates.get(estate_id);
    if (!slot) {
      if (forWrite) {
        throw new AdmittedAssertionScopeViolationError({
          estate_id,
          reason: 'unseeded_estate',
        });
      }
      return null;
    }
    if (slot.tenant_id !== tenant_id) {
      if (forWrite) {
        throw new AdmittedAssertionScopeViolationError({
          estate_id,
          reason: 'foreign_tenant',
        });
      }
      return null;
    }
    return slot;
  }

  function nextReceiptRef(slot: EstateSlot): string {
    // Short, synthetic, per-estate sequence — never a UUID or long opaque run.
    return `rcpt-priv-${slot.audit.length + 1}`;
  }

  function recordInternal(scope: AdmittedScope, rawTransition: unknown): RecordOutcome {
    // (0) Validate the transition shape/markers BEFORE touching any state, so an
    // unsafe / payload-shaped / over-long transition is rejected with zero
    // ledger/audit/recall residue (Codex blocker 3, 4). validateTransition
    // returns a FROZEN, closure-owned snapshot; every line below reads ONLY this
    // snapshot, never the caller-owned object, so a caller accessor getter cannot
    // return a safe value at validation and a different one at commit (TOCTOU).
    const transition = validateTransition(rawTransition);

    // (1) Resolve the tenant-owned, seeded slot (fail closed on foreign/unseeded).
    const slot = resolveOwnedSlot(scope, /*forWrite*/ true)!;
    const fingerprint = transitionFingerprint(transition);

    // (2) Spike-scoped replay handling — BEFORE any mutation or capacity work.
    const priorReplay = slot.replays.get(transition.replay_key);
    if (priorReplay) {
      if (priorReplay.fingerprint === fingerprint) {
        // Idempotent retry: return the prior result, mint nothing new.
        const existing = slot.assertions.get(priorReplay.admitted_assertion_id);
        return {
          outcome: 'replayed',
          admitted_assertion_id: priorReplay.admitted_assertion_id,
          assertion_status: 'active',
          superseded_assertion_id: existing?.supersedes_assertion_id,
        };
      }
      // Same key, different synthetic content → fail closed.
      throw new AdmittedAssertionReplayConflictError({
        estate_id: slot.estate_id,
        reason: 'replay_key_content_mismatch',
      });
    }

    if (transition.kind === 'admit') {
      return applyAdmit(slot, transition, fingerprint);
    }
    return applySupersede(slot, transition, fingerprint);
  }

  function applyAdmit(
    slot: EstateSlot,
    transition: SyntheticAdmissionTransition,
    fingerprint: string,
  ): RecordOutcome {
    if (slot.assertions.has(transition.admitted_assertion_id)) {
      // A fresh replay key minting over an existing synthetic id is a conflict.
      throw new AdmittedAssertionReplayConflictError({
        estate_id: slot.estate_id,
        reason: 'assertion_id_collision',
      });
    }

    const receipt_ref = nextReceiptRef(slot);
    // Internal records are frozen at creation (defense-in-depth, matching the
    // readonly types) so internal state cannot be mutated in place. Reads still
    // hand out detached copies (Codex blocker 3).
    const assertion = Object.freeze<SyntheticAdmittedAssertion>({
      admitted_assertion_id: transition.admitted_assertion_id,
      tenant_id: slot.tenant_id,
      estate_id: slot.estate_id,
      source_candidate_id: transition.source_candidate_id,
      admission_transition_id: transition.admission_transition_id,
      assertion_class: transition.assertion_class,
      assertion_status: 'active',
      recall_eligible: true,
      receipt_ref,
    });
    const auditRecord = Object.freeze<SyntheticAuditRecord>({
      audit_event: 'assertion_admitted',
      admission_transition_id: transition.admission_transition_id,
      source_candidate_id: transition.source_candidate_id,
      admitted_assertion_id: transition.admitted_assertion_id,
      receipt_ref,
      audit_private: true,
      public_audit_detail: false,
    });

    // Capacity is checked against the FULLY-COMPUTED record — including the
    // retained replay-de-dup metadata (key + fingerprint) — BEFORE any mutation,
    // so an over-capacity write leaves the estate exactly as it was, and a large
    // replay key counts against the budget (Codex blocker 2).
    const replayBytes = replayEntryBytes(
      transition.replay_key,
      assertion.admitted_assertion_id,
      fingerprint,
    );
    const byteDelta = syntheticBytes(assertion) + syntheticBytes(auditRecord) + replayBytes;
    enforceCaps(slot, /*countDelta*/ 1, byteDelta);

    // Atomic synchronous commit — no `await` between these mutations.
    slot.assertions.set(assertion.admitted_assertion_id, assertion);
    slot.audit.push(auditRecord);
    slot.bytes += byteDelta;
    slot.replays.set(transition.replay_key, {
      admitted_assertion_id: assertion.admitted_assertion_id,
      fingerprint,
    });

    return { outcome: 'recorded', admitted_assertion_id: assertion.admitted_assertion_id, assertion_status: 'active' };
  }

  function applySupersede(
    slot: EstateSlot,
    transition: SyntheticAdmissionTransition,
    fingerprint: string,
  ): RecordOutcome {
    const priorId = transition.supersedes_assertion_id;
    if (!priorId) {
      // A supersession with no prior is invalid synthetic input → fail closed.
      throw new AdmittedAssertionScopeViolationError({
        estate_id: slot.estate_id,
        reason: 'prior_not_in_estate',
      });
    }
    const prior = slot.assertions.get(priorId);
    if (!prior) {
      // The prior is not in THIS estate — one estate cannot supersede another's.
      throw new AdmittedAssertionScopeViolationError({
        estate_id: slot.estate_id,
        reason: 'prior_not_in_estate',
      });
    }
    if (prior.assertion_status !== 'active') {
      // Cannot supersede an already-superseded prior — fail closed.
      throw new AdmittedAssertionReplayConflictError({
        estate_id: slot.estate_id,
        reason: 'prior_not_active',
      });
    }
    if (slot.assertions.has(transition.admitted_assertion_id)) {
      throw new AdmittedAssertionReplayConflictError({
        estate_id: slot.estate_id,
        reason: 'assertion_id_collision',
      });
    }

    const receipt_ref = nextReceiptRef(slot);
    // Internal records are frozen at creation (defense-in-depth, matching the
    // readonly types). The prior is REPLACED with a fresh frozen object rather
    // than mutated in place.
    const corrected = Object.freeze<SyntheticAdmittedAssertion>({
      admitted_assertion_id: transition.admitted_assertion_id,
      tenant_id: slot.tenant_id,
      estate_id: slot.estate_id,
      source_candidate_id: transition.source_candidate_id,
      admission_transition_id: transition.admission_transition_id,
      assertion_class: transition.assertion_class,
      assertion_status: 'active',
      recall_eligible: true,
      supersedes_assertion_id: priorId,
      receipt_ref,
    });
    // The prior moves to canonical `superseded`, retained for audit/provenance,
    // and dropped from ordinary recall.
    const priorSuperseded = Object.freeze<SyntheticAdmittedAssertion>({
      ...prior,
      assertion_status: 'superseded',
      recall_eligible: false,
      superseded_by_assertion_id: corrected.admitted_assertion_id,
    });
    const auditRecord = Object.freeze<SyntheticAuditRecord>({
      audit_event: 'assertion_superseded',
      admission_transition_id: transition.admission_transition_id,
      source_candidate_id: transition.source_candidate_id,
      admitted_assertion_id: corrected.admitted_assertion_id,
      receipt_ref,
      audit_private: true,
      public_audit_detail: false,
    });

    // Compute the net deltas for BOTH mutations — plus the retained replay-de-dup
    // metadata — and check caps before either is applied, so a partial
    // supersession can never be left half-committed and the replay key counts
    // against the budget (Codex blocker 2).
    const replayBytes = replayEntryBytes(
      transition.replay_key,
      corrected.admitted_assertion_id,
      fingerprint,
    );
    const countDelta = 1; // one new corrected assertion; the prior stays counted
    const byteDelta =
      syntheticBytes(corrected) +
      syntheticBytes(auditRecord) +
      replayBytes +
      (syntheticBytes(priorSuperseded) - syntheticBytes(prior));
    enforceCaps(slot, countDelta, byteDelta);

    // Atomic synchronous commit of both mutations.
    slot.assertions.set(priorSuperseded.admitted_assertion_id, priorSuperseded);
    slot.assertions.set(corrected.admitted_assertion_id, corrected);
    slot.audit.push(auditRecord);
    slot.bytes += byteDelta;
    slot.replays.set(transition.replay_key, {
      admitted_assertion_id: corrected.admitted_assertion_id,
      fingerprint,
    });

    return {
      outcome: 'recorded',
      admitted_assertion_id: corrected.admitted_assertion_id,
      assertion_status: 'active',
      superseded_assertion_id: priorSuperseded.admitted_assertion_id,
    };
  }

  function enforceCaps(slot: EstateSlot, countDelta: number, byteDelta: number): void {
    // Reads ONLY the frozen, closure-owned `caps` — never the caller-owned config
    // object — so a post-construction config mutation cannot widen a cap.
    const projectedCount = slot.assertions.size + countDelta;
    if (projectedCount > caps.maxAssertionsPerEstate) {
      throw new AdmittedAssertionCapExceededError({
        estate_id: slot.estate_id,
        dimension: 'assertion_count',
        cap: caps.maxAssertionsPerEstate,
        observed: projectedCount,
      });
    }
    const projectedBytes = slot.bytes + byteDelta;
    if (projectedBytes > caps.maxAssertionBytesPerEstate) {
      throw new AdmittedAssertionCapExceededError({
        estate_id: slot.estate_id,
        dimension: 'byte_budget',
        cap: caps.maxAssertionBytesPerEstate,
        observed: projectedBytes,
      });
    }
  }

  function projectRecallInternal(scope: AdmittedScope): RecallProjection {
    const slot = resolveOwnedSlot(scope, /*forWrite*/ false);
    if (!slot) return Object.freeze({ includes: Object.freeze([]), excludes: Object.freeze([]) });
    const includes: string[] = [];
    const excludes: string[] = [];
    for (const a of slot.assertions.values()) {
      if (a.assertion_status === 'active' && a.recall_eligible) {
        includes.push(a.admitted_assertion_id);
      } else {
        excludes.push(a.admitted_assertion_id);
      }
    }
    // Freshly-built arrays of primitive string ids — frozen so a caller cannot
    // mutate the returned projection (and could never reach internal state
    // through it anyway, since the ids are primitives, not references). (Codex
    // blocker 3.)
    return Object.freeze({ includes: Object.freeze(includes), excludes: Object.freeze(excludes) });
  }

  function footprint(scope: AdmittedScope): EstateFootprint {
    const slot = resolveOwnedSlot(scope, /*forWrite*/ false);
    if (!slot) return Object.freeze({ assertions: 0, bytes: 0 });
    // Freshly-built, frozen snapshot of primitive counts — never a live
    // reference to slot internals (Codex blocker 3).
    return Object.freeze({ assertions: slot.assertions.size, bytes: slot.bytes });
  }

  function auditFor(scope: AdmittedScope): readonly SyntheticAuditRecord[] {
    const slot = resolveOwnedSlot(scope, /*forWrite*/ false);
    if (!slot) return Object.freeze([]);
    // Detach: map each internal record to a FROZEN shallow copy, then freeze the
    // outer array. The caller receives copies — mutating a returned record (or
    // the array) cannot reach the internal audit records, so an externally
    // mutated `unsafe_marker`, `audit_private`, or `public_audit_detail` never
    // persists internally (Codex blocker 3). The internal records are themselves
    // frozen at creation as defense-in-depth.
    return Object.freeze(slot.audit.map(detachAuditRecord));
  }

  return {
    seedEstate(scope) {
      // Snapshot the validated scope ONCE into closure-owned ids; read only the
      // snapshot below.
      const { tenant_id, estate_id } = snapshotScope(scope);
      const existing = estates.get(estate_id);
      if (existing) {
        if (existing.tenant_id !== tenant_id) {
          // Re-seeding an estate under a different tenant fails closed — an
          // estate cannot be silently re-homed across tenants (Codex blocker 1).
          throw new AdmittedAssertionTenantConflictError({ estate_id });
        }
        return; // idempotent for the same (tenant, estate): never destroys state
      }
      estates.set(estate_id, {
        tenant_id,
        estate_id,
        assertions: new Map(),
        audit: [],
        replays: new Map(),
        bytes: 0,
      });
    },
    record(scope, transition) {
      return recordInternal(scope, transition);
    },
    forEstate(scope) {
      // Validate the binding scope eagerly AND snapshot it into a FROZEN,
      // closure-owned object. EVERY view method below closes over `bound` — never
      // the caller-owned `scope` — so mutating the original scope object AFTER
      // this call cannot re-home the view to a different tenant/estate. The view
      // reads and writes ONLY the (tenant, estate) it was constructed for (Codex
      // blocker 1).
      const bound = snapshotScope(scope);
      return {
        tenant_id: bound.tenant_id,
        estate_id: bound.estate_id,
        record: (transition) => recordInternal(bound, transition),
        projectRecall: () => projectRecallInternal(bound),
        inspectEstate: () => footprint(bound),
        auditTrail: () => auditFor(bound),
      };
    },
    projectRecall(scope) {
      return projectRecallInternal(scope);
    },
    inspectEstate(scope) {
      return footprint(scope);
    },
    auditTrail(scope) {
      return auditFor(scope);
    },
  };
}
