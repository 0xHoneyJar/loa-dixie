#!/usr/bin/env node
// Phase 33L — Admission Wedge route-contract test-vector (draft v0) validator.
//
// DOCS-ONLY / NON-RUNTIME. This script is an isolated, dependency-free shape /
// no-leak / non-final-marker validator over the JSON route-contract test-vector
// fixtures in THIS directory (docs/admission-wedge/route-contract-test-vectors).
// It is NOT wired into the application, NOT imported by any route, and exercises
// NO live admission behavior. It freezes no schema and authorizes no route,
// route spike, storage, auth, consent, or live admission.
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
// app/src/services/straylight-recall-intake/refusal-mapping.ts). Other vectors
// either carry null or a clearly draft/non-final admission reason marker.
const STABLE_PUBLIC_REASON_CODES = new Set(['ingress.invalid_request']);

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
  'audit_receipt_ref',
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

function checkPublicResponse(vec, push) {
  const p = vec.expected_public_response;
  if (!p || typeof p !== 'object') {
    push('expected_public_response object is required');
    return;
  }
  if (!Array.isArray(p.must_not_include) || p.must_not_include.length === 0) {
    push('expected_public_response.must_not_include must be a non-empty no-leak denylist');
  }
  if (p.rendered_candidate_payload !== false) push('expected_public_response.rendered_candidate_payload must be false');
  // safe_reason_code: null OR a clearly-draft marker OR the one stable Dixie code.
  const code = p.safe_reason_code;
  if (code !== null && code !== undefined) {
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
    const failures = [];
    const push = (m) => failures.push(m);
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

    if (vec.scenario_id !== scenarioId) push(`scenario_id must be "${scenarioId}" (got ${JSON.stringify(vec.scenario_id)})`);

    checkMetadata(vec, push);
    checkUnresolvedMarkers(vec, push);
    checkStorageAuthConsent(vec, push);
    checkRequestVector(vec, push);
    checkPublicResponse(vec, push);
    checkNoLeakAssertions(vec, push);
    checkRecallProjection(vec, scenarioId, push);

    for (const f of noLeakFailures(publicSurface(vec))) push(f);
    for (const f of syntheticIdFailures(vec)) push(f);

    results.push({ scenarioId, filename, failures });
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

const ok = report(validate());
process.exit(ok ? 0 : 1);
