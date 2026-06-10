// Phase 33N — dev/operator-only Admission Wedge route SPIKE: auth gate.
//
// This is a DEV/OPERATOR-ONLY gate, NOT production auth (Phase 33M §12).
// Service authentication here only proves a caller MAY exercise the dev spike;
// it does NOT prove end-user/channel/tenant/surface authorization, and it does
// NOT implement an end-user consent model. It exists to prove the spike is not
// public — never to claim production signer/authority semantics.
//
// Header choice (deliberate, documented): the service token is read from a
// DEDICATED `x-admission-service-token` header, NOT `Authorization: Bearer`.
// Rationale: the spike route is mounted under `/api/*`, behind the global
// allowlist middleware (server.ts), which already consumes `Authorization`
// (JWT wallet or `Bearer dxk_` api key) and is NOT exempt for `/api/admission`.
// Reusing `Authorization` for the dev token would collide with that global
// gate (a non-dxk/non-JWT bearer is rejected by the allowlist before the route
// runs, and would be needlessly run through the JWT verifier). A dedicated
// header keeps the spike behind BOTH the global allowlist (defense-in-depth)
// AND this dev/operator gate, without collision. The repo's only
// `Authorization: Bearer` service gate (admin) works only because admin is
// allowlist-exempt; the admission spike is not, so it does not reuse that
// pattern.
//
// Fail-closed rules (Phase 33M §1, §9):
//   * with BOTH the service token AND the operator-id allowlist empty/unset,
//     the gate rejects ALL calls (no production default);
//   * each CONFIGURED gate must pass: if a service token is configured, the
//     caller must present a matching `x-admission-service-token`; if an
//     operator-id allowlist is configured, the caller must present an
//     allowlisted `x-admission-operator-id`. Both configured → both required;
//   * comparisons are constant-time and never reveal whether a token almost
//     matched, nor which gate failed.

import { safeEqual } from '../../utils/crypto.js';

export interface AdmissionSpikeGateConfig {
  /** Configured dev/operator service token ('' = not configured). */
  serviceToken: string;
  /** Configured dev/operator id allowlist ([] = not configured). */
  operatorIds: string[];
}

export interface AdmissionSpikeCredentials {
  /** `x-admission-service-token` header value (or undefined). */
  serviceToken: string | undefined;
  /** `x-admission-operator-id` header value (or undefined). */
  operatorId: string | undefined;
}

/** Constant-time membership test that does not early-exit (avoids leaking which
 *  entry matched / how far the scan got). Returns false for an empty list. */
function allowlistContains(list: string[], candidate: string): boolean {
  let matched = false;
  for (const entry of list) {
    // Bitwise-OR accumulation; safeEqual itself is constant-time per pair.
    matched = safeEqual(entry, candidate) || matched;
  }
  return matched;
}

/**
 * Decide whether the caller may exercise the dev/operator spike. Returns a
 * single boolean; the route maps `false` to one stable public-safe refusal
 * regardless of WHY (missing/invalid/non-operator), so no information about
 * which gate failed or whether a credential almost matched is exposed.
 */
export function authorizeAdmissionSpike(
  config: AdmissionSpikeGateConfig,
  creds: AdmissionSpikeCredentials,
): boolean {
  const tokenConfigured = config.serviceToken.length > 0;
  const operatorConfigured = config.operatorIds.length > 0;

  // Fail closed: an empty token AND empty allowlist rejects all calls.
  if (!tokenConfigured && !operatorConfigured) return false;

  // Each CONFIGURED gate must pass. Unconfigured gates do not block, but at
  // least one is configured (guaranteed by the check above).
  let tokenOk = true;
  if (tokenConfigured) {
    const presented = creds.serviceToken;
    tokenOk =
      presented !== undefined &&
      presented.length > 0 &&
      safeEqual(presented, config.serviceToken);
  }

  let operatorOk = true;
  if (operatorConfigured) {
    operatorOk =
      creds.operatorId !== undefined &&
      creds.operatorId.length > 0 &&
      allowlistContains(config.operatorIds, creds.operatorId);
  }

  return tokenOk && operatorOk;
}
