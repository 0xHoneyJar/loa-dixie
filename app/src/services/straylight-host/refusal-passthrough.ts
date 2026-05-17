// Surface-by-surface identity relay helpers — Dixie-local adapter boundary.
//
// Dixie does not produce Straylight host objects. For each in-slice surface
// (Recall intake, receipt retrieval, exclusion display, provenance walk,
// audit-chain lookup, estate summary), Dixie receives the wedge-emitted
// typed response and relays it verbatim. These helpers exist to:
//
//   1. Make the relay role explicit at every call site (so reviewers and
//      future maintainers can see Dixie is not synthesising responses).
//   2. Provide a single seam for later instrumentation (logging, metrics,
//      trace propagation) without changing the surface contract.
//
// Every helper is an identity function on the corresponding response type:
//   * It MUST NOT mutate the input.
//   * It MUST NOT reclassify a `denied` / `refused` / `not_found` outcome
//     into a `served` / `found` outcome.
//   * It MUST NOT synthesise a success response.
//   * It MUST NOT collapse or rewrite discriminants.
//
// Typed refusal reasons are preserved verbatim — the response value
// returned is the exact value received.
//
// Response types are imported (type-only) from the tag-pinned
// `@loa/straylight/host` package; Dixie does not redefine the wire surface.

import type {
  AuditChainLookupResponse,
  EstateSummaryResponse,
  ExclusionDisplayResponse,
  ProvenanceWalkResponse,
  ReceiptRetrievalResponse,
  RecallIntakeResponse,
} from '@loa/straylight/host';

/**
 * Surface 1 relay. Dixie relays Straylight's `RecallIntakeResponse`
 * verbatim. Dixie does not produce a `RecallPack` / `RecallReceipt`,
 * does not reclassify denial reasons, and does not synthesise a
 * `served` outcome.
 */
export function relayRecallIntake(response: RecallIntakeResponse): RecallIntakeResponse {
  return response;
}

/**
 * Surface 2 relay. Dixie relays Straylight's `ReceiptRetrievalResponse`
 * verbatim. Dixie does not produce a `RecallReceipt` and does not
 * reclassify a `not_found` outcome.
 */
export function relayReceiptRetrieval(
  response: ReceiptRetrievalResponse,
): ReceiptRetrievalResponse {
  return response;
}

/**
 * Surface 3 relay. Dixie relays Straylight's `ExclusionDisplayResponse`
 * verbatim. Dixie does not produce `ExclusionAggregate` /
 * `RedactionAggregate` / `MarkedItemDisplay` shapes and does not
 * reclassify exclusion categories.
 */
export function relayExclusionDisplay(
  response: ExclusionDisplayResponse,
): ExclusionDisplayResponse {
  return response;
}

/**
 * Surface 4 relay. Dixie relays Straylight's `ProvenanceWalkResponse`
 * verbatim. Dixie does not produce provenance entries and does not
 * reclassify a `refused` outcome.
 */
export function relayProvenanceWalk(
  response: ProvenanceWalkResponse,
): ProvenanceWalkResponse {
  return response;
}

/**
 * Surface 5 relay. Dixie relays Straylight's `AuditChainLookupResponse`
 * verbatim. Dixie does not produce `AuditEvent` payloads, does not
 * verify chain links, and does not reclassify a `broken` or `refused`
 * outcome.
 */
export function relayAuditChainLookup(
  response: AuditChainLookupResponse,
): AuditChainLookupResponse {
  return response;
}

/**
 * Surface 6 relay. Dixie relays Straylight's `EstateSummaryResponse`
 * verbatim. Dixie does not produce `EstateSummaryCounts`, does not apply
 * frame discipline on its own, and does not reclassify a `refused`
 * outcome.
 */
export function relayEstateSummary(response: EstateSummaryResponse): EstateSummaryResponse {
  return response;
}
