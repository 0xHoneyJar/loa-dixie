// Phase 33Q — integration proof that wiring the dev-only synthetic
// admitted-assertion ledger into the route via the OPTIONAL DI seam:
//   (a) leaves the public response byte-IDENTICAL to the Phase 33N no-store
//       Option A path when no ledger is injected (production/server default);
//   (b) records internally on accept/supersede but NEVER changes the public body
//       and NEVER leaks ledger ids / private audit fields;
//   (c) does not record for pending / reject / malformed;
//   (d) fails closed to the stable public-safe refusal when the ledger throws,
//       with no recallable residue.
//
// Authorized by the Phase 33P storage/receipt hardening decision gate
// (docs/ADMISSION-WEDGE-STORAGE-RECEIPT-HARDENING-GATE.md §7–§12). The handler is
// mounted directly (mirroring route-gate.test.ts), so this exercises the route
// logic + the DI seam, not the global middleware stack. server.ts injects NO
// ledger — the ledger here is a test-only injection.
//
// SCOPE BINDING (Codex blocker 1): the route is injected with BOTH a synthetic
// tenant id and a synthetic estate id; the ledger binds every access to that
// (tenant, estate) pair. Inspection in these tests uses the same scope.
//
// CONFLICT NOTE (Phase 33P §12): a genuine conflicting replay is NOT reachable
// through the public route — the route always derives an IDENTICAL fixed
// synthetic transition per scenario, so it can only ever produce an idempotent
// replay, never a conflict. The conflicting-replay-fails-closed proof therefore
// lives at the unit layer (admitted-assertion-ledger.test.ts). Here we prove the
// route's fail-closed-on-throw behavior with a stub ledger whose record() throws.

import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { createAdmissionIntakeRoutes } from '../../../src/routes/admission-intake.js';
import {
  ADMISSION_TRANSITION_INTENTS,
  createAdmittedAssertionLedger,
  findAdmissionPublicLeaks,
  type AdmittedAssertionLedger,
  type AdmittedScope,
} from '../../../src/services/admission-wedge-spike/index.js';

const TOKEN = 'dev-operator-token-synthetic-store-001';
const OPERATOR = 'op-store-test';
const SYNTH_ESTATE = 'estate-synthetic-dev';
const SYNTH_TENANT = 'tenant-synthetic-dev';
const SCOPE: AdmittedScope = { tenant_id: SYNTH_TENANT, estate_id: SYNTH_ESTATE };

// The fixed synthetic ids the route mints (must match admission-intake.ts).
const SYNTH_ADMITTED_ASSERTION_ID = 'assn-active-synthetic-dev';
const SYNTH_CORRECTED_ASSERTION_ID = 'assn-corrected-synthetic-dev';
const SYNTH_SOURCE_CANDIDATE_ID = 'cand-synthetic-dev';

function authHeaders(extra?: Record<string, string>) {
  return {
    'content-type': 'application/json',
    'x-admission-service-token': TOKEN,
    'x-admission-operator-id': OPERATOR,
    ...extra,
  };
}

function spikeBody(transition_intent: string) {
  return JSON.stringify({ spike: 'admission_intake_dev_spike_v0', transition_intent });
}

/** Build a route app. When `withLedger` is true, a real seeded ledger is
 *  injected and returned for post-request inspection. */
function buildApp(opts?: { withLedger?: boolean; ledger?: AdmittedAssertionLedger }) {
  let ledger: AdmittedAssertionLedger | undefined;
  if (opts?.ledger) {
    ledger = opts.ledger;
  } else if (opts?.withLedger) {
    ledger = createAdmittedAssertionLedger({
      maxAssertionsPerEstate: 100,
      maxAssertionBytesPerEstate: 1_000_000,
    });
    ledger.seedEstate(SCOPE);
  }
  const app = new Hono();
  app.route(
    '/api/admission/intake',
    createAdmissionIntakeRoutes({
      enabled: true,
      gate: { serviceToken: TOKEN, operatorIds: [OPERATOR] },
      admittedAssertionLedger: ledger,
      admittedAssertionTenantId: ledger ? SYNTH_TENANT : undefined,
      admittedAssertionEstateId: ledger ? SYNTH_ESTATE : undefined,
    }),
  );
  return { app, ledger };
}

async function post(app: Hono, intent: string, headers = authHeaders()) {
  return app.request('/api/admission/intake', { method: 'POST', headers, body: spikeBody(intent) });
}

// ── (a) Default (no ledger) is byte-equivalent to Option A ────────────────────
//
// For scenarios whose ledger write SUCCEEDS, the public body is byte-identical
// with and without the ledger seam. `supersede` requires a prior active
// assertion to correct, so for that scenario BOTH apps are primed with a
// preceding accept first (priming the stateless no-ledger app is harmless). The
// distinct case of a STANDALONE supersede against an empty ledger (which
// correctly fails closed) is proven separately below.

describe('Phase 33Q route — ledger seam does not change the public body when the write succeeds', () => {
  for (const [name, intent] of Object.entries(ADMISSION_TRANSITION_INTENTS)) {
    it(`${name}: public response identical with and without the ledger seam`, async () => {
      const { app: noLedger } = buildApp();
      const { app: withLedger } = buildApp({ withLedger: true });

      // Precondition: a supersede needs a prior active assertion in the estate.
      if (name === 'supersede') {
        await post(noLedger, ADMISSION_TRANSITION_INTENTS.accept);
        await post(withLedger, ADMISSION_TRANSITION_INTENTS.accept);
      }

      const r1 = await post(noLedger, intent);
      const r2 = await post(withLedger, intent);

      expect(r1.status).toBe(r2.status);
      const [t1, t2] = [await r1.text(), await r2.text()];
      // The injected ledger must not change a single byte of the public body.
      expect(t2).toBe(t1);
      expect(findAdmissionPublicLeaks(JSON.parse(t2))).toEqual([]);
    });
  }

  it('no-ledger is the production default: server.ts injects no ledger, behavior unchanged', async () => {
    // The no-ledger app IS the Phase 33N Option A path verbatim — every scenario
    // returns its deterministic public outcome with no leak.
    const { app } = buildApp();
    for (const intent of Object.values(ADMISSION_TRANSITION_INTENTS)) {
      const res = await post(app, intent);
      const body = JSON.parse(await res.text());
      expect(body.spike).toBe('dev_operator_only_non_production');
      expect(findAdmissionPublicLeaks(body)).toEqual([]);
    }
  });

  it('a partial DI injection (ledger but no tenant id) records nothing — stays Option A', async () => {
    // Defense-in-depth: with a ledger but a MISSING tenant id, the route must NOT
    // attempt a ledger write (it needs the full synthetic scope), so behavior is
    // the no-store Option A path and the ledger stays empty.
    const ledger = createAdmittedAssertionLedger({
      maxAssertionsPerEstate: 100,
      maxAssertionBytesPerEstate: 1_000_000,
    });
    ledger.seedEstate(SCOPE);
    const app = new Hono();
    app.route(
      '/api/admission/intake',
      createAdmissionIntakeRoutes({
        enabled: true,
        gate: { serviceToken: TOKEN, operatorIds: [OPERATOR] },
        admittedAssertionLedger: ledger,
        // admittedAssertionTenantId intentionally omitted.
        admittedAssertionEstateId: SYNTH_ESTATE,
      }),
    );
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    expect(res.status).toBe(200);
    expect(ledger.inspectEstate(SCOPE).assertions).toBe(0);
  });

  it('a STANDALONE supersede against an empty ledger fails closed (referential integrity)', async () => {
    // With the ledger injected but NO prior accept, the synthetic supersede has
    // no active prior to correct → the ledger fails closed and the route returns
    // the stable 400 refusal. This is correct, state-driven fail-closed behavior
    // (NOT a public-schema change): the public body is still the standard refusal
    // shape, leak-clean, and no synthetic assertion is left behind.
    const { app, ledger } = buildApp({ withLedger: true });
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.supersede);
    expect(res.status).toBe(400);
    const body = JSON.parse(await res.text());
    expect(body.outcome_class).toBe('refused');
    expect(body.safe_reason_code).toBe('ingress.invalid_request');
    expect(findAdmissionPublicLeaks(body)).toEqual([]);
    expect(ledger!.inspectEstate(SCOPE).assertions).toBe(0);
  });
});

// ── (b) accept/supersede record internally; public body unchanged & leak-clean ─

describe('Phase 33Q route — accept records internally, public body unchanged (§9.1, §11)', () => {
  it('accept mints one active synthetic assertion in the ledger without leaking it', async () => {
    const { app, ledger } = buildApp({ withLedger: true });
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    const text = await res.text();
    const body = JSON.parse(text);

    expect(res.status).toBe(200);
    expect(body.outcome_class).toBe('admitted');
    expect(body.recall_eligible).toBe(true);
    expect(findAdmissionPublicLeaks(body)).toEqual([]);

    // Internal effect: one active assertion recorded.
    expect(ledger!.inspectEstate(SCOPE).assertions).toBe(1);
    expect(ledger!.projectRecall(SCOPE).includes).toEqual([SYNTH_ADMITTED_ASSERTION_ID]);

    // The synthetic ledger ids / private audit fields NEVER appear on the wire.
    expect(text).not.toContain(SYNTH_ADMITTED_ASSERTION_ID);
    expect(text).not.toContain(SYNTH_SOURCE_CANDIDATE_ID);
    expect(text).not.toContain('assertion_admitted');
    expect(text).not.toContain('audit_private');
    expect(text).not.toContain('rcpt-priv-');
  });

  it('supersede (after an accept) repoints recall to corrected active, prior preserved', async () => {
    const { app, ledger } = buildApp({ withLedger: true });
    await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.supersede);
    const text = await res.text();
    const body = JSON.parse(text);

    expect(res.status).toBe(200);
    expect(body.outcome_class).toBe('superseded_with_correction');
    expect(findAdmissionPublicLeaks(body)).toEqual([]);

    // Internal effect: corrected active recallable; prior superseded but kept.
    expect(ledger!.projectRecall(SCOPE)).toEqual({
      includes: [SYNTH_CORRECTED_ASSERTION_ID],
      excludes: [SYNTH_ADMITTED_ASSERTION_ID],
    });
    expect(ledger!.inspectEstate(SCOPE).assertions).toBe(2);

    // No ledger id leaks on the wire.
    expect(text).not.toContain(SYNTH_CORRECTED_ASSERTION_ID);
    expect(text).not.toContain(SYNTH_ADMITTED_ASSERTION_ID);
  });

  it('replaying the same accept does not mint a duplicate (spike-scoped de-dup, §12)', async () => {
    const { app, ledger } = buildApp({ withLedger: true });
    const r1 = await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    const r2 = await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    expect(await r1.text()).toBe(await r2.text());
    // Only one synthetic assertion despite two identical accepts.
    expect(ledger!.inspectEstate(SCOPE).assertions).toBe(1);
  });
});

// ── (c) pending / reject / malformed never record an admitted assertion ───────

describe('Phase 33Q route — pending/reject/malformed leave no admitted assertion (§9.3–§9.5)', () => {
  it('pending records nothing and is not recallable', async () => {
    const { app, ledger } = buildApp({ withLedger: true });
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.pending);
    expect(res.status).toBe(200);
    expect(ledger!.inspectEstate(SCOPE).assertions).toBe(0);
    expect(ledger!.projectRecall(SCOPE)).toEqual({ includes: [], excludes: [] });
    expect(ledger!.auditTrail(SCOPE)).toEqual([]);
  });

  it('reject records no admitted assertion', async () => {
    const { app, ledger } = buildApp({ withLedger: true });
    await post(app, ADMISSION_TRANSITION_INTENTS.reject);
    expect(ledger!.inspectEstate(SCOPE).assertions).toBe(0);
    expect(ledger!.projectRecall(SCOPE).includes).toEqual([]);
  });

  it('malformed fails closed before the ledger is reached', async () => {
    const { app, ledger } = buildApp({ withLedger: true });
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.malformed);
    expect(res.status).toBe(400);
    expect(ledger!.inspectEstate(SCOPE).assertions).toBe(0);
  });

  it('an unsupported/garbage shape fails closed and reaches no ledger write', async () => {
    const { app, ledger } = buildApp({ withLedger: true });
    const res = await app.request('/api/admission/intake', {
      method: 'POST',
      headers: authHeaders(),
      body: '{ not json',
    });
    expect(res.status).toBe(400);
    expect(ledger!.inspectEstate(SCOPE).assertions).toBe(0);
  });
});

// ── (d) ledger throw → stable fail-closed refusal, no recallable residue ──────

describe('Phase 33Q route — ledger throw fails closed to the stable refusal (§9 case-8)', () => {
  it('a throwing ledger collapses an accept to the stable 400 refusal, leaking nothing', async () => {
    // Stub ledger whose record() throws (simulating capacity/scope/conflict).
    // Its inspect/project/audit methods report empty, proving no residue.
    let recordCalls = 0;
    const throwingLedger: AdmittedAssertionLedger = {
      seedEstate: () => undefined,
      record: () => {
        recordCalls += 1;
        throw new Error('synthetic ledger record failure');
      },
      forEstate: (scope) => ({
        tenant_id: scope.tenant_id,
        estate_id: scope.estate_id,
        record: () => {
          throw new Error('synthetic ledger record failure');
        },
        projectRecall: () => ({ includes: [], excludes: [] }),
        inspectEstate: () => ({ assertions: 0, bytes: 0 }),
        auditTrail: () => [],
      }),
      projectRecall: () => ({ includes: [], excludes: [] }),
      inspectEstate: () => ({ assertions: 0, bytes: 0 }),
      auditTrail: () => [],
    };
    const { app } = buildApp({ ledger: throwingLedger });

    const res = await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    expect(res.status).toBe(400);
    const body = JSON.parse(await res.text());
    expect(body.outcome_class).toBe('refused');
    expect(body.safe_reason_code).toBe('ingress.invalid_request');
    expect(body.recall_eligible).toBe(false);
    expect(body.public_receipt_ref ?? null).toBeNull();
    expect(body.recall_projection?.ordinary_recall_includes ?? []).toEqual([]);
    // The synthetic error text never leaks.
    expect(JSON.stringify(body)).not.toContain('synthetic ledger record failure');
    expect(findAdmissionPublicLeaks(body)).toEqual([]);
    // The route DID attempt the ledger write for the accept scenario.
    expect(recordCalls).toBe(1);
  });

  it('a throwing ledger does NOT affect pending (ledger never invoked for pending)', async () => {
    let recordCalls = 0;
    const throwingLedger: AdmittedAssertionLedger = {
      seedEstate: () => undefined,
      record: () => {
        recordCalls += 1;
        throw new Error('should not be called for pending');
      },
      forEstate: (scope) => ({
        tenant_id: scope.tenant_id,
        estate_id: scope.estate_id,
        record: () => ({ outcome: 'recorded', admitted_assertion_id: 'x', assertion_status: 'active' }),
        projectRecall: () => ({ includes: [], excludes: [] }),
        inspectEstate: () => ({ assertions: 0, bytes: 0 }),
        auditTrail: () => [],
      }),
      projectRecall: () => ({ includes: [], excludes: [] }),
      inspectEstate: () => ({ assertions: 0, bytes: 0 }),
      auditTrail: () => [],
    };
    const { app } = buildApp({ ledger: throwingLedger });
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.pending);
    expect(res.status).toBe(200);
    expect(recordCalls).toBe(0);
  });
});
