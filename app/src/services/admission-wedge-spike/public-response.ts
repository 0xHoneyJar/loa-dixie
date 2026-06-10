// Phase 33N — dev/operator-only Admission Wedge route SPIKE: public-response
// builder (Storage Option A; NON-PRODUCTION).
//
// Builds the deterministic, public-safe response body for a classified
// dev-spike outcome. The body is constructed PURELY from the classification
// plus fixed synthetic placeholders — it NEVER incorporates request-controlled
// material, raw candidate payloads, source material, operational ids,
// idempotency keys, authority/signature material, tokens, urls, or storage
// internals. The no-leak boundary is therefore structural; the runtime
// no-leak helper (no-leak.ts) is a defense-in-depth check, not the sole guard.

import type {
  AdmissionSpikeClassification,
  AdmissionSpikeScenario,
} from './classifier.js';
import {
  ADMISSION_SPIKE_UNRESOLVED_ROWS,
  ADMISSION_SPIKE_REVIEW_DEPENDENT_ROWS,
} from './classifier.js';

/** Fixed synthetic public-safe receipt placeholder. NOT an operational id, NOT
 *  durable — Option A mints no durable receipt. Short, descriptive, never
 *  derived from request material. */
const SYNTHETIC_PUBLIC_RECEIPT_REF = 'admission-spike-receipt-draft';

/** Fixed synthetic recall-projection placeholders (mirror the Phase 33L
 *  vectors' projection placeholders). */
const ADMITTED_ACTIVE_PLACEHOLDER = 'admitted_active_assertion_draft_placeholder';
const CORRECTED_ACTIVE_PLACEHOLDER = 'corrected_active_assertion_draft_placeholder';
const SUPERSEDED_PRIOR_PLACEHOLDER = 'superseded_prior_assertion_draft_placeholder';

export interface AdmissionSpikePublicResponse {
  /** Clearly marks this as a dev/operator-only, non-production spike. */
  spike: 'dev_operator_only_non_production';
  outcome_class: AdmissionSpikeClassification['outcome_class'];
  scenario_id: string;
  recall_eligible: boolean;
  /** Safe recall projection summary (synthetic placeholders only). */
  recall_projection: {
    ordinary_recall_includes: string[];
    ordinary_recall_excludes: string[];
  };
  /** Public-safe synthetic receipt reference, or null when none is minted. */
  public_receipt_ref: string | null;
  /** Public-safe reason code, or null. */
  safe_reason_code: string | null;
  /** Non-final / draft indicators — the spike claims nothing final. */
  draft_markers: {
    schema_final: false;
    route_contract_final: false;
    production_admission: false;
    straylight_primitive_review_complete: false;
    idempotency_final: false;
    unresolved_review_rows: readonly string[];
    review_dependent_non_final_rows: readonly string[];
  };
}

const SCENARIO_IDS: Record<AdmissionSpikeScenario, string> = {
  pending: 'candidate_pending_not_recallable',
  accept: 'accept_candidate_to_admitted_assertion',
  reject: 'reject_candidate_no_assertion',
  supersede: 'supersede_with_corrected_assertion',
  malformed: 'malformed_or_unsafe_payload_fail_closed',
};

function recallProjectionFor(scenario: AdmissionSpikeScenario): {
  ordinary_recall_includes: string[];
  ordinary_recall_excludes: string[];
} {
  switch (scenario) {
    case 'accept':
      return {
        ordinary_recall_includes: [ADMITTED_ACTIVE_PLACEHOLDER],
        ordinary_recall_excludes: [],
      };
    case 'supersede':
      return {
        ordinary_recall_includes: [CORRECTED_ACTIVE_PLACEHOLDER],
        ordinary_recall_excludes: [SUPERSEDED_PRIOR_PLACEHOLDER],
      };
    case 'pending':
    case 'reject':
    case 'malformed':
    default:
      return { ordinary_recall_includes: [], ordinary_recall_excludes: [] };
  }
}

/**
 * Build the deterministic public-safe response body from a classification.
 * Pure: identical input → identical output; no request-controlled material is
 * ever incorporated.
 */
export function buildAdmissionSpikePublicResponse(
  c: AdmissionSpikeClassification,
): AdmissionSpikePublicResponse {
  return {
    spike: 'dev_operator_only_non_production',
    outcome_class: c.outcome_class,
    scenario_id: SCENARIO_IDS[c.scenario],
    recall_eligible: c.recall_eligible,
    recall_projection: recallProjectionFor(c.scenario),
    public_receipt_ref: c.mints_public_receipt_ref ? SYNTHETIC_PUBLIC_RECEIPT_REF : null,
    safe_reason_code: c.safe_reason_code,
    draft_markers: {
      schema_final: false,
      route_contract_final: false,
      production_admission: false,
      straylight_primitive_review_complete: false,
      idempotency_final: false,
      unresolved_review_rows: ADMISSION_SPIKE_UNRESOLVED_ROWS,
      review_dependent_non_final_rows: ADMISSION_SPIKE_REVIEW_DEPENDENT_ROWS,
    },
  };
}
