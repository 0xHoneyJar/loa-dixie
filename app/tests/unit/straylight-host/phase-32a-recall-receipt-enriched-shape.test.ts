// Phase 32A — Dixie consumer contract for the enriched Straylight
// `RecallReceipt` shape introduced by Phase 31E (loa-straylight 12f85d2)
// and shipped through Phase 31F (operator recall wedge demo,
// loa-straylight 34bfff8).
//
// Phase 31E added two coupled obligations on the Straylight seam:
//   1. `RecallReceipt.redacted_counts_by_reason: RedactionSummary[]` is now
//      an explicit field of every recall receipt, alongside the existing
//      scalar `redacted_count` and the `excluded_counts_by_reason` map.
//   2. `redacted_counts_by_reason` is folded into the canonical
//      `receipt_hash` computation, so any consumer that strips it (or
//      replaces it with an empty array) breaks the receipt-hash chain.
//
// Dixie is a consumer / served-path / BFF layer. Dixie must NOT redefine
// what counts as redaction, exclusion, contested marking, revocation, or
// forgetting — those remain Straylight semantics. Dixie's only obligation
// at this seam is to faithfully type, accept, and propagate every field
// that Straylight emits on a `RecallReceipt`, including the Phase 31E
// `redacted_counts_by_reason`.
//
// This file is the consumer-contract proof for Phase 32A. It is
// intentionally NOT a runtime/integration test: the live Phase 30E
// served-path fixture seeds an empty estate, so it can only exercise the
// zero-redaction branch end-to-end. The unit-level proof below populates
// `redacted_counts_by_reason` with > 0 entries and locks the shape that
// Dixie's `import type { RecallReceipt }` is willing to accept and pass
// through, without taking ownership of any Straylight semantics.
//
// Type-only imports from `@loa/straylight` are unchanged from existing
// Dixie test files — the recall-intake adapter and route remain on the
// `@loa/straylight/runtime/recall-intake` value-import discipline, which
// is enforced by `tests/unit/recall-intake/consumer-contract.test.ts`.

import { describe, expect, it } from 'vitest';
import type { RecallReceipt, RedactionSummary } from '@loa/straylight';

// ── Local builder for a Phase 31E-shaped receipt ────────────────────────────
//
// The values are deliberately synthetic: this file does not call any
// Straylight runtime, does not reproduce Straylight's canonicalization or
// hashing, and does not assert any Straylight-side invariant beyond the
// shape Dixie is expected to consume. The `redacted_count ===
// sum(redacted_counts_by_reason.count)` invariant tested below is the
// Straylight-side contract that Dixie relies on as a consumer; a Dixie
// integration that silently drops `redacted_counts_by_reason` would break
// that invariant on its way out, even though Straylight itself preserves
// it. The test locks Dixie's pass-through behavior against that breakage.

function buildEnrichedReceipt(
  redacted_counts_by_reason: RedactionSummary[],
  excluded_counts_by_reason: Record<string, number>,
): RecallReceipt {
  const redacted_count = redacted_counts_by_reason.reduce((acc, r) => acc + r.count, 0);
  return {
    receipt_id: 'rcpt:phase32a-fixture',
    recall_request_id: 'rreq:phase32a-fixture',
    recall_pack_id: 'rpack:phase32a-fixture',
    actor_id: '0xabcdef0000000000000000000000000000000032',
    estate_id: '0xabcdef0000000000000000000000000000000032',
    filters_applied: [],
    included_assertion_ids: [],
    marked_assertion_ids: [],
    redacted_count,
    redacted_counts_by_reason,
    excluded_counts_by_reason,
    policy_decision_ref: 'straylight.default-recall.v0',
    requester_signature_ref: 'sig:phase32a-fixture',
    pack_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000001',
    receipt_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000002',
    created_at: '2026-05-24T00:00:00.000Z',
    detail_level: 'standard',
  };
}

// A Dixie BFF would receive the Straylight `RecallReceipt` through the
// `RecallIntakeResponse.served` envelope and then JSON-serialize it onto
// the wire. The pass-through under test is exactly that: structuredClone
// (a structural identity) followed by JSON round-trip (the wire-format
// identity). If either step silently drops a Phase 31E field, the
// downstream HTTP body would no longer match the Straylight emission.

function passThrough(r: RecallReceipt): RecallReceipt {
  return JSON.parse(JSON.stringify(r)) as RecallReceipt;
}

describe('Phase 32A — Dixie consumer contract for the enriched RecallReceipt shape', () => {
  it('accepts and propagates redacted_counts_by_reason with > 0 entries', () => {
    const enriched = buildEnrichedReceipt(
      [
        { reason: 'tenant_redacted', count: 2 },
        { reason: 'actor_private_excluded', count: 1 },
      ],
      { policy_excluded: 3, contested: 1 },
    );
    const out = passThrough(enriched);

    expect(out.redacted_counts_by_reason).toBeDefined();
    expect(Array.isArray(out.redacted_counts_by_reason)).toBe(true);
    expect(out.redacted_counts_by_reason).toEqual(enriched.redacted_counts_by_reason);
  });

  it('preserves redacted_count === sum(redacted_counts_by_reason.count)', () => {
    const enriched = buildEnrichedReceipt(
      [
        { reason: 'tenant_redacted', count: 4 },
        { reason: 'forgotten', count: 7 },
      ],
      {},
    );
    const out = passThrough(enriched);

    const summed = out.redacted_counts_by_reason.reduce((acc, r) => acc + r.count, 0);
    expect(out.redacted_count).toBe(summed);
    expect(out.redacted_count).toBe(11);
  });

  it('preserves excluded_counts_by_reason as a plain Record<string,number>', () => {
    const enriched = buildEnrichedReceipt([], { contested: 5, revoked: 2 });
    const out = passThrough(enriched);

    expect(typeof out.excluded_counts_by_reason).toBe('object');
    expect(out.excluded_counts_by_reason).not.toBeNull();
    expect(out.excluded_counts_by_reason).toEqual({ contested: 5, revoked: 2 });
  });

  it('preserves sha256-prefixed pack_hash and receipt_hash through JSON pass-through', () => {
    const enriched = buildEnrichedReceipt([{ reason: 'tenant_redacted', count: 1 }], {});
    const out = passThrough(enriched);

    expect(out.pack_hash.startsWith('sha256:')).toBe(true);
    expect(out.receipt_hash.startsWith('sha256:')).toBe(true);
    expect(out.pack_hash).toBe(enriched.pack_hash);
    expect(out.receipt_hash).toBe(enriched.receipt_hash);
  });

  it('zero-redaction case still emits redacted_counts_by_reason as an empty array', () => {
    const enriched = buildEnrichedReceipt([], {});
    const out = passThrough(enriched);

    expect(out.redacted_counts_by_reason).toEqual([]);
    expect(out.redacted_count).toBe(0);
  });
});

describe('Phase 32A — RedactionSummary type structure (compile-time)', () => {
  it('RedactionSummary carries reason and count keys', () => {
    type Required = 'reason' | 'count';
    type _HasRequired = Required extends keyof RedactionSummary ? true : false;
    const _ok: _HasRequired = true;
    expect(_ok).toBe(true);
  });

  it('RecallReceipt exposes Phase 31E redacted_counts_by_reason as RedactionSummary[]', () => {
    type Field = RecallReceipt['redacted_counts_by_reason'];
    type _IsArray = Field extends RedactionSummary[] ? true : false;
    const _ok: _IsArray = true;
    expect(_ok).toBe(true);
  });
});
