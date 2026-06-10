// Phase 33N — dev/operator-only Admission Wedge spike classifier + scenario
// behavior + no-leak (NON-PRODUCTION, Storage Option A).
//
// Uses the Phase 33L route-contract test vectors as the FIXTURE CONTRACT
// EVIDENCE (Phase 33M §7, §9): the classifier's `transition_intent`
// discriminators are read from the actual vector JSON `request_vector`, and the
// classified outcomes are checked against each vector's
// `expected_public_response` / `expected_recall_projection`. The vectors are
// read read-only as fixtures in this test ONLY — no docs validator is imported
// into runtime, and the vector JSON is NOT mutated.

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  classifyAdmissionSpike,
  AdmissionSpikeUnsupportedShapeError,
  ADMISSION_SPIKE_BODY_MARKER,
  buildAdmissionSpikePublicResponse,
  findAdmissionPublicLeaks,
  type AdmissionSpikeScenario,
} from '../../../src/services/admission-wedge-spike/index.js';

// docs/admission-wedge/route-contract-test-vectors lives at the repo root,
// three levels up from app/tests/unit/admission-wedge-spike.
const VECTORS_DIR = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'docs',
  'admission-wedge',
  'route-contract-test-vectors',
);

interface RouteVector {
  scenario_id: string;
  request_vector: { transition_intent: string };
  expected_public_response: {
    outcome_class: string;
    recall_eligible: boolean;
    safe_reason_code: string | null;
  };
  expected_recall_projection: {
    ordinary_recall_includes: string[];
    ordinary_recall_excludes: string[];
  };
}

function loadVector(file: string): RouteVector {
  return JSON.parse(readFileSync(join(VECTORS_DIR, file), 'utf8')) as RouteVector;
}

// scenario → (vector file, our scenario key). Frozen-by-count: exactly five.
const SCENARIOS: Array<{
  file: string;
  scenario: AdmissionSpikeScenario;
  vectorScenarioId: string;
}> = [
  { file: 'candidate-pending-not-recallable.json', scenario: 'pending', vectorScenarioId: 'candidate_pending_not_recallable' },
  { file: 'accept-candidate-to-admitted-assertion.json', scenario: 'accept', vectorScenarioId: 'accept_candidate_to_admitted_assertion' },
  { file: 'reject-candidate-no-assertion.json', scenario: 'reject', vectorScenarioId: 'reject_candidate_no_assertion' },
  { file: 'supersede-with-corrected-assertion.json', scenario: 'supersede', vectorScenarioId: 'supersede_with_corrected_assertion' },
  { file: 'malformed-or-unsafe-payload-fail-closed.json', scenario: 'malformed', vectorScenarioId: 'malformed_or_unsafe_payload_fail_closed' },
];

function bodyForVector(v: RouteVector) {
  return {
    spike: ADMISSION_SPIKE_BODY_MARKER,
    transition_intent: v.request_vector.transition_intent,
  };
}

describe('Phase 33N — classifier maps the five Phase 33L vectors deterministically', () => {
  it('exactly five scenarios are recognized (frozen-by-count; no sixth)', () => {
    expect(SCENARIOS).toHaveLength(5);
    const ids = new Set(SCENARIOS.map((s) => s.vectorScenarioId));
    expect(ids.size).toBe(5);
  });

  for (const { file, scenario, vectorScenarioId } of SCENARIOS) {
    describe(`${vectorScenarioId}`, () => {
      const vector = loadVector(file);

      it('vector loads and its scenario_id matches', () => {
        expect(vector.scenario_id).toBe(vectorScenarioId);
      });

      it('classifies to the expected outcome_class and recall eligibility', () => {
        const c = classifyAdmissionSpike(bodyForVector(vector));
        expect(c.scenario).toBe(scenario);
        expect(c.outcome_class).toBe(vector.expected_public_response.outcome_class);
        expect(c.recall_eligible).toBe(vector.expected_public_response.recall_eligible);
      });

      it('public response recall projection matches the vector projection', () => {
        const c = classifyAdmissionSpike(bodyForVector(vector));
        const body = buildAdmissionSpikePublicResponse(c);
        expect(body.recall_projection.ordinary_recall_includes).toEqual(
          vector.expected_recall_projection.ordinary_recall_includes,
        );
        expect(body.recall_projection.ordinary_recall_excludes).toEqual(
          vector.expected_recall_projection.ordinary_recall_excludes,
        );
      });

      it('public response is deep-walk no-leak clean', () => {
        const c = classifyAdmissionSpike(bodyForVector(vector));
        const body = buildAdmissionSpikePublicResponse(c);
        expect(findAdmissionPublicLeaks(body)).toEqual([]);
      });

      it('public response carries the non-final draft markers and never claims final/production', () => {
        const c = classifyAdmissionSpike(bodyForVector(vector));
        const body = buildAdmissionSpikePublicResponse(c);
        expect(body.spike).toBe('dev_operator_only_non_production');
        expect(body.draft_markers.schema_final).toBe(false);
        expect(body.draft_markers.production_admission).toBe(false);
        expect(body.draft_markers.straylight_primitive_review_complete).toBe(false);
        expect(body.draft_markers.idempotency_final).toBe(false);
        expect(body.draft_markers.unresolved_review_rows).toEqual(['E', 'G', 'H', 'K', 'N', 'O']);
        expect(body.draft_markers.review_dependent_non_final_rows).toEqual(['J']);
      });
    });
  }
});

describe('Phase 33N — scenario-specific behaviors (Phase 33M §3 A–E)', () => {
  function classify(scenario: AdmissionSpikeScenario) {
    const entry = SCENARIOS.find((s) => s.scenario === scenario)!;
    return classifyAdmissionSpike(bodyForVector(loadVector(entry.file)));
  }

  it('A. pending: proposed, not recallable, no denied/rejected vocabulary, no public receipt', () => {
    const c = classify('pending');
    const body = buildAdmissionSpikePublicResponse(c);
    expect(body.outcome_class).toBe('accepted_as_proposed');
    expect(body.recall_eligible).toBe(false);
    expect(body.public_receipt_ref).toBeNull();
    expect(body.recall_projection.ordinary_recall_includes).toEqual([]);
    // Pending must NOT use denied/rejected vocabulary.
    expect(body.outcome_class).not.toMatch(/denied|rejected|refused/);
    expect(body.safe_reason_code).toBeNull();
  });

  it('B. accept: admitted, recall-eligible future-intent, corrected/admitted active in projection', () => {
    const c = classify('accept');
    const body = buildAdmissionSpikePublicResponse(c);
    expect(body.outcome_class).toBe('admitted');
    expect(body.recall_eligible).toBe(true);
    expect(body.recall_projection.ordinary_recall_includes).toEqual([
      'admitted_active_assertion_draft_placeholder',
    ]);
    expect(body.recall_projection.ordinary_recall_excludes).toEqual([]);
  });

  it('C. reject: denied, no assertion, not recallable, stable draft denial code', () => {
    const c = classify('reject');
    const body = buildAdmissionSpikePublicResponse(c);
    expect(body.outcome_class).toBe('denied');
    expect(body.recall_eligible).toBe(false);
    expect(body.recall_projection.ordinary_recall_includes).toEqual([]);
    expect(body.safe_reason_code).toBe('admission_transition_denied_draft_non_final');
  });

  it('D. supersede: corrected-active included, superseded prior excluded from ordinary recall', () => {
    const c = classify('supersede');
    const body = buildAdmissionSpikePublicResponse(c);
    expect(body.outcome_class).toBe('superseded_with_correction');
    expect(body.recall_eligible).toBe(true);
    expect(body.recall_projection.ordinary_recall_includes).toEqual([
      'corrected_active_assertion_draft_placeholder',
    ]);
    expect(body.recall_projection.ordinary_recall_excludes).toEqual([
      'superseded_prior_assertion_draft_placeholder',
    ]);
  });

  it('E. malformed: fail-closed refusal with the stable Dixie shape-failure code, nothing recallable', () => {
    const c = classify('malformed');
    const body = buildAdmissionSpikePublicResponse(c);
    expect(body.outcome_class).toBe('refused');
    expect(c.http_status).toBe(400);
    expect(body.recall_eligible).toBe(false);
    expect(body.public_receipt_ref).toBeNull();
    expect(body.safe_reason_code).toBe('ingress.invalid_request');
    expect(body.recall_projection.ordinary_recall_includes).toEqual([]);
  });
});

describe('Phase 33N — classifier fails closed on unsupported shapes (no widening)', () => {
  const UNSUPPORTED: Array<[string, unknown]> = [
    ['null', null],
    ['empty object', {}],
    ['missing marker', { transition_intent: 'admit_assertion_accept_draft' }],
    ['wrong marker', { spike: 'something_else', transition_intent: 'admit_assertion_accept_draft' }],
    ['unknown transition_intent', { spike: ADMISSION_SPIKE_BODY_MARKER, transition_intent: 'invent_new_intent' }],
    ['free-form candidate payload (production-ish)', { spike: ADMISSION_SPIKE_BODY_MARKER, transition_intent: 'admit_assertion_accept_draft', candidate_payload: { text: 'remember this' } }],
    ['extra keys (strict)', { spike: ADMISSION_SPIKE_BODY_MARKER, transition_intent: 'admit_assertion_accept_draft', tenant_id: '0xabc' }],
    ['array', []],
    ['string', 'admit_assertion_accept_draft'],
  ];

  for (const [name, input] of UNSUPPORTED) {
    it(`throws AdmissionSpikeUnsupportedShapeError for: ${name}`, () => {
      expect(() => classifyAdmissionSpike(input)).toThrow(AdmissionSpikeUnsupportedShapeError);
    });
  }

  it('any extra key (e.g. a UUID-bearing field) is rejected by the strict schema', () => {
    // The strict schema accepts ONLY {spike, transition_intent}; any extra
    // field — including one carrying a UUID / operational id — fails closed.
    expect(() =>
      classifyAdmissionSpike({
        spike: ADMISSION_SPIKE_BODY_MARKER,
        transition_intent: 'admit_assertion_accept_draft',
        candidate_ref: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).toThrow(AdmissionSpikeUnsupportedShapeError);
  });
});

describe('Phase 33N — idempotency / duplicate-mint impossibility (Option A future-intent)', () => {
  it('classification is pure: same input → identical outcome, no durable state, no duplicate', () => {
    const body = { spike: ADMISSION_SPIKE_BODY_MARKER, transition_intent: 'admit_assertion_accept_draft' };
    const a = classifyAdmissionSpike(body);
    const b = classifyAdmissionSpike(body);
    // Deterministic and identical — Option A mints nothing durable, so a
    // "retry" cannot create a duplicate admitted/corrected assertion.
    expect(a).toEqual(b);
    const r1 = buildAdmissionSpikePublicResponse(a);
    const r2 = buildAdmissionSpikePublicResponse(b);
    expect(r1).toEqual(r2);
    // The public response never echoes an idempotency KEY. (It does carry an
    // `idempotency_final: false` draft marker — a non-final flag, not a key —
    // so we assert the forbidden key/value, not the substring "idempotency".)
    expect(findAdmissionPublicLeaks(r1)).toEqual([]);
    expect(JSON.stringify(r1)).not.toMatch(/idempotency_key/i);
  });
});
