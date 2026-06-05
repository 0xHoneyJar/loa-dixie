#!/usr/bin/env node
// Phase 33E — Admission Wedge draft v1 contract-probe validator.
//
// DOCS-ONLY / NON-RUNTIME. This script is an isolated, dependency-free shape /
// no-leak / hardening validator over the JSON probe fixtures in this directory.
// It is NOT wired into the application, NOT imported by any route, and exercises
// NO live admission behavior. It freezes no schema and authorizes no route,
// storage, auth, or live admission.
//
// Hard isolation rules (enforced by construction):
//   * Node built-ins ONLY (node:fs, node:path, node:url). No third-party deps.
//   * No package.json change, no lockfile change.
//   * No import of @loa/straylight, no import of any app/src route/service.
//   * No database, storage, network, or environment access.
//   * Validates ONLY files under docs/admission-wedge/fixtures.
//
// What it proves (Phase 33E hardening):
//   1. All five required scenario files exist and parse as JSON, and the five
//      semantic scenarios are preserved (no rename / split / removal).
//   2. Shared metadata is present and correct for draft v1: probe_kind /
//      probe_version='dixie_admission_wedge_probe_v1' / status /
//      schema_final=false / canonical_schema=false / route_contract=false /
//      runtime_enabled=false / production_admission=false / public_safe=true /
//      hardening_phase='33E' / identity_binding_final=false /
//      synthetic_binding=true / straylight_primitive_review markers (review NOT
//      complete, required before route design).
//   3. No public_response leaks raw candidate payload, unsafe markers, sentinel
//      strings, stack traces, URLs, tokens, PEM keys, long opaque IDs, or
//      audit-only / private fields (tenant/estate/actor ids, candidate_payload,
//      raw_reasons, audit/idempotency/authority detail).
//   4. Synthetic-only identity binding: tenant/estate/actor ids are short
//      synthetic labels, never real-looking or long operational IDs.
//   5. Each scenario satisfies its load-bearing invariant (pending / accept /
//      reject / supersede / fail-closed), including the hardened pending-vs-
//      denied distinction, the candidate->transition->admitted chain, the
//      corrected-active-only recall projection, and the fail-closed no-mint.
//   6. Draft hardening placeholders exist and are marked non-final: idempotency
//      (all five write/transition/fail-closed probes), authority/signer (all
//      transition-bearing probes), and the public/private receipt split.
//
// It emits a deterministic pass/fail summary and exits non-zero on any failure.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = dirname(fileURLToPath(import.meta.url));

// scenario_id -> on-disk filename. The five required scenarios (PRESERVED — a
// future phase must not rename, split, or remove these).
const REQUIRED = {
  candidate_pending_not_recallable: 'candidate-pending-not-recallable.json',
  accept_candidate_to_admitted_assertion: 'accept-candidate-to-admitted-assertion.json',
  reject_candidate_no_assertion: 'reject-candidate-no-assertion.json',
  supersede_with_corrected_assertion: 'supersede-with-corrected-assertion.json',
  malformed_or_unsafe_payload_fail_closed: 'malformed-or-unsafe-payload-fail-closed.json',
};

const PROBE_KIND = 'admission_wedge_contract_probe';
const PROBE_VERSION = 'dixie_admission_wedge_probe_v1';
const PROBE_STATUS = 'draft_contract_probe';
const HARDENING_PHASE = '33E';

// Scenarios that carry an explicit admission/supersession transition (and so
// must carry a draft authority/signer field).
const TRANSITION_BEARING = new Set([
  'accept_candidate_to_admitted_assertion',
  'reject_candidate_no_assertion',
  'supersede_with_corrected_assertion',
]);

// Scenarios that mint a public-safe receipt reference on the public_response.
const PUBLIC_RECEIPT_BEARING = new Set([
  'accept_candidate_to_admitted_assertion',
  'reject_candidate_no_assertion',
  'supersede_with_corrected_assertion',
]);

// Scenarios that mint NO public receipt (only a private audit receipt ref).
const NO_PUBLIC_RECEIPT = new Set([
  'candidate_pending_not_recallable',
  'malformed_or_unsafe_payload_fail_closed',
]);

// Reason codes the fail-closed public path may carry. Grounded in the existing
// Dixie-local refusal family (app/src/services/straylight-recall-intake/
// refusal-mapping.ts) — NOT coined here. Kept inline so the validator imports
// nothing from the app.
const STABLE_PUBLIC_REASON_CODES = new Set([
  'ingress.invalid_request',
  'seam.class_validation_failed',
]);

// Substrings that must never appear anywhere in a public_response (keys or
// string values). Includes this probe set's generic synthetic marker plus
// known internal/foreign sentinel forms guarded defensively.
const FORBIDDEN_SUBSTRINGS = [
  'unsafe_marker',
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

// Regex leak patterns checked against every string value/key in a public_response.
const FORBIDDEN_PATTERNS = [
  { name: 'url', re: /\bhttps?:\/\//i },
  { name: 'ws-url', re: /\bwss?:\/\//i },
  { name: 'jwt', re: /\beyJ[A-Za-z0-9_-]{8,}/ },
  { name: 'openai-style-key', re: /\bsk-[A-Za-z0-9]{16,}/ },
  { name: 'bearer-token', re: /\bBearer\s+\S+/ },
  { name: '0x-hex-address', re: /0x[0-9a-fA-F]{16,}/ },
  { name: 'long-hex-id', re: /\b[0-9a-fA-F]{40,}\b/ },
  { name: 'long-opaque-id', re: /[A-Za-z0-9_-]{32,}/ },
  { name: 'stack-frame', re: /\bat\s+\/?\S+:\d+:\d+/ },
  { name: 'source-line-ref', re: /\.[jt]s:\d+/ },
  { name: 'error-prefix', re: /\b(?:Error|TypeError|RangeError|SyntaxError):\s/ },
];

// Keys that are audit-only / private and must never appear in a public_response
// (deep). The public projection carries only public-safe references/summaries.
const FORBIDDEN_PUBLIC_KEYS = new Set([
  // identity binding (synthetic, audit-only)
  'tenant_id',
  'estate_id',
  'candidate_id',
  'source_candidate_id',
  'prior_assertion_id',
  'proposing_actor_id',
  'correcting_actor_id',
  'caller_actor_id',
  'actor_id',
  'service_actor',
  // candidate / source material
  'candidate_payload',
  'corrected_candidate_payload',
  'source_ref',
  'source_kind',
  // audit reasoning / receipts
  'raw_reasons',
  'policy_reason',
  'policy_decision',
  'receipt_id',
  'audit_only',
  'audit_private',
  'public_audit_detail',
  'audit_receipt_ref',
  'private_reason_family',
  'refusal_class',
  'decision_time_label',
  'audit_event',
  'recall_eligibility_result',
  // transition / assertion linkage ids (audit-only)
  'admission_transition_id',
  'admitted_assertion_id',
  'supersession_transition_id',
  'supersedes_assertion_id',
  'superseded_by_assertion_id',
  'corrected_assertion_id',
  // draft idempotency placeholders (audit/internal, never public)
  'idempotency_key_draft',
  'idempotency_scope_draft',
  'idempotency_final',
  // draft authority placeholders (never public)
  'authority_signer_type_draft',
  'authority_scope_draft',
  'authority_binding_final',
]);

// Tokens that, if present in a pending probe's public outcome surface, would
// wrongly collapse "proposed/pending" into "denied". The pending scenario must
// not use rejection vocabulary on its public outcome.
const REJECTION_VOCAB = /\b(?:denied|rejected|transition_denied)\b/i;

// Synthetic identity fields checked on the private input section. They must be
// short, lower-snake synthetic labels — never real-looking or long ids.
const IDENTITY_FIELDS = [
  'tenant_id',
  'estate_id',
  'proposing_actor_id',
  'correcting_actor_id',
  'caller_actor_id',
];
const SYNTHETIC_ID_RE = /^[a-z][a-z0-9_]*$/;
const SYNTHETIC_ID_MAX_LEN = 40;

// ---------------------------------------------------------------------------
// Reporting helpers
// ---------------------------------------------------------------------------

/** Walk every (key, string-value) pair in a JSON value. */
function* walk(node, path = '$') {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    yield { kind: 'value', path, value: node };
    return;
  }
  if (typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      yield* walk(node[i], `${path}[${i}]`);
    }
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    yield { kind: 'key', path: `${path}.${k}`, value: k };
    yield* walk(v, `${path}.${k}`);
  }
}

function noLeakFailures(publicResponse) {
  const failures = [];
  for (const node of walk(publicResponse, '$.public_response')) {
    // Forbidden audit-only / private keys.
    if (node.kind === 'key' && FORBIDDEN_PUBLIC_KEYS.has(node.value)) {
      failures.push(`audit-only/private key "${node.value}" present in public_response at ${node.path}`);
    }
    // Forbidden substrings (checked on keys AND values).
    for (const s of FORBIDDEN_SUBSTRINGS) {
      if (node.value.includes(s)) {
        failures.push(`forbidden substring "${s}" found in public_response at ${node.path}`);
      }
    }
    // Forbidden regex patterns (string values and keys).
    for (const p of FORBIDDEN_PATTERNS) {
      if (p.re.test(node.value)) {
        failures.push(`forbidden ${p.name} pattern matched in public_response at ${node.path}`);
      }
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Shared hardening checks
// ---------------------------------------------------------------------------

function checkMetadata(probe, push) {
  if (probe.probe_kind !== PROBE_KIND) push(`probe_kind must be "${PROBE_KIND}" (got ${JSON.stringify(probe.probe_kind)})`);
  if (probe.probe_version !== PROBE_VERSION) push(`probe_version must be "${PROBE_VERSION}" (draft v1) (got ${JSON.stringify(probe.probe_version)})`);
  if (probe.status !== PROBE_STATUS) push(`status must be "${PROBE_STATUS}" (got ${JSON.stringify(probe.status)})`);
  if (probe.schema_final !== false) push('schema_final must be false (schema is NOT frozen)');
  if (probe.canonical_schema !== false) push('canonical_schema must be false (not a canonical schema)');
  if (probe.route_contract !== false) push('route_contract must be false (not a live route contract)');
  if (probe.runtime_enabled !== false) push('runtime_enabled must be false');
  if (probe.production_admission !== false) push('production_admission must be false');
  if (probe.public_safe !== true) push('public_safe must be true');
  if (probe.hardening_phase !== HARDENING_PHASE) push(`hardening_phase must be "${HARDENING_PHASE}" (got ${JSON.stringify(probe.hardening_phase)})`);
  if (probe.identity_binding_final !== false) push('identity_binding_final must be false (synthetic-only binding)');
  if (probe.synthetic_binding !== true) push('synthetic_binding must be true (synthetic-only identity binding)');
  if (!probe.public_response || typeof probe.public_response !== 'object') push('public_response object is required');
}

// Straylight primitive review must be marked required-before-route-design and
// NOT complete. The probe must not claim a completed primitive review or a
// final/canonical schema.
function checkStraylightMarkers(probe, push) {
  if (probe.straylight_primitive_review !== 'required_before_route_design') {
    push(`straylight_primitive_review must be "required_before_route_design" (got ${JSON.stringify(probe.straylight_primitive_review)})`);
  }
  if (probe.straylight_primitive_review_complete !== false) {
    push('straylight_primitive_review_complete must be false (no Straylight primitive review has occurred)');
  }
}

// Synthetic-only identity binding: any identity field present on input must be
// a short, lower-snake synthetic label (rejects long / real-looking ids).
function checkSyntheticIdentity(probe, push) {
  const input = probe.input;
  if (!input || typeof input !== 'object') return; // input shape is per-scenario
  for (const f of IDENTITY_FIELDS) {
    if (!(f in input)) continue;
    const v = input[f];
    if (typeof v !== 'string' || !SYNTHETIC_ID_RE.test(v) || v.length > SYNTHETIC_ID_MAX_LEN) {
      push(`identity field input.${f} must be a short synthetic label (got ${JSON.stringify(v)})`);
    }
  }
}

// Draft idempotency placeholder, required on every write/transition/fail-closed
// probe and explicitly marked non-final.
function checkIdempotency(probe, push) {
  const idem = probe.idempotency;
  if (!idem || typeof idem !== 'object') {
    push('idempotency draft placeholder object is required (idempotency_key_draft / idempotency_scope_draft / idempotency_final)');
    return;
  }
  if (typeof idem.idempotency_key_draft !== 'string' || idem.idempotency_key_draft.length === 0) {
    push('idempotency.idempotency_key_draft must be a non-empty draft string');
  }
  if (typeof idem.idempotency_scope_draft !== 'string' || idem.idempotency_scope_draft.length === 0) {
    push('idempotency.idempotency_scope_draft must be a non-empty draft string');
  }
  if (idem.idempotency_final !== false) {
    push('idempotency.idempotency_final must be false (idempotency semantics are NOT final)');
  }
}

// Public/private receipt split. Every probe declares the split markers; the
// public_receipt_ref is non-null and mirrored on the public_response only for
// receipt-bearing scenarios, and null for the no-public-receipt scenarios.
function checkReceiptSplit(probe, scenarioId, push) {
  const rs = probe.receipt_split;
  if (!rs || typeof rs !== 'object') {
    push('receipt_split object is required (public_receipt_ref / audit_receipt_ref / audit_private / public_audit_detail)');
    return;
  }
  if (rs.audit_private !== true) push('receipt_split.audit_private must be true');
  if (rs.public_audit_detail !== false) push('receipt_split.public_audit_detail must be false');
  if (typeof rs.audit_receipt_ref !== 'string' || rs.audit_receipt_ref.length === 0) {
    push('receipt_split.audit_receipt_ref must be a non-empty (audit-private) reference');
  }
  if (PUBLIC_RECEIPT_BEARING.has(scenarioId)) {
    if (typeof rs.public_receipt_ref !== 'string' || rs.public_receipt_ref.length === 0) {
      push('receipt_split.public_receipt_ref must be a non-empty public-safe reference for this scenario');
    } else if (probe.public_response?.receipt_public_ref !== rs.public_receipt_ref) {
      push('receipt_split.public_receipt_ref must equal public_response.receipt_public_ref');
    }
  }
  if (NO_PUBLIC_RECEIPT.has(scenarioId)) {
    if (rs.public_receipt_ref !== null) {
      push('receipt_split.public_receipt_ref must be null (no public receipt is minted for this scenario)');
    }
    if ('receipt_public_ref' in (probe.public_response ?? {})) {
      push('public_response must not carry receipt_public_ref for a no-public-receipt scenario');
    }
  }
}

// Transition-bearing probes carry a DRAFT authority/signer field that does not
// claim production auth.
function transitionObject(probe) {
  if (probe.admission_transition && typeof probe.admission_transition === 'object') return probe.admission_transition;
  if (probe.supersession_transition && typeof probe.supersession_transition === 'object') return probe.supersession_transition;
  return null;
}

function checkAuthorityDraft(probe, push) {
  const t = transitionObject(probe);
  if (!t) {
    push('transition-bearing scenario must carry an admission/supersession transition object');
    return;
  }
  if (typeof t.authority_signer_type_draft !== 'string' || t.authority_signer_type_draft.length === 0) {
    push('transition must carry a draft authority field authority_signer_type_draft');
  } else if (/production|final|live/i.test(t.authority_signer_type_draft)) {
    push('authority_signer_type_draft must not claim production/final/live auth');
  }
  if (typeof t.authority_scope_draft !== 'string' || t.authority_scope_draft.length === 0) {
    push('transition must carry a draft authority_scope_draft field');
  }
  if (t.authority_binding_final !== false) {
    push('transition.authority_binding_final must be false (authority binding is NOT final / not production auth)');
  }
}

// ---------------------------------------------------------------------------
// Per-probe semantic checks (preserved invariants + hardening)
// ---------------------------------------------------------------------------

function checkPending(probe, push) {
  if (probe.admission_transition !== null) push('candidate_pending: admission_transition must be null (no transition yet)');
  if (probe.admitted_assertion !== null) push('candidate_pending: admitted_assertion must be null (no admitted assertion)');
  if (probe.public_response?.recall_eligible !== false) push('candidate_pending: public_response.recall_eligible must be false');
  if (probe.public_response?.candidate_state !== 'proposed') push('candidate_pending: public_response.candidate_state must be canonical "proposed"');
  if (probe.public_response?.rendered_candidate_payload !== false) push('candidate_pending: rendered_candidate_payload must be false');
  // Hardened pending-vs-denied: a pending candidate must NOT use rejection
  // vocabulary on its public outcome surface.
  const pr = probe.public_response ?? {};
  for (const k of ['outcome', 'candidate_state', 'public_summary']) {
    if (typeof pr[k] === 'string' && REJECTION_VOCAB.test(pr[k])) {
      push(`candidate_pending: public_response.${k} must not use denied/rejected/transition_denied vocabulary (pending != denied)`);
    }
  }
}

function checkAccept(probe, push) {
  const t = probe.admission_transition;
  const a = probe.admitted_assertion;
  const candId = probe.input?.candidate_id;
  if (!t || typeof t !== 'object') { push('accept: admission_transition object is required'); return; }
  if (!a || typeof a !== 'object') { push('accept: admitted_assertion object is required'); return; }
  if (t.transition_kind !== 'admit_assertion') push('accept: transition_kind must be canonical "admit_assertion"');
  if (t.outcome !== 'accepted') push('accept: transition outcome must be "accepted"');
  // candidate -> transition -> admitted assertion chain.
  if (!candId || t.source_candidate_id !== candId) push('accept: transition.source_candidate_id must link to input.candidate_id');
  if (a.source_candidate_id !== candId) push('accept: admitted_assertion.source_candidate_id must link to input.candidate_id');
  if (!t.admitted_assertion_id || t.admitted_assertion_id !== a.admitted_assertion_id) push('accept: transition.admitted_assertion_id must reference the admitted assertion');
  if (a.admission_transition_id !== t.admission_transition_id) push('accept: admitted_assertion.admission_transition_id must reference the transition');
  if (a.assertion_status !== 'active') push('accept: admitted assertion status must be canonical "active" (no bare "admitted" status)');
  if (a.recall_eligible !== true) push('accept: admitted_assertion.recall_eligible must be true (under policy)');
  if (probe.public_response?.recall_eligible !== true) push('accept: public_response.recall_eligible must be true');
  if (probe.public_response?.rendered_candidate_payload !== false) push('accept: rendered_candidate_payload must be false');
}

function checkReject(probe, push) {
  const t = probe.admission_transition;
  // Rejection vocabulary must be bound to an EXPLICIT transition, not a pending absence.
  if (!t || typeof t !== 'object') { push('reject: an explicit admission_transition object is required'); return; }
  if (probe.admitted_assertion !== null) push('reject: admitted_assertion must be null (no assertion minted)');
  if (t.admitted_assertion_id !== null) push('reject: transition.admitted_assertion_id must be null');
  if (t.transition_kind !== 'admit_assertion') push('reject: transition_kind must be canonical "admit_assertion"');
  if (t.outcome !== 'denied') push('reject: transition outcome must be "denied"');
  if (probe.audit?.admission_receipt?.audit_event !== 'transition_denied') push('reject: audit event must be canonical "transition_denied"');
  if (probe.public_response?.recall_eligible !== false) push('reject: public_response.recall_eligible must be false');
  if (probe.public_response?.outcome !== 'denied') push('reject: public_response.outcome must be "denied"');
}

function checkSupersede(probe, push) {
  const assertions = Array.isArray(probe.assertions) ? probe.assertions : [];
  const superseded = assertions.find((x) => x.assertion_status === 'superseded');
  const active = assertions.find((x) => x.assertion_status === 'active');
  if (!superseded) { push('supersede: an assertion with canonical status "superseded" is required'); }
  if (!active) { push('supersede: an assertion with canonical status "active" (corrected) is required'); }
  if (superseded && superseded.recall_eligible !== false) push('supersede: superseded assertion must not be recall-eligible');
  if (active && active.recall_eligible !== true) push('supersede: corrected active assertion must be recall-eligible');
  if (superseded && active) {
    if (active.supersedes_assertion_id !== superseded.assertion_id) push('supersede: corrected active must link supersedes_assertion_id -> prior');
    if (superseded.superseded_by_assertion_id !== active.assertion_id) push('supersede: superseded prior must link superseded_by_assertion_id -> corrected');
  }
  const ordinary = probe.recall_projection?.ordinary_recall_members ?? [];
  if (active && !ordinary.includes(active.assertion_id)) push('supersede: ordinary recall must include the corrected active assertion');
  if (superseded && ordinary.includes(superseded.assertion_id)) push('supersede: ordinary recall must EXCLUDE the superseded assertion');
  if (probe.public_response?.recall_eligible !== true) push('supersede: public_response.recall_eligible must be true (corrected active)');
  if (probe.public_response?.rendered_candidate_payload !== false) push('supersede: rendered_candidate_payload must be false');
}

function checkMalformed(probe, push) {
  if (probe.admitted_assertion !== null) push('malformed: admitted_assertion must be null (fail-closed mints nothing)');
  if (probe.admission_transition !== null) push('malformed: admission_transition must be null (fail-closed before any transition)');
  if (probe.public_response?.outcome !== 'refused') push('malformed: public_response.outcome must be "refused"');
  const code = probe.public_response?.reason_code;
  if (!code || !STABLE_PUBLIC_REASON_CODES.has(code)) push(`malformed: public reason_code must be a stable Dixie-family code (${[...STABLE_PUBLIC_REASON_CODES].join(' | ')}), got ${JSON.stringify(code)}`);
  if (probe.public_response?.recall_eligible !== false) push('malformed: public_response.recall_eligible must be false');
  if (probe.public_response?.rendered_candidate_payload !== false) push('malformed: rendered_candidate_payload must be false');
}

const SEMANTIC_CHECKS = {
  candidate_pending_not_recallable: checkPending,
  accept_candidate_to_admitted_assertion: checkAccept,
  reject_candidate_no_assertion: checkReject,
  supersede_with_corrected_assertion: checkSupersede,
  malformed_or_unsafe_payload_fail_closed: checkMalformed,
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function validate() {
  const results = [];

  for (const [scenarioId, filename] of Object.entries(REQUIRED)) {
    const failures = [];
    const push = (m) => failures.push(m);
    const path = join(FIXTURES_DIR, filename);

    if (!existsSync(path)) {
      results.push({ scenarioId, filename, failures: ['file does not exist'] });
      continue;
    }

    let probe;
    try {
      probe = JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
      results.push({ scenarioId, filename, failures: [`JSON parse error: ${err.message}`] });
      continue;
    }

    // scenario_id must match the file's slot (scenarios preserved, never renamed).
    if (probe.scenario_id !== scenarioId) push(`scenario_id must be "${scenarioId}" (got ${JSON.stringify(probe.scenario_id)})`);

    // Shared metadata + hardening markers.
    checkMetadata(probe, push);
    checkStraylightMarkers(probe, push);
    checkSyntheticIdentity(probe, push);

    // No-leak sweep over the public response.
    for (const f of noLeakFailures(probe.public_response ?? {})) push(f);

    // Draft idempotency placeholder is required on every write/transition/
    // fail-closed probe (all five scenarios here).
    checkIdempotency(probe, push);

    // Public/private receipt split markers.
    checkReceiptSplit(probe, scenarioId, push);

    // Transition-bearing probes carry a draft authority/signer field.
    if (TRANSITION_BEARING.has(scenarioId)) checkAuthorityDraft(probe, push);

    // Per-scenario semantic invariant (preserved + hardened).
    const semantic = SEMANTIC_CHECKS[scenarioId];
    if (semantic) semantic(probe, push);

    results.push({ scenarioId, filename, failures });
  }

  return results;
}

function report(results) {
  const lines = [];
  lines.push('Phase 33E — Admission Wedge draft v1 contract-probe validation');
  lines.push('===============================================================');
  lines.push(`fixtures dir: ${FIXTURES_DIR}`);
  lines.push(`probe version: ${PROBE_VERSION}`);
  lines.push(`required probes: ${Object.keys(REQUIRED).length}`);
  lines.push('');

  let failedProbes = 0;
  let totalFailures = 0;

  // Stable ordering: REQUIRED is iterated in declaration order above.
  for (const r of results) {
    if (r.failures.length === 0) {
      lines.push(`PASS  ${r.scenarioId}  (${basename(r.filename)})`);
    } else {
      failedProbes++;
      totalFailures += r.failures.length;
      lines.push(`FAIL  ${r.scenarioId}  (${basename(r.filename)})`);
      for (const f of r.failures) lines.push(`        - ${f}`);
    }
  }

  lines.push('');
  lines.push('---------------------------------------------------------------');
  if (failedProbes === 0) {
    lines.push(`RESULT: PASS — ${results.length}/${results.length} probes valid, 0 failures.`);
  } else {
    lines.push(`RESULT: FAIL — ${failedProbes}/${results.length} probes failed, ${totalFailures} failure(s).`);
  }

  process.stdout.write(lines.join('\n') + '\n');
  return failedProbes === 0;
}

const ok = report(validate());
process.exit(ok ? 0 : 1);
