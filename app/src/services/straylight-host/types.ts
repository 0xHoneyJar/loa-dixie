// Straylight recall-host wire contract — Dixie-local mirror.
//
// Source of truth: `loa-straylight/src/straylight/host/types.ts`. This file
// is a pre-consumption mirror that exists only until a future
// dependency-wiring PR can replace it with
// `import type { ... } from '@loa/straylight/host'`.
//
// Straylight is currently private / TS-source-only / no dist / no exports map
// / no published release tag for Dixie consumption, and Dixie's
// `@0xhoneyjar/loa-hounfour` pin (v8.3.1) cannot satisfy Straylight's
// `^8.6.0` peer requirement without a separate Hounfour-skew resolution
// that is out of scope for this slice.
//
// This mirror MUST NOT become Dixie's canonical Straylight schema
// authority. Wedge-owned payloads (`RecallPack`, `RecallReceipt`,
// `AuditEvent`, provenance entries, and the privacy/risk/status enums) are
// carried as opaque or minimal structural shapes so the mirror cannot drift
// into a competing schema. Anything Dixie surfaces back to a caller is
// produced upstream by Straylight; Dixie relays.

// ─── Host frame & caller envelope ────────────────────────────────────────────

/**
 * Host-facing environment frame. Narrower than the wedge's
 * `EnvironmentFrame` by design — the host surfaces in scope are limited to
 * these two frames per the recall-host MVP contract. Any other frame value
 * MUST be refused at the host layer (`frame_unsupported`).
 */
export type HostFrame = 'actor_private' | 'public_discord';

export interface HostCaller {
  tenant_id: string;
  actor_id: string;
  session_id?: string;
  /** Required for Surfaces 4 and 6; optional/unused for Surfaces 1, 2, 3, 5. */
  frame?: HostFrame;
}

// ─── Closed enums surfaced by host outcomes ──────────────────────────────────

/** Six-category receipt vocabulary pinned by ADR-020D §6. */
export type ExclusionReason =
  | 'included'
  | 'excluded'
  | 'redacted'
  | 'challenged'
  | 'revoked'
  | 'blocked-by-policy';

/**
 * Closed enum of denial reasons surfaced on Surface 1. Every value is
 * derived from a wedge outcome (class_validation, policy_decision, recall
 * denial) or a host-layer intake refusal (cross-tenant, frame_unsupported).
 * Dixie never invents a denial reason; it relays whichever value Straylight
 * (or the host-layer refusal) emits.
 */
export type DeniedReason =
  | 'class_validation_failed'
  | 'policy_unavailable'
  | 'signer_not_competent'
  | 'cross_tenant_recall_refused'
  | 'storage_unavailable'
  | 'blocked_by_policy'
  | 'privacy_scope_refusal'
  | 'frame_unsupported'
  | 'tenant_resolution_failed';

// ─── Surface 1 — Recall intake response ──────────────────────────────────────

export type RecallIntakeResponse =
  | {
      outcome: 'served';
      // Wedge-owned RecallPack / RecallReceipt. Carried as opaque payloads;
      // Dixie does NOT produce, validate, or reinterpret these objects.
      pack: unknown;
      receipt: unknown;
      audit_event_id?: string;
    }
  | {
      outcome: 'denied';
      reason: DeniedReason;
      raw_reasons: string[];
      audit_event_id?: string;
      intake_log_entry_id?: string;
    }
  | {
      outcome: 'needs_review';
      review_queue_id: string;
      raw_reasons: string[];
      audit_event_id?: string;
    };

// ─── Surface 2 — Receipt retrieval response ──────────────────────────────────

export type ReceiptRetrievalResponse =
  | { outcome: 'found'; receipt: unknown }
  | {
      outcome: 'not_found';
      reason:
        | 'unknown_receipt_id'
        | 'cross_tenant_refused'
        | 'storage_unavailable'
        | 'tenant_resolution_failed';
    };

// ─── Surface 3 — Excluded-assertion reason display ───────────────────────────

export interface ExclusionAggregate {
  category: ExclusionReason;
  raw_reason: string;
  count: number;
}

export interface RedactionAggregate {
  category: 'redacted';
  raw_reason: string;
  count: number;
}

export interface MarkedItemDisplay {
  assertion_id: string;
  /** Wedge-owned class taxonomy; carried as opaque string. */
  assertion_class: string;
  /** Wedge-owned status taxonomy; carried as opaque string. */
  status: string;
  category: ExclusionReason;
  raw_reason: string;
}

export interface ExclusionDisplayResponse {
  excluded_aggregates: ExclusionAggregate[];
  redacted_aggregates: RedactionAggregate[];
  marked: MarkedItemDisplay[];
}

// ─── Surface 4 — Provenance walk response ────────────────────────────────────

export type ProvenanceWalkResponse =
  | {
      outcome: 'walked';
      // Wedge-owned provenance entries. Carried as opaque payload; Dixie
      // relays the array verbatim and does not reinterpret entries.
      provenance: unknown[];
    }
  | {
      outcome: 'refused';
      reason:
        | 'privacy_scope_refusal'
        | 'cross_tenant_refused'
        | 'unknown_assertion'
        | 'storage_unavailable'
        | 'tenant_resolution_failed'
        | 'frame_unsupported';
    };

// ─── Surface 5 — Audit-chain lookup response ─────────────────────────────────

export type AuditChainLookupResponse =
  | {
      outcome: 'verified';
      // Wedge-owned AuditEvent[]. Carried as opaque payload; Dixie does NOT
      // synthesise audit-chain truth and does NOT verify chain links.
      events: unknown[];
      chain_status: 'ok';
    }
  | {
      outcome: 'broken';
      events: unknown[];
      chain_status: 'broken';
      break_index: number;
      break_reason: string;
    }
  | {
      outcome: 'refused';
      reason:
        | 'cross_tenant_refused'
        | 'unknown_estate'
        | 'storage_unavailable'
        | 'tenant_resolution_failed';
    };

// ─── Surface 6 — Estate summary ──────────────────────────────────────────────

export interface EstateSummaryCounts {
  /** Wedge-owned `AssertionClass` keyspace; carried as Record<string, number>. */
  by_class: Record<string, number>;
  /** Wedge-owned `AssertionStatus` keyspace; carried as Record<string, number>. */
  by_status: Record<string, number>;
  /**
   * Spec 2-key shape. Frame discipline applied upstream by Straylight:
   * when caller.frame is `public_discord`, the `actor_private` count is
   * zeroed out. The widened map below still surfaces the raw counts for
   * traceability.
   */
  by_privacy_scope: { actor_private: number; public_discord: number };
  /** Wedge-owned `RiskLevel` keyspace; carried as Record<string, number>. */
  by_risk_level: Record<string, number>;
  /**
   * Widened 4-key map mirroring the wedge's `PrivacyScope` enum. Frame
   * discipline does NOT apply here; this is the raw bucket count and
   * exists for trace/debug only. Host consumers MUST prefer
   * `by_privacy_scope` for operator-facing render.
   */
  _widened_privacy_scope: {
    public: number;
    tenant: number;
    actor_private: number;
    sealed: number;
  };
}

export type EstateSummaryResponse =
  | {
      outcome: 'summarized';
      actor_id: string;
      estate_id: string;
      counts: EstateSummaryCounts;
    }
  | {
      outcome: 'refused';
      reason:
        | 'cross_tenant_refused'
        | 'unknown_estate'
        | 'privacy_scope_refusal'
        | 'storage_unavailable'
        | 'tenant_resolution_failed'
        | 'frame_unsupported';
    };
