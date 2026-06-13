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

// Phase 33Q — bounded, process-local, SYNTHETIC admitted-assertion ledger
// (dev-only, disabled-by-default, NON-PRODUCTION; authorized by Phase 33P §7–§12).
// This stays on the internal service barrel ONLY — it is NOT re-exported from
// any package entrypoint (no `src/index.ts` re-export, no package `exports`),
// exactly like the rest of the spike (Phase 33M §8 / 33P §8 no package export).
//
// The ledger's safety is SPIKE-SCOPED and validation-enforced — bounded
// capacity (validated at creation), tenant+estate scoping, and synthetic-only
// input validation. It is NOT a claim of complete production safety: final
// tenant/estate/actor binding, idempotency, signer/authority, schema, receipt
// semantics, and durable storage all remain UNRESOLVED (Phase 33P §8, §12).
export {
  createAdmittedAssertionLedger,
  AdmittedAssertionCapExceededError,
  AdmittedAssertionScopeViolationError,
  AdmittedAssertionReplayConflictError,
  AdmittedAssertionInvalidConfigError,
  AdmittedAssertionInvalidInputError,
  AdmittedAssertionTenantConflictError,
  type AdmittedAssertionLedger,
  type AdmittedAssertionLedgerConfig,
  type AdmittedScope,
  type ScopedAdmittedView,
  type SyntheticAdmittedAssertion,
  type SyntheticAuditRecord,
  type SyntheticAdmissionTransition,
  type RecordOutcome,
  type EstateFootprint,
  type RecallProjection,
} from './admitted-assertion-ledger.js';
