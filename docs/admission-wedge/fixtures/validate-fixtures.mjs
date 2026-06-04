#!/usr/bin/env node
// Phase 33C — Admission Wedge draft contract-probe validator.
//
// DOCS-ONLY / NON-RUNTIME. This script is an isolated, dependency-free shape /
// no-leak validator over the JSON probe fixtures in this directory. It is NOT
// wired into the application, NOT imported by any route, and exercises NO live
// admission behavior.
//
// Hard isolation rules (enforced by construction):
//   * Node built-ins ONLY (node:fs, node:path, node:url). No third-party deps.
//   * No package.json change, no lockfile change.
//   * No import of @loa/straylight, no import of any app/src route/service.
//   * No database, storage, network, or environment access.
//   * Validates ONLY files under docs/admission-wedge/fixtures.
//
// What it proves:
//   1. All five required scenario files exist and parse as JSON.
//   2. Shared metadata is present and correct (probe_kind / probe_version /
//      schema_final=false / runtime_enabled=false / production_admission=false /
//      public_safe=true).
//   3. No public_response leaks raw candidate payload, unsafe markers, sentinel
//      strings, stack traces, URLs, tokens, PEM keys, long IDs, or audit-only
//      fields.
//   4. Each scenario satisfies its load-bearing invariant (pending / accept /
//      reject / supersede / fail-closed).
//
// It emits a deterministic pass/fail summary and exits non-zero on any failure.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = dirname(fileURLToPath(import.meta.url));

// scenario_id -> on-disk filename. The five required scenarios.
const REQUIRED = {
  candidate_pending_not_recallable: 'candidate-pending-not-recallable.json',
  accept_candidate_to_admitted_assertion: 'accept-candidate-to-admitted-assertion.json',
  reject_candidate_no_assertion: 'reject-candidate-no-assertion.json',
  supersede_with_corrected_assertion: 'supersede-with-corrected-assertion.json',
  malformed_or_unsafe_payload_fail_closed: 'malformed-or-unsafe-payload-fail-closed.json',
};

const PROBE_KIND = 'admission_wedge_contract_probe';
const PROBE_VERSION = 'dixie_admission_wedge_probe_v0';

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

// Regex leak patterns checked against every string value in a public_response.
const FORBIDDEN_PATTERNS = [
  { name: 'url', re: /\bhttps?:\/\//i },
  { name: 'ws-url', re: /\bwss?:\/\//i },
  { name: 'jwt', re: /\beyJ[A-Za-z0-9_-]{8,}/ },
  { name: 'openai-style-key', re: /\bsk-[A-Za-z0-9]{16,}/ },
  { name: 'bearer-token', re: /\bBearer\s+\S+/ },
  { name: '0x-hex-address', re: /0x[0-9a-fA-F]{16,}/ },
  { name: 'long-hex-id', re: /\b[0-9a-fA-F]{40,}\b/ },
  { name: 'stack-frame', re: /\bat\s+\/?\S+:\d+:\d+/ },
  { name: 'source-line-ref', re: /\.[jt]s:\d+/ },
  { name: 'error-prefix', re: /\b(?:Error|TypeError|RangeError|SyntaxError):\s/ },
];

// Keys that are audit-only / private and must never appear in a public_response
// (deep). The public projection carries only public-safe references/summaries.
const FORBIDDEN_PUBLIC_KEYS = new Set([
  'tenant_id',
  'estate_id',
  'candidate_id',
  'source_candidate_id',
  'proposing_actor_id',
  'correcting_actor_id',
  'caller_actor_id',
  'actor_id',
  'service_actor',
  'candidate_payload',
  'corrected_candidate_payload',
  'source_ref',
  'source_kind',
  'raw_reasons',
  'policy_reason',
  'policy_decision',
  'receipt_id',
  'audit_only',
  'decision_time_label',
  'audit_event',
  'admitted_assertion_id',
]);

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
    // Forbidden audit-only keys.
    if (node.kind === 'key' && FORBIDDEN_PUBLIC_KEYS.has(node.value)) {
      failures.push(`audit-only key "${node.value}" present in public_response at ${node.path}`);
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
// Per-probe semantic checks
// ---------------------------------------------------------------------------

function checkMetadata(probe, push) {
  if (probe.probe_kind !== PROBE_KIND) push(`probe_kind must be "${PROBE_KIND}" (got ${JSON.stringify(probe.probe_kind)})`);
  if (probe.probe_version !== PROBE_VERSION) push(`probe_version must be "${PROBE_VERSION}" (got ${JSON.stringify(probe.probe_version)})`);
  if (probe.schema_final !== false) push('schema_final must be false');
  if (probe.runtime_enabled !== false) push('runtime_enabled must be false');
  if (probe.production_admission !== false) push('production_admission must be false');
  if (probe.public_safe !== true) push('public_safe must be true');
  if (!probe.public_response || typeof probe.public_response !== 'object') push('public_response object is required');
}

function checkPending(probe, push) {
  if (probe.admission_transition !== null) push('candidate_pending: admission_transition must be null (no transition yet)');
  if (probe.admitted_assertion !== null) push('candidate_pending: admitted_assertion must be null (no admitted assertion)');
  if (probe.public_response?.recall_eligible !== false) push('candidate_pending: public_response.recall_eligible must be false');
  if (probe.public_response?.candidate_state !== 'proposed') push('candidate_pending: public_response.candidate_state must be canonical "proposed"');
  if (probe.public_response?.rendered_candidate_payload !== false) push('candidate_pending: rendered_candidate_payload must be false');
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
  if (probe.admitted_assertion !== null) push('reject: admitted_assertion must be null (no assertion minted)');
  if (t && t.admitted_assertion_id !== null) push('reject: transition.admitted_assertion_id must be null');
  if (t && t.outcome !== 'denied') push('reject: transition outcome must be "denied"');
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

    // scenario_id must match the file's slot.
    if (probe.scenario_id !== scenarioId) push(`scenario_id must be "${scenarioId}" (got ${JSON.stringify(probe.scenario_id)})`);

    checkMetadata(probe, push);

    // No-leak sweep over the public response.
    for (const f of noLeakFailures(probe.public_response ?? {})) push(f);

    // Per-scenario semantic invariant.
    const semantic = SEMANTIC_CHECKS[scenarioId];
    if (semantic) semantic(probe, push);

    results.push({ scenarioId, filename, failures });
  }

  return results;
}

function report(results) {
  const lines = [];
  lines.push('Phase 33C — Admission Wedge draft contract-probe validation');
  lines.push('===========================================================');
  lines.push(`fixtures dir: ${FIXTURES_DIR}`);
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
  lines.push('-----------------------------------------------------------');
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
