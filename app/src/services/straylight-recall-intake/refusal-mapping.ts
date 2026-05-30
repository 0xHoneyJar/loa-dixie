// Phase 26E — refusal mapping.
//
// ADR-026D §4.a–§4.g + §3.a (iv): every refusal class maps to a documented
// HTTP status, response body shape, and audit emission key. This module is
// pure (no I/O); the route handler calls it after every seam invocation
// and after every ingress refusal.

import type { RecallIntakeResponse } from '@loa/straylight/host';

export type RefusalClass =
  // Ingress refusals (§3.d, §4.g)
  | 'ingress.invalid_request'
  | 'ingress.unauthenticated'
  | 'ingress.cross_tenant_body_mismatch'
  | 'ingress.payload_too_large'
  | 'ingress.rate_limited'
  | 'ingress.missing_idempotency_key'
  // Bounded-store refusals (§3.a iii/iv)
  | 'guard.tenant_assertion_cap'
  | 'guard.tenant_byte_budget'
  // Runtime seam refusals (§4.a–§4.f)
  | 'seam.capability_unrecognized'
  | 'seam.proof_invalid'
  | 'seam.capability_missing_env_key'
  | 'seam.cross_tenant_recall_refused'
  | 'seam.tenant_resolution_failed'
  | 'seam.frame_unsupported'
  | 'seam.privacy_scope_refusal'
  | 'seam.class_validation_failed'
  | 'seam.policy_unavailable'
  | 'seam.signer_not_competent'
  | 'seam.blocked_by_policy'
  | 'seam.storage_unavailable';

export interface RefusalEnvelope {
  http_status: 400 | 401 | 403 | 413 | 429 | 503 | 500;
  body: {
    outcome: 'denied' | 'needs_review';
    error: RefusalClass;
    message: string;
    raw_reasons?: string[];
    audit_event_id?: string;
    intake_log_entry_id?: string;
    review_queue_id?: string;
  };
  audit: {
    event: 'recall_intake.refused';
    refusal_class: RefusalClass;
    tenant_id?: string;
    caller_actor_id?: string;
    raw_reasons?: string[];
  };
}

export function ingressRefusal(
  refusal_class: Extract<RefusalClass, `ingress.${string}`>,
  message: string,
  ctx: { tenant_id?: string; caller_actor_id?: string },
): RefusalEnvelope {
  const map: Record<Extract<RefusalClass, `ingress.${string}`>, RefusalEnvelope['http_status']> = {
    'ingress.invalid_request': 400,
    'ingress.unauthenticated': 401,
    'ingress.cross_tenant_body_mismatch': 403,
    'ingress.payload_too_large': 413,
    'ingress.rate_limited': 429,
    'ingress.missing_idempotency_key': 400,
  };
  return {
    http_status: map[refusal_class],
    body: { outcome: 'denied', error: refusal_class, message },
    audit: {
      event: 'recall_intake.refused',
      refusal_class,
      tenant_id: ctx.tenant_id,
      caller_actor_id: ctx.caller_actor_id,
    },
  };
}

export function guardRefusal(
  refusal_class: Extract<RefusalClass, `guard.${string}`>,
  message: string,
  ctx: { tenant_id: string; caller_actor_id?: string },
): RefusalEnvelope {
  return {
    http_status: 503,
    body: { outcome: 'denied', error: refusal_class, message },
    audit: {
      event: 'recall_intake.refused',
      refusal_class,
      tenant_id: ctx.tenant_id,
      caller_actor_id: ctx.caller_actor_id,
    },
  };
}

/**
 * Map a `RecallIntakeResponse` from the runtime seam into a refusal
 * envelope (or pass through `served` / `needs_review` shapes).
 *
 * For `served`, callers do NOT use this function — the served body is
 * returned directly with status 200.
 */
export function mapSeamResponseToRefusal(
  response: RecallIntakeResponse,
  ctx: { tenant_id?: string; caller_actor_id?: string },
): RefusalEnvelope | undefined {
  if (response.outcome === 'served') return undefined;
  if (response.outcome === 'needs_review') {
    return {
      http_status: 503,
      body: {
        outcome: 'needs_review',
        error: 'seam.policy_unavailable',
        message: 'recall request routed to review queue',
        raw_reasons: response.raw_reasons,
        review_queue_id: response.review_queue_id,
        audit_event_id: response.audit_event_id,
      },
      audit: {
        event: 'recall_intake.refused',
        refusal_class: 'seam.policy_unavailable',
        tenant_id: ctx.tenant_id,
        caller_actor_id: ctx.caller_actor_id,
        raw_reasons: response.raw_reasons,
      },
    };
  }

  // outcome === 'denied'
  const seam_codes: Array<{ pattern: RegExp; cls: RefusalClass; status: RefusalEnvelope['http_status'] }> = [
    { pattern: /^runtime_seam:capability_unrecognized$/, cls: 'seam.capability_unrecognized', status: 503 },
    { pattern: /^runtime_seam:proof_invalid$/, cls: 'seam.proof_invalid', status: 503 },
    { pattern: /^runtime_seam:capability_missing_env_key$/, cls: 'seam.capability_missing_env_key', status: 503 },
  ];

  for (const r of response.raw_reasons ?? []) {
    for (const m of seam_codes) {
      if (m.pattern.test(r)) {
        return {
          http_status: m.status,
          body: {
            outcome: 'denied',
            error: m.cls,
            message: 'runtime seam refused',
            raw_reasons: response.raw_reasons,
            audit_event_id: response.audit_event_id,
            intake_log_entry_id: response.intake_log_entry_id,
          },
          audit: {
            event: 'recall_intake.refused',
            refusal_class: m.cls,
            tenant_id: ctx.tenant_id,
            caller_actor_id: ctx.caller_actor_id,
            raw_reasons: response.raw_reasons,
          },
        };
      }
    }
  }

  const reasonMap: Record<string, { cls: RefusalClass; status: RefusalEnvelope['http_status'] }> = {
    cross_tenant_recall_refused: { cls: 'seam.cross_tenant_recall_refused', status: 403 },
    tenant_resolution_failed: { cls: 'seam.tenant_resolution_failed', status: 403 },
    frame_unsupported: { cls: 'seam.frame_unsupported', status: 400 },
    privacy_scope_refusal: { cls: 'seam.privacy_scope_refusal', status: 403 },
    class_validation_failed: { cls: 'seam.class_validation_failed', status: 400 },
    policy_unavailable: { cls: 'seam.policy_unavailable', status: 503 },
    signer_not_competent: { cls: 'seam.signer_not_competent', status: 403 },
    blocked_by_policy: { cls: 'seam.blocked_by_policy', status: 403 },
    storage_unavailable: { cls: 'seam.storage_unavailable', status: 503 },
  };
  const m = reasonMap[response.reason];
  const cls: RefusalClass = m ? m.cls : 'seam.storage_unavailable';
  const status: RefusalEnvelope['http_status'] = m ? m.status : 503;

  // Phase 32K — sanitize public storage / internal-seam denial bodies.
  //
  // `storage_unavailable` is the ONE denial class whose seam `raw_reasons`
  // is an UNCONTROLLED exception message rather than public Straylight
  // vocabulary, so its raw reasons must never reach the public HTTP body:
  //   * producer A — unseeded tenant: the Straylight host try/catch
  //     (`@loa/straylight/.../host/intake.js`) coerces the bounded store's
  //     `getKeyring()` throw into `reason:'storage_unavailable'` with
  //     `raw_reasons:[err.message]`, where `err.message` carries the
  //     bounded-store implementation text AND the raw tenant id
  //     (`bounded-estate-store: no slot for tenant <id>`);
  //   * producer C — the Dixie route internal-error fallback
  //     (`routes/recall-intake.ts`) synthesizes
  //     `raw_reasons:['runtime_seam:internal:' + err.message]`.
  // Both are dropped from the public `body` here and retained ONLY on the
  // internal `audit` object below (no new logging system is introduced —
  // the existing emitAudit/intake-deny trail keeps the raw reason). The
  // public message is a fixed, classification-only string. Every OTHER
  // denial class keeps its public `raw_reasons` (public wedge vocabulary —
  // the Phase 32D denied-no-leak contract).
  const isInternalSeamFailure = cls === 'seam.storage_unavailable';
  return {
    http_status: status,
    body: {
      outcome: 'denied',
      error: cls,
      message: isInternalSeamFailure
        ? 'recall storage unavailable'
        : `seam denial: ${response.reason}`,
      // Omit the key entirely (not just empty) for internal-seam failures so
      // the public wire body contains neither the `raw_reasons` key nor any
      // bounded-store / tenant / internal-seam text.
      ...(isInternalSeamFailure ? {} : { raw_reasons: response.raw_reasons }),
      audit_event_id: response.audit_event_id,
      intake_log_entry_id: response.intake_log_entry_id,
    },
    audit: {
      event: 'recall_intake.refused',
      refusal_class: cls,
      tenant_id: ctx.tenant_id,
      caller_actor_id: ctx.caller_actor_id,
      raw_reasons: response.raw_reasons,
    },
  };
}
