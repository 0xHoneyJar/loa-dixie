// Phase 46V — dev/operator-only Admission Wedge ROUTE-STORAGE spike, exercised
// through the route handler with the route-storage store DI seam (Storage
// Mode 1: no-migration, bounded-synthetic, in-process; NON-PRODUCTION).
//
// Authorized NARROWLY by Phase 46U
// (docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md §3–§16). This
// proves the route-level obligations the unit suite cannot:
//
//   * default-off: with NO store injected (the production/server default unless
//     the route-storage gate is on), the public body is byte-IDENTICAL to the
//     Phase 33N no-store path and leak-clean — current behavior unchanged;
//   * persisted / replayed public no-leak: accept/supersede record into the
//     store while the public body stays the deterministic public-safe response,
//     deep-walked clean by the runtime guard, with NO store ids on the wire;
//     replaying returns the SAME public body and mints no duplicate;
//   * recall lifecycle: pending/reject/malformed mint nothing recallable; accept
//     references an admitted assertion; supersede excludes the prior;
//   * degraded / failed store fails closed: a throwing store collapses an accept
//     to the stable public-safe refusal with no recallable residue, leaking
//     neither the store error nor any id;
//   * actor isolation at the route: the route records under one fixed synthetic
//     actor; a different actor scope sees nothing.
//
// The handler is mounted directly (mirroring store-coupled.test.ts), so this
// exercises the route logic + the DI seam. The server-level AND-gating of the
// two env flags is proven in registration.test.ts. All ids/tokens are synthetic.

import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { createAdmissionIntakeRoutes } from '../../../src/routes/admission-intake.js';
import {
  ADMISSION_TRANSITION_INTENTS,
  createRouteStorageSpikeStore,
  findAdmissionPublicLeaks,
  type RouteStorageSpikeScope,
  type RouteStorageSpikeStore,
} from '../../../src/services/admission-wedge-spike/index.js';

const TOKEN = 'dev-operator-token-synthetic-rss-001';
const OPERATOR = 'op-rss-test';

// Must match the server's fixed synthetic constants (server.ts Phase 46V block).
const SYNTH_TENANT = 'tenant-synthetic-dev';
const SYNTH_ESTATE = 'estate-synthetic-dev';
const SYNTH_ACTOR = 'actor-synthetic-dev';
const SCOPE: RouteStorageSpikeScope = {
  tenant_id: SYNTH_TENANT,
  estate_id: SYNTH_ESTATE,
  actor_id: SYNTH_ACTOR,
};

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

/** Build a route app. When `withStore` is true a real seeded store is injected
 *  and returned for post-request inspection. A custom `store` overrides it. */
function buildApp(opts?: { withStore?: boolean; store?: RouteStorageSpikeStore }) {
  let store: RouteStorageSpikeStore | undefined;
  if (opts?.store) {
    store = opts.store;
  } else if (opts?.withStore) {
    store = createRouteStorageSpikeStore({
      maxActors: 8,
      maxAssertionsPerEstate: 32,
      maxAssertionBytesPerEstate: 100_000,
    });
    store.seedScope(SCOPE);
  }
  const app = new Hono();
  app.route(
    '/api/admission/intake',
    createAdmissionIntakeRoutes({
      enabled: true,
      gate: { serviceToken: TOKEN, operatorIds: [OPERATOR] },
      routeStorageSpikeStore: store,
      routeStorageSpikeTenantId: store ? SYNTH_TENANT : undefined,
      routeStorageSpikeEstateId: store ? SYNTH_ESTATE : undefined,
      routeStorageSpikeActorId: store ? SYNTH_ACTOR : undefined,
    }),
  );
  return { app, store };
}

async function post(app: Hono, intent: string, headers = authHeaders()) {
  return app.request('/api/admission/intake', { method: 'POST', headers, body: spikeBody(intent) });
}

// ── Default-off: the store seam never changes the public body ─────────────────

describe('Phase 46V route — store seam does not change the public body (default-off parity)', () => {
  for (const [name, intent] of Object.entries(ADMISSION_TRANSITION_INTENTS)) {
    it(`${name}: public response identical with and without the store seam`, async () => {
      const { app: noStore } = buildApp();
      const { app: withStore } = buildApp({ withStore: true });

      // A supersede needs a prior active assertion in the estate.
      if (name === 'supersede') {
        await post(noStore, ADMISSION_TRANSITION_INTENTS.accept);
        await post(withStore, ADMISSION_TRANSITION_INTENTS.accept);
      }

      const r1 = await post(noStore, intent);
      const r2 = await post(withStore, intent);
      expect(r1.status).toBe(r2.status);
      const [t1, t2] = [await r1.text(), await r2.text()];
      expect(t2).toBe(t1); // byte-identical
      expect(findAdmissionPublicLeaks(JSON.parse(t2))).toEqual([]);
    });
  }

  it('no-store IS the production default: behavior unchanged, no leak', async () => {
    const { app, store } = buildApp();
    expect(store).toBeUndefined();
    for (const intent of Object.values(ADMISSION_TRANSITION_INTENTS)) {
      const res = await post(app, intent);
      const body = JSON.parse(await res.text());
      expect(body.spike).toBe('dev_operator_only_non_production');
      expect(findAdmissionPublicLeaks(body)).toEqual([]);
    }
  });

  it('a partial DI injection (store but no actor id) records nothing — stays no-store path', async () => {
    const store = createRouteStorageSpikeStore({
      maxActors: 8,
      maxAssertionsPerEstate: 32,
      maxAssertionBytesPerEstate: 100_000,
    });
    store.seedScope(SCOPE);
    const app = new Hono();
    app.route(
      '/api/admission/intake',
      createAdmissionIntakeRoutes({
        enabled: true,
        gate: { serviceToken: TOKEN, operatorIds: [OPERATOR] },
        routeStorageSpikeStore: store,
        routeStorageSpikeTenantId: SYNTH_TENANT,
        routeStorageSpikeEstateId: SYNTH_ESTATE,
        // routeStorageSpikeActorId intentionally omitted.
      }),
    );
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    expect(res.status).toBe(200);
    expect(store.inspectScope(SCOPE).assertions).toBe(0);
  });
});

// ── Persisted / replayed public no-leak + internal effect ─────────────────────

describe('Phase 46V route — accept persists internally; public body unchanged & leak-clean', () => {
  it('accept references one active synthetic assertion without leaking it', async () => {
    const { app, store } = buildApp({ withStore: true });
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    const text = await res.text();
    const body = JSON.parse(text);

    expect(res.status).toBe(200);
    expect(body.outcome_class).toBe('admitted');
    expect(body.recall_eligible).toBe(true);
    expect(findAdmissionPublicLeaks(body)).toEqual([]);

    // Internal effect: one active assertion recorded under the synthetic actor.
    expect(store!.inspectScope(SCOPE).assertions).toBe(1);
    expect(store!.projectRecall(SCOPE).includes).toEqual([SYNTH_ADMITTED_ASSERTION_ID]);

    // No store ids / private audit fields on the wire.
    expect(text).not.toContain(SYNTH_ADMITTED_ASSERTION_ID);
    expect(text).not.toContain(SYNTH_SOURCE_CANDIDATE_ID);
    expect(text).not.toContain(SYNTH_ACTOR);
    expect(text).not.toContain('assertion_admitted');
    expect(text).not.toContain('audit_private');
    expect(text).not.toContain('rcpt-priv-');
  });

  it('replaying the same accept returns the SAME public body and mints no duplicate', async () => {
    const { app, store } = buildApp({ withStore: true });
    const r1 = await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    const r2 = await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    const [t1, t2] = [await r1.text(), await r2.text()];
    // Replayed public response is byte-identical AND leak-clean.
    expect(t2).toBe(t1);
    expect(findAdmissionPublicLeaks(JSON.parse(t2))).toEqual([]);
    // Only one synthetic assertion despite two identical accepts.
    expect(store!.inspectScope(SCOPE).assertions).toBe(1);
  });

  it('supersede (after accept) repoints recall; prior preserved, no id leak', async () => {
    const { app, store } = buildApp({ withStore: true });
    await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.supersede);
    const text = await res.text();
    const body = JSON.parse(text);

    expect(res.status).toBe(200);
    expect(body.outcome_class).toBe('superseded_with_correction');
    expect(findAdmissionPublicLeaks(body)).toEqual([]);

    expect(store!.projectRecall(SCOPE)).toEqual({
      includes: [SYNTH_CORRECTED_ASSERTION_ID],
      excludes: [SYNTH_ADMITTED_ASSERTION_ID],
    });
    expect(text).not.toContain(SYNTH_CORRECTED_ASSERTION_ID);
    expect(text).not.toContain(SYNTH_ADMITTED_ASSERTION_ID);
  });
});

// ── Recall lifecycle (Phase 46U §16 invariants) ───────────────────────────────

describe('Phase 46V route — recall lifecycle invariants', () => {
  it('pending records nothing recallable', async () => {
    const { app, store } = buildApp({ withStore: true });
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.pending);
    expect(res.status).toBe(200);
    expect(store!.inspectScope(SCOPE).assertions).toBe(0);
    expect(store!.projectRecall(SCOPE)).toEqual({ includes: [], excludes: [] });
  });

  it('reject creates no admitted assertion', async () => {
    const { app, store } = buildApp({ withStore: true });
    await post(app, ADMISSION_TRANSITION_INTENTS.reject);
    expect(store!.inspectScope(SCOPE).assertions).toBe(0);
  });

  it('malformed fails closed before the store is reached', async () => {
    const { app, store } = buildApp({ withStore: true });
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.malformed);
    expect(res.status).toBe(400);
    expect(store!.inspectScope(SCOPE).assertions).toBe(0);
  });

  it('a different (unseeded) actor scope sees nothing the route recorded', async () => {
    const { app, store } = buildApp({ withStore: true });
    await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    // The route records under SYNTH_ACTOR only; another actor is isolated.
    const other: RouteStorageSpikeScope = { ...SCOPE, actor_id: 'actor-other-dev' };
    expect(store!.projectRecall(other)).toEqual({ includes: [], excludes: [] });
    expect(store!.inspectScope(other)).toEqual({ assertions: 0, bytes: 0 });
  });
});

// ── Degraded / failed store fails closed (no residue, no leak) ─────────────────

describe('Phase 46V route — store failure fails closed to the stable refusal', () => {
  it('a throwing store collapses an accept to the stable 400 refusal, leaking nothing', async () => {
    let recordCalls = 0;
    const throwingStore: RouteStorageSpikeStore = {
      seedScope: () => undefined,
      record: () => {
        recordCalls += 1;
        throw new Error('synthetic route-storage failure: secret estate-synthetic-dev');
      },
      projectRecall: () => ({ includes: [], excludes: [] }),
      inspectScope: () => ({ assertions: 0, bytes: 0 }),
      auditTrail: () => [],
      tombstoneActor: () => undefined,
      isActorTombstoned: () => false,
      actorCount: () => 0,
    };
    const { app } = buildApp({ store: throwingStore });

    const res = await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    expect(res.status).toBe(400);
    const body = JSON.parse(await res.text());
    expect(body.outcome_class).toBe('refused');
    expect(body.safe_reason_code).toBe('ingress.invalid_request');
    expect(body.recall_eligible).toBe(false);
    expect(body.public_receipt_ref ?? null).toBeNull();
    expect(body.recall_projection?.ordinary_recall_includes ?? []).toEqual([]);
    // The synthetic error text / ids never leak.
    expect(JSON.stringify(body)).not.toContain('synthetic route-storage failure');
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(findAdmissionPublicLeaks(body)).toEqual([]);
    expect(recordCalls).toBe(1);
  });

  it('a throwing store does NOT affect pending (store never invoked for pending)', async () => {
    let recordCalls = 0;
    const throwingStore: RouteStorageSpikeStore = {
      seedScope: () => undefined,
      record: () => {
        recordCalls += 1;
        throw new Error('should not be called for pending');
      },
      projectRecall: () => ({ includes: [], excludes: [] }),
      inspectScope: () => ({ assertions: 0, bytes: 0 }),
      auditTrail: () => [],
      tombstoneActor: () => undefined,
      isActorTombstoned: () => false,
      actorCount: () => 0,
    };
    const { app } = buildApp({ store: throwingStore });
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.pending);
    expect(res.status).toBe(200);
    expect(recordCalls).toBe(0);
  });
});
