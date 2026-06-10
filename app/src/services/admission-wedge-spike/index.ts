// Phase 33N — dev/operator-only Admission Wedge route SPIKE: service barrel.
//
// Exposes the service-layer primitives the route composes. NON-PRODUCTION,
// dev/operator-only, Storage Option A (no durable storage). Authorized narrowly
// by Phase 33M
// (docs/ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md).
//
// NOTE: this is an internal service barrel only. It is deliberately NOT
// re-exported from any package entrypoint — the spike adds NO package export
// (Phase 33M §8). It performs NO `@loa/straylight` runtime value import and NO
// Freeside import.

export {
  classifyAdmissionSpike,
  AdmissionSpikeUnsupportedShapeError,
  ADMISSION_SPIKE_BODY_MARKER,
  ADMISSION_TRANSITION_INTENTS,
  ADMISSION_SPIKE_SHAPE_REFUSAL_CODE,
  ADMISSION_SPIKE_DENIED_REASON_DRAFT,
  ADMISSION_SPIKE_FAIL_CLOSED,
  ADMISSION_SPIKE_UNRESOLVED_ROWS,
  ADMISSION_SPIKE_REVIEW_DEPENDENT_ROWS,
  type AdmissionSpikeScenario,
  type AdmissionSpikeClassification,
} from './classifier.js';

export {
  buildAdmissionSpikePublicResponse,
  type AdmissionSpikePublicResponse,
} from './public-response.js';

export {
  findAdmissionPublicLeaks,
  isAdmissionPublicSafe,
} from './no-leak.js';

export {
  authorizeAdmissionSpike,
  type AdmissionSpikeGateConfig,
  type AdmissionSpikeCredentials,
} from './auth-gate.js';
