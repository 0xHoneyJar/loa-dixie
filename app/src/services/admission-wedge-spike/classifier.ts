// Phase 33N — dev/operator-only Admission Wedge route SPIKE: pure classifier
// and public-response builder.
//
// Authorized NARROWLY by Phase 33M
// (docs/ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md §7–§15)
// as a disabled-by-default, dev/operator-only, NON-PRODUCTION route spike.
//
// SCOPE / NON-GOALS:
//   * dev/operator ONLY — never production admission, never a public path;
//   * Storage Option A — NO durable Admission Wedge storage, NO database
//     writes, NO migrations. This module is PURE: it computes a deterministic
//     public-safe outcome from a recognized dev-spike request shape and mints
//     NOTHING durable. "Rollback" is trivial: there is no durable state;
//   * it does NOT prove a production schema, production auth/consent,
//     production tenant/estate/actor binding, final idempotency, a completed
//     Straylight primitive review, or Freeside runtime integration;
//   * it echoes NO request-controlled material into the public response — the
//     response is built purely from the classified scenario, so a public
//     response can carry no raw candidate payload, source, token, or id from
//     the request body (the no-leak boundary is structural, not just checked).
//
// Request shape (Approach C — Phase 33M §3): the classifier matches the
// minimal draft fields the Phase 33L route-contract test vectors carry on
// their `request_vector` (`transition_intent`), behind a required synthetic
// non-production marker, and FAILS CLOSED for any unsupported shape. It does
// NOT widen beyond the five Phase 33L scenarios.

import { z } from 'zod';

/** Synthetic, non-production discriminator the dev-spike body must carry.
 *  Its presence makes a request an explicit dev-spike request rather than
 *  any production admission body (no production body shape is accepted). */
export const ADMISSION_SPIKE_BODY_MARKER = 'admission_intake_dev_spike_v0';

/** The five draft `transition_intent` values carried by the Phase 33L
 *  route-contract test vectors (their `request_vector.transition_intent`),
 *  mapped 1:1 to the five frozen scenarios. No sixth scenario. */
export const ADMISSION_TRANSITION_INTENTS = {
  /** Vector A — candidate proposed, no transition. */
  pending: 'none_candidate_write_only_draft',
  /** Vector B — explicit accept/admit transition. */
  accept: 'admit_assertion_accept_draft',
  /** Vector C — explicit reject/deny transition. */
  reject: 'admit_assertion_deny_draft',
  /** Vector D — supersession with correction. */
  supersede: 'supersede_with_correction_draft',
  /** Vector E — explicit malformed/unsafe, refused at ingress. */
  malformed: 'none_refused_at_ingress_before_transition_draft',
} as const;

export type AdmissionSpikeScenario = keyof typeof ADMISSION_TRANSITION_INTENTS;

const INTENT_TO_SCENARIO: Record<string, AdmissionSpikeScenario> = {
  [ADMISSION_TRANSITION_INTENTS.pending]: 'pending',
  [ADMISSION_TRANSITION_INTENTS.accept]: 'accept',
  [ADMISSION_TRANSITION_INTENTS.reject]: 'reject',
  [ADMISSION_TRANSITION_INTENTS.supersede]: 'supersede',
  [ADMISSION_TRANSITION_INTENTS.malformed]: 'malformed',
};

/** Stable, public-safe shape-failure code (the existing Dixie-local refusal
 *  family code the Phase 33L fail-closed vector reuses). NOT an admission
 *  final code. */
export const ADMISSION_SPIKE_SHAPE_REFUSAL_CODE = 'ingress.invalid_request';

/** Draft, non-final public reason marker for an explicit denied transition
 *  (mirrors the Phase 33L reject vector's `safe_reason_code`). */
export const ADMISSION_SPIKE_DENIED_REASON_DRAFT = 'admission_transition_denied_draft_non_final';

// Carried-forward Phase 33J §5/§6 unresolved primitive-review markers (NOT
// resolved by this spike — the Straylight primitive review remains required
// and not complete).
export const ADMISSION_SPIKE_UNRESOLVED_ROWS = ['E', 'G', 'H', 'K', 'N', 'O'] as const;
export const ADMISSION_SPIKE_REVIEW_DEPENDENT_ROWS = ['J'] as const;

// Strict dev-spike request schema. Extra keys are rejected (strict) so a
// production-ish or arbitrary body fails closed rather than being silently
// accepted. The schema accepts ONLY the two minimal fields the Phase 33L
// route-contract vectors carry on their `request_vector`: the synthetic
// dev-spike marker plus the draft transition discriminator. It deliberately
// accepts NO free-form memory/candidate payload and does NOT widen beyond the
// five scenarios.
const AdmissionSpikeBodySchema = z
  .object({
    spike: z.literal(ADMISSION_SPIKE_BODY_MARKER),
    transition_intent: z.enum(
      Object.values(ADMISSION_TRANSITION_INTENTS) as [string, ...string[]],
    ),
  })
  .strict();

export interface AdmissionSpikeClassification {
  scenario: AdmissionSpikeScenario;
  outcome_class:
    | 'accepted_as_proposed'
    | 'admitted'
    | 'denied'
    | 'superseded_with_correction'
    | 'refused';
  /** Deterministic public HTTP status for the outcome. 200 for the four
   *  deterministic admission outcomes; 400 for the fail-closed refusal. */
  http_status: 200 | 400;
  /** Whether the outcome is recall-eligible (future-intent, draft, review-
   *  dependent). Pending / reject / malformed are never recallable. */
  recall_eligible: boolean;
  /** Whether a public-safe (synthetic) receipt reference is minted. NO durable
   *  receipt is ever written (Option A) — this only governs whether a SAFE
   *  synthetic placeholder appears publicly. */
  mints_public_receipt_ref: boolean;
  /** Public-safe reason code (or null). Either the stable Dixie shape-failure
   *  code or a clearly-draft/non-final admission marker. */
  safe_reason_code: string | null;
}

const CLASSIFICATIONS: Record<AdmissionSpikeScenario, AdmissionSpikeClassification> = {
  pending: {
    scenario: 'pending',
    outcome_class: 'accepted_as_proposed',
    http_status: 200,
    recall_eligible: false,
    mints_public_receipt_ref: false,
    safe_reason_code: null,
  },
  accept: {
    scenario: 'accept',
    outcome_class: 'admitted',
    http_status: 200,
    recall_eligible: true,
    mints_public_receipt_ref: true,
    safe_reason_code: null,
  },
  reject: {
    scenario: 'reject',
    outcome_class: 'denied',
    http_status: 200,
    recall_eligible: false,
    mints_public_receipt_ref: true,
    safe_reason_code: ADMISSION_SPIKE_DENIED_REASON_DRAFT,
  },
  supersede: {
    scenario: 'supersede',
    outcome_class: 'superseded_with_correction',
    http_status: 200,
    recall_eligible: true,
    mints_public_receipt_ref: true,
    safe_reason_code: null,
  },
  malformed: {
    scenario: 'malformed',
    outcome_class: 'refused',
    http_status: 400,
    recall_eligible: false,
    mints_public_receipt_ref: false,
    safe_reason_code: ADMISSION_SPIKE_SHAPE_REFUSAL_CODE,
  },
};

/** The deterministic fail-closed classification — used for any unsupported /
 *  malformed / unsafe shape and as the partial-failure result. */
export const ADMISSION_SPIKE_FAIL_CLOSED: AdmissionSpikeClassification =
  CLASSIFICATIONS.malformed;

/**
 * Thrown when a request does not match a supported dev-spike shape. The route
 * catches this and returns the SAME public-safe fail-closed refusal as the
 * explicit malformed scenario — it never reveals the hidden reason.
 */
export class AdmissionSpikeUnsupportedShapeError extends Error {
  constructor() {
    super('unsupported admission dev-spike request shape');
    this.name = 'AdmissionSpikeUnsupportedShapeError';
  }
}

/**
 * Pure classifier. Recognizes only the five Phase 33L scenario forms via the
 * draft `transition_intent` discriminator (behind the synthetic dev-spike
 * marker) and FAILS CLOSED for everything else by throwing
 * `AdmissionSpikeUnsupportedShapeError`. Mints nothing durable.
 *
 * The explicit malformed scenario (vector E) is RECOGNIZED and returns the
 * fail-closed `refused` classification; a genuinely unsupported shape THROWS
 * — both routes collapse to the identical public-safe refusal at the handler.
 */
export function classifyAdmissionSpike(input: unknown): AdmissionSpikeClassification {
  const parsed = AdmissionSpikeBodySchema.safeParse(input);
  if (!parsed.success) {
    throw new AdmissionSpikeUnsupportedShapeError();
  }
  const scenario = INTENT_TO_SCENARIO[parsed.data.transition_intent];
  if (!scenario) {
    throw new AdmissionSpikeUnsupportedShapeError();
  }
  return CLASSIFICATIONS[scenario];
}
