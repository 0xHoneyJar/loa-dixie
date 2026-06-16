// Phase 33N — runtime no-leak guard. Proves the deep-walk inherits the Phase
// 33L denylist as the runtime baseline (Phase 33M §14): it rejects forbidden
// public keys, forbidden substrings/patterns, UUIDs, and long opaque ids, at
// any depth — and passes clean public-safe bodies.

import { describe, expect, it } from 'vitest';
import {
  findAdmissionPublicLeaks,
  isAdmissionPublicSafe,
  classifyAdmissionSpike,
  buildAdmissionSpikePublicResponse,
  ADMISSION_SPIKE_BODY_MARKER,
  ADMISSION_TRANSITION_INTENTS,
} from '../../../src/services/admission-wedge-spike/index.js';

describe('Phase 33N — findAdmissionPublicLeaks (runtime no-leak baseline)', () => {
  it('passes a clean public-safe body', () => {
    const clean = {
      spike: 'dev_operator_only_non_production',
      outcome_class: 'admitted',
      scenario_id: 'accept_candidate_to_admitted_assertion',
      recall_eligible: true,
      recall_projection: { ordinary_recall_includes: ['admitted_active_assertion_draft_placeholder'], ordinary_recall_excludes: [] },
      public_receipt_ref: 'admission-spike-receipt-draft',
      safe_reason_code: null,
    };
    expect(findAdmissionPublicLeaks(clean)).toEqual([]);
    expect(isAdmissionPublicSafe(clean)).toBe(true);
  });

  describe('rejects forbidden public KEYS at any depth', () => {
    const forbiddenKeys = [
      'tenant_id', 'estate_id', 'candidate_id', 'candidate_payload', 'raw_candidate_payload',
      'source_material', 'raw_reasons', 'policy_reason', 'idempotency_key', 'authority_signature_material',
      'admitted_assertion_id', 'receipt_id', 'audit_receipt_ref', 'token', 'secret', 'storage_internals',
    ];
    for (const key of forbiddenKeys) {
      it(`flags "${key}"`, () => {
        const leaks = findAdmissionPublicLeaks({ outcome_class: 'admitted', nested: { [key]: 'x' } });
        expect(leaks.length).toBeGreaterThan(0);
        expect(leaks.join(' ')).toContain(key);
      });
    }
  });

  it('allows rendered_candidate_payload ONLY as boolean false', () => {
    expect(findAdmissionPublicLeaks({ rendered_candidate_payload: false })).toEqual([]);
    expect(findAdmissionPublicLeaks({ rendered_candidate_payload: 'some text' }).length).toBeGreaterThan(0);
    expect(findAdmissionPublicLeaks({ rendered_candidate_payload: true }).length).toBeGreaterThan(0);
  });

  describe('rejects forbidden value shapes', () => {
    it('UUID', () => {
      expect(findAdmissionPublicLeaks({ x: '550e8400-e29b-41d4-a716-446655440000' }).length).toBeGreaterThan(0);
    });
    it('long opaque run (>=24 chars)', () => {
      expect(findAdmissionPublicLeaks({ x: 'abcdef0123456789abcdef0123456789' }).length).toBeGreaterThan(0);
    });
    it('0x hex address', () => {
      expect(findAdmissionPublicLeaks({ x: '0xabcdef0000000000000000000000000000000001' }).length).toBeGreaterThan(0);
    });
    it('url', () => {
      expect(findAdmissionPublicLeaks({ x: 'see https://example.com/x' }).length).toBeGreaterThan(0);
    });
    it('JWT', () => {
      expect(findAdmissionPublicLeaks({ x: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' }).length).toBeGreaterThan(0);
    });
    it('bearer token', () => {
      expect(findAdmissionPublicLeaks({ x: 'Bearer sometoken' }).length).toBeGreaterThan(0);
    });
    it('stack frame', () => {
      // Matches the Phase 33L `stack-frame` pattern /\bat\s+\/?\S+:\d+:\d+/.
      expect(findAdmissionPublicLeaks({ x: 'at /app/src/foo.ts:12:3' }).length).toBeGreaterThan(0);
    });
    it('internal seam substring', () => {
      expect(findAdmissionPublicLeaks({ x: 'runtime_seam:internal:boom' }).length).toBeGreaterThan(0);
    });
    it('unsafe marker substring', () => {
      expect(findAdmissionPublicLeaks({ x: 'unsafe_marker:danger' }).length).toBeGreaterThan(0);
    });
  });

  it('walks arrays and deeply nested objects', () => {
    const deep = { a: { b: [{ c: { tenant_id: '0xabc' } }] } };
    expect(findAdmissionPublicLeaks(deep).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Phase 46P — runtime forbidden-key parity with the Phase 33L route-contract
// validator (authorized by Phase 46O / PR #160).
// ---------------------------------------------------------------------------
//
// The runtime mirror had drifted to 52 keys while the docs validator's
// FORBIDDEN_PUBLIC_KEYS reached 114 (Phases 33Z + 46J). Phase 46P restores exact
// parity by adding the 62 missing keys. The list below is the documented Phase
// 46O 62-key gap (validator MINUS runtime), COPIED here as a local test fixture —
// the runtime no-leak module exports no key set and the docs validator is never
// imported into runtime, so there is no package/export/config change. Each key
// is proven to FAIL CLOSED when surfaced on a public body; the exact-key
// no-overmatch guards prove the additions do not reject legitimate
// prefix-sharing request draft markers.
describe('Phase 46P — runtime forbidden-key parity (62 mirrored keys fail closed)', () => {
  // The 62 keys Phase 46P mirrored from the validator (25 Phase 33Z + 37 Phase
  // 46J). Copied verbatim from the Phase 46O gap analysis (validator − runtime).
  const PHASE_46P_MIRRORED_KEYS = [
    // Phase 33Z — TransitionReceipt / AuditEvent / signer / metadata key names.
    'receiptId',
    'transition_receipt', 'transitionReceipt',
    'transition_receipt_ref', 'transitionReceiptRef',
    'transition_id', 'transitionId',
    'audit_event', 'auditEvent',
    'audit_event_class', 'auditEventClass',
    'audit_ref', 'auditRef',
    'audit_id', 'auditId',
    'receipt_ref', 'receiptRef',
    'private_receipt_ref', 'privateReceiptRef',
    'signer', 'signature',
    'policy_details', 'policyDetails',
    'metadata',
    'receipt_public_ref',
    // Phase 46J — canonical ref/hash + consent/auth key-name family.
    'supersedes_refs', 'supersedesRefs',
    'linked_assertion_refs', 'linkedAssertionRefs',
    'signer_refs', 'signerRefs',
    'audit_event_ref', 'auditEventRef',
    'receipt_hash', 'receiptHash',
    'audit_hash', 'auditHash',
    'previous_audit_hash', 'previousAuditHash',
    'policy_decision_ref', 'policyDecisionRef',
    'assertion_refs', 'assertionRefs',
    'target_refs', 'targetRefs',
    'subject_refs', 'subjectRefs',
    'consent',
    'consent_ref', 'consentRef',
    'consent_proof', 'consentProof',
    'consent_receipt', 'consentReceipt',
    'consent_subject', 'consentSubject',
    'consent_grantor', 'consentGrantor',
    'consent_scope', 'consentScope',
    'auth_decision', 'authDecision',
  ];

  it('the mirrored gap fixture is exactly the documented 62 keys (25 + 37), no dupes', () => {
    expect(PHASE_46P_MIRRORED_KEYS).toHaveLength(62);
    expect(new Set(PHASE_46P_MIRRORED_KEYS).size).toBe(62);
  });

  describe('every newly mirrored key fails closed on the public surface', () => {
    // Exhaustive, mechanically verified coverage over the entire mirrored set.
    // A short, safe-LOOKING value is used so the finding is attributable to the
    // KEY-NAME check (Set.has), not to a value-pattern / UUID / opaque-run wall.
    for (const key of PHASE_46P_MIRRORED_KEYS) {
      it(`flags "${key}" on the public surface (top-level)`, () => {
        const leaks = findAdmissionPublicLeaks({ outcome_class: 'admitted', [key]: 'safe_draft' });
        expect(leaks.length).toBeGreaterThan(0);
        expect(leaks.join(' ')).toContain(`forbidden public key "${key}"`);
        expect(isAdmissionPublicSafe({ [key]: 'safe_draft' })).toBe(false);
      });

      it(`flags "${key}" nested at any depth`, () => {
        const deep = { spike: 'dev_operator_only_non_production', a: { b: [{ c: { [key]: 'safe_draft' } }] } };
        const leaks = findAdmissionPublicLeaks(deep);
        expect(leaks.length).toBeGreaterThan(0);
        expect(leaks.join(' ')).toContain(`forbidden public key "${key}"`);
      });
    }
  });

  describe('exact-key matching: legitimate prefix-sharing draft markers are NOT over-matched', () => {
    // These request draft markers SHARE a prefix with a newly mirrored bare key
    // (`consent` / `auth_decision`) but are not exact matches, so they must stay
    // allowed. Values are public-safe draft markers.
    const ALLOWED_PREFIX_SHARING_KEYS: Record<string, string> = {
      consent_assumption: 'draft_non_implemented',
      consent_scope_assumption: 'draft_non_implemented',
      consent_note_draft: 'dev_only_marker_draft',
      auth_assumption: 'draft_non_implemented',
    };
    for (const [key, value] of Object.entries(ALLOWED_PREFIX_SHARING_KEYS)) {
      it(`allows "${key}" (exact-key, not over-matched)`, () => {
        expect(findAdmissionPublicLeaks({ [key]: value })).toEqual([]);
        expect(isAdmissionPublicSafe({ [key]: value })).toBe(true);
      });
    }

    it('allows a request-shaped surface carrying all four prefix-sharing markers at once', () => {
      const requestSurface = {
        route_exists: false,
        storage_assumption: 'draft_no_write_performed',
        ...ALLOWED_PREFIX_SHARING_KEYS,
      };
      expect(findAdmissionPublicLeaks(requestSurface)).toEqual([]);
    });
  });

  describe('public-safe builder output stays clean after the parity hardening', () => {
    // Proves the real public-response builder — which emits a fixed 8-field
    // allowlist — still passes the now-114-key runtime guard for all five
    // scenarios (no false positive from the newly mirrored keys).
    for (const intent of Object.values(ADMISSION_TRANSITION_INTENTS)) {
      it(`scenario intent "${intent}" → clean public body`, () => {
        const c = classifyAdmissionSpike({ spike: ADMISSION_SPIKE_BODY_MARKER, transition_intent: intent });
        const body = buildAdmissionSpikePublicResponse(c);
        expect(findAdmissionPublicLeaks(body)).toEqual([]);
        expect(isAdmissionPublicSafe(body)).toBe(true);
      });
    }
  });
});
