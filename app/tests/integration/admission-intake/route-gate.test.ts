// Phase 33N — POST /api/admission/intake dev/operator-only route SPIKE,
// end-to-end against an in-process Hono app (NON-PRODUCTION, Storage Option A).
//
// Proves: disabled-gate refusal, unauthorized refusal (missing/invalid/non-
// operator), all five scenarios over the real handler, malformed fail-closed,
// deep-walk no-leak over EVERY public response, partial-failure fails closed,
// and that no durable storage / Freeside import is reachable from the spike.
//
// The handler is mounted directly (mirroring recall-intake/route.test.ts), so
// this test exercises the route logic, not the global middleware stack (the
// server-level conditional mount is proven in registration.test.ts).

import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import {
  createAdmissionIntakeRoutes,
  type AdmissionSpikeAuditEvent,
} from '../../../src/routes/admission-intake.js';
import {
  ADMISSION_SPIKE_BODY_MARKER,
  ADMISSION_TRANSITION_INTENTS,
  findAdmissionPublicLeaks,
} from '../../../src/services/admission-wedge-spike/index.js';

const TOKEN = 'dev-operator-token-synthetic-route-001';
const OPERATOR = 'op-route-test';

// --- Forced-leak fail-closed expectations (Patch 2, second round) ---
//
// The EXACT hardcoded known-safe fallback body the route returns when the
// runtime no-leak guard reports a finding OR throws (route guardFailedFallback-
// Body()). Every forced-leak path on every guard-failure mode must return this
// body VERBATIM — no extra fields, no intended-body residue, no guard details.
const GUARD_FAILED_FALLBACK_BODY = {
  spike: 'dev_operator_only_non_production',
  outcome_class: 'refused',
  error: 'admission.fail_closed',
  message: 'admission intake request refused',
} as const;

// A single poison string an adversarial guard might surface as a "finding":
// a forbidden public key plus a long opaque/operational id shape.
const POISON = 'tenant_id-0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

// A guard-detail blob that embeds EVERY class of sentinel a guard could
// plausibly leak: the poison, a forbidden-key phrase, an Error:/stack/secret
// trace, the service token, the operator id, and the body marker. Both the
// returns-a-finding and the throws guard modes carry this; the route must let
// NONE of it reach the wire or the audit trail.
const GUARD_DETAIL = `forbidden public key "tenant_id" ${POISON} :: Error: secret in stack at /x.ts:1:1 token=${TOKEN} operator=${OPERATOR} marker=${ADMISSION_SPIKE_BODY_MARKER}`;

// Substrings that must NEVER appear on the wire (or in audit) for a forced-leak
// fail-closed response. Three groups: (1) guard findings / injected secrets,
// (2) credentials + request-controlled material, (3) "intended rejected body"
// content — the per-path body the route was BUILDING when the guard tripped,
// which must not survive the collapse to the fixed fallback. None of these is a
// substring of the four fixed fallback strings, so they never false-positive.
const FORCED_LEAK_FORBIDDEN_SUBSTRINGS: string[] = [
  // (1) guard findings / injected secrets / error internals
  'tenant_id',
  POISON,
  'forbidden public key',
  'Error:',
  'stack',
  'secret',
  GUARD_DETAIL,
  // (2) credentials + request material
  TOKEN,
  OPERATOR,
  ADMISSION_SPIKE_BODY_MARKER,
  // (3) intended (rejected) body content — must not survive the fail-closed
  // collapse. These appear in the per-path intended bodies (disabled /
  // unauthorized / fail-closed / the five classified outcomes) but never in the
  // fixed fallback.
  'scenario_id',
  'recall_projection',
  'recall_eligible',
  'safe_reason_code',
  'public_receipt_ref',
  'draft_markers',
  'admission-spike-receipt-draft',
  'ingress.invalid_request',
  'malformed_or_unsafe_payload_fail_closed',
  'admission.spike_disabled',
  'admission.unauthorized_dev_operator',
  'accepted_as_proposed',
  'admitted_active_assertion_draft_placeholder',
  'corrected_active_assertion_draft_placeholder',
  'superseded_prior_assertion_draft_placeholder',
];

function buildApp(opts?: {
  enabled?: boolean;
  serviceToken?: string;
  operatorIds?: string[];
  beforeFinalize?: () => void;
  noLeakGuard?: (body: unknown) => string[];
}) {
  const audit: AdmissionSpikeAuditEvent[] = [];
  const app = new Hono();
  app.route(
    '/api/admission/intake',
    createAdmissionIntakeRoutes({
      enabled: opts?.enabled ?? true,
      gate: {
        serviceToken: opts?.serviceToken ?? TOKEN,
        operatorIds: opts?.operatorIds ?? [OPERATOR],
      },
      beforeFinalize: opts?.beforeFinalize,
      noLeakGuard: opts?.noLeakGuard,
      emitAudit: (e) => audit.push(e),
    }),
  );
  return { app, audit };
}

function authHeaders(extra?: Record<string, string>) {
  return {
    'content-type': 'application/json',
    'x-admission-service-token': TOKEN,
    'x-admission-operator-id': OPERATOR,
    ...extra,
  };
}

function spikeBody(transition_intent: string) {
  return JSON.stringify({ spike: ADMISSION_SPIKE_BODY_MARKER, transition_intent });
}

describe('POST /api/admission/intake — disabled gate (default-off posture)', () => {
  it('returns a safe disabled refusal (404) leaking nothing', async () => {
    const { app, audit } = buildApp({ enabled: false });
    const res = await app.request('/api/admission/intake', {
      method: 'POST',
      headers: authHeaders(),
      body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept),
    });
    expect(res.status).toBe(404);
    const text = await res.text();
    const body = JSON.parse(text);
    expect(body.outcome_class).toBe('refused');
    expect(body.error).toBe('admission.spike_disabled');
    expect(findAdmissionPublicLeaks(body)).toEqual([]);
    expect(audit.some((e) => e.event === 'admission_intake_spike.disabled')).toBe(true);
  });
});

describe('POST /api/admission/intake — auth gate (dev/operator-only)', () => {
  it('missing auth denies (403)', async () => {
    const { app } = buildApp();
    const res = await app.request('/api/admission/intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept),
    });
    expect(res.status).toBe(403);
    const body = JSON.parse(await res.text());
    expect(body.error).toBe('admission.unauthorized_dev_operator');
    expect(findAdmissionPublicLeaks(body)).toEqual([]);
  });

  it('invalid token denies (403)', async () => {
    const { app } = buildApp();
    const res = await app.request('/api/admission/intake', {
      method: 'POST',
      headers: authHeaders({ 'x-admission-service-token': 'wrong-token' }),
      body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept),
    });
    expect(res.status).toBe(403);
  });

  it('non-operator denies (403)', async () => {
    const { app } = buildApp();
    const res = await app.request('/api/admission/intake', {
      method: 'POST',
      headers: authHeaders({ 'x-admission-operator-id': 'op-mallory' }),
      body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept),
    });
    expect(res.status).toBe(403);
  });

  it('empty token AND empty allowlist rejects all even when enabled', async () => {
    const { app } = buildApp({ serviceToken: '', operatorIds: [] });
    const res = await app.request('/api/admission/intake', {
      method: 'POST',
      headers: authHeaders(),
      body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept),
    });
    expect(res.status).toBe(403);
  });

  it('does not reveal the token or whether it almost matched on refusal', async () => {
    const { app } = buildApp();
    const res = await app.request('/api/admission/intake', {
      method: 'POST',
      headers: authHeaders({ 'x-admission-service-token': TOKEN.slice(0, -1) }),
      body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept),
    });
    expect(res.status).toBe(403);
    const text = await res.text();
    expect(text).not.toContain(TOKEN);
    expect(text).not.toContain(TOKEN.slice(0, -1));
    expect(text).not.toMatch(/almost|prefix|partial/i);
  });
});

describe('POST /api/admission/intake — five scenarios (authorized)', () => {
  const cases: Array<{ name: string; intent: string; status: number; outcome: string; recall: boolean }> = [
    { name: 'A pending', intent: ADMISSION_TRANSITION_INTENTS.pending, status: 200, outcome: 'accepted_as_proposed', recall: false },
    { name: 'B accept', intent: ADMISSION_TRANSITION_INTENTS.accept, status: 200, outcome: 'admitted', recall: true },
    { name: 'C reject', intent: ADMISSION_TRANSITION_INTENTS.reject, status: 200, outcome: 'denied', recall: false },
    { name: 'D supersede', intent: ADMISSION_TRANSITION_INTENTS.supersede, status: 200, outcome: 'superseded_with_correction', recall: true },
    { name: 'E malformed', intent: ADMISSION_TRANSITION_INTENTS.malformed, status: 400, outcome: 'refused', recall: false },
  ];

  for (const tc of cases) {
    it(`${tc.name}: ${tc.outcome} (${tc.status}), no leak`, async () => {
      const { app, audit } = buildApp();
      const res = await app.request('/api/admission/intake', {
        method: 'POST',
        headers: authHeaders(),
        body: spikeBody(tc.intent),
      });
      expect(res.status).toBe(tc.status);
      const body = JSON.parse(await res.text());
      expect(body.outcome_class).toBe(tc.outcome);
      expect(body.recall_eligible).toBe(tc.recall);
      expect(body.spike).toBe('dev_operator_only_non_production');
      expect(findAdmissionPublicLeaks(body)).toEqual([]);
      // Audit carries only public-safe fields.
      const serialized = JSON.stringify(audit);
      expect(serialized).not.toContain(TOKEN);
      expect(serialized).not.toContain(OPERATOR);
    });
  }
});

describe('POST /api/admission/intake — malformed / unsupported fail-closed', () => {
  const bad: Array<[string, string]> = [
    ['invalid JSON', '{ not json'],
    ['missing marker', JSON.stringify({ transition_intent: ADMISSION_TRANSITION_INTENTS.accept })],
    ['unknown intent', JSON.stringify({ spike: ADMISSION_SPIKE_BODY_MARKER, transition_intent: 'invent' })],
    ['free-form payload', JSON.stringify({ spike: ADMISSION_SPIKE_BODY_MARKER, transition_intent: ADMISSION_TRANSITION_INTENTS.accept, candidate_payload: { text: 'remember this' } })],
    ['empty body', ''],
  ];
  for (const [name, raw] of bad) {
    it(`${name} → 400 ingress.invalid_request, nothing recallable, no leak`, async () => {
      const { app } = buildApp();
      const res = await app.request('/api/admission/intake', {
        method: 'POST',
        headers: authHeaders(),
        body: raw,
      });
      expect(res.status).toBe(400);
      const body = JSON.parse(await res.text());
      expect(body.outcome_class).toBe('refused');
      expect(body.safe_reason_code).toBe('ingress.invalid_request');
      expect(body.recall_eligible).toBe(false);
      expect(findAdmissionPublicLeaks(body)).toEqual([]);
      // The hidden reason (e.g. the raw payload) never appears in the body.
      expect(JSON.stringify(body)).not.toContain('remember this');
    });
  }
});

describe('POST /api/admission/intake — partial-failure posture (Phase 33M §13.1)', () => {
  it('an internal partial failure fails closed with the stable refusal, no recallable state', async () => {
    const { app } = buildApp({
      beforeFinalize: () => {
        throw new Error('simulated partial internal failure');
      },
    });
    // Use the accept scenario (which WOULD have been recall-eligible) to prove
    // a partial failure produces NO recallable admitted assertion.
    const res = await app.request('/api/admission/intake', {
      method: 'POST',
      headers: authHeaders(),
      body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept),
    });
    expect(res.status).toBe(400);
    const body = JSON.parse(await res.text());
    expect(body.outcome_class).toBe('refused');
    expect(body.safe_reason_code).toBe('ingress.invalid_request');
    expect(body.recall_eligible).toBe(false);
    expect(body.public_receipt_ref ?? null).toBeNull();
    expect(body.recall_projection?.ordinary_recall_includes ?? []).toEqual([]);
    // The simulated error message must not leak into the public body.
    expect(JSON.stringify(body)).not.toContain('simulated partial internal failure');
    expect(findAdmissionPublicLeaks(body)).toEqual([]);
  });

  it('retrying the same accept request never mints a duplicate (Option A future-intent)', async () => {
    const { app } = buildApp();
    const headers = authHeaders();
    const body = spikeBody(ADMISSION_TRANSITION_INTENTS.accept);
    const r1 = await app.request('/api/admission/intake', { method: 'POST', headers, body });
    const r2 = await app.request('/api/admission/intake', { method: 'POST', headers, body });
    const t1 = await r1.text();
    const t2 = await r2.text();
    // Deterministic, identical, no durable state → no duplicate assertion.
    expect(r1.status).toBe(r2.status);
    expect(t1).toBe(t2);
    expect(JSON.parse(t1).public_receipt_ref).toBe('admission-spike-receipt-draft');
  });
});

describe('POST /api/admission/intake — no-leak deep-walk over every public surface', () => {
  it('covers disabled / unauthorized / malformed / all five scenarios', async () => {
    const surfaces: Array<{ label: string; app: Hono; headers: Record<string, string>; body: string }> = [];

    // disabled
    surfaces.push({ label: 'disabled', app: buildApp({ enabled: false }).app, headers: authHeaders(), body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept) });
    // unauthorized
    surfaces.push({ label: 'unauthorized', app: buildApp().app, headers: { 'content-type': 'application/json' }, body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept) });
    // malformed
    surfaces.push({ label: 'malformed', app: buildApp().app, headers: authHeaders(), body: '{ not json' });
    // five scenarios
    for (const intent of Object.values(ADMISSION_TRANSITION_INTENTS)) {
      surfaces.push({ label: `scenario:${intent}`, app: buildApp().app, headers: authHeaders(), body: spikeBody(intent) });
    }

    for (const s of surfaces) {
      const res = await s.app.request('/api/admission/intake', { method: 'POST', headers: s.headers, body: s.body });
      const text = await res.text();
      const parsed = JSON.parse(text);
      const leaks = findAdmissionPublicLeaks(parsed);
      expect({ label: s.label, leaks }).toEqual({ label: s.label, leaks: [] });
      // Wire-text scan for obvious leak shapes.
      expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]+\./); // no JWT
      expect(text).not.toContain('.ts:');
      expect(text).not.toContain('Traceback');
    }
  });
});

// Patch 1 (Phase 33N audit): the runtime no-leak guard MUST inspect EVERY
// public body — not only the classified-outcome responses. These tests use the
// `noLeakGuard` DI seam to prove (a) the guard is actually invoked for every
// response path (disabled / unauthorized / oversized / malformed / classifier-
// error / partial-failure / a successful classified outcome), and (b) when the
// guard reports a leak on any path, the route fails closed to a hardcoded
// known-safe fallback that itself leaks neither the rejected body nor the
// guard's own findings.

// Every distinct response path, expressed as a buildApp() options + request.
// `cleanEvent` is the SINGLE per-path audit event the route emits when the guard
// passes (used to prove exactly-one-event behavior and that a guard failure
// suppresses this event in favor of the stable refused event).
type GuardPathCase = {
  label: string;
  opts: Parameters<typeof buildApp>[0];
  headers: Record<string, string>;
  body: string;
  cleanEvent: AdmissionSpikeAuditEvent['event'];
};

// The five CLASSIFIED responses (Patch 2): every transition_intent the
// classifier recognizes. Note `classified:malformed` is the EXPLICIT malformed
// classification (vector E — recognized → refused/400), which is distinct from
// the `classifier-error` path below (an UNRECOGNIZED intent that throws). The
// four non-refused outcomes emit `…outcome`; the explicit malformed emits
// `…refused` (carrying scenario_id + outcome_class on the clean path).
const CLASSIFIED_CASES: Array<{ label: string; intent: string; cleanEvent: AdmissionSpikeAuditEvent['event'] }> = [
  { label: 'classified:pending', intent: ADMISSION_TRANSITION_INTENTS.pending, cleanEvent: 'admission_intake_spike.outcome' },
  { label: 'classified:accept', intent: ADMISSION_TRANSITION_INTENTS.accept, cleanEvent: 'admission_intake_spike.outcome' },
  { label: 'classified:reject', intent: ADMISSION_TRANSITION_INTENTS.reject, cleanEvent: 'admission_intake_spike.outcome' },
  { label: 'classified:supersede', intent: ADMISSION_TRANSITION_INTENTS.supersede, cleanEvent: 'admission_intake_spike.outcome' },
  { label: 'classified:malformed', intent: ADMISSION_TRANSITION_INTENTS.malformed, cleanEvent: 'admission_intake_spike.refused' },
];

function guardPathCases(spyGuard?: (body: unknown) => string[]): GuardPathCase[] {
  return [
    { label: 'disabled', opts: { enabled: false, noLeakGuard: spyGuard }, headers: authHeaders(), body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept), cleanEvent: 'admission_intake_spike.disabled' },
    { label: 'unauthorized', opts: { noLeakGuard: spyGuard }, headers: { 'content-type': 'application/json' }, body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept), cleanEvent: 'admission_intake_spike.unauthorized' },
    // A body well past the 8KB endpoint cap trips the byte-length check before
    // JSON.parse (deterministic regardless of any recomputed content-length).
    { label: 'oversized', opts: { noLeakGuard: spyGuard }, headers: authHeaders(), body: '{"spike":"' + 'x'.repeat(9000) + '"}', cleanEvent: 'admission_intake_spike.refused' },
    { label: 'malformed', opts: { noLeakGuard: spyGuard }, headers: authHeaders(), body: '{ not json', cleanEvent: 'admission_intake_spike.refused' },
    { label: 'classifier-error', opts: { noLeakGuard: spyGuard }, headers: authHeaders(), body: JSON.stringify({ spike: ADMISSION_SPIKE_BODY_MARKER, transition_intent: 'totally-unknown-intent' }), cleanEvent: 'admission_intake_spike.refused' },
    { label: 'partial-failure', opts: { noLeakGuard: spyGuard, beforeFinalize: () => { throw new Error('boom'); } }, headers: authHeaders(), body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept), cleanEvent: 'admission_intake_spike.refused' },
    // All five classified responses (Patch 2): pending, accept, reject,
    // supersede, and the explicit malformed classification.
    ...CLASSIFIED_CASES.map((tc) => ({
      label: tc.label,
      opts: { noLeakGuard: spyGuard },
      headers: authHeaders(),
      body: spikeBody(tc.intent),
      cleanEvent: tc.cleanEvent,
    })),
  ];
}

describe('POST /api/admission/intake — runtime no-leak guard runs on EVERY response path (Patch 1)', () => {
  it('invokes the injected guard exactly once for every public response path', async () => {
    // Covers all non-classified paths AND all five classified responses
    // (pending / accept / reject / supersede / explicit malformed) — Patch 2.
    for (const tc of guardPathCases()) {
      let calls = 0;
      const seen: unknown[] = [];
      const spyGuard = (body: unknown) => {
        calls += 1;
        seen.push(body);
        return []; // clean — let the intended body through
      };
      const { app, audit } = buildApp({ ...tc.opts, noLeakGuard: spyGuard });
      await app.request('/api/admission/intake', { method: 'POST', headers: tc.headers, body: tc.body });
      // The guard saw this path's outgoing body before it was sent.
      expect({ path: tc.label, calls }).toEqual({ path: tc.label, calls: 1 });
      // And what it inspected was an object (the public body), never a string.
      expect({ path: tc.label, isObject: typeof seen[0] === 'object' && seen[0] !== null }).toEqual({
        path: tc.label,
        isObject: true,
      });
      // On a CLEAN guard, exactly one audit event fires for this path — the
      // intended per-path event — and NOT the stable guard-failure refused
      // event (unless this path's clean event already IS `…refused`).
      expect({ path: tc.label, len: audit.length }).toEqual({ path: tc.label, len: 1 });
      expect({ path: tc.label, event: audit[0]!.event }).toEqual({ path: tc.label, event: tc.cleanEvent });
    }
  });

  // The two guard-FAILURE modes the route treats identically (fail closed):
  // (a) the guard RETURNS a non-empty finding list, and (b) the guard THROWS.
  // Patch 2 (second round): the error/secret/stack-leak proof must hold for
  // EVERY forced-leak path under BOTH modes — not only for one standalone
  // throwing-guard test. Each mode's guard embeds the full GUARD_DETAIL blob
  // (poison + forbidden-key phrase + Error:/stack/secret + token + operator +
  // body marker); none of it may reach the wire or the audit trail.
  const GUARD_FAILURE_MODES: Array<{
    mode: string;
    makeGuard: () => (body: unknown) => string[];
  }> = [
    { mode: 'returns-finding', makeGuard: () => () => [GUARD_DETAIL] },
    {
      mode: 'throws',
      makeGuard:
        () =>
        () => {
          throw new Error(GUARD_DETAIL);
        },
    },
  ];

  it('fails closed to the EXACT known-safe fallback on every path under both guard-failure modes', async () => {
    // Adversarial: force the guard to fail (return a finding OR throw) as if a
    // forbidden field had slipped into the outgoing body. Every path — including
    // all five classified responses (pending / accept / reject / supersede /
    // explicit malformed) — must collapse to the HARDCODED fallback (HTTP 500):
    // exact body equality, never the intended body, never the guard's findings,
    // and never an Error/stack/secret. (Patch 2.)
    for (const gm of GUARD_FAILURE_MODES) {
      for (const tc of guardPathCases()) {
        const where = `${tc.label}/${gm.mode}`;
        const { app, audit } = buildApp({ ...tc.opts, noLeakGuard: gm.makeGuard() });
        const res = await app.request('/api/admission/intake', {
          method: 'POST',
          headers: tc.headers,
          body: tc.body,
        });
        expect({ where, status: res.status }).toEqual({ where, status: 500 });
        const text = await res.text();
        const body = JSON.parse(text);

        // (1) EXACT fallback body equality — proves no extra fields, no
        // intended-body residue, and no guard detail are present (`toEqual`
        // requires the object to have EXACTLY these keys/values).
        expect({ where, body }).toEqual({ where, body: { ...GUARD_FAILED_FALLBACK_BODY } });

        // (2) Wire-text sentinel sweep — the serialized client response carries
        // none of: guard findings, poison, forbidden-key text, TOKEN, OPERATOR,
        // body marker, intended rejected-body content, Error:, stack, or secret.
        for (const forbidden of FORCED_LEAK_FORBIDDEN_SUBSTRINGS) {
          expect({ where, forbidden, present: text.includes(forbidden) }).toEqual({
            where,
            forbidden,
            present: false,
          });
        }
        // (3) The fallback is clean under the REAL guard.
        expect({ where, leaks: findAdmissionPublicLeaks(body) }).toEqual({ where, leaks: [] });

        // (4) Exact audit behavior on guard failure: EXACTLY ONE event (not
        // audit.some), the STABLE refused event, and NOT the original per-path
        // clean event. The guard-failure refused event carries NO scenario_id
        // and NO outcome_class — distinguishing it from a clean classified
        // refused event (e.g. classified:malformed) which would carry both.
        expect({ where, len: audit.length }).toEqual({ where, len: 1 });
        const event = audit[0]!;
        expect({ where, event: event.event }).toEqual({
          where,
          event: 'admission_intake_spike.refused',
        });
        expect({ where, scenario_id: event.scenario_id ?? null }).toEqual({ where, scenario_id: null });
        expect({ where, outcome_class: event.outcome_class ?? null }).toEqual({
          where,
          outcome_class: null,
        });
        // (5) No guard details / secrets / token / operator / request body in
        // the audit trail either — same sentinel sweep applied to the audit.
        const serializedAudit = JSON.stringify(audit);
        for (const forbidden of FORCED_LEAK_FORBIDDEN_SUBSTRINGS) {
          expect({ where, forbidden, inAudit: serializedAudit.includes(forbidden) }).toEqual({
            where,
            forbidden,
            inAudit: false,
          });
        }
      }
    }
  });

  it('fails closed (does not crash or leak) when the guard itself THROWS (focused smoke test)', async () => {
    // Retained as a focused, readable smoke test. It is NO LONGER the sole proof
    // of error/secret/stack non-leakage — the forced-leak matrix above now
    // exercises the throwing-guard mode on every path. A guard that throws must
    // be treated like a detected leak — never a 500 with a stack trace, never
    // the intended body.
    const throwingGuard = () => {
      throw new Error('guard exploded: tenant_id=secret');
    };
    const { app } = buildApp({ noLeakGuard: throwingGuard });
    const res = await app.request('/api/admission/intake', {
      method: 'POST',
      headers: authHeaders(),
      body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept),
    });
    expect(res.status).toBe(500);
    const text = await res.text();
    const body = JSON.parse(text);
    expect(body).toEqual({ ...GUARD_FAILED_FALLBACK_BODY });
    expect(text).not.toContain('guard exploded');
    expect(text).not.toContain('secret');
    expect(text).not.toContain('Error:');
    expect(findAdmissionPublicLeaks(body)).toEqual([]);
  });
});
