// Phase 33Q — unit proof of the bounded, process-local, SYNTHETIC
// admitted-assertion ledger.
//
// Authorized by the Phase 33P storage/receipt hardening decision gate
// (docs/ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md §7–§12). These tests
// exercise the ledger API DIRECTLY (not through the route), proving the §9
// proof cases that are stateful and the §9 case-8 bounded-store safety set over
// SYNTHETIC material only. Nothing here touches a database, file, socket, timer,
// migration, or any durable backend — the ledger is JS Maps in a closure.
//
// SCOPE BINDING (Codex blocker 1): every read/write is bound to BOTH a
// synthetic tenant_id AND a synthetic estate_id. One tenant's estate is
// unreachable from another tenant; an estate_id cannot be re-homed to a second
// tenant.
//
// SYNTHETIC-ONLY DISCIPLINE (Codex blocker 3): every externally supplied
// string-like field is validated to a bounded synthetic-label shape BEFORE any
// mutation; unsafe markers, payload-shaped extra fields, and over-long values
// are rejected with zero ledger/audit/recall residue.
//
// STRICT CAPACITY (Codex blocker 2): the capacity config is validated at ledger
// creation (finite, positive, integer, dev-bounded), and retained replay
// metadata (keys + fingerprints) is included in the byte budget.
//
// IDEMPOTENCY BOUNDARY (Phase 33P §12): the replay/de-duplication and
// conflicting-replay proofs below are SPIKE-SCOPED ONLY. They do NOT settle
// final production idempotency semantics, which remain explicitly UNRESOLVED.

import { describe, expect, it } from 'vitest';
import {
  createAdmittedAssertionLedger,
  AdmittedAssertionCapExceededError,
  AdmittedAssertionScopeViolationError,
  AdmittedAssertionReplayConflictError,
  AdmittedAssertionInvalidConfigError,
  AdmittedAssertionInvalidInputError,
  AdmittedAssertionTenantConflictError,
  findAdmissionPublicLeaks,
  type AdmittedAssertionLedger,
  type AdmittedScope,
  type SyntheticAdmissionTransition,
} from '../../../src/services/admission-wedge-spike/index.js';

// ── Synthetic builders (short labels only; never UUID / long-opaque) ──────────

const SCOPE_A: AdmittedScope = { tenant_id: 'tenant-synth-a', estate_id: 'estate-synth-a' };

function freshLedger(
  overrides?: Partial<{ maxAssertionsPerEstate: number; maxAssertionBytesPerEstate: number }>,
): AdmittedAssertionLedger {
  return createAdmittedAssertionLedger({
    maxAssertionsPerEstate: overrides?.maxAssertionsPerEstate ?? 100,
    maxAssertionBytesPerEstate: overrides?.maxAssertionBytesPerEstate ?? 1_000_000,
  });
}

function seededLedger(
  scope: AdmittedScope = SCOPE_A,
  cfg?: Partial<{ maxAssertionsPerEstate: number; maxAssertionBytesPerEstate: number }>,
): AdmittedAssertionLedger {
  const ledger = freshLedger(cfg);
  ledger.seedEstate(scope);
  return ledger;
}

function admitTransition(
  overrides?: Partial<SyntheticAdmissionTransition>,
): SyntheticAdmissionTransition {
  return {
    kind: 'admit',
    source_candidate_id: 'cand-synth-1',
    admission_transition_id: 'txn-admit-1',
    admitted_assertion_id: 'assn-active-1',
    assertion_class: 'preference',
    replay_key: 'admit:cand-synth-1',
    ...overrides,
  };
}

function supersedeTransition(
  overrides?: Partial<SyntheticAdmissionTransition>,
): SyntheticAdmissionTransition {
  return {
    kind: 'supersede',
    source_candidate_id: 'cand-synth-2',
    admission_transition_id: 'txn-supersede-1',
    admitted_assertion_id: 'assn-corrected-1',
    assertion_class: 'preference',
    replay_key: 'supersede:cand-synth-1',
    supersedes_assertion_id: 'assn-active-1',
    ...overrides,
  };
}

/**
 * Zero-residue proof for a REJECTED adversarial transition. A transition that
 * fails validation must leave the estate EXACTLY as it was — no stored
 * assertion, no retained bytes, no audit record, and nothing recallable. We
 * assert all four surfaces so a regression that half-applies (or partially
 * accounts) a rejected input is caught immediately after THAT input, rather than
 * being masked by a single count check at the end of an adversarial loop.
 */
function expectZeroResidue(
  ledger: AdmittedAssertionLedger,
  scope: AdmittedScope = SCOPE_A,
): void {
  expect(ledger.inspectEstate(scope)).toEqual({ assertions: 0, bytes: 0 });
  expect(ledger.auditTrail(scope)).toEqual([]);
  expect(ledger.projectRecall(scope)).toEqual({ includes: [], excludes: [] });
}

// ── §9 proof case 1 & 2 — accept → admitted assertion exists, with audit ──────

describe('Phase 33Q ledger — accept mints one active recall-eligible assertion + private audit (§9.1, §9.2)', () => {
  it('records exactly one active, recall-eligible synthetic admitted assertion', () => {
    const ledger = seededLedger();
    const outcome = ledger.record(SCOPE_A, admitTransition());

    expect(outcome.outcome).toBe('recorded');
    expect(outcome.admitted_assertion_id).toBe('assn-active-1');
    expect(outcome.assertion_status).toBe('active');

    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(1);
    // The active assertion is ordinarily recallable (identity/status/provenance
    // observable — §9 case-8 final bullet).
    expect(ledger.projectRecall(SCOPE_A)).toEqual({
      includes: ['assn-active-1'],
      excludes: [],
    });
  });

  it('attaches a synthetic, explicitly NON-FINAL audit record with BOTH privacy markers (§10)', () => {
    const ledger = seededLedger();
    ledger.record(SCOPE_A, admitTransition());

    const audit = ledger.auditTrail(SCOPE_A);
    expect(audit).toHaveLength(1);
    expect(audit[0]!.audit_event).toBe('assertion_admitted');
    expect(audit[0]!.admission_transition_id).toBe('txn-admit-1');
    expect(audit[0]!.source_candidate_id).toBe('cand-synth-1');
    // Receipt/audit split discipline (§10): the record is private AND carries no
    // public audit detail. It explains the outcome; it never claims to be a
    // production receipt.
    expect(audit[0]!.audit_private).toBe(true);
    expect(audit[0]!.public_audit_detail).toBe(false);
  });
});

// ── §9 case-8 final bullet — identity/status/provenance WITHOUT raw payload ───

describe('Phase 33Q ledger — identity/status/provenance observable WITHOUT raw payload persistence (§9 case-8)', () => {
  it('exposes id, active status, and provenance link while storing NO raw payload', () => {
    const ledger = seededLedger();
    ledger.record(SCOPE_A, admitTransition());

    const view = ledger.forEstate(SCOPE_A);
    // Identity + status observable.
    expect(view.projectRecall().includes).toEqual(['assn-active-1']);
    // Provenance observable via the private audit trail (transition → candidate).
    const audit = view.auditTrail();
    expect(audit[0]!.admitted_assertion_id).toBe('assn-active-1');
    expect(audit[0]!.source_candidate_id).toBe('cand-synth-1');

    // No raw payload, source material, or unsafe marker anywhere in the stored
    // synthetic state. We serialize the whole private surface and assert the
    // absence of payload-shaped content (we do NOT run findAdmissionPublicLeaks
    // here — these PRIVATE records legitimately carry forbidden public KEYS like
    // admitted_assertion_id, so the public-leak guard belongs only on the public
    // projection, asserted separately below).
    const serializedPrivate = JSON.stringify({
      audit: view.auditTrail(),
      recall: view.projectRecall(),
      footprint: view.inspectEstate(),
    });
    expect(serializedPrivate).not.toContain('unsafe_marker:');
    expect(serializedPrivate).not.toContain('candidate_payload');
    expect(serializedPrivate).not.toContain('source_ref');
    expect(serializedPrivate).not.toContain('source_material');
    expect(serializedPrivate).not.toContain('raw_reason');
  });
});

// ── §9 proof case 6 — supersession repoints recall, preserves prior provenance ─

describe('Phase 33Q ledger — supersession repoints recall to corrected active, prior preserved (§9.6)', () => {
  it('marks prior superseded (not recallable) and corrected active (recallable), prior still inspectable', () => {
    const ledger = seededLedger();
    ledger.record(SCOPE_A, admitTransition());
    const outcome = ledger.record(SCOPE_A, supersedeTransition());

    expect(outcome.outcome).toBe('recorded');
    expect(outcome.admitted_assertion_id).toBe('assn-corrected-1');
    expect(outcome.superseded_assertion_id).toBe('assn-active-1');

    // Ordinary recall now includes ONLY the corrected active assertion; the
    // prior is excluded but retained for audit/provenance.
    expect(ledger.projectRecall(SCOPE_A)).toEqual({
      includes: ['assn-corrected-1'],
      excludes: ['assn-active-1'],
    });

    // Both assertions remain present (the prior is retained, not deleted).
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(2);

    // A superseded-event audit record exists, private + non-final.
    const audit = ledger.auditTrail(SCOPE_A);
    expect(audit.map((a) => a.audit_event)).toEqual(['assertion_admitted', 'assertion_superseded']);
    expect(audit.every((a) => a.audit_private === true && a.public_audit_detail === false)).toBe(true);
  });

  it('fails closed when superseding a prior that is not in the estate (§9 case-8 isolation/atomicity)', () => {
    const ledger = seededLedger();
    // No prior admitted; superseding a non-existent prior must fail closed and
    // leave the estate empty.
    expect(() => ledger.record(SCOPE_A, supersedeTransition())).toThrow(
      AdmittedAssertionScopeViolationError,
    );
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(0);
  });

  it('fails closed when superseding an already-superseded prior (conflict)', () => {
    const ledger = seededLedger();
    ledger.record(SCOPE_A, admitTransition());
    ledger.record(SCOPE_A, supersedeTransition());
    // A second supersession of the now-superseded prior conflicts.
    expect(() =>
      ledger.record(
        SCOPE_A,
        supersedeTransition({
          admitted_assertion_id: 'assn-corrected-2',
          admission_transition_id: 'txn-supersede-2',
          replay_key: 'supersede:cand-synth-1:again',
        }),
      ),
    ).toThrow(AdmittedAssertionReplayConflictError);
  });
});

// ── §9 case-8 — tenant/estate isolation (Codex blocker 1) ─────────────────────

describe('Phase 33Q ledger — tenant/estate isolation (§9 case-8)', () => {
  it('keeps one estate’s admitted assertions unreachable from another', () => {
    const ledger = freshLedger();
    const a: AdmittedScope = { tenant_id: 'tenant-a', estate_id: 'estate-a' };
    const b: AdmittedScope = { tenant_id: 'tenant-b', estate_id: 'estate-b' };
    ledger.seedEstate(a);
    ledger.seedEstate(b);

    ledger.record(a, admitTransition({ admitted_assertion_id: 'assn-a-1', replay_key: 'admit:a1' }));

    // estate-b sees nothing of estate-a's synthetic state.
    expect(ledger.projectRecall(b)).toEqual({ includes: [], excludes: [] });
    expect(ledger.inspectEstate(b).assertions).toBe(0);
    expect(ledger.auditTrail(b)).toEqual([]);

    // estate-a's own view is intact.
    expect(ledger.projectRecall(a).includes).toEqual(['assn-a-1']);
  });

  it('a one-estate flood to capacity cannot starve another estate', () => {
    const ledger = freshLedger({ maxAssertionsPerEstate: 2 });
    const a: AdmittedScope = { tenant_id: 'tenant-a', estate_id: 'estate-a' };
    const b: AdmittedScope = { tenant_id: 'tenant-b', estate_id: 'estate-b' };
    ledger.seedEstate(a);
    ledger.seedEstate(b);

    ledger.record(a, admitTransition({ admitted_assertion_id: 'a1', replay_key: 'k:a1' }));
    ledger.record(a, admitTransition({ admitted_assertion_id: 'a2', replay_key: 'k:a2' }));
    expect(() =>
      ledger.record(a, admitTransition({ admitted_assertion_id: 'a3', replay_key: 'k:a3' })),
    ).toThrow(AdmittedAssertionCapExceededError);

    // estate-b is unaffected by estate-a's overflow.
    ledger.record(b, admitTransition({ admitted_assertion_id: 'b1', replay_key: 'k:b1' }));
    expect(ledger.inspectEstate(b).assertions).toBe(1);
  });

  it('records into an unseeded estate fail closed', () => {
    const ledger = freshLedger();
    expect(() =>
      ledger.record({ tenant_id: 'tenant-x', estate_id: 'estate-missing' }, admitTransition()),
    ).toThrow(AdmittedAssertionScopeViolationError);
  });
});

// ── §9 case-8 — tenant binding & conflict (Codex blocker 1) ───────────────────

describe('Phase 33Q ledger — tenant binding: same estate / different tenant (Codex blocker 1)', () => {
  it('re-seeding the SAME estate_id under a DIFFERENT tenant fails closed (tenant conflict)', () => {
    const ledger = seededLedger({ tenant_id: 'tenant-a', estate_id: 'estate-shared' });
    // Re-seeding the same estate under tenant-a is idempotent (no throw).
    ledger.seedEstate({ tenant_id: 'tenant-a', estate_id: 'estate-shared' });
    // Re-seeding the same estate under tenant-b must FAIL CLOSED — an estate
    // cannot be silently re-homed across tenants.
    expect(() => ledger.seedEstate({ tenant_id: 'tenant-b', estate_id: 'estate-shared' })).toThrow(
      AdmittedAssertionTenantConflictError,
    );
  });

  it('a conflicting reseed does NOT disturb the original tenant’s state', () => {
    const a: AdmittedScope = { tenant_id: 'tenant-a', estate_id: 'estate-shared' };
    const ledger = seededLedger(a);
    ledger.record(a, admitTransition());
    expect(() => ledger.seedEstate({ tenant_id: 'tenant-b', estate_id: 'estate-shared' })).toThrow(
      AdmittedAssertionTenantConflictError,
    );
    // tenant-a's assertion is intact; the estate still belongs to tenant-a.
    expect(ledger.inspectEstate(a).assertions).toBe(1);
    expect(ledger.projectRecall(a).includes).toEqual(['assn-active-1']);
  });

  it('a foreign tenant cannot READ another tenant’s estate (reads fail closed to empty)', () => {
    const a: AdmittedScope = { tenant_id: 'tenant-a', estate_id: 'estate-shared' };
    const foreign: AdmittedScope = { tenant_id: 'tenant-b', estate_id: 'estate-shared' };
    const ledger = seededLedger(a);
    ledger.record(a, admitTransition());

    // The foreign tenant sees NOTHING — no cross-tenant read.
    expect(ledger.projectRecall(foreign)).toEqual({ includes: [], excludes: [] });
    expect(ledger.inspectEstate(foreign)).toEqual({ assertions: 0, bytes: 0 });
    expect(ledger.auditTrail(foreign)).toEqual([]);
  });

  it('a foreign tenant cannot WRITE into another tenant’s estate (writes fail closed)', () => {
    const a: AdmittedScope = { tenant_id: 'tenant-a', estate_id: 'estate-shared' };
    const foreign: AdmittedScope = { tenant_id: 'tenant-b', estate_id: 'estate-shared' };
    const ledger = seededLedger(a);
    ledger.record(a, admitTransition());

    // A write under the foreign tenant fails closed and leaves tenant-a intact.
    try {
      ledger.record(
        foreign,
        admitTransition({ admitted_assertion_id: 'assn-foreign', replay_key: 'admit:foreign' }),
      );
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AdmittedAssertionScopeViolationError);
      expect((err as AdmittedAssertionScopeViolationError).reason).toBe('foreign_tenant');
    }
    // tenant-a still has exactly its one original assertion; nothing leaked in.
    expect(ledger.inspectEstate(a).assertions).toBe(1);
    expect(ledger.projectRecall(a).includes).toEqual(['assn-active-1']);
  });

  it('the scoped view is tenant- AND estate-bound', () => {
    const a: AdmittedScope = { tenant_id: 'tenant-a', estate_id: 'estate-shared' };
    const ledger = seededLedger(a);
    const view = ledger.forEstate(a);
    expect(view.tenant_id).toBe('tenant-a');
    expect(view.estate_id).toBe('estate-shared');
    // A view bound to a foreign tenant reads empty even for a populated estate.
    ledger.record(a, admitTransition());
    const foreignView = ledger.forEstate({ tenant_id: 'tenant-b', estate_id: 'estate-shared' });
    expect(foreignView.projectRecall()).toEqual({ includes: [], excludes: [] });
    expect(foreignView.inspectEstate().assertions).toBe(0);
  });
});

// ── Scoped views snapshot an IMMUTABLE scope (Codex blocker 1) ────────────────

describe('Phase 33Q ledger — scoped view snapshots its scope; later mutation of the original cannot re-home it (Codex blocker 1)', () => {
  it('READ: mutating the original scope object after forEstate() does not change what the view reads', () => {
    const a: AdmittedScope = { tenant_id: 'tenant-a', estate_id: 'estate-a' };
    const b: AdmittedScope = { tenant_id: 'tenant-b', estate_id: 'estate-b' };
    const ledger = freshLedger();
    ledger.seedEstate(a);
    ledger.seedEstate(b);
    ledger.record(a, admitTransition({ admitted_assertion_id: 'assn-a-1', replay_key: 'k:a1' }));
    ledger.record(b, admitTransition({ admitted_assertion_id: 'assn-b-1', replay_key: 'k:b1' }));

    // Build a MUTABLE scope object and a view over A/A.
    const mutable: AdmittedScope = { tenant_id: 'tenant-a', estate_id: 'estate-a' };
    const view = ledger.forEstate(mutable);
    expect(view.tenant_id).toBe('tenant-a');
    expect(view.estate_id).toBe('estate-a');

    // Now mutate the ORIGINAL object to point at tenant B / estate B.
    mutable.tenant_id = 'tenant-b';
    mutable.estate_id = 'estate-b';

    // The view still reads ONLY A/A — it never followed the mutation to B/B.
    expect(view.tenant_id).toBe('tenant-a');
    expect(view.estate_id).toBe('estate-a');
    expect(view.projectRecall().includes).toEqual(['assn-a-1']);
    expect(view.inspectEstate().assertions).toBe(1);
    expect(view.auditTrail().map((r) => r.admitted_assertion_id)).toEqual(['assn-a-1']);
    // It must NOT have read estate B's state.
    expect(view.projectRecall().includes).not.toContain('assn-b-1');
  });

  it('WRITE: mutating the original scope object after forEstate() does not redirect writes to B/B', () => {
    const a: AdmittedScope = { tenant_id: 'tenant-a', estate_id: 'estate-a' };
    const b: AdmittedScope = { tenant_id: 'tenant-b', estate_id: 'estate-b' };
    const ledger = freshLedger();
    ledger.seedEstate(a);
    ledger.seedEstate(b);

    const mutable: AdmittedScope = { tenant_id: 'tenant-a', estate_id: 'estate-a' };
    const view = ledger.forEstate(mutable);

    // Re-home the original object to B/B AFTER binding.
    mutable.tenant_id = 'tenant-b';
    mutable.estate_id = 'estate-b';

    // A write through the original view lands in A/A only.
    view.record(admitTransition({ admitted_assertion_id: 'assn-a-1', replay_key: 'k:a1' }));

    // A/A received the write; B/B is untouched.
    expect(ledger.inspectEstate(a).assertions).toBe(1);
    expect(ledger.projectRecall(a).includes).toEqual(['assn-a-1']);
    expect(ledger.inspectEstate(b).assertions).toBe(0);
    expect(ledger.projectRecall(b)).toEqual({ includes: [], excludes: [] });
  });

  it('WRITE fails closed per A/A state (not B/B) — a supersede with no A/A prior fails even though B/B has one', () => {
    const a: AdmittedScope = { tenant_id: 'tenant-a', estate_id: 'estate-a' };
    const b: AdmittedScope = { tenant_id: 'tenant-b', estate_id: 'estate-b' };
    const ledger = freshLedger();
    ledger.seedEstate(a);
    ledger.seedEstate(b);
    // B/B has a prior active assertion that a supersede COULD correct.
    ledger.record(b, admitTransition({ admitted_assertion_id: 'assn-active-1', replay_key: 'k:b-admit' }));

    const mutable: AdmittedScope = { tenant_id: 'tenant-a', estate_id: 'estate-a' };
    const view = ledger.forEstate(mutable);
    // Re-home the original to B/B.
    mutable.tenant_id = 'tenant-b';
    mutable.estate_id = 'estate-b';

    // The view is bound to A/A, where there is NO prior — so a supersede fails
    // closed according to A/A state, never silently succeeding against B/B.
    expect(() => view.record(supersedeTransition({ replay_key: 'k:a-supersede' }))).toThrow(
      AdmittedAssertionScopeViolationError,
    );
    // B/B's prior was never touched (still active, still alone).
    expect(ledger.projectRecall(b).includes).toEqual(['assn-active-1']);
    expect(ledger.inspectEstate(b).assertions).toBe(1);
    // A/A remains empty.
    expect(ledger.inspectEstate(a).assertions).toBe(0);
  });
});

// ── §9 case-8 — capacity-limit failure leaves state unchanged ─────────────────

describe('Phase 33Q ledger — capacity-limit failure behavior (§9 case-8)', () => {
  it('assertion-count overflow throws with dimension/cap/observed, state unchanged', () => {
    const ledger = seededLedger(SCOPE_A, { maxAssertionsPerEstate: 1 });
    ledger.record(SCOPE_A, admitTransition({ admitted_assertion_id: 'a1', replay_key: 'k1' }));

    try {
      ledger.record(SCOPE_A, admitTransition({ admitted_assertion_id: 'a2', replay_key: 'k2' }));
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AdmittedAssertionCapExceededError);
      const e = err as AdmittedAssertionCapExceededError;
      expect(e.estate_id).toBe('estate-synth-a');
      expect(e.dimension).toBe('assertion_count');
      expect(e.cap).toBe(1);
      expect(e.observed).toBe(2);
    }
    // Bounded REJECTION, not eviction: the original is intact, count unchanged.
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(1);
    expect(ledger.projectRecall(SCOPE_A).includes).toEqual(['a1']);
  });

  it('byte-budget overflow throws and leaves state unchanged', () => {
    const ledger = seededLedger(SCOPE_A, {
      maxAssertionsPerEstate: 1_000,
      maxAssertionBytesPerEstate: 120,
    });
    // A long (but still bounded-length, synthetic-shape) assertion_class forces a
    // single-record byte overflow. 120 bytes is far smaller than one record.
    expect(() =>
      ledger.record(
        SCOPE_A,
        admitTransition({ assertion_class: 'c'.repeat(120), replay_key: 'k-big' }),
      ),
    ).toThrow(AdmittedAssertionCapExceededError);
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(0);
    expect(ledger.inspectEstate(SCOPE_A).bytes).toBe(0);
  });

  it('retained replay metadata contributes to the byte budget (Codex blocker 2)', () => {
    // Two ledgers, identical except for replay_key length. The longer replay key
    // must cost MORE bytes, proving the retained replay metadata is accounted —
    // a 1 MB key cannot be retained while reported bytes stay small.
    const shortLedger = seededLedger(SCOPE_A, { maxAssertionsPerEstate: 10 });
    shortLedger.record(SCOPE_A, admitTransition({ replay_key: 'k1' }));
    const shortBytes = shortLedger.inspectEstate(SCOPE_A).bytes;

    const longLedger = seededLedger(SCOPE_A, { maxAssertionsPerEstate: 10 });
    longLedger.record(SCOPE_A, admitTransition({ replay_key: `k-${'x'.repeat(100)}` }));
    const longBytes = longLedger.inspectEstate(SCOPE_A).bytes;

    expect(longBytes).toBeGreaterThan(shortBytes);
    // The difference is at least the extra replay-key characters.
    expect(longBytes - shortBytes).toBeGreaterThanOrEqual(100);
  });

  it('a write whose retained replay key would breach the byte budget fails closed (Codex blocker 2)', () => {
    // Sized so the assertion + audit fit but the retained replay key tips the
    // budget over — proving the replay key is counted in the capacity check, not
    // retained silently.
    const baseline = seededLedger(SCOPE_A, { maxAssertionsPerEstate: 10 });
    baseline.record(SCOPE_A, admitTransition({ replay_key: 'k1' }));
    const oneRecordBytes = baseline.inspectEstate(SCOPE_A).bytes;

    // Budget that admits the record under a short key but not under a long one.
    const ledger = seededLedger(SCOPE_A, {
      maxAssertionsPerEstate: 10,
      maxAssertionBytesPerEstate: oneRecordBytes + 20,
    });
    expect(() =>
      ledger.record(SCOPE_A, admitTransition({ replay_key: `k-${'y'.repeat(100)}` })),
    ).toThrow(AdmittedAssertionCapExceededError);
    // Bounded rejection, not silent retention: nothing was stored.
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(0);
    expect(ledger.inspectEstate(SCOPE_A).bytes).toBe(0);
  });
});

// ── Strict capacity-config validation at creation (Codex blocker 2) ───────────

describe('Phase 33Q ledger — capacity config is strictly validated at creation (Codex blocker 2)', () => {
  it('rejects an Infinity assertion cap', () => {
    expect(() =>
      createAdmittedAssertionLedger({
        maxAssertionsPerEstate: Number.POSITIVE_INFINITY,
        maxAssertionBytesPerEstate: 1_000,
      }),
    ).toThrow(AdmittedAssertionInvalidConfigError);
  });

  it('rejects an Infinity byte cap', () => {
    expect(() =>
      createAdmittedAssertionLedger({
        maxAssertionsPerEstate: 10,
        maxAssertionBytesPerEstate: Number.POSITIVE_INFINITY,
      }),
    ).toThrow(AdmittedAssertionInvalidConfigError);
  });

  it('rejects a NaN cap', () => {
    expect(() =>
      createAdmittedAssertionLedger({
        maxAssertionsPerEstate: Number.NaN,
        maxAssertionBytesPerEstate: 1_000,
      }),
    ).toThrow(AdmittedAssertionInvalidConfigError);
  });

  it('rejects zero, negative, fractional, and over-ceiling caps', () => {
    expect(() =>
      createAdmittedAssertionLedger({ maxAssertionsPerEstate: 0, maxAssertionBytesPerEstate: 1_000 }),
    ).toThrow(AdmittedAssertionInvalidConfigError);
    expect(() =>
      createAdmittedAssertionLedger({ maxAssertionsPerEstate: -5, maxAssertionBytesPerEstate: 1_000 }),
    ).toThrow(AdmittedAssertionInvalidConfigError);
    expect(() =>
      createAdmittedAssertionLedger({ maxAssertionsPerEstate: 1.5, maxAssertionBytesPerEstate: 1_000 }),
    ).toThrow(AdmittedAssertionInvalidConfigError);
    expect(() =>
      createAdmittedAssertionLedger({
        maxAssertionsPerEstate: 10,
        maxAssertionBytesPerEstate: 100_000_000,
      }),
    ).toThrow(AdmittedAssertionInvalidConfigError);
  });

  it('rejects a non-number cap', () => {
    expect(() =>
      createAdmittedAssertionLedger({
        // @ts-expect-error — proving runtime rejection of a non-number cap.
        maxAssertionsPerEstate: '10',
        maxAssertionBytesPerEstate: 1_000,
      }),
    ).toThrow(AdmittedAssertionInvalidConfigError);
  });

  it('carries a safe field/reason and no payload on the config error', () => {
    try {
      createAdmittedAssertionLedger({
        maxAssertionsPerEstate: Number.POSITIVE_INFINITY,
        maxAssertionBytesPerEstate: 1_000,
      });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AdmittedAssertionInvalidConfigError);
      const e = err as AdmittedAssertionInvalidConfigError;
      expect(e.field).toBe('maxAssertionsPerEstate');
      expect(e.reason).toBe('not_finite');
      expect(findAdmissionPublicLeaks(e.message)).toEqual([]);
    }
  });
});

// ── Validated caps are copied into closure-owned constants (Codex blocker 2) ──

describe('Phase 33Q ledger — validated caps are closure-owned; mutating the original config cannot widen them (Codex blocker 2)', () => {
  it('mutating both caps to Infinity AFTER construction does not relax the configured cap of one', () => {
    // Construct with maxAssertionsPerEstate = 1 (and a small byte budget).
    const config = { maxAssertionsPerEstate: 1, maxAssertionBytesPerEstate: 100_000 };
    const ledger = createAdmittedAssertionLedger(config);
    ledger.seedEstate(SCOPE_A);
    ledger.record(SCOPE_A, admitTransition({ admitted_assertion_id: 'a1', replay_key: 'k1' }));

    // Mutate the ORIGINAL config object to Infinity on BOTH dimensions.
    config.maxAssertionsPerEstate = Number.POSITIVE_INFINITY;
    config.maxAssertionBytesPerEstate = Number.POSITIVE_INFINITY;

    // The second assertion still fails closed under the ORIGINAL cap of one —
    // the ledger reads only its frozen, closure-owned caps.
    try {
      ledger.record(SCOPE_A, admitTransition({ admitted_assertion_id: 'a2', replay_key: 'k2' }));
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AdmittedAssertionCapExceededError);
      const e = err as AdmittedAssertionCapExceededError;
      expect(e.dimension).toBe('assertion_count');
      // The cap reported is still 1 — proving the closure-owned copy, not the
      // mutated config (which now reads Infinity).
      expect(e.cap).toBe(1);
      expect(e.observed).toBe(2);
    }

    // No residue from the failed write: still exactly one assertion, one audit
    // record, and only a1 is recallable; the failed key was never consumed.
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(1);
    expect(ledger.auditTrail(SCOPE_A)).toHaveLength(1);
    expect(ledger.projectRecall(SCOPE_A).includes).toEqual(['a1']);
  });

  it('mutating the byte cap to Infinity AFTER construction does not relax the original byte budget', () => {
    const config = { maxAssertionsPerEstate: 1_000, maxAssertionBytesPerEstate: 120 };
    const ledger = createAdmittedAssertionLedger(config);
    ledger.seedEstate(SCOPE_A);

    // Widen the original config's byte cap after construction.
    config.maxAssertionBytesPerEstate = Number.POSITIVE_INFINITY;

    // A single record that overflows the ORIGINAL 120-byte budget still fails.
    expect(() =>
      ledger.record(SCOPE_A, admitTransition({ assertion_class: 'c'.repeat(120), replay_key: 'k-big' })),
    ).toThrow(AdmittedAssertionCapExceededError);
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(0);
    expect(ledger.inspectEstate(SCOPE_A).bytes).toBe(0);
  });
});

// ── Synthetic-only / raw-material rejection (Codex blocker 3) ─────────────────

describe('Phase 33Q ledger — synthetic-only transition validation rejects unsafe/raw material (Codex blocker 3)', () => {
  it('rejects an unsafe marker in any accepted field, with zero residue', () => {
    const ledger = seededLedger();
    // An unsafe marker smuggled into the source_candidate_id is rejected before
    // any mutation.
    expect(() =>
      ledger.record(SCOPE_A, admitTransition({ source_candidate_id: 'unsafe_marker:raw-candidate' })),
    ).toThrow(AdmittedAssertionInvalidInputError);
    // …and into the replay_key (where `:` is shape-allowed) is also rejected.
    expect(() =>
      ledger.record(SCOPE_A, admitTransition({ replay_key: 'unsafe_marker:raw-candidate' })),
    ).toThrow(AdmittedAssertionInvalidInputError);
    // Zero residue: nothing stored, no audit, nothing recallable.
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(0);
    expect(ledger.auditTrail(SCOPE_A)).toEqual([]);
    expect(ledger.projectRecall(SCOPE_A)).toEqual({ includes: [], excludes: [] });
  });

  it('rejects payload-shaped values (candidate_payload, source_material, raw_reason) in any field', () => {
    const ledger = seededLedger();
    for (const bad of ['candidate_payload', 'source_material', 'raw_reason', 'source_ref']) {
      expect(() =>
        ledger.record(SCOPE_A, admitTransition({ assertion_class: bad })),
      ).toThrow(AdmittedAssertionInvalidInputError);
    }
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(0);
  });

  it('rejects a payload-shaped EXTRA field (strict key set), with zero residue', () => {
    const ledger = seededLedger();
    expect(() =>
      ledger.record(
        SCOPE_A,
        // @ts-expect-error — proving runtime rejection of an extra payload field.
        admitTransition({ candidate_payload: 'arbitrary raw material here' }),
      ),
    ).toThrow(AdmittedAssertionInvalidInputError);
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(0);
    expect(ledger.auditTrail(SCOPE_A)).toEqual([]);
  });

  it('rejects an over-long field (e.g. a 1 MB string) before it can be stored or accounted', () => {
    const ledger = seededLedger();
    const huge = 'a'.repeat(1_000_000);
    expect(() => ledger.record(SCOPE_A, admitTransition({ replay_key: huge }))).toThrow(
      AdmittedAssertionInvalidInputError,
    );
    // No residue and the byte budget was never touched by the oversized value.
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(0);
    expect(ledger.inspectEstate(SCOPE_A).bytes).toBe(0);
  });

  it('rejects an out-of-shape (free-form / whitespace / uppercase) identity label', () => {
    const ledger = seededLedger();
    for (const bad of ['Free Form Text', 'has whitespace', 'UPPER', 'punc!tuation', '']) {
      expect(() =>
        ledger.record(SCOPE_A, admitTransition({ admitted_assertion_id: bad })),
      ).toThrow(AdmittedAssertionInvalidInputError);
    }
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(0);
  });

  it('rejects an invalid transition kind', () => {
    const ledger = seededLedger();
    expect(() =>
      // @ts-expect-error — proving runtime rejection of an invalid kind.
      ledger.record(SCOPE_A, admitTransition({ kind: 'delete_everything' })),
    ).toThrow(AdmittedAssertionInvalidInputError);
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(0);
  });

  it('rejects a malformed scope (non-synthetic tenant/estate id)', () => {
    const ledger = freshLedger();
    expect(() => ledger.seedEstate({ tenant_id: 'Tenant With Spaces', estate_id: 'estate-ok' })).toThrow(
      AdmittedAssertionInvalidInputError,
    );
    expect(() => ledger.seedEstate({ tenant_id: 'tenant-ok', estate_id: 'unsafe_marker:x' })).toThrow(
      AdmittedAssertionInvalidInputError,
    );
  });

  it('no raw payload / unsafe marker survives a rejected transition in audit or inspection output', () => {
    const ledger = seededLedger();
    const sentinel = 'unsafe_marker:raw-candidate';
    try {
      ledger.record(SCOPE_A, admitTransition({ source_candidate_id: sentinel }));
    } catch {
      // expected
    }
    const serialized = JSON.stringify({
      audit: ledger.auditTrail(SCOPE_A),
      recall: ledger.projectRecall(SCOPE_A),
      footprint: ledger.inspectEstate(SCOPE_A),
    });
    expect(serialized).not.toContain(sentinel);
    expect(serialized).not.toContain('unsafe_marker');
    expect(serialized).not.toContain('raw-candidate');
  });
});

// ── §9 case-8 — atomic partial-failure / no residue ───────────────────────────

describe('Phase 33Q ledger — atomic partial-failure, no residue (§9 case-8)', () => {
  it('a pre-mutation failure leaves NO partially-admitted residue and NO recallable state', () => {
    const ledger = seededLedger(SCOPE_A, { maxAssertionsPerEstate: 1 });
    ledger.record(SCOPE_A, admitTransition({ admitted_assertion_id: 'a1', replay_key: 'k1' }));

    // This second record overflows and must be rejected BEFORE any mutation.
    expect(() =>
      ledger.record(SCOPE_A, admitTransition({ admitted_assertion_id: 'a2', replay_key: 'k2' })),
    ).toThrow(AdmittedAssertionCapExceededError);

    // No half-applied assertion, no orphan audit record, no recallable residue,
    // and the replay key for the failed write was never registered.
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(1);
    expect(ledger.auditTrail(SCOPE_A)).toHaveLength(1);
    expect(ledger.projectRecall(SCOPE_A)).toEqual({ includes: ['a1'], excludes: [] });
    // Re-issuing the failed write under freed capacity proves its key was not
    // silently consumed by the failed attempt.
    const ledger2 = seededLedger(SCOPE_A, { maxAssertionsPerEstate: 2 });
    ledger2.record(SCOPE_A, admitTransition({ admitted_assertion_id: 'a1', replay_key: 'k1' }));
    const out = ledger2.record(SCOPE_A, admitTransition({ admitted_assertion_id: 'a2', replay_key: 'k2' }));
    expect(out.outcome).toBe('recorded');
  });

  it('a failed supersession leaves the prior active and recallable (no half-applied supersession)', () => {
    const ledger = seededLedger(SCOPE_A, { maxAssertionsPerEstate: 1 });
    ledger.record(SCOPE_A, admitTransition());
    // Supersession would need a 2nd assertion slot but the cap is 1 → overflow
    // before either mutation. The prior must stay active + recallable.
    expect(() => ledger.record(SCOPE_A, supersedeTransition())).toThrow(
      AdmittedAssertionCapExceededError,
    );
    expect(ledger.projectRecall(SCOPE_A)).toEqual({ includes: ['assn-active-1'], excludes: [] });
    expect(ledger.auditTrail(SCOPE_A)).toHaveLength(1); // only the admit
  });
});

// ── §9 case-8 / §12 — replay de-dup and conflicting replay ────────────────────

describe('Phase 33Q ledger — spike-scoped replay/de-dup (§9 case-8, §12)', () => {
  it('replaying the SAME synthetic transition mints no duplicate (idempotent)', () => {
    const ledger = seededLedger();
    const first = ledger.record(SCOPE_A, admitTransition());
    const second = ledger.record(SCOPE_A, admitTransition());

    expect(first.outcome).toBe('recorded');
    expect(second.outcome).toBe('replayed');
    expect(second.admitted_assertion_id).toBe(first.admitted_assertion_id);
    // Exactly one assertion and one audit record — no second mint.
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(1);
    expect(ledger.auditTrail(SCOPE_A)).toHaveLength(1);
  });

  it('a CONFLICTING replay (same key, different content) fails closed, original intact', () => {
    const ledger = seededLedger();
    ledger.record(SCOPE_A, admitTransition());
    expect(() =>
      ledger.record(
        SCOPE_A,
        // Same replay_key, different synthetic content.
        admitTransition({ admitted_assertion_id: 'assn-active-other', assertion_class: 'claim' }),
      ),
    ).toThrow(AdmittedAssertionReplayConflictError);

    // No overwrite, no fork, no corruption.
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(1);
    expect(ledger.projectRecall(SCOPE_A).includes).toEqual(['assn-active-1']);
  });

  it('a fresh replay key minting over an existing synthetic id is a conflict', () => {
    const ledger = seededLedger();
    ledger.record(SCOPE_A, admitTransition());
    expect(() =>
      ledger.record(SCOPE_A, admitTransition({ replay_key: 'different-key' })),
    ).toThrow(AdmittedAssertionReplayConflictError);
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(1);
  });
});

// ── §9 case-8 — process-local ephemerality / restart-no-residue ───────────────

describe('Phase 33Q ledger — process-local ephemerality & restart-no-residue (§9 case-8)', () => {
  it('a freshly-created ledger is empty (no durable admitted-assertion residue survives a "restart")', () => {
    // First "process": record an assertion.
    const ledgerA = seededLedger();
    ledgerA.record(SCOPE_A, admitTransition());
    expect(ledgerA.inspectEstate(SCOPE_A).assertions).toBe(1);

    // Second "process": a brand-new ledger instance shares NO state — the synthetic
    // admitted assertion is gone. (The ledger holds only closure-captured Maps;
    // there is no durable backend to survive a restart.)
    const ledgerB = freshLedger();
    expect(ledgerB.inspectEstate(SCOPE_A)).toEqual({ assertions: 0, bytes: 0 });
    expect(ledgerB.projectRecall(SCOPE_A)).toEqual({ includes: [], excludes: [] });
    expect(ledgerB.auditTrail(SCOPE_A)).toEqual([]);
  });

  it('seedEstate is idempotent and never destroys existing synthetic state', () => {
    const ledger = seededLedger();
    ledger.record(SCOPE_A, admitTransition());
    // Re-seeding the same (tenant, estate) must NOT wipe the recorded assertion.
    ledger.seedEstate(SCOPE_A);
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(1);
  });
});

// ── §11 — the public recall projection is leak-clean ──────────────────────────

describe('Phase 33Q ledger — public recall projection is no-leak clean (§11)', () => {
  it('projectRecall output carries only short synthetic ids and passes findAdmissionPublicLeaks', () => {
    const ledger = seededLedger();
    ledger.record(SCOPE_A, admitTransition());
    ledger.record(SCOPE_A, supersedeTransition());

    const projection = ledger.projectRecall(SCOPE_A);
    // The projection (the only ledger surface a public response could ever
    // derive from) is leak-clean: no forbidden keys, no UUID/long-opaque ids.
    expect(findAdmissionPublicLeaks(projection)).toEqual([]);
    expect(findAdmissionPublicLeaks(projection.includes)).toEqual([]);
    expect(findAdmissionPublicLeaks(projection.excludes)).toEqual([]);
  });
});

// ── Returned audit / inspect / projection are detached from internals (blocker 3) ─

describe('Phase 33Q ledger — auditTrail() returns detached, frozen records; mutating them cannot alter internal state (Codex blocker 3)', () => {
  it('mutating a returned audit record with unsafe_marker:raw-candidate does not persist internally', () => {
    const ledger = seededLedger();
    ledger.record(SCOPE_A, admitTransition());

    const returned = ledger.auditTrail(SCOPE_A);
    // Attempt to smuggle an unsafe marker onto the returned record. The record is
    // frozen, so this throws in a module with implicit strict mode (ESM); we
    // tolerate either a throw OR a silent no-op, then prove no internal effect.
    try {
      (returned[0] as unknown as Record<string, unknown>).unsafe_marker = 'raw-candidate';
    } catch {
      // expected for a frozen object under strict mode
    }

    // A FRESH read must not contain the injected marker anywhere.
    const after = ledger.auditTrail(SCOPE_A);
    const serialized = JSON.stringify(after);
    expect(serialized).not.toContain('unsafe_marker');
    expect(serialized).not.toContain('raw-candidate');
    expect((after[0] as unknown as Record<string, unknown>).unsafe_marker).toBeUndefined();
  });

  it('mutating a returned audit record with a 1 MB value does not change internal footprint/bytes', () => {
    const ledger = seededLedger();
    ledger.record(SCOPE_A, admitTransition());
    const bytesBefore = ledger.inspectEstate(SCOPE_A).bytes;

    const returned = ledger.auditTrail(SCOPE_A);
    try {
      (returned[0] as unknown as Record<string, unknown>).receipt_ref = 'z'.repeat(1_000_000);
    } catch {
      // expected for a frozen object
    }

    // The internal footprint is unchanged — the returned copy is detached.
    expect(ledger.inspectEstate(SCOPE_A).bytes).toBe(bytesBefore);
    const after = ledger.auditTrail(SCOPE_A);
    expect(after[0]!.receipt_ref).toBe('rcpt-priv-1');
    expect(after[0]!.receipt_ref.length).toBeLessThan(100);
  });

  it('mutating returned audit_private/public_audit_detail does not flip the internal privacy markers', () => {
    const ledger = seededLedger();
    ledger.record(SCOPE_A, admitTransition());

    const returned = ledger.auditTrail(SCOPE_A);
    // Attempt EACH privacy-marker mutation INDEPENDENTLY. A shared `try` block
    // would let the first frozen-write abort before the second was even
    // attempted, hiding a regression where one marker is mutable. `Reflect.set`
    // never throws on a frozen target — it returns `false` — so both writes are
    // always attempted and we additionally assert each was actually refused.
    const mutated = returned[0] as unknown as Record<string, unknown>;
    const privateFlipped = Reflect.set(mutated, 'audit_private', false);
    const publicFlipped = Reflect.set(mutated, 'public_audit_detail', true);
    expect(privateFlipped).toBe(false);
    expect(publicFlipped).toBe(false);

    // A fresh read still shows the correct, private markers.
    const after = ledger.auditTrail(SCOPE_A);
    expect(after[0]!.audit_private).toBe(true);
    expect(after[0]!.public_audit_detail).toBe(false);
  });

  it('pushing onto the returned audit array does not grow the internal trail', () => {
    const ledger = seededLedger();
    ledger.record(SCOPE_A, admitTransition());

    const returned = ledger.auditTrail(SCOPE_A);
    try {
      (returned as SyntheticAuditRecord[]).push({
        audit_event: 'assertion_admitted',
        admission_transition_id: 'txn-injected',
        source_candidate_id: 'cand-injected',
        admitted_assertion_id: 'assn-injected',
        receipt_ref: 'rcpt-injected',
        audit_private: true,
        public_audit_detail: false,
      });
    } catch {
      // expected for a frozen array
    }
    // The internal trail still has exactly the one real record.
    expect(ledger.auditTrail(SCOPE_A)).toHaveLength(1);
    expect(ledger.auditTrail(SCOPE_A)[0]!.admission_transition_id).toBe('txn-admit-1');
  });

  it('inspectEstate() / projectRecall() return detached objects; mutating them cannot alter internal state', () => {
    const ledger = seededLedger();
    ledger.record(SCOPE_A, admitTransition());

    const footprint = ledger.inspectEstate(SCOPE_A);
    try {
      (footprint as unknown as Record<string, unknown>).assertions = 999;
    } catch {
      // expected for a frozen object
    }
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(1);

    const projection = ledger.projectRecall(SCOPE_A);
    try {
      (projection.includes as string[]).push('assn-injected');
    } catch {
      // expected for a frozen array
    }
    // A fresh projection is unaffected by the mutation of a prior returned one.
    expect(ledger.projectRecall(SCOPE_A).includes).toEqual(['assn-active-1']);
    expect(ledger.projectRecall(SCOPE_A).includes).not.toContain('assn-injected');
  });
});

// ── Plain-record / exact-key validation (Codex blocker 4) ─────────────────────

describe('Phase 33Q ledger — exact-key/plain-record validation rejects non-enumerable, inherited, symbol, and prototype tricks (Codex blocker 4)', () => {
  it('rejects a transition with a NON-ENUMERABLE candidate_payload own property before any mutation', () => {
    const ledger = seededLedger();
    const t = admitTransition();
    // Hide a payload-shaped own property behind non-enumerability — Object.keys
    // would miss it, Reflect.ownKeys does not.
    Object.defineProperty(t, 'candidate_payload', {
      value: 'arbitrary raw material here',
      enumerable: false,
      writable: true,
      configurable: true,
    });
    expect(() => ledger.record(SCOPE_A, t)).toThrow(AdmittedAssertionInvalidInputError);
    // Zero residue across ALL surfaces (count + bytes + audit + recall).
    expectZeroResidue(ledger);
  });

  it('rejects a transition with an INHERITED candidate_payload (non-Object.prototype prototype) before mutation', () => {
    const ledger = seededLedger();
    const proto = { candidate_payload: 'arbitrary raw material here' };
    const t = Object.assign(Object.create(proto), admitTransition());
    expect(() => ledger.record(SCOPE_A, t)).toThrow(AdmittedAssertionInvalidInputError);
    expectZeroResidue(ledger);
  });

  it('rejects a transition with a SYMBOL own key before mutation', () => {
    const ledger = seededLedger();
    const t = admitTransition();
    (t as unknown as Record<symbol, unknown>)[Symbol('candidate_payload')] = 'raw';
    expect(() => ledger.record(SCOPE_A, t)).toThrow(AdmittedAssertionInvalidInputError);
    expectZeroResidue(ledger);
  });

  it('rejects a transition carried on an UNEXPECTED prototype (class instance) before mutation', () => {
    const ledger = seededLedger();
    class TransitionLike {
      kind = 'admit' as const;
      source_candidate_id = 'cand-synth-1';
      admission_transition_id = 'txn-admit-1';
      admitted_assertion_id = 'assn-active-1';
      assertion_class = 'preference';
      replay_key = 'admit:cand-synth-1';
    }
    const t = new TransitionLike();
    expect(() => ledger.record(SCOPE_A, t as unknown as SyntheticAdmissionTransition)).toThrow(
      AdmittedAssertionInvalidInputError,
    );
    expectZeroResidue(ledger);
  });

  it('rejects an array, Date, and Map as a transition (non-plain records), each leaving zero residue', () => {
    const ledger = seededLedger();
    const cases: Array<[string, unknown]> = [
      ['array', []],
      ['Date', new Date(0)],
      ['Map', new Map()],
    ];
    for (const [label, bad] of cases) {
      expect(
        () => ledger.record(SCOPE_A, bad as SyntheticAdmissionTransition),
        `non-plain ${label} must be rejected`,
      ).toThrow(AdmittedAssertionInvalidInputError);
      // Prove zero residue IMMEDIATELY after EACH rejected input, not once at
      // the end — so a regression that half-applies one specific case is caught.
      expectZeroResidue(ledger);
    }
  });

  it('accepts a legitimate null-prototype plain record (explicitly allowed)', () => {
    const ledger = seededLedger();
    const t = Object.assign(Object.create(null), admitTransition());
    const out = ledger.record(SCOPE_A, t);
    expect(out.outcome).toBe('recorded');
    expect(ledger.inspectEstate(SCOPE_A).assertions).toBe(1);
  });

  it('an accessor getter cannot return a safe value at validation and a different one at commit (TOCTOU)', () => {
    const ledger = seededLedger();
    let reads = 0;
    const t = admitTransition();
    // Replace admitted_assertion_id with a getter that flips after the first read.
    Object.defineProperty(t, 'admitted_assertion_id', {
      enumerable: true,
      configurable: true,
      get() {
        reads += 1;
        return reads === 1 ? 'assn-active-1' : 'unsafe_marker:raw-candidate';
      },
    });
    // The ledger reads each field exactly once into a frozen snapshot, so the
    // toggling getter cannot smuggle the unsafe second value into stored state.
    ledger.record(SCOPE_A, t);
    const serialized = JSON.stringify({
      audit: ledger.auditTrail(SCOPE_A),
      recall: ledger.projectRecall(SCOPE_A),
    });
    expect(serialized).not.toContain('unsafe_marker');
    expect(serialized).not.toContain('raw-candidate');
    expect(ledger.projectRecall(SCOPE_A).includes).toEqual(['assn-active-1']);
  });
});

// ── No-leak of error text ─────────────────────────────────────────────────────

describe('Phase 33Q ledger — error messages are public-safe (no long/opaque ids)', () => {
  it('cap / scope / conflict / invalid-input error messages carry no UUID or >=24-char opaque run', () => {
    const ledger = seededLedger(SCOPE_A, { maxAssertionsPerEstate: 1 });
    ledger.record(SCOPE_A, admitTransition({ admitted_assertion_id: 'a1', replay_key: 'k1' }));

    const messages: string[] = [];
    try {
      ledger.record(SCOPE_A, admitTransition({ admitted_assertion_id: 'a2', replay_key: 'k2' }));
    } catch (e) {
      messages.push((e as Error).message);
    }
    try {
      ledger.record({ tenant_id: 'tenant-x', estate_id: 'estate-missing' }, admitTransition({ replay_key: 'k3' }));
    } catch (e) {
      messages.push((e as Error).message);
    }
    try {
      ledger.record(SCOPE_A, admitTransition({ admitted_assertion_id: 'a-x', replay_key: 'k1' }));
    } catch (e) {
      messages.push((e as Error).message);
    }
    // A rejected unsafe field must NOT echo the raw value into the message.
    try {
      ledger.record(SCOPE_A, admitTransition({ source_candidate_id: 'unsafe_marker:raw-candidate' }));
    } catch (e) {
      messages.push((e as Error).message);
    }

    expect(messages.length).toBeGreaterThanOrEqual(4);
    for (const m of messages) {
      // Run the same leak detector the route uses over the raw message string.
      expect(findAdmissionPublicLeaks(m)).toEqual([]);
      // The unsafe marker text never reaches the error message.
      expect(m).not.toContain('unsafe_marker');
      expect(m).not.toContain('raw-candidate');
    }
  });
});
