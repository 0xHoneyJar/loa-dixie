// ADR-026D §4.a–§4.g; §5.e: each refusal class has a documented HTTP
// status, body shape, and audit emission.

import { describe, expect, it } from 'vitest';
import {
  ingressRefusal,
  guardRefusal,
  mapSeamResponseToRefusal,
} from '../../../src/services/straylight-recall-intake/index.js';
import type { RecallIntakeResponse } from '@loa/straylight/host';

describe('ingressRefusal', () => {
  it('payload_too_large → 413', () => {
    const r = ingressRefusal('ingress.payload_too_large', 'big', { tenant_id: 'w' });
    expect(r.http_status).toBe(413);
    expect(r.body.error).toBe('ingress.payload_too_large');
    expect(r.audit.refusal_class).toBe('ingress.payload_too_large');
  });
  it('rate_limited → 429', () => {
    const r = ingressRefusal('ingress.rate_limited', 'rl', { tenant_id: 'w' });
    expect(r.http_status).toBe(429);
  });
  it('cross_tenant_body_mismatch → 403', () => {
    const r = ingressRefusal('ingress.cross_tenant_body_mismatch', 'mismatch', { tenant_id: 'w' });
    expect(r.http_status).toBe(403);
  });
  it('unauthenticated → 401', () => {
    const r = ingressRefusal('ingress.unauthenticated', 'no auth', {});
    expect(r.http_status).toBe(401);
  });
  it('missing_idempotency_key → 400', () => {
    const r = ingressRefusal('ingress.missing_idempotency_key', 'no key', { tenant_id: 'w' });
    expect(r.http_status).toBe(400);
  });
});

describe('guardRefusal', () => {
  it('tenant_assertion_cap → 503 with audit', () => {
    const r = guardRefusal('guard.tenant_assertion_cap', 'cap', { tenant_id: 'w' });
    expect(r.http_status).toBe(503);
    expect(r.audit.refusal_class).toBe('guard.tenant_assertion_cap');
  });
  it('tenant_byte_budget → 503', () => {
    const r = guardRefusal('guard.tenant_byte_budget', 'byte', { tenant_id: 'w' });
    expect(r.http_status).toBe(503);
  });
});

describe('mapSeamResponseToRefusal — runtime_seam codes', () => {
  it('capability_unrecognized → seam.capability_unrecognized 503 (ADR-026D §4.c)', () => {
    const resp: RecallIntakeResponse = {
      outcome: 'denied',
      reason: 'storage_unavailable',
      raw_reasons: ['runtime_seam:capability_unrecognized'],
    };
    const r = mapSeamResponseToRefusal(resp, { tenant_id: 'w' })!;
    expect(r.http_status).toBe(503);
    expect(r.body.error).toBe('seam.capability_unrecognized');
  });
  it('proof_invalid → seam.proof_invalid 503 (ADR-026D §4.b)', () => {
    const resp: RecallIntakeResponse = {
      outcome: 'denied',
      reason: 'storage_unavailable',
      raw_reasons: ['runtime_seam:proof_invalid'],
    };
    const r = mapSeamResponseToRefusal(resp, {})!;
    expect(r.body.error).toBe('seam.proof_invalid');
  });
});

describe('mapSeamResponseToRefusal — host denial reasons', () => {
  it('cross_tenant_recall_refused → 403 (ADR-026D §4.g)', () => {
    const resp: RecallIntakeResponse = {
      outcome: 'denied',
      reason: 'cross_tenant_recall_refused',
      raw_reasons: ['caller:cross_tenant'],
    };
    const r = mapSeamResponseToRefusal(resp, { tenant_id: 'w' })!;
    expect(r.http_status).toBe(403);
    expect(r.body.error).toBe('seam.cross_tenant_recall_refused');
  });
  it('frame_unsupported → 400 (ADR-026D §4.f)', () => {
    const resp: RecallIntakeResponse = {
      outcome: 'denied',
      reason: 'frame_unsupported',
      raw_reasons: [],
    };
    const r = mapSeamResponseToRefusal(resp, {})!;
    expect(r.http_status).toBe(400);
    expect(r.body.error).toBe('seam.frame_unsupported');
  });
  it('class_validation_failed → 400', () => {
    const resp: RecallIntakeResponse = {
      outcome: 'denied',
      reason: 'class_validation_failed',
      raw_reasons: ['class:bad'],
    };
    const r = mapSeamResponseToRefusal(resp, {})!;
    expect(r.http_status).toBe(400);
  });
});

describe('mapSeamResponseToRefusal — Phase 32K storage/internal-seam sanitization', () => {
  // Producer (A): unseeded tenant. The Straylight host try/catch coerces the
  // bounded store's getKeyring() throw into reason:'storage_unavailable'
  // with raw_reasons:[err.message], where err.message carries the bounded-
  // store implementation text AND the raw tenant id. The PUBLIC body must
  // not forward it; the internal audit object must retain it.
  it('storage_unavailable: omits raw_reasons from the PUBLIC body but retains them on audit', () => {
    const leakyMessage =
      'bounded-estate-store: no slot for tenant 0xabcdef0000000000000000000000000000000099';
    const resp: RecallIntakeResponse = {
      outcome: 'denied',
      reason: 'storage_unavailable',
      raw_reasons: [leakyMessage],
      intake_log_entry_id: 'idlog_x',
    };
    const r = mapSeamResponseToRefusal(resp, { tenant_id: 'w', caller_actor_id: 'w' })!;
    expect(r.http_status).toBe(503);
    expect(r.body.error).toBe('seam.storage_unavailable');
    expect(r.body.outcome).toBe('denied');

    // PUBLIC body: no raw_reasons key, no leaky message text anywhere.
    expect(r.body.raw_reasons).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(r.body, 'raw_reasons')).toBe(false);
    expect(JSON.stringify(r.body)).not.toContain('bounded-estate-store');
    expect(JSON.stringify(r.body)).not.toContain('no slot for tenant');
    expect(JSON.stringify(r.body)).not.toContain(
      '0xabcdef0000000000000000000000000000000099',
    );
    // Message is a fixed, classification-only string (not the throw text).
    expect(typeof r.body.message).toBe('string');
    expect(r.body.message).not.toContain(leakyMessage);

    // INTERNAL audit: raw reason is preserved for the safe internal trail.
    expect(r.audit.raw_reasons).toEqual([leakyMessage]);
    expect(r.audit.refusal_class).toBe('seam.storage_unavailable');
  });

  // Producer (C): route internal-error fallback synthesizes a
  // runtime_seam:internal:* raw reason on a storage_unavailable response.
  it('storage_unavailable: drops a runtime_seam:internal:* raw reason from the public body', () => {
    const resp: RecallIntakeResponse = {
      outcome: 'denied',
      reason: 'storage_unavailable',
      raw_reasons: ['runtime_seam:internal:Cannot read properties of undefined'],
    };
    const r = mapSeamResponseToRefusal(resp, { tenant_id: 'w' })!;
    expect(r.body.error).toBe('seam.storage_unavailable');
    expect(r.body.raw_reasons).toBeUndefined();
    expect(JSON.stringify(r.body)).not.toContain('runtime_seam:internal');
    // Internal audit still carries it.
    expect(r.audit.raw_reasons).toEqual([
      'runtime_seam:internal:Cannot read properties of undefined',
    ]);
  });

  // A denied response with an UNKNOWN reason string falls through to the
  // storage_unavailable class and must be sanitized identically (it would
  // otherwise be the broadest leak surface for any future seam reason).
  it('unknown denial reason → storage_unavailable class, public body sanitized', () => {
    const resp = {
      outcome: 'denied',
      reason: 'some_future_reason_not_in_map',
      raw_reasons: ['internal:leak:do-not-expose'],
    } as unknown as RecallIntakeResponse;
    const r = mapSeamResponseToRefusal(resp, {})!;
    expect(r.body.error).toBe('seam.storage_unavailable');
    expect(r.body.raw_reasons).toBeUndefined();
    expect(JSON.stringify(r.body)).not.toContain('internal:leak:do-not-expose');
    expect(r.audit.raw_reasons).toEqual(['internal:leak:do-not-expose']);
  });

  // Phase 32D contract preserved: a real, public-vocabulary denial reason
  // (privacy_scope_refusal) STILL forwards its raw_reasons on the public
  // body. The sanitization is scoped to the internal-seam class only.
  it('privacy_scope_refusal still forwards public raw_reasons (Phase 32D contract intact)', () => {
    const resp: RecallIntakeResponse = {
      outcome: 'denied',
      reason: 'privacy_scope_refusal',
      raw_reasons: ['privacy_scope:public_frame_blocked'],
    };
    const r = mapSeamResponseToRefusal(resp, {})!;
    expect(r.http_status).toBe(403);
    expect(r.body.error).toBe('seam.privacy_scope_refusal');
    expect(r.body.raw_reasons).toEqual(['privacy_scope:public_frame_blocked']);
  });

  it('blocked_by_policy still forwards public raw_reasons', () => {
    const resp: RecallIntakeResponse = {
      outcome: 'denied',
      reason: 'blocked_by_policy',
      raw_reasons: ['competence:signer_role_not_admitted'],
    };
    const r = mapSeamResponseToRefusal(resp, {})!;
    expect(r.http_status).toBe(403);
    expect(r.body.error).toBe('seam.blocked_by_policy');
    expect(r.body.raw_reasons).toEqual(['competence:signer_role_not_admitted']);
  });
});

describe('mapSeamResponseToRefusal — pass-through', () => {
  it('served → undefined (caller emits 200 directly)', () => {
    const resp: RecallIntakeResponse = {
      outcome: 'served',
      pack: {} as never,
      receipt: {} as never,
    };
    expect(mapSeamResponseToRefusal(resp, {})).toBeUndefined();
  });
  it('needs_review → 503 with review_queue_id surfaced', () => {
    const resp: RecallIntakeResponse = {
      outcome: 'needs_review',
      review_queue_id: 'rq_1',
      raw_reasons: ['policy:review'],
    };
    const r = mapSeamResponseToRefusal(resp, {})!;
    expect(r.http_status).toBe(503);
    expect(r.body.review_queue_id).toBe('rq_1');
  });
});
