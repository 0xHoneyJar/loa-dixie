// Phase 33N — runtime no-leak guard. Proves the deep-walk inherits the Phase
// 33L denylist as the runtime baseline (Phase 33M §14): it rejects forbidden
// public keys, forbidden substrings/patterns, UUIDs, and long opaque ids, at
// any depth — and passes clean public-safe bodies.

import { describe, expect, it } from 'vitest';
import { findAdmissionPublicLeaks, isAdmissionPublicSafe } from '../../../src/services/admission-wedge-spike/index.js';

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
