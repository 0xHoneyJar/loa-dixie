#!/usr/bin/env node
// Phase 33L — Admission Wedge route-contract test-vector (draft v0) validator.
// Phase 33Z route-vector alignment — see the §"Phase 33Z alignment" block below.
//
// DOCS-ONLY / NON-RUNTIME. This script is an isolated, dependency-free shape /
// no-leak / non-final-marker validator over the JSON route-contract test-vector
// fixtures in THIS directory (docs/admission-wedge/route-contract-test-vectors).
// It is NOT wired into the application, NOT imported by any route, and exercises
// NO live admission behavior. It freezes no schema and authorizes no route,
// route spike, storage, auth, consent, or live admission.
//
// Phase 33Z alignment (docs + route-contract test-vector / validator alignment lane,
// non-runtime; authorized by Phase 33Y §10). Phase 33Z aligns these five vectors and
// this validator to the ACCEPTED Phase 33X / 33Y draft route-contract baseline and the
// source-real Phase 33N spike shape, WITHOUT freezing the route contract or final
// schema and WITHOUT authorizing any runtime/route/storage/auth/consent work:
//   * the public envelope is standardized on `public_receipt_ref` (string public-safe
//     DRAFT reference, or null where no public receipt is minted) — REPLACING the
//     pre-33Z `public_receipt_ref_policy` abstraction (33X §7.1; 33Y §5/§9;
//     source-real at public-response.ts:44,:104);
//   * the retired `public_receipt_ref_policy` and `receipt_public_ref` tokens are
//     rejected on the public surface;
//   * there is NO public `admission.duplicate_replay` code and no `duplicate_replay`
//     token anywhere (identical replay returns the prior public envelope; private
//     telemetry only — 33X §8 / 33Y §5,§9);
//   * class-validation rejection (malformed) uses the source-real `ingress.invalid_request`
//     (NOT `admission.unsupported_transition`, NOT dotted `admission.transition_denied`);
//   * policy denial (reject) uses the source-real underscored
//     `admission_transition_denied_draft_non_final` (the dotted code is draft-only / absent
//     from source and is rejected on the public surface);
//   * the five scenarios are preserved (no sixth); the unresolved-review markers,
//     draft-status flags, and the private TransitionReceipt / AuditEvent no-leak
//     boundary are unchanged.
//
// These vectors are route-contract test-vector DRAFTS, not executable route
// tests. They do not prove a route exists. This validator only checks that the
// authored draft fixtures are internally consistent, carry the correct
// non-final / unresolved-review markers, and never embed leak-shaped material in
// their public-response surface.
//
// Hard isolation rules (enforced by construction):
//   * Node built-ins ONLY (node:fs, node:path, node:url). No third-party deps.
//   * No package.json change, no lockfile change.
//   * No import of @loa/straylight, no import of any app/src route/service, and
//     no import of the sibling Phase 33E probe validator.
//   * No database, storage, network, or environment access.
//   * Validates ONLY files under docs/admission-wedge/route-contract-test-vectors.
//
// What it proves (Phase 33L):
//   1. EXACTLY five required scenario files exist and parse as JSON, the five
//      scenario_ids match their slots (preserved, never renamed/split/removed),
//      and there is NO sixth vector in this directory.
//   2. Shared metadata is present and correct for the route-vector draft:
//      vector_kind / vector_version / phase=33L / source_probe_version /
//      source_probe_phase=33E and the full non-final flag block
//      (schema_final / route_contract_final / runtime_enabled / route_implemented
//      / route_spike_authorized / storage_writes_performed / auth_implemented /
//      consent_implemented / production_admission all false;
//      straylight_primitive_review_complete false; public_safe true).
//   3. Unresolved-review markers are carried forward and NOT treated as resolved:
//      genuinely_unresolved_rows == [E,G,H,K,N,O] and
//      review_dependent_non_final_rows == [J].
//   4. Storage/auth/consent assumptions are draft / non-implemented and the
//      dev/operator scope is not authorized by Phase 33L.
//   5. The expected public-response carries a no-leak must_not_include denylist
//      and the no_leak_assertions block asserts no private/operational/raw/
//      idempotency/authority material on the public surface.
//   6. No leak-shaped material appears anywhere in the vector EXCEPT inside the
//      denylist arrays that legitimately NAME the forbidden categories — the
//      public-facing surfaces (request_vector, expected_public_response minus its
//      must_not_include list, recall projection) are deep-walked for forbidden
//      substrings / regex patterns / private keys.
//   7. All identifier-shaped values are short synthetic placeholders (no long
//      opaque/operational IDs anywhere in the document).
//   8. (Phase 33Z) The public envelope carries `public_receipt_ref` (string
//      public-safe DRAFT reference, or null for pending/malformed where no public
//      receipt is minted); the retired `public_receipt_ref_policy` and
//      `receipt_public_ref` tokens are absent from the public surface.
//   9. (Phase 33Z) The per-scenario public refusal taxonomy matches the source-real
//      codes: malformed -> `ingress.invalid_request`; reject ->
//      `admission_transition_denied_draft_non_final`; pending/accept/supersede ->
//      null. The draft-only / source-absent dotted `admission.transition_denied`,
//      `admission.unsupported_transition`, and `admission.duplicate_replay` codes
//      never appear on the public surface.
//  10. (Phase 33Z) No `duplicate_replay` token appears anywhere in any vector
//      (identical replay returns the prior public envelope; private telemetry only).
//
// It emits a deterministic pass/fail summary and exits non-zero on any failure.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const VECTORS_DIR = dirname(fileURLToPath(import.meta.url));

// scenario_id -> on-disk filename. EXACTLY these five (frozen-by-count; a future
// phase must not rename, split, remove, or add a sixth without a separate gate).
const REQUIRED = {
  candidate_pending_not_recallable: 'candidate-pending-not-recallable.json',
  accept_candidate_to_admitted_assertion: 'accept-candidate-to-admitted-assertion.json',
  reject_candidate_no_assertion: 'reject-candidate-no-assertion.json',
  supersede_with_corrected_assertion: 'supersede-with-corrected-assertion.json',
  malformed_or_unsafe_payload_fail_closed: 'malformed-or-unsafe-payload-fail-closed.json',
};

const VECTOR_KIND = 'dixie_admission_wedge_route_contract_test_vector';
const VECTOR_VERSION = 'dixie_admission_wedge_route_vector_draft_v0';
const PHASE = '33L';
const SOURCE_PROBE_VERSION = 'dixie_admission_wedge_probe_v1';
const SOURCE_PROBE_PHASE = '33E';

// Carried-forward Phase 33J §5/§6 + Phase 33K §5/§16 markers.
const EXPECTED_UNRESOLVED_ROWS = ['E', 'G', 'H', 'K', 'N', 'O'];
const EXPECTED_REVIEW_DEPENDENT_ROWS = ['J'];

// Boolean flags that MUST be exactly false on every vector (nothing is final /
// implemented / authorized / performed).
const FALSE_FLAGS = [
  'schema_final',
  'route_contract_final',
  'runtime_enabled',
  'route_implemented',
  'route_spike_authorized',
  'storage_writes_performed',
  'auth_implemented',
  'consent_implemented',
  'production_admission',
  'straylight_primitive_review_complete',
];

// The only stable PUBLIC reason code a vector may carry on its public surface is
// the existing Dixie-local refusal-family code (grounded in
// app/src/services/straylight-recall-intake/refusal-mapping.ts:12 and reused by
// the Phase 33N spike classifier at
// app/src/services/admission-wedge-spike/classifier.ts:64). Other vectors either
// carry null or the underscored draft/non-final admission denial marker.
const STABLE_PUBLIC_REASON_CODES = new Set(['ingress.invalid_request']);

// Phase 33Z per-scenario safe_reason_code taxonomy (aligned to the accepted Phase
// 33X / 33Y draft baseline AND the source-real Phase 33N spike classifier):
//   * malformed/unsafe class-validation rejection -> the source-real, stable Dixie
//     ingress code `ingress.invalid_request` (33Y §9: class-validation rejection
//     uses ingress.invalid_request, NOT admission.unsupported_transition and NOT
//     admission.transition_denied) — classifier.ts:64;
//   * policy denial (reject) -> the source-real underscored draft denial marker
//     `admission_transition_denied_draft_non_final` — classifier.ts:68 (the dotted
//     `admission.transition_denied` is a DRAFT-ONLY prose code, absent from source,
//     so it must NOT appear on the public test surface);
//   * pending / accept / supersede -> null (no public refusal code).
const EXPECTED_SAFE_REASON_CODE = {
  candidate_pending_not_recallable: null,
  accept_candidate_to_admitted_assertion: null,
  reject_candidate_no_assertion: 'admission_transition_denied_draft_non_final',
  supersede_with_corrected_assertion: null,
  malformed_or_unsafe_payload_fail_closed: 'ingress.invalid_request',
};

// Phase 33Z public-receipt-representation alignment. The accepted Phase 33X / 33Y
// baseline standardizes the public envelope on `public_receipt_ref` (33X §7.1,
// 33Y §5/§9), `null` where no public receipt is minted; the Phase 33N runtime
// spike already uses `public_receipt_ref: string | null` (public-response.ts:44,
// :104, gated by classifier `mints_public_receipt_ref`). Phase 33Z REPLACES the
// prior vector-level `public_receipt_ref_policy` abstraction with that field.
//   * scenarios that mint a public-safe receipt (accept / reject / supersede) carry
//     a non-null public-safe DRAFT placeholder string;
//   * scenarios that mint none (pending / malformed) carry `null`.
const RECEIPT_NULL_SCENARIOS = new Set([
  'candidate_pending_not_recallable',
  'malformed_or_unsafe_payload_fail_closed',
]);

// Retired / never-allowed public-surface receipt tokens. `public_receipt_ref_policy`
// is the pre-33Z vector abstraction that Phase 33Z replaces; `receipt_public_ref`
// is retired from the public envelope by 33V/33X/33Y (legacy debt lives only in the
// separately-gated Phase 33E fixtures). Either appearing on a route vector is a
// stale-state regression.
const RETIRED_RECEIPT_KEYS = new Set(['public_receipt_ref_policy', 'receipt_public_ref']);

// Public reason codes that are DRAFT-ONLY prose in the 33G/33X/33V/33Y design docs
// and ABSENT from runtime source — they must never appear on the public test
// surface (the vectors align to source-real codes only).
const FORBIDDEN_DRAFT_REASON_CODES = new Set([
  'admission.transition_denied',
  'admission.unsupported_transition',
  'admission.duplicate_replay',
]);

// Identical-replay returns the prior public envelope with NO new public code; any
// duplicate-replay classification is private telemetry only (33X §8 / 33Y §5,§9).
// The token must therefore appear nowhere in a route vector.
const FORBIDDEN_REPLAY_TOKEN = 'duplicate_replay';

// Substrings that must never appear in a public-facing surface (keys or string
// values), mirroring the Phase 33E probe validator's defensive set.
const FORBIDDEN_SUBSTRINGS = [
  'unsafe_marker:',
  'BODY_OVER_CAP',
  'body-over-cap',
  'runtime_seam:internal:',
  'CANDIDATE_PRIVATE_SENTINEL',
  'SOURCE_SENTINEL',
  'SUPERSEDED_PRIVATE_SENTINEL',
  'ADMITTED_PRIVATE_SENTINEL',
  'STRAYLIGHT_RUNTIME_DIXIE_KEY',
  'ADMIN_KEY',
  'Traceback',
  'node_modules/',
  '-----BEGIN ',
];

// Regex leak patterns checked against every string value/key in a public surface.
const FORBIDDEN_PATTERNS = [
  { name: 'url', re: /\bhttps?:\/\//i },
  { name: 'ws-url', re: /\bwss?:\/\//i },
  { name: 'jwt', re: /\beyJ[A-Za-z0-9_-]{8,}/ },
  { name: 'openai-style-key', re: /\bsk-[A-Za-z0-9]{16,}/ },
  { name: 'bearer-token', re: /\bBearer\s+\S+/ },
  { name: '0x-hex-address', re: /0x[0-9a-fA-F]{16,}/ },
  { name: 'long-hex-id', re: /\b[0-9a-fA-F]{40,}\b/ },
  { name: 'long-opaque-id', re: /[A-Za-z0-9]{32,}/ },
  { name: 'stack-frame', re: /\bat\s+\/?\S+:\d+:\d+/ },
  { name: 'error-prefix', re: /\b(?:Error|TypeError|RangeError|SyntaxError):\s/ },
];

// Keys that are private/audit/operational and must never appear as keys on the
// public-facing surface. Presence of any of these as an object key on the public
// surface is a leak regardless of value.
//
// This set covers (a) the operational/private identifier and payload keys, and
// (b) every no-leak category named by README §9 (raw candidate payload, source
// material, raw reasons, private/audit fields, operational ids, idempotency keys,
// authority/signature material, tokens, urls, stack traces, storage internals),
// plus obvious singular/plural / snake-case variants. The one negative-assertion
// flag whose presence-as-`false` is legitimate (`rendered_candidate_payload`) is
// handled separately by NEGATIVE_ASSERTION_KEYS below, NOT here.
const FORBIDDEN_PUBLIC_KEYS = new Set([
  'tenant_id',
  'estate_id',
  'candidate_id',
  'source_candidate_id',
  'prior_assertion_id',
  'proposing_actor_id',
  'correcting_actor_id',
  'caller_actor_id',
  'subject_actor_id',
  'actor_id',
  'candidate_payload',
  'corrected_candidate_payload',
  'source_ref',
  'source_kind',
  'raw_reasons',
  'raw_reason',
  'policy_reason',
  'private_reason_family',
  'receipt_id',
  'receiptId',
  'audit_receipt_ref',
  // Private `TransitionReceipt` / `AuditEvent` / private-receipt shapes. Only the
  // public-safe `public_receipt_ref` (and its `null`) may cross to the public
  // surface (33X §7.1/§7.2, 33V §4/§7, 33Y §5/§9). The private TransitionReceipt,
  // the AuditEvent (incl. its class), the private/internal receipt reference, the
  // transition id, signer/signature material, opaque policy detail, and a raw
  // `metadata` bag must NEVER appear on the public surface — they belong to the
  // private `expected_private_or_audit_effect` block (which `publicSurface()`
  // excludes from this walk), not to the caller-observable response. snake_case
  // and camelCase spellings are both forbidden so a serializer rename cannot leak.
  'transition_receipt',
  'transitionReceipt',
  'transition_receipt_ref',
  'transitionReceiptRef',
  'transition_id',
  'transitionId',
  'audit_event',
  'auditEvent',
  'audit_event_class',
  'auditEventClass',
  'audit_ref',
  'auditRef',
  'audit_id',
  'auditId',
  'receipt_ref',
  'receiptRef',
  'private_receipt_ref',
  'privateReceiptRef',
  'signer',
  'signature',
  'policy_details',
  'policyDetails',
  'metadata',
  // `receipt_public_ref` is retired from the public envelope by Phase 33V/33X/33Y
  // (the public field is now `public_receipt_ref`); its legacy spelling survives
  // only in the separately-gated Phase 33E fixtures. It must never appear on a
  // route-vector public surface.
  'receipt_public_ref',
  'idempotency_key',
  'idempotency_key_draft',
  'authority_signer_type_draft',
  'authority_scope_draft',
  'admission_transition_id',
  'admitted_assertion_id',
  'supersedes_assertion_id',
  'superseded_by_assertion_id',
  // README §9 no-leak categories + variants (forbidden as public-surface keys).
  'raw_candidate_payload',
  'raw_candidate_payloads',
  'rendered_candidate_payloads',
  'source_material',
  'source_materials',
  'private_audit_fields',
  'private_audit_field',
  'operational_ids',
  'operational_id',
  'operational_tenant_estate_actor_ids',
  'authority_signature_material',
  'authority_signature',
  'signature_material',
  'tokens',
  'token',
  'secrets',
  'secret',
  'urls',
  'url',
  'stack_traces',
  'stack_trace',
  'stack_traces_debug_internals',
  'storage_internals',
  'storage_internal',
]);

// Negative-assertion keys: their presence on the public surface is legitimate
// ONLY when they carry the boolean literal `false` (the vector affirmatively
// states the payload is NOT rendered). Any data-bearing value is a leak. Kept
// out of FORBIDDEN_PUBLIC_KEYS so a `false` flag is not mistaken for a leak.
const NEGATIVE_ASSERTION_KEYS = new Set(['rendered_candidate_payload']);

// A general UUID shape (incl. UUID v4). UUIDs are opaque operational identifiers
// and must never appear anywhere in a vector — they evade the unbroken-run check
// because their hyphens keep each segment short. Enforced globally (whole vector).
const UUID_RE = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/;

// Any value containing an UNBROKEN alphanumeric run this long is treated as an
// opaque / operational id (hash, token, long key) and rejected. Authored
// placeholders are descriptive lower-snake labels whose separators (_ - . space)
// keep every run short, so this never trips on legitimate draft markers/prose.
const MAX_OPAQUE_RUN = 24;

// ---------------------------------------------------------------------------
// Walk helpers
// ---------------------------------------------------------------------------

/** Walk every (key, string-value) pair, skipping any subtree whose key is in
 *  `skipKeys` (used to skip the denylist arrays that legitimately name forbidden
 *  categories). */
function* walk(node, path, skipKeys) {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    yield { kind: 'value', path, value: node };
    return;
  }
  if (typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield* walk(node[i], `${path}[${i}]`, skipKeys);
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    yield { kind: 'key', path: `${path}.${k}`, value: k, child: v };
    if (skipKeys && skipKeys.has(k)) continue; // do not descend into denylist arrays
    yield* walk(v, `${path}.${k}`, skipKeys);
  }
}

// Public-facing surface = request_vector + expected_public_response (minus its
// must_not_include denylist) + expected_recall_projection. These are the parts a
// caller could conceivably observe; they must never embed leak-shaped material.
function publicSurface(vec) {
  const epr = { ...(vec.expected_public_response ?? {}) };
  delete epr.must_not_include; // legitimately names forbidden categories
  return {
    request_vector: vec.request_vector ?? {},
    expected_public_response: epr,
    expected_recall_projection: vec.expected_recall_projection ?? {},
  };
}

function noLeakFailures(surface) {
  const failures = [];
  for (const node of walk(surface, '$.public_surface', null)) {
    if (node.kind === 'key') {
      if (FORBIDDEN_PUBLIC_KEYS.has(node.value)) {
        failures.push(`private/operational/forbidden-category key "${node.value}" present on public surface at ${node.path}`);
      }
      // Negative-assertion keys are allowed ONLY as the literal `false`.
      if (NEGATIVE_ASSERTION_KEYS.has(node.value) && node.child !== false) {
        failures.push(`negative-assertion key "${node.value}" on public surface at ${node.path} must be the boolean false, not ${JSON.stringify(node.child)} (a present payload is a leak)`);
      }
    }
    for (const s of FORBIDDEN_SUBSTRINGS) {
      if (node.value.includes(s)) failures.push(`forbidden substring "${s}" on public surface at ${node.path}`);
    }
    for (const p of FORBIDDEN_PATTERNS) {
      if (p.re.test(node.value)) failures.push(`forbidden ${p.name} pattern on public surface at ${node.path}`);
    }
    if (UUID_RE.test(node.value)) {
      failures.push(`UUID-shaped operational identifier on public surface at ${node.path} — ids must be short synthetic placeholders`);
    }
  }
  return failures;
}

// No long opaque/operational ids anywhere in the document. Descriptive
// snake/kebab/dotted labels and prose are fine; an unbroken alphanumeric run of
// MAX_OPAQUE_RUN+ chars (a hash, token, or operational id) is not. UUID-shaped
// identifiers are ALSO rejected globally: their hyphens keep every run short so
// the unbroken-run check alone misses them, yet they are exactly the long opaque
// operational ids the vectors must never carry (short synthetic placeholders
// only). The global scope here means a UUID injected into any section — public,
// private/audit, recall, request, or metadata — fails the vector.
const OPAQUE_RUN_RE = new RegExp(`[A-Za-z0-9]{${MAX_OPAQUE_RUN},}`);
function syntheticIdFailures(vec) {
  const failures = [];
  for (const node of walk(vec, '$', null)) {
    if (node.kind !== 'value') continue;
    if (OPAQUE_RUN_RE.test(node.value)) {
      failures.push(`opaque/operational-id-shaped run (>=${MAX_OPAQUE_RUN} unbroken alphanumerics) at ${node.path} — ids must be short synthetic placeholders`);
    }
    if (UUID_RE.test(node.value)) {
      failures.push(`UUID-shaped operational identifier at ${node.path} — ids must be short synthetic placeholders, not UUIDs`);
    }
  }
  return failures;
}

// Retired receipt-spelling lock (global, recursive). Phase 33Z retired the
// vector-level `public_receipt_ref_policy` abstraction (replaced by the source-real
// `public_receipt_ref`) and 33V/33X/33Y retired the `receipt_public_ref` spelling
// from the public envelope. Neither may appear as an object KEY at ANY depth of a
// route-contract vector — not just at the top of `expected_public_response`. A
// shallow (direct-property) check let a nested reintroduction (e.g. inside a sub-
// object on the public surface) slip through; this walk closes that escape. Exact
// key match only, so the live `public_receipt_ref` field is never affected.
function retiredReceiptKeyFailures(vec) {
  const failures = [];
  for (const node of walk(vec, '$', null)) {
    if (node.kind === 'key' && RETIRED_RECEIPT_KEYS.has(node.value)) {
      failures.push(`retired receipt key "${node.value}" present at ${node.path} — Phase 33Z standardizes the public envelope on "public_receipt_ref"; the retired token must not appear at any depth of a route vector`);
    }
  }
  return failures;
}

// No public `admission.duplicate_replay` code, and no `duplicate_replay` token at
// all. The accepted 33X §8 / 33Y §5,§9 baseline retires duplicate-replay from the
// public taxonomy: identical replay returns the PRIOR public envelope unchanged
// (no new public code), and any duplicate-replay classification is private
// telemetry only. The token must therefore appear nowhere in a route vector (keys
// or values). Each vector instead encodes replay semantics in its prose
// `idempotency_expectation` string without a public code.
function replayTokenFailures(vec) {
  const failures = [];
  for (const node of walk(vec, '$', null)) {
    if (node.value.includes(FORBIDDEN_REPLAY_TOKEN)) {
      failures.push(`forbidden "${FORBIDDEN_REPLAY_TOKEN}" token at ${node.path} — there is no public admission.duplicate_replay code; identical replay returns the prior public envelope (private telemetry only)`);
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function checkMetadata(vec, push) {
  if (vec.vector_kind !== VECTOR_KIND) push(`vector_kind must be "${VECTOR_KIND}" (got ${JSON.stringify(vec.vector_kind)})`);
  if (vec.vector_version !== VECTOR_VERSION) push(`vector_version must be "${VECTOR_VERSION}" (got ${JSON.stringify(vec.vector_version)})`);
  if (vec.phase !== PHASE) push(`phase must be "${PHASE}" (got ${JSON.stringify(vec.phase)})`);
  if (vec.source_probe_version !== SOURCE_PROBE_VERSION) push(`source_probe_version must be "${SOURCE_PROBE_VERSION}" (got ${JSON.stringify(vec.source_probe_version)})`);
  if (vec.source_probe_phase !== SOURCE_PROBE_PHASE) push(`source_probe_phase must be "${SOURCE_PROBE_PHASE}" (got ${JSON.stringify(vec.source_probe_phase)})`);
  for (const f of FALSE_FLAGS) {
    if (vec[f] !== false) push(`${f} must be false (got ${JSON.stringify(vec[f])})`);
  }
  if (vec.public_safe !== true) push('public_safe must be true');
}

function checkUnresolvedMarkers(vec, push) {
  const m = vec.unresolved_review_markers;
  if (!m || typeof m !== 'object') {
    push('unresolved_review_markers object is required (genuinely_unresolved_rows / review_dependent_non_final_rows)');
    return;
  }
  if (!arraysEqual(m.genuinely_unresolved_rows, EXPECTED_UNRESOLVED_ROWS)) {
    push(`unresolved_review_markers.genuinely_unresolved_rows must be ${JSON.stringify(EXPECTED_UNRESOLVED_ROWS)} (got ${JSON.stringify(m.genuinely_unresolved_rows)})`);
  }
  if (!arraysEqual(m.review_dependent_non_final_rows, EXPECTED_REVIEW_DEPENDENT_ROWS)) {
    push(`unresolved_review_markers.review_dependent_non_final_rows must be ${JSON.stringify(EXPECTED_REVIEW_DEPENDENT_ROWS)} (got ${JSON.stringify(m.review_dependent_non_final_rows)})`);
  }
}

function checkStorageAuthConsent(vec, push) {
  const s = vec.storage_auth_consent_assumptions;
  if (!s || typeof s !== 'object') {
    push('storage_auth_consent_assumptions object is required');
    return;
  }
  if (s.storage_model !== 'draft_non_implemented') push('storage_auth_consent_assumptions.storage_model must be "draft_non_implemented"');
  if (s.service_auth_model !== 'draft_non_implemented') push('storage_auth_consent_assumptions.service_auth_model must be "draft_non_implemented"');
  if (s.end_user_consent_model !== 'draft_non_implemented') push('storage_auth_consent_assumptions.end_user_consent_model must be "draft_non_implemented"');
  if (s.dev_operator_scope !== 'not_authorized_by_phase_33l') push('storage_auth_consent_assumptions.dev_operator_scope must be "not_authorized_by_phase_33l"');
}

function checkRequestVector(vec, push) {
  const r = vec.request_vector;
  if (!r || typeof r !== 'object') {
    push('request_vector object is required');
    return;
  }
  if (r.route_exists !== false) push('request_vector.route_exists must be false (no admission route exists)');
  if (r.route_authorized !== false) push('request_vector.route_authorized must be false');
  if (r.storage_assumption !== 'draft_no_write_performed') push('request_vector.storage_assumption must be "draft_no_write_performed"');
  if (typeof r.auth_assumption !== 'string' || !/^draft_/.test(r.auth_assumption)) push('request_vector.auth_assumption must be a draft_* marker');
  if (typeof r.consent_assumption !== 'string' || !/^draft_/.test(r.consent_assumption)) push('request_vector.consent_assumption must be a draft_* marker');
}

function checkPublicResponse(vec, scenarioId, push) {
  const p = vec.expected_public_response;
  if (!p || typeof p !== 'object') {
    push('expected_public_response object is required');
    return;
  }
  if (!Array.isArray(p.must_not_include) || p.must_not_include.length === 0) {
    push('expected_public_response.must_not_include must be a non-empty no-leak denylist');
  }
  if (p.rendered_candidate_payload !== false) push('expected_public_response.rendered_candidate_payload must be false');

  // Phase 33Z public-receipt representation. The public envelope is standardized on
  // `public_receipt_ref` (33X §7.1, 33Y §5/§9; source-real at public-response.ts:44).
  // The retired `public_receipt_ref_policy` abstraction and the retired
  // `receipt_public_ref` spelling must be gone from the public response.
  for (const retired of RETIRED_RECEIPT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(p, retired)) {
      push(`expected_public_response must not carry the retired key "${retired}" — Phase 33Z standardizes the public envelope on "public_receipt_ref"`);
    }
  }
  if (!Object.prototype.hasOwnProperty.call(p, 'public_receipt_ref')) {
    push('expected_public_response.public_receipt_ref is required (string public-safe draft reference, or null where no public receipt is minted)');
  } else {
    const ref = p.public_receipt_ref;
    const mustBeNull = RECEIPT_NULL_SCENARIOS.has(scenarioId);
    if (mustBeNull) {
      if (ref !== null) {
        push(`${scenarioId}: expected_public_response.public_receipt_ref must be null (no public receipt is minted; got ${JSON.stringify(ref)})`);
      }
    } else if (typeof ref !== 'string' || ref.length === 0) {
      push(`${scenarioId}: expected_public_response.public_receipt_ref must be a non-empty public-safe draft reference string (a public receipt is minted; got ${JSON.stringify(ref)})`);
    } else if (!/draft|reference/.test(ref)) {
      // It must stay an explicitly DRAFT, non-final public-safe placeholder — never a
      // frozen/final value and never an operational id (the global opaque-run / no-leak
      // walks additionally guard the value's shape).
      push(`${scenarioId}: expected_public_response.public_receipt_ref must be an explicitly draft/non-final public-safe placeholder (got ${JSON.stringify(ref)}); Phase 33Z freezes no final schema`);
    }
  }

  // Per-scenario safe_reason_code taxonomy (source-real codes only).
  //
  // `safe_reason_code` MUST be present on every vector's public response. A missing
  // property is NOT equivalent to a null code: an omitted field would let a null-code
  // scenario silently drop its explicit "no public refusal code" assertion. So the
  // property must exist, and for the null scenarios its value must be the JSON literal
  // `null` (never omitted, never any other falsy value).
  const codePresent = Object.prototype.hasOwnProperty.call(p, 'safe_reason_code');
  if (!codePresent) {
    push('expected_public_response.safe_reason_code is required on every vector (must exist; null scenarios must carry the literal null, not omit the field)');
  }
  const code = p.safe_reason_code;
  if (typeof code === 'string' && FORBIDDEN_DRAFT_REASON_CODES.has(code)) {
    push(`expected_public_response.safe_reason_code "${code}" is a draft-only prose code absent from source and must not appear on the public surface (class-validation rejection uses "ingress.invalid_request"; policy denial uses the source-real "admission_transition_denied_draft_non_final")`);
  }
  if (Object.prototype.hasOwnProperty.call(EXPECTED_SAFE_REASON_CODE, scenarioId)) {
    // Exact scenario value enforcement: the property must exist AND strictly equal the
    // expected value. For null scenarios this requires the literal `null` to be present
    // (an omitted field — `code === undefined` — fails, since `undefined !== null`).
    const expected = EXPECTED_SAFE_REASON_CODE[scenarioId];
    if (!codePresent || code !== expected) {
      push(`${scenarioId}: expected_public_response.safe_reason_code must be exactly ${JSON.stringify(expected)} and present (got ${codePresent ? JSON.stringify(code) : 'omitted'})`);
    }
  } else if (codePresent && code !== null) {
    // Defensive fallback for any future scenario id: present, and either null, the
    // stable Dixie code, or an explicit draft marker.
    if (typeof code !== 'string') {
      push('expected_public_response.safe_reason_code must be null or a string');
    } else if (!STABLE_PUBLIC_REASON_CODES.has(code) && !/draft|non_final/.test(code)) {
      push(`expected_public_response.safe_reason_code must be null, the stable Dixie code "ingress.invalid_request", or a draft/non_final marker (got ${JSON.stringify(code)})`);
    }
  }
}

function checkNoLeakAssertions(vec, push) {
  const n = vec.no_leak_assertions;
  if (!n || typeof n !== 'object') {
    push('no_leak_assertions object is required');
    return;
  }
  const mustBeFalse = [
    'public_response_contains_private_material',
    'public_response_contains_operational_ids',
    'public_response_contains_raw_candidate',
    'public_response_contains_idempotency_key',
    'public_response_contains_authority_material',
  ];
  for (const k of mustBeFalse) {
    if (n[k] !== false) push(`no_leak_assertions.${k} must be false`);
  }
}

function checkRecallProjection(vec, scenarioId, push) {
  const rp = vec.expected_recall_projection;
  if (!rp || typeof rp !== 'object') {
    push('expected_recall_projection object is required');
    return;
  }
  if (rp.candidate_recallable_before_admission !== false) {
    push('expected_recall_projection.candidate_recallable_before_admission must be false');
  }
  // Pending / reject / malformed must include nothing in ordinary recall.
  const emptyRecallScenarios = new Set([
    'candidate_pending_not_recallable',
    'reject_candidate_no_assertion',
    'malformed_or_unsafe_payload_fail_closed',
  ]);
  if (emptyRecallScenarios.has(scenarioId)) {
    if (!Array.isArray(rp.ordinary_recall_includes) || rp.ordinary_recall_includes.length !== 0) {
      push(`${scenarioId}: expected_recall_projection.ordinary_recall_includes must be empty`);
    }
  }
  if (scenarioId === 'supersede_with_corrected_assertion') {
    if (!Array.isArray(rp.ordinary_recall_includes) || rp.ordinary_recall_includes.length !== 1) {
      push('supersede: ordinary_recall_includes must contain exactly the corrected active assertion placeholder');
    }
    if (!Array.isArray(rp.ordinary_recall_excludes) || rp.ordinary_recall_excludes.length !== 1) {
      push('supersede: ordinary_recall_excludes must contain exactly the superseded prior placeholder');
    }
  }
}

// Run the full per-vector check battery and return the accumulated failures. Shared
// by the main validator and the `--self-check` negative-mutation harness so both
// exercise byte-identical enforcement.
function collectVectorFailures(vec, scenarioId) {
  const failures = [];
  const push = (m) => failures.push(m);

  if (vec.scenario_id !== scenarioId) push(`scenario_id must be "${scenarioId}" (got ${JSON.stringify(vec.scenario_id)})`);

  checkMetadata(vec, push);
  checkUnresolvedMarkers(vec, push);
  checkStorageAuthConsent(vec, push);
  checkRequestVector(vec, push);
  checkPublicResponse(vec, scenarioId, push);
  checkNoLeakAssertions(vec, push);
  checkRecallProjection(vec, scenarioId, push);

  for (const f of noLeakFailures(publicSurface(vec))) push(f);
  for (const f of syntheticIdFailures(vec)) push(f);
  for (const f of replayTokenFailures(vec)) push(f);
  for (const f of retiredReceiptKeyFailures(vec)) push(f);

  return failures;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function validate() {
  const results = [];

  // No sixth vector: every .json in this directory must be one of the five.
  const onDisk = existsSync(VECTORS_DIR)
    ? readdirSync(VECTORS_DIR).filter((f) => f.endsWith('.json'))
    : [];
  const allowed = new Set(Object.values(REQUIRED));
  const extras = onDisk.filter((f) => !allowed.has(f));

  for (const [scenarioId, filename] of Object.entries(REQUIRED)) {
    const path = join(VECTORS_DIR, filename);

    if (!existsSync(path)) {
      results.push({ scenarioId, filename, failures: ['file does not exist'] });
      continue;
    }

    let vec;
    try {
      vec = JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
      results.push({ scenarioId, filename, failures: [`JSON parse error: ${err.message}`] });
      continue;
    }

    results.push({ scenarioId, filename, failures: collectVectorFailures(vec, scenarioId) });
  }

  return { results, extras };
}

function report({ results, extras }) {
  const lines = [];
  lines.push('Phase 33L — Admission Wedge route-contract test-vector (draft v0) validation');
  lines.push('============================================================================');
  lines.push(`vectors dir: ${VECTORS_DIR}`);
  lines.push(`vector version: ${VECTOR_VERSION}`);
  lines.push(`required vectors: ${Object.keys(REQUIRED).length}`);
  lines.push('');

  let failedVectors = 0;
  let totalFailures = 0;

  for (const r of results) {
    if (r.failures.length === 0) {
      lines.push(`PASS  ${r.scenarioId}  (${basename(r.filename)})`);
    } else {
      failedVectors++;
      totalFailures += r.failures.length;
      lines.push(`FAIL  ${r.scenarioId}  (${basename(r.filename)})`);
      for (const f of r.failures) lines.push(`        - ${f}`);
    }
  }

  // No-sixth-vector check.
  let sixthFailure = false;
  if (extras.length > 0) {
    sixthFailure = true;
    lines.push('');
    lines.push(`FAIL  no-sixth-vector  — unexpected JSON file(s) present: ${extras.join(', ')}`);
  } else {
    lines.push('');
    lines.push('PASS  no-sixth-vector  (exactly five route-contract test-vector JSON files)');
  }

  lines.push('');
  lines.push('----------------------------------------------------------------------------');
  const ok = failedVectors === 0 && !sixthFailure;
  if (ok) {
    lines.push(`RESULT: PASS — ${results.length}/${results.length} vectors valid, 0 failures, no sixth vector.`);
  } else {
    lines.push(`RESULT: FAIL — ${failedVectors}/${results.length} vectors failed, ${totalFailures} failure(s)${sixthFailure ? ', plus an unexpected extra vector' : ''}.`);
  }

  process.stdout.write(lines.join('\n') + '\n');
  return ok;
}

// ---------------------------------------------------------------------------
// Negative-mutation self-check (`--self-check`)
// ---------------------------------------------------------------------------
//
// Proves the validator FAILS CLOSED on the specific leak/omission shapes the Phase
// 33Z hardening pass targets. Each case loads a known-good vector, applies one
// mutation, runs the SAME `collectVectorFailures` battery the live validator uses,
// and asserts a matching failure is raised. Node built-ins only; mutates no file on
// disk (the on-disk vectors are read once and deep-cloned per case via JSON round-
// trip). A case that does NOT fail closed is itself a self-check failure.

function loadGoodVector(scenarioId) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, REQUIRED[scenarioId]), 'utf8'));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const SELF_CHECK_CASES = [
  {
    name: 'nested public_receipt_ref_policy inside expected_public_response',
    scenarioId: 'accept_candidate_to_admitted_assertion',
    mutate: (v) => {
      v.expected_public_response.receipt_block_draft = {
        public_receipt_ref_policy: 'public_safe_receipt_reference_draft',
      };
    },
    expectSubstring: 'retired receipt key "public_receipt_ref_policy"',
  },
  {
    name: 'omitted safe_reason_code in a null-code scenario (must be literal null)',
    scenarioId: 'candidate_pending_not_recallable',
    mutate: (v) => {
      delete v.expected_public_response.safe_reason_code;
    },
    expectSubstring: 'safe_reason_code must be exactly null and present',
  },
  {
    name: 'transition_receipt in expected_public_response',
    scenarioId: 'accept_candidate_to_admitted_assertion',
    mutate: (v) => {
      v.expected_public_response.transition_receipt = 'leaked_private_receipt_draft';
    },
    expectSubstring: '"transition_receipt" present on public surface',
  },
  {
    name: 'audit_event_class in expected_public_response',
    scenarioId: 'reject_candidate_no_assertion',
    mutate: (v) => {
      v.expected_public_response.audit_event_class = 'transition_denied_draft';
    },
    expectSubstring: '"audit_event_class" present on public surface',
  },
  {
    name: 'private receipt_ref in expected_public_response',
    scenarioId: 'accept_candidate_to_admitted_assertion',
    mutate: (v) => {
      v.expected_public_response.receipt_ref = 'private_receipt_ref_draft';
    },
    expectSubstring: '"receipt_ref" present on public surface',
  },
];

function selfCheck() {
  const lines = [];
  lines.push('Phase 33Z — route-contract test-vector validator NEGATIVE self-check');
  lines.push('============================================================================');
  lines.push('Each case mutates a known-good vector and asserts the validator fails closed.');
  lines.push('');

  let passed = 0;
  let failed = 0;

  for (const c of SELF_CHECK_CASES) {
    // Baseline: the unmutated vector must validate clean, so any failure is the
    // mutation's doing and not a pre-existing problem.
    const baseline = collectVectorFailures(loadGoodVector(c.scenarioId), c.scenarioId);
    if (baseline.length !== 0) {
      failed++;
      lines.push(`FAIL  ${c.name}`);
      lines.push(`        - baseline vector "${c.scenarioId}" unexpectedly has ${baseline.length} failure(s) before mutation:`);
      for (const f of baseline) lines.push(`            · ${f}`);
      continue;
    }

    const mutated = deepClone(loadGoodVector(c.scenarioId));
    c.mutate(mutated);
    const failures = collectVectorFailures(mutated, c.scenarioId);
    const matched = failures.filter((f) => f.includes(c.expectSubstring));

    if (matched.length > 0) {
      passed++;
      lines.push(`PASS  ${c.name}`);
      lines.push(`        fails closed → ${matched[0]}`);
    } else {
      failed++;
      lines.push(`FAIL  ${c.name}`);
      lines.push(`        - expected a failure containing: ${JSON.stringify(c.expectSubstring)}`);
      lines.push(`        - actual failures (${failures.length}): ${failures.length ? '' : '(none — validator did NOT fail closed)'}`);
      for (const f of failures) lines.push(`            · ${f}`);
    }
  }

  lines.push('');
  lines.push('----------------------------------------------------------------------------');
  const ok = failed === 0;
  if (ok) {
    lines.push(`RESULT: PASS — ${passed}/${SELF_CHECK_CASES.length} negative mutations fail closed as required.`);
  } else {
    lines.push(`RESULT: FAIL — ${failed}/${SELF_CHECK_CASES.length} negative mutation(s) did NOT fail closed.`);
  }

  process.stdout.write(lines.join('\n') + '\n');
  return ok;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

const ok = process.argv.includes('--self-check') ? selfCheck() : report(validate());
process.exit(ok ? 0 : 1);
