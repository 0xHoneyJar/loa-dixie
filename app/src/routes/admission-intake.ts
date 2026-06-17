// Phase 33N — POST /api/admission/intake (dev/operator-only route SPIKE).
//
// NON-PRODUCTION. Authorized NARROWLY by Phase 33M
// (docs/ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md §7–§15):
// a single, disabled-by-default, dev/operator-only route spike behind an
// explicit env gate + operator/service allowlist, using Storage Option A (no
// durable Admission Wedge storage, no DB writes, no migrations — safe
// future-intent receipts / public-safe outcomes only). Rollback is trivial:
// there is no durable state to roll back.
//
// This route does NOT authorize and does NOT implement: production admission;
// production storage/auth/consent; Freeside runtime/client integration; Discord
// ingestion; user chat becoming memory; a public `remember-this`; a final
// schema; final idempotency/signer/authority semantics; production
// tenant/estate/actor identity binding; or a completed Straylight primitive
// review. It mounts ONLY when DIXIE_ADMISSION_INTAKE_ENABLED === 'true'
// (server.ts conditional mount; default off → route not registered at all).
//
// Import discipline: this file imports ONLY Dixie-local service primitives and
// `hono`. It performs NO `@loa/straylight` import and NO Freeside import.

import { Hono, type Context } from 'hono';
import { getRequestContext } from '../validation.js';
import {
  authorizeAdmissionSpike,
  classifyAdmissionSpike,
  AdmissionSpikeUnsupportedShapeError,
  buildAdmissionSpikePublicResponse,
  findAdmissionPublicLeaks,
  ADMISSION_SPIKE_FAIL_CLOSED,
  ADMISSION_SPIKE_SHAPE_REFUSAL_CODE,
  type AdmissionSpikeClassification,
  type AdmissionSpikeGateConfig,
  type AdmittedAssertionLedger,
  type SyntheticAdmissionTransition,
  type RouteStorageSpikeStore,
} from '../services/admission-wedge-spike/index.js';

/** Header carrying the dev/operator id (checked against the allowlist). */
const OPERATOR_ID_HEADER = 'x-admission-operator-id';

/** Dedicated header carrying the dev/operator service token. NOT
 *  `Authorization` — see auth-gate.ts for the rationale (avoids colliding with
 *  the global /api/* allowlist gate, which is not exempt for /api/admission). */
const SERVICE_TOKEN_HEADER = 'x-admission-service-token';

/** Endpoint-local body cap. The dev-spike body is tiny; this is well under the
 *  global /api/* 100KB limit and bounds the read before JSON.parse. */
const DEFAULT_BODY_MAX_BYTES = 8_192;

export interface AdmissionSpikeAuditEvent {
  event:
    | 'admission_intake_spike.disabled'
    | 'admission_intake_spike.unauthorized'
    | 'admission_intake_spike.refused'
    | 'admission_intake_spike.outcome';
  /** Public-safe scenario id (or undefined for gate/auth refusals). */
  scenario_id?: string;
  /** Public-safe outcome class (or undefined). */
  outcome_class?: string;
  request_id?: string;
}

export interface AdmissionSpikeRouteDeps {
  /** Defense-in-depth: when false, the handler returns a safe disabled refusal
   *  even if mounted. server.ts only mounts the route when enabled is true. */
  enabled: boolean;
  gate: AdmissionSpikeGateConfig;
  bodyMaxBytes?: number;
  /** Audit emit hook (defaults to no-op). Receives ONLY public-safe fields —
   *  never raw body, tokens, or operator ids. */
  emitAudit?: (event: AdmissionSpikeAuditEvent) => void;
  /** Test seam (Phase 33M §10 partial-failure): invoked after classification,
   *  before the public response is finalized. Throwing simulates a partial
   *  internal failure; the handler MUST fail closed (no durable state under
   *  Option A; no recallable / partially-admitted residue). */
  beforeFinalize?: (classification: AdmissionSpikeClassification) => void;
  /** Runtime no-leak guard (DI seam). Defaults to `findAdmissionPublicLeaks`.
   *  EVERY public response — disabled, unauthorized, malformed, oversized,
   *  classifier-error, partial-failure, and all classified outcomes — is
   *  deep-walked through this guard before it is sent; a non-empty result fails
   *  closed to a hardcoded known-safe fallback (Phase 33M §14). Injectable so
   *  tests can prove the guard is invoked on every response path and that a
   *  forced leak fails closed without leaking the guard's own findings. */
  noLeakGuard?: (body: unknown) => string[];
  /** Phase 33Q — OPTIONAL dev-only synthetic admitted-assertion ledger (DI seam).
   *  Disabled-by-default: when undefined (the production/server default — server.ts
   *  injects NO ledger), the route behaves EXACTLY as the Phase 33N no-store
   *  Option A spike. When injected (tests only), an accepted/superseded synthetic
   *  candidate is recorded into the bounded, process-local, NON-DURABLE ledger so
   *  the candidate → admitted-assertion → recall transition's stateful effect can
   *  be proven over SYNTHETIC material (Phase 33P §7–§12). The ledger's records
   *  and ids are NEVER surfaced in the public body; any ledger throw fails closed
   *  to the same stable public-safe refusal as a partial failure.
   *
   *  The ledger write is attempted ONLY when BOTH a ledger AND a synthetic
   *  (tenant, estate) scope are injected (`admittedAssertionTenantId` +
   *  `admittedAssertionEstateId`); a partial injection (missing either) records
   *  nothing — the route stays the no-store Option A path. */
  admittedAssertionLedger?: AdmittedAssertionLedger;
  /** Synthetic tenant id the spike records under when a ledger is injected. The
   *  spike request body carries NO tenant/estate/candidate ids, so the tenant is
   *  a fixed synthetic dev constant (never request-derived). The ledger binds
   *  every access to BOTH this tenant and the estate below; this is a SPIKE
   *  isolation constant, NOT the final production tenant-binding semantics
   *  (Phase 33P §12 — those stay unresolved). */
  admittedAssertionTenantId?: string;
  /** Synthetic estate id the spike records into when a ledger is injected. The
   *  spike request body carries NO tenant/estate/candidate ids, so the estate is
   *  a fixed synthetic dev constant (never request-derived). */
  admittedAssertionEstateId?: string;

  // ── Phase 46V — dev/operator-only ROUTE-STORAGE spike seam (Storage Mode 1) ──
  //
  // Disabled-by-default. When undefined (the production/server default unless the
  // separate route-storage-spike env gate is enabled), the route behaves EXACTLY
  // as the Phase 33N no-store Option A spike / the Phase 33Q ledger-seam path. The
  // server wires this ONLY when BOTH the base route gate AND the draft
  // route-storage-spike gate are 'true' (config.admissionIntakeStorageSpikeEnabled
  // ANDed with admissionIntakeSpikeEnabled at the mount site) — so storage never
  // activates merely because route intake is enabled.
  //
  // It records the SAME fixed synthetic transition the ledger seam derives (built
  // from constants, never request material), into a bounded, process-local,
  // NON-DURABLE, tenant/estate/ACTOR-scoped store. Its records / ids are NEVER
  // surfaced in the public body; any store throw fails closed to the same stable
  // public-safe refusal as a partial failure. NO durable write, NO migration.
  //
  // The store write is attempted ONLY when the store AND the full synthetic
  // (tenant, estate, actor) scope are all injected; a partial injection records
  // nothing (stays the no-store path).
  /** Phase 46V route-storage spike store (DI seam). */
  routeStorageSpikeStore?: RouteStorageSpikeStore;
  /** Synthetic tenant id the route-storage spike records under (fixed dev
   *  constant; never request-derived). */
  routeStorageSpikeTenantId?: string;
  /** Synthetic estate id the route-storage spike records into (fixed dev
   *  constant; never request-derived). */
  routeStorageSpikeEstateId?: string;
  /** Synthetic actor id the route-storage spike scopes by (fixed dev constant;
   *  never request-derived) — the third isolation dimension (Phase 46U §10). */
  routeStorageSpikeActorId?: string;
}

/** Fixed synthetic identity constants for the dev-only ledger seam. These are
 *  short synthetic labels — never request-derived, never UUID/long-opaque. The
 *  spike body carries only `spike` + `transition_intent`, so the transition is
 *  built from these constants alone; no request-controlled material is placed in
 *  it. The ledger ALSO validates every field to a bounded synthetic shape before
 *  storing it, so this no-raw-payload property is enforced, not merely assumed
 *  (Phase 33P §8 no-raw-payload; §11 no-leak). */
const SYNTH_SOURCE_CANDIDATE_ID = 'cand-synthetic-dev';
const SYNTH_ADMIT_TRANSITION_ID = 'txn-admit-synthetic-dev';
const SYNTH_ADMITTED_ASSERTION_ID = 'assn-active-synthetic-dev';
const SYNTH_SUPERSEDE_TRANSITION_ID = 'txn-supersede-synthetic-dev';
const SYNTH_CORRECTED_ASSERTION_ID = 'assn-corrected-synthetic-dev';
const SYNTH_ASSERTION_CLASS = 'preference';

/**
 * Derive a SYNTHETIC admission transition from a classified scenario plus fixed
 * synthetic constants — NEVER from request-controlled material (the spike body
 * carries only `spike` + `transition_intent`). Returns null for any scenario
 * that mints no admitted assertion (pending / reject / malformed), so the route
 * only touches the ledger for `accept` and `supersede` (Phase 33P §9 cases 1–6).
 *
 * For `supersede` the transition references a prior synthetic active assertion
 * (the one an earlier `accept` would have minted) so the ledger can repoint
 * recall to the corrected active assertion while preserving the prior's
 * audit/provenance.
 */
function synthTransitionFor(
  classification: AdmissionSpikeClassification,
): SyntheticAdmissionTransition | null {
  switch (classification.scenario) {
    case 'accept':
      return {
        kind: 'admit',
        source_candidate_id: SYNTH_SOURCE_CANDIDATE_ID,
        admission_transition_id: SYNTH_ADMIT_TRANSITION_ID,
        admitted_assertion_id: SYNTH_ADMITTED_ASSERTION_ID,
        assertion_class: SYNTH_ASSERTION_CLASS,
        replay_key: `admit:${SYNTH_SOURCE_CANDIDATE_ID}`,
      };
    case 'supersede':
      return {
        kind: 'supersede',
        source_candidate_id: SYNTH_SOURCE_CANDIDATE_ID,
        admission_transition_id: SYNTH_SUPERSEDE_TRANSITION_ID,
        admitted_assertion_id: SYNTH_CORRECTED_ASSERTION_ID,
        assertion_class: SYNTH_ASSERTION_CLASS,
        replay_key: `supersede:${SYNTH_SOURCE_CANDIDATE_ID}`,
        supersedes_assertion_id: SYNTH_ADMITTED_ASSERTION_ID,
      };
    case 'pending':
    case 'reject':
    case 'malformed':
    default:
      return null;
  }
}

/** Stable public-safe refusal body for the disabled gate. Leaks nothing. */
function disabledRefusalBody() {
  return {
    spike: 'dev_operator_only_non_production' as const,
    outcome_class: 'refused' as const,
    error: 'admission.spike_disabled',
    message: 'admission intake dev spike is disabled',
  };
}

/** Stable public-safe refusal body for an unauthorized caller. Reveals nothing
 *  about which gate failed or whether a credential almost matched. */
function unauthorizedRefusalBody() {
  return {
    spike: 'dev_operator_only_non_production' as const,
    outcome_class: 'refused' as const,
    error: 'admission.unauthorized_dev_operator',
    message: 'dev/operator authorization required',
  };
}

/** Stable public-safe fail-closed refusal body (malformed / unsupported /
 *  partial-failure). Uses the existing stable Dixie shape-failure code; never
 *  leaks the hidden reason. */
function failClosedRefusalBody() {
  const c = ADMISSION_SPIKE_FAIL_CLOSED;
  return {
    spike: 'dev_operator_only_non_production' as const,
    outcome_class: c.outcome_class,
    scenario_id: 'malformed_or_unsafe_payload_fail_closed',
    recall_eligible: false as const,
    recall_projection: { ordinary_recall_includes: [], ordinary_recall_excludes: [] },
    public_receipt_ref: null,
    safe_reason_code: ADMISSION_SPIKE_SHAPE_REFUSAL_CODE,
    error: ADMISSION_SPIKE_SHAPE_REFUSAL_CODE,
    message: 'admission intake request refused',
  };
}

/** Hardcoded, known-safe fail-closed body returned ONLY when the runtime
 *  no-leak guard rejects (or throws on) an outgoing body — a never-expected
 *  event, since every public body is built structurally safe. It is a FIXED
 *  literal of short, safe strings, deliberately NOT re-run through the guard
 *  (no recursion), and it carries NONE of the guard's findings, so the failure
 *  detail never reaches the client. Proven safe by the no-leak unit test. */
function guardFailedFallbackBody() {
  return {
    spike: 'dev_operator_only_non_production' as const,
    outcome_class: 'refused' as const,
    error: 'admission.fail_closed',
    message: 'admission intake request refused',
  };
}

/** Public HTTP statuses the spike ever emits (all ContentfulStatusCode). */
type AdmissionSpikeStatus = 200 | 400 | 403 | 404 | 500;

export function createAdmissionIntakeRoutes(deps: AdmissionSpikeRouteDeps): Hono {
  const app = new Hono();
  const emit = deps.emitAudit ?? (() => undefined);
  const bodyMaxBytes = deps.bodyMaxBytes ?? DEFAULT_BODY_MAX_BYTES;
  const noLeakGuard = deps.noLeakGuard ?? findAdmissionPublicLeaks;

  /**
   * THE single send path for the route. Every public response — without
   * exception — is finalized here: the body is deep-walked through the runtime
   * no-leak guard (Phase 33M §14) BEFORE it is serialized. If the guard reports
   * any finding (or throws), the response collapses to a hardcoded known-safe
   * fail-closed fallback at HTTP 500; that fallback is NOT re-guarded (no
   * recursion) and carries none of the guard's findings, so the failure detail
   * never reaches the client. This makes the docs claim ("every public body is
   * deep-walked") a runtime invariant, not just a comment.
   *
   * `onSend` (the per-path public-safe audit event) is emitted ONLY when the
   * guard passes and the intended body is actually sent. A guard failure emits
   * exactly one `admission_intake_spike.refused` instead.
   */
  function sendPublicResponse(
    c: Context,
    status: AdmissionSpikeStatus,
    body: Record<string, unknown>,
    requestId: string | undefined,
    onSend: AdmissionSpikeAuditEvent,
  ): Response {
    let leaks: string[];
    try {
      leaks = noLeakGuard(body);
    } catch {
      // A guard that throws is treated exactly like a detected leak: fail
      // closed. Never surface the thrown error.
      leaks = ['guard_threw'];
    }
    if (leaks.length > 0) {
      // NOTE: deliberately do NOT include `leaks` in the response — the guard's
      // own findings can describe the rejected (potentially sensitive) body.
      emit({ event: 'admission_intake_spike.refused', request_id: requestId });
      return c.json(guardFailedFallbackBody(), 500);
    }
    emit(onSend);
    return c.json(body, status);
  }

  app.post('/', async (c) => {
    const { requestId } = getRequestContext(c);

    // (0) Disabled gate — defense-in-depth fail-closed (Phase 33M §9).
    if (!deps.enabled) {
      return sendPublicResponse(c, 404, disabledRefusalBody(), requestId, {
        event: 'admission_intake_spike.disabled',
        request_id: requestId,
      });
    }

    // (1) Dev/operator auth gate — NOT production auth (Phase 33M §12). One
    // stable refusal for missing/invalid/non-operator; never reveals which
    // gate failed or whether a credential almost matched.
    const authorized = authorizeAdmissionSpike(deps.gate, {
      serviceToken: c.req.header(SERVICE_TOKEN_HEADER),
      operatorId: c.req.header(OPERATOR_ID_HEADER),
    });
    if (!authorized) {
      return sendPublicResponse(c, 403, unauthorizedRefusalBody(), requestId, {
        event: 'admission_intake_spike.unauthorized',
        request_id: requestId,
      });
    }

    // (2) Bounded body read + parse. Any read/parse problem fails closed with
    // the stable shape-failure refusal (no leak of the hidden reason).
    const refused: AdmissionSpikeAuditEvent = {
      event: 'admission_intake_spike.refused',
      request_id: requestId,
    };
    let raw: unknown;
    try {
      const contentLengthHeader = c.req.header('content-length');
      if (contentLengthHeader) {
        const len = Number.parseInt(contentLengthHeader, 10);
        if (Number.isFinite(len) && len > bodyMaxBytes) {
          return sendPublicResponse(c, 400, failClosedRefusalBody(), requestId, refused);
        }
      }
      const text = await c.req.raw.clone().text();
      if (Buffer.byteLength(text, 'utf8') > bodyMaxBytes) {
        return sendPublicResponse(c, 400, failClosedRefusalBody(), requestId, refused);
      }
      raw = text.length === 0 ? null : JSON.parse(text);
    } catch {
      return sendPublicResponse(c, 400, failClosedRefusalBody(), requestId, refused);
    }

    // (3) Pure classification (Approach C — only the five Phase 33L scenario
    // forms; everything else throws and fails closed). Mints nothing durable.
    let classification: AdmissionSpikeClassification;
    try {
      classification = classifyAdmissionSpike(raw);
    } catch (err) {
      // Unsupported shape (or any classifier error) → identical public-safe
      // fail-closed refusal as the explicit malformed scenario.
      if (!(err instanceof AdmissionSpikeUnsupportedShapeError)) {
        // Defensive: any unexpected classifier error also fails closed.
      }
      return sendPublicResponse(c, 400, failClosedRefusalBody(), requestId, refused);
    }

    // (4) Partial-failure posture (Phase 33M §13.1; Phase 33Q ledger seam). Any
    // internal partial failure during finalization fails closed. With NO ledger
    // injected (the production/server default) this is the Phase 33N Option A
    // path verbatim: nothing durable to roll back, no recallable assertion, no
    // duplicate/partially-admitted residue. With the OPTIONAL dev-only synthetic
    // ledger injected (tests only), an accept/supersede records into the
    // bounded, process-local, NON-DURABLE ledger here — inside the SAME guarded
    // try, so a ledger throw (capacity / scope / replay-conflict) collapses to
    // the identical stable public-safe refusal and the bounded ledger is left
    // exactly as it was (atomic; no partially-admitted / recallable residue —
    // Phase 33P §9 case-8). The ledger result is intentionally discarded: it is
    // NEVER surfaced in the public body, which stays the deterministic
    // public-safe response built in step (5).
    try {
      deps.beforeFinalize?.(classification);
      if (
        deps.admittedAssertionLedger &&
        deps.admittedAssertionTenantId &&
        deps.admittedAssertionEstateId
      ) {
        const transition = synthTransitionFor(classification);
        if (transition) {
          deps.admittedAssertionLedger.record(
            {
              tenant_id: deps.admittedAssertionTenantId,
              estate_id: deps.admittedAssertionEstateId,
            },
            transition,
          );
        }
      }
      // Phase 46V route-storage spike (Mode 1): record the SAME fixed synthetic
      // transition into the bounded, NON-DURABLE, tenant/estate/actor-scoped
      // store when the store AND the full synthetic scope are injected. Inside
      // the SAME guarded try, so a store throw (capacity / scope / conflict /
      // tombstone) collapses to the identical stable public-safe refusal and the
      // store is left exactly as it was (atomic; no partially-admitted /
      // recallable residue). The result is intentionally discarded — it is NEVER
      // surfaced in the public body (step 5).
      if (
        deps.routeStorageSpikeStore &&
        deps.routeStorageSpikeTenantId &&
        deps.routeStorageSpikeEstateId &&
        deps.routeStorageSpikeActorId
      ) {
        const transition = synthTransitionFor(classification);
        if (transition) {
          deps.routeStorageSpikeStore.record(
            {
              tenant_id: deps.routeStorageSpikeTenantId,
              estate_id: deps.routeStorageSpikeEstateId,
              actor_id: deps.routeStorageSpikeActorId,
            },
            transition,
          );
        }
      }
    } catch {
      return sendPublicResponse(c, 400, failClosedRefusalBody(), requestId, refused);
    }

    // (5) Build the deterministic public-safe body. The runtime no-leak guard
    // runs inside sendPublicResponse (as it does for EVERY response path), so a
    // (never-expected) leak fails closed to the known-safe fallback there. The
    // outcome audit event is emitted only when the guard passes and the body is
    // actually sent.
    const body = buildAdmissionSpikePublicResponse(classification);
    return sendPublicResponse(
      c,
      classification.http_status,
      body as unknown as Record<string, unknown>,
      requestId,
      {
        event:
          classification.outcome_class === 'refused'
            ? 'admission_intake_spike.refused'
            : 'admission_intake_spike.outcome',
        scenario_id: body.scenario_id,
        outcome_class: body.outcome_class,
        request_id: requestId,
      },
    );
  });

  return app;
}
