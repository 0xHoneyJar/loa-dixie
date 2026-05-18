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
