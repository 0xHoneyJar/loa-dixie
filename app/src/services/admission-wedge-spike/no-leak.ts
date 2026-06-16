// Phase 33N — dev/operator-only Admission Wedge route SPIKE: runtime no-leak
// guard (defense-in-depth).
//
// This is the RUNTIME no-leak baseline the Phase 33M gate (§14) requires the
// spike to inherit from the Phase 33L route-contract test-vector validator's
// denylist
// (docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs:
// FORBIDDEN_PUBLIC_KEYS / FORBIDDEN_SUBSTRINGS / FORBIDDEN_PATTERNS + the
// UUID / long-opaque-run rules). The denylist is MIRRORED here as a small,
// dependency-free runtime module — the docs validator is NOT imported into
// runtime (it stays Node-built-ins-only, docs-bound), per Phase 33M §10.
//
// Phase 46P — runtime forbidden-key parity restoration (authorized by Phase 46O
// / PR #160). Phases 33Z and 46J hardened the docs validator's
// FORBIDDEN_PUBLIC_KEYS to 114 keys, but the runtime mirror still carried only
// the original 52, leaving a 62-key drift (25 Phase 33Z TransitionReceipt /
// AuditEvent / signer / metadata key names + 37 Phase 46J canonical ref/hash /
// consent / auth key names). That drift was latent debt, not a live leak — the
// fixed public-response builder emits an 8-field allowlist containing none of
// the missing keys — but the mirror is now brought back to exact parity so a
// future durable-store serializer cannot surface a canonical ref/hash/consent
// field under a short, safe-looking value that would slip the value-pattern
// walls. The additions are EXACT-key only (Set.has) and snake_case + camelCase,
// so legitimate request draft markers (`consent_assumption`, `auth_assumption`,
// `consent_scope_assumption`, `consent_note_draft`, …) that merely share a
// prefix are NOT over-matched. No substring/prefix matching is introduced.
//
// `findAdmissionPublicLeaks` deep-walks any public response object and returns
// a list of human-readable leak findings (empty when clean). The route uses it
// as a last-line assertion before serializing a public body; the tests use it
// to deep-walk every public surface (disabled / unauthorized / malformed / all
// five scenarios / partial-failure).

/** Forbidden private/operational/forbidden-category keys (mirrors the Phase
 *  33L validator's FORBIDDEN_PUBLIC_KEYS). Presence as a key on a public
 *  surface is a leak regardless of value. */
const FORBIDDEN_PUBLIC_KEYS = new Set<string>([
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
  // Phase 33Z private `TransitionReceipt` / `AuditEvent` / private-receipt shapes
  // (mirrors the Phase 33L validator). Only the public-safe `public_receipt_ref`
  // (and its `null`) may cross to the public surface; the private TransitionReceipt,
  // the AuditEvent (incl. its class), the private/internal receipt reference, the
  // transition id, signer/signature material, opaque policy detail, and a raw
  // `metadata` bag must NEVER appear publicly. snake_case + camelCase both forbidden
  // so a serializer rename cannot leak.
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
  // (the public field is now `public_receipt_ref`); it must never appear on a
  // route public surface.
  'receipt_public_ref',
  'idempotency_key',
  'idempotency_key_draft',
  'authority_signer_type_draft',
  'authority_scope_draft',
  'admission_transition_id',
  'admitted_assertion_id',
  'supersedes_assertion_id',
  'superseded_by_assertion_id',
  // README §9 no-leak categories + variants.
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
  // Phase 46J consent/storage canonical key-name hardening (mirrors the Phase 33L
  // validator). The exact canonical key names a future durable-store serializer must
  // never surface publicly, in snake_case AND camelCase. EXACT-key match only — the
  // legitimate request draft markers `consent_assumption` / `auth_assumption` (and
  // siblings like `consent_scope_assumption` / `consent_note_draft`) are NOT exact
  // matches for the bare `consent` / `auth_decision` keys and stay allowed.
  //   (a) canonical Straylight Assertion ref arrays.
  'supersedes_refs',
  'supersedesRefs',
  'linked_assertion_refs',
  'linkedAssertionRefs',
  //   (b) canonical TransitionReceipt / AuditEvent private refs + hash-chain links.
  'signer_refs',
  'signerRefs',
  'audit_event_ref',
  'auditEventRef',
  'receipt_hash',
  'receiptHash',
  'audit_hash',
  'auditHash',
  'previous_audit_hash',
  'previousAuditHash',
  'policy_decision_ref',
  'policyDecisionRef',
  'assertion_refs',
  'assertionRefs',
  'target_refs',
  'targetRefs',
  //   (c) canonical candidate-subject mapping (subject maps to canonical subject_refs,
  //       never a coined subject_actor_id).
  'subject_refs',
  'subjectRefs',
  //   (d) consent / auth-decision key-name family. Bare `consent` / `auth_decision`
  //       are forbidden by EXACT match only.
  'consent',
  'consent_ref',
  'consentRef',
  'consent_proof',
  'consentProof',
  'consent_receipt',
  'consentReceipt',
  'consent_subject',
  'consentSubject',
  'consent_grantor',
  'consentGrantor',
  'consent_scope',
  'consentScope',
  'auth_decision',
  'authDecision',
]);

/** Negative-assertion keys: legitimate ONLY as the boolean literal `false`. */
const NEGATIVE_ASSERTION_KEYS = new Set<string>(['rendered_candidate_payload']);

/** Forbidden substrings (mirrors the Phase 33L validator). */
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

/** Forbidden regex leak patterns (mirrors the Phase 33L validator). */
const FORBIDDEN_PATTERNS: Array<{ name: string; re: RegExp }> = [
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

/** UUID shape (incl. v4) — opaque operational identifier; never permitted. */
const UUID_RE =
  /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/;

/** Any unbroken alphanumeric run this long is treated as an opaque/operational
 *  id and rejected (mirrors the Phase 33L MAX_OPAQUE_RUN). */
const MAX_OPAQUE_RUN = 24;
const OPAQUE_RUN_RE = new RegExp(`[A-Za-z0-9]{${MAX_OPAQUE_RUN},}`);

interface WalkNode {
  kind: 'key' | 'value';
  path: string;
  value: string;
  child?: unknown;
}

function* walk(node: unknown, path: string): Generator<WalkNode> {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    yield { kind: 'value', path, value: node };
    return;
  }
  if (typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield* walk(node[i], `${path}[${i}]`);
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    yield { kind: 'key', path: `${path}.${k}`, value: k, child: v };
    yield* walk(v, `${path}.${k}`);
  }
}

/**
 * Deep-walk a public response and return all no-leak findings (empty array =
 * clean). Checks forbidden keys, negative-assertion-key discipline, forbidden
 * substrings, forbidden regex patterns, UUIDs, and long opaque runs — across
 * every key and string value at any depth.
 */
export function findAdmissionPublicLeaks(surface: unknown): string[] {
  const failures: string[] = [];
  for (const node of walk(surface, '$.public')) {
    if (node.kind === 'key') {
      if (FORBIDDEN_PUBLIC_KEYS.has(node.value)) {
        failures.push(`forbidden public key "${node.value}" at ${node.path}`);
      }
      if (NEGATIVE_ASSERTION_KEYS.has(node.value) && node.child !== false) {
        failures.push(
          `negative-assertion key "${node.value}" at ${node.path} must be boolean false`,
        );
      }
    }
    for (const s of FORBIDDEN_SUBSTRINGS) {
      if (node.value.includes(s)) {
        failures.push(`forbidden substring "${s}" at ${node.path}`);
      }
    }
    for (const p of FORBIDDEN_PATTERNS) {
      if (p.re.test(node.value)) {
        failures.push(`forbidden ${p.name} pattern at ${node.path}`);
      }
    }
    if (UUID_RE.test(node.value)) {
      failures.push(`UUID-shaped operational id at ${node.path}`);
    }
    if (node.kind === 'value' && OPAQUE_RUN_RE.test(node.value)) {
      failures.push(`opaque/operational-id-shaped run (>=${MAX_OPAQUE_RUN}) at ${node.path}`);
    }
  }
  return failures;
}

/** Convenience boolean wrapper. */
export function isAdmissionPublicSafe(surface: unknown): boolean {
  return findAdmissionPublicLeaks(surface).length === 0;
}
