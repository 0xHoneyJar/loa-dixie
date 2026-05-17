import { describe, expect, it } from 'vitest';
import {
  relayAuditChainLookup,
  relayEstateSummary,
  relayExclusionDisplay,
  relayProvenanceWalk,
  relayReceiptRetrieval,
  relayRecallIntake,
} from '../../../src/services/straylight-host/refusal-passthrough.js';
import type {
  AuditChainLookupResponse,
  AuditEvent,
  EstateSummaryCounts,
  EstateSummaryResponse,
  ExclusionDisplayResponse,
  ProvenanceEntry,
  ProvenanceWalkResponse,
  ReceiptRetrievalResponse,
  RecallIntakeResponse,
  RecallPack,
  RecallReceipt,
} from '@loa/straylight/host';

describe('relayRecallIntake', () => {
  it('returns a deep-equal unchanged served response', () => {
    const response: RecallIntakeResponse = {
      outcome: 'served',
      pack: { opaque: 'wedge-pack' } as unknown as RecallPack,
      receipt: { opaque: 'wedge-receipt' } as unknown as RecallReceipt,
      audit_event_id: 'ae-1',
    };
    const before = structuredClone(response);
    const out = relayRecallIntake(response);
    expect(out).toEqual(before);
    expect(response).toEqual(before);
  });

  it('preserves typed denied reasons verbatim', () => {
    const response: RecallIntakeResponse = {
      outcome: 'denied',
      reason: 'cross_tenant_recall_refused',
      raw_reasons: ['caller_tenant != target_tenant'],
      intake_log_entry_id: 'idlog_deadbeef',
    };
    const out = relayRecallIntake(response);
    expect(out).toEqual(response);
    if (out.outcome === 'denied') {
      expect(out.reason).toBe('cross_tenant_recall_refused');
    } else {
      throw new Error('discriminant was rewritten');
    }
  });

  it('preserves needs_review discriminant verbatim', () => {
    const response: RecallIntakeResponse = {
      outcome: 'needs_review',
      review_queue_id: 'rq-1',
      raw_reasons: ['policy_review_pending'],
    };
    const out = relayRecallIntake(response);
    expect(out.outcome).toBe('needs_review');
    expect(out).toEqual(response);
  });
});

describe('relayReceiptRetrieval', () => {
  it('returns a deep-equal unchanged found response', () => {
    const response: ReceiptRetrievalResponse = {
      outcome: 'found',
      receipt: { opaque: 'wedge-receipt' } as unknown as RecallReceipt,
    };
    const before = structuredClone(response);
    const out = relayReceiptRetrieval(response);
    expect(out).toEqual(before);
    expect(response).toEqual(before);
  });

  it('preserves typed not_found reasons verbatim', () => {
    const reasons: Array<
      Extract<ReceiptRetrievalResponse, { outcome: 'not_found' }>['reason']
    > = [
      'unknown_receipt_id',
      'cross_tenant_refused',
      'storage_unavailable',
      'tenant_resolution_failed',
    ];
    for (const reason of reasons) {
      const response: ReceiptRetrievalResponse = { outcome: 'not_found', reason };
      const out = relayReceiptRetrieval(response);
      expect(out).toEqual(response);
      if (out.outcome === 'not_found') {
        expect(out.reason).toBe(reason);
      } else {
        throw new Error('discriminant was rewritten');
      }
    }
  });
});

describe('relayExclusionDisplay', () => {
  it('returns a deep-equal unchanged response and does not mutate', () => {
    const response: ExclusionDisplayResponse = {
      excluded_aggregates: [
        { category: 'excluded', raw_reason: 'class_unsupported', count: 2 },
        { category: 'blocked-by-policy', raw_reason: 'policy_X', count: 1 },
      ],
      redacted_aggregates: [{ category: 'redacted', raw_reason: 'pii_field', count: 3 }],
      marked: [
        {
          assertion_id: 'a-1',
          assertion_class: 'observation',
          status: 'active',
          category: 'challenged',
          raw_reason: 'contested_by_b',
        },
      ],
    };
    const before = structuredClone(response);
    const out = relayExclusionDisplay(response);
    expect(out).toEqual(before);
    expect(response).toEqual(before);
  });
});

describe('relayProvenanceWalk', () => {
  it('returns a deep-equal unchanged walked response', () => {
    const response: ProvenanceWalkResponse = {
      outcome: 'walked',
      provenance: [
        { opaque: 'entry-1' } as unknown as ProvenanceEntry,
        { opaque: 'entry-2' } as unknown as ProvenanceEntry,
      ],
    };
    const before = structuredClone(response);
    const out = relayProvenanceWalk(response);
    expect(out).toEqual(before);
    expect(response).toEqual(before);
  });

  it('preserves typed refused reasons verbatim', () => {
    const reasons: Array<
      Extract<ProvenanceWalkResponse, { outcome: 'refused' }>['reason']
    > = [
      'privacy_scope_refusal',
      'cross_tenant_refused',
      'unknown_assertion',
      'storage_unavailable',
      'tenant_resolution_failed',
      'frame_unsupported',
    ];
    for (const reason of reasons) {
      const response: ProvenanceWalkResponse = { outcome: 'refused', reason };
      const out = relayProvenanceWalk(response);
      expect(out).toEqual(response);
      if (out.outcome === 'refused') {
        expect(out.reason).toBe(reason);
      } else {
        throw new Error('discriminant was rewritten');
      }
    }
  });
});

describe('relayAuditChainLookup', () => {
  it('returns a deep-equal unchanged verified response', () => {
    const response: AuditChainLookupResponse = {
      outcome: 'verified',
      events: [
        { opaque: 'ev-1' } as unknown as AuditEvent,
        { opaque: 'ev-2' } as unknown as AuditEvent,
      ],
      chain_status: 'ok',
    };
    const before = structuredClone(response);
    const out = relayAuditChainLookup(response);
    expect(out).toEqual(before);
    expect(response).toEqual(before);
  });

  it('preserves broken outcome with break metadata verbatim', () => {
    const response: AuditChainLookupResponse = {
      outcome: 'broken',
      events: [{ opaque: 'ev-1' } as unknown as AuditEvent],
      chain_status: 'broken',
      break_index: 0,
      break_reason: 'hash_mismatch',
    };
    const out = relayAuditChainLookup(response);
    expect(out).toEqual(response);
    if (out.outcome === 'broken') {
      expect(out.break_index).toBe(0);
      expect(out.break_reason).toBe('hash_mismatch');
    } else {
      throw new Error('discriminant was rewritten');
    }
  });

  it('preserves typed refused reasons verbatim', () => {
    const reasons: Array<
      Extract<AuditChainLookupResponse, { outcome: 'refused' }>['reason']
    > = [
      'cross_tenant_refused',
      'unknown_estate',
      'storage_unavailable',
      'tenant_resolution_failed',
    ];
    for (const reason of reasons) {
      const response: AuditChainLookupResponse = { outcome: 'refused', reason };
      const out = relayAuditChainLookup(response);
      expect(out).toEqual(response);
      if (out.outcome === 'refused') {
        expect(out.reason).toBe(reason);
      } else {
        throw new Error('discriminant was rewritten');
      }
    }
  });
});

describe('relayEstateSummary', () => {
  it('returns a deep-equal unchanged summarized response', () => {
    const response: EstateSummaryResponse = {
      outcome: 'summarized',
      actor_id: 'actor-1',
      estate_id: 'estate-1',
      counts: {
        by_class: { observation: 5, claim: 2 },
        by_status: { active: 7 } as EstateSummaryCounts['by_status'],
        by_privacy_scope: { actor_private: 3, public_discord: 4 },
        by_risk_level: { low: 5, medium: 2 } as EstateSummaryCounts['by_risk_level'],
        _widened_privacy_scope: {
          public: 1,
          tenant: 2,
          actor_private: 3,
          sealed: 1,
        },
      },
    };
    const before = structuredClone(response);
    const out = relayEstateSummary(response);
    expect(out).toEqual(before);
    expect(response).toEqual(before);
  });

  it('preserves typed refused reasons verbatim', () => {
    const reasons: Array<
      Extract<EstateSummaryResponse, { outcome: 'refused' }>['reason']
    > = [
      'cross_tenant_refused',
      'unknown_estate',
      'privacy_scope_refusal',
      'storage_unavailable',
      'tenant_resolution_failed',
      'frame_unsupported',
    ];
    for (const reason of reasons) {
      const response: EstateSummaryResponse = { outcome: 'refused', reason };
      const out = relayEstateSummary(response);
      expect(out).toEqual(response);
      if (out.outcome === 'refused') {
        expect(out.reason).toBe(reason);
      } else {
        throw new Error('discriminant was rewritten');
      }
    }
  });
});
