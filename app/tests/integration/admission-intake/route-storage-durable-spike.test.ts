// Phase 47A — dev/operator-only Admission Wedge ROUTE-STORAGE DURABLE (Mode 2)
// spike, exercised through the route handler with the durable store DI seam.
//
// Authorized NARROWLY by Phase 46Z
// (docs/ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md
// §10–§12). The durable store implements the SAME RouteStorageSpikeStore interface
// as the Phase 46V Mode-1 store, so the route handler is UNCHANGED — this proves the
// route-level Mode-2 obligations:
//
//   * public body is byte-IDENTICAL to the Mode-1 / no-store path and leak-clean
//     (the durable store changes the BACKEND, never the public envelope — D.4 / N.2);
//   * accept/supersede record into the DURABLE store while the public body stays the
//     deterministic public-safe response with NO store ids on the wire (N.1 / N.3);
//   * DURABILITY across a route "restart": a fresh route over a fresh store that
//     HYDRATES the same dir sees the prior recorded state, while the replayed public
//     body is unchanged and leak-clean;
//   * recall lifecycle: pending/reject/malformed mint nothing recallable; accept
//     references an admitted assertion; supersede excludes the prior;
//   * degraded / failed durable store fails closed to the stable public-safe refusal
//     (D.8), leaking neither the store error nor any id;
//   * NO durable artifact is a `.sql` file (off the production migration path).
//
// The handler is mounted directly (mirroring the Phase 46V route-storage-spike
// integration suite). The server-level three-gate AND is proven in registration.test.ts.
// All ids/tokens are synthetic.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';
import { createAdmissionIntakeRoutes } from '../../../src/routes/admission-intake.js';
import {
  ADMISSION_TRANSITION_INTENTS,
  createRouteStorageDurableSpikeStore,
  findAdmissionPublicLeaks,
  type RouteStorageDurableSpikeStore,
  type RouteStorageSpikeScope,
  type RouteStorageSpikeStore,
} from '../../../src/services/admission-wedge-spike/index.js';

const TOKEN = 'dev-operator-token-synthetic-rsd-001';
const OPERATOR = 'op-rsd-test';

// Must match the server's fixed synthetic constants (server.ts Phase 46V block).
const SYNTH_TENANT = 'tenant-synthetic-dev';
const SYNTH_ESTATE = 'estate-synthetic-dev';
const SYNTH_ACTOR = 'actor-synthetic-dev';
const SCOPE: RouteStorageSpikeScope = {
  tenant_id: SYNTH_TENANT,
  estate_id: SYNTH_ESTATE,
  actor_id: SYNTH_ACTOR,
};

const SYNTH_ADMITTED_ASSERTION_ID = 'assn-active-synthetic-dev';
const SYNTH_CORRECTED_ASSERTION_ID = 'assn-corrected-synthetic-dev';
const SYNTH_SOURCE_CANDIDATE_ID = 'cand-synthetic-dev';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'aw-durable-route-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

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

function makeDurableStore(): RouteStorageDurableSpikeStore {
  const store = createRouteStorageDurableSpikeStore({
    dir,
    maxActors: 8,
    maxAssertionsPerEstate: 32,
    maxAssertionBytesPerEstate: 100_000,
    maxDurableEntries: 64,
  });
  store.seedScope(SCOPE);
  return store;
}

/** Build a route app wired with a store (defaults to a fresh durable store). */
function buildApp(opts?: { store?: RouteStorageSpikeStore; noStore?: boolean }) {
  const store = opts?.noStore ? undefined : (opts?.store ?? makeDurableStore());
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

// ── Public body parity: the durable backend never changes the public envelope ─

describe('Phase 47A durable route — public body identical to no-store path (D.4 / N.2)', () => {
  for (const [name, intent] of Object.entries(ADMISSION_TRANSITION_INTENTS)) {
    it(`${name}: public response identical with the durable store and with no store`, async () => {
      const { app: noStore } = buildApp({ noStore: true });
      const { app: withStore } = buildApp();

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
});

// ── Persisted public no-leak + internal durable effect ────────────────────────

describe('Phase 47A durable route — accept persists durably; public body leak-clean (N.1/N.3)', () => {
  it('accept records one active synthetic assertion durably without leaking it', async () => {
    const { app, store } = buildApp();
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.accept);
    const text = await res.text();
    const body = JSON.parse(text);

    expect(res.status).toBe(200);
    expect(body.outcome_class).toBe('admitted');
    expect(body.recall_eligible).toBe(true);
    expect(findAdmissionPublicLeaks(body)).toEqual([]);

    // Internal durable effect.
    expect(store!.inspectScope(SCOPE).assertions).toBe(1);
    expect(store!.projectRecall(SCOPE).includes).toEqual([SYNTH_ADMITTED_ASSERTION_ID]);

    // No store ids / private audit fields on the wire.
    expect(text).not.toContain(SYNTH_ADMITTED_ASSERTION_ID);
    expect(text).not.toContain(SYNTH_SOURCE_CANDIDATE_ID);
    expect(text).not.toContain(SYNTH_ACTOR);
    expect(text).not.toContain('assertion_admitted');
    expect(text).not.toContain('audit_private');

    // The durable artifact written is a `.json` snapshot (never `.sql`).
    const files = readdirSync(dir);
    expect(files.some((f) => f.endsWith('.json'))).toBe(true);
    expect(files.some((f) => f.endsWith('.sql'))).toBe(false);
  });
});

// ── Durability across a route "restart" (hydration) ───────────────────────────

describe('Phase 47A durable route — survives a route restart (hydration) with unchanged public body', () => {
  it('a fresh route over a fresh store on the same dir sees the prior accept and stays leak-clean', async () => {
    // First "process": record an accept through the route.
    const { app: app1 } = buildApp();
    const r1 = await post(app1, ADMISSION_TRANSITION_INTENTS.accept);
    const t1 = await r1.text();
    expect(r1.status).toBe(200);

    // Second "process": a brand-new store over the SAME dir hydrates the prior
    // state; a brand-new route is wired to it. (makeDurableStore re-seeds the fixed
    // synthetic scope, which is idempotent against the hydrated snapshot.)
    const store2 = makeDurableStore();
    const app2 = new Hono();
    app2.route(
      '/api/admission/intake',
      createAdmissionIntakeRoutes({
        enabled: true,
        gate: { serviceToken: TOKEN, operatorIds: [OPERATOR] },
        routeStorageSpikeStore: store2,
        routeStorageSpikeTenantId: SYNTH_TENANT,
        routeStorageSpikeEstateId: SYNTH_ESTATE,
        routeStorageSpikeActorId: SYNTH_ACTOR,
      }),
    );

    // The hydrated store already holds the prior accept.
    expect(store2.inspectScope(SCOPE).assertions).toBe(1);
    expect(store2.projectRecall(SCOPE).includes).toEqual([SYNTH_ADMITTED_ASSERTION_ID]);

    // Replaying the accept on the new route returns the SAME public body (idempotent
    // replay against the hydrated state) and stays leak-clean; no duplicate minted.
    const r2 = await post(app2, ADMISSION_TRANSITION_INTENTS.accept);
    const t2 = await r2.text();
    expect(t2).toBe(t1);
    expect(findAdmissionPublicLeaks(JSON.parse(t2))).toEqual([]);
    expect(store2.inspectScope(SCOPE).assertions).toBe(1);
  });

  it('a supersede recorded in one route is reflected after a restart hydrate', async () => {
    const { app: app1 } = buildApp();
    await post(app1, ADMISSION_TRANSITION_INTENTS.accept);
    await post(app1, ADMISSION_TRANSITION_INTENTS.supersede);

    const store2 = makeDurableStore(); // hydrates from the same dir
    expect(store2.projectRecall(SCOPE)).toEqual({
      includes: [SYNTH_CORRECTED_ASSERTION_ID],
      excludes: [SYNTH_ADMITTED_ASSERTION_ID],
    });
  });
});

// ── Recall lifecycle (Phase 46U §16 invariants) ───────────────────────────────

describe('Phase 47A durable route — recall lifecycle invariants', () => {
  it('pending records nothing recallable (and persists no record entry)', async () => {
    const { app, store } = buildApp();
    const before = store!.durableEntryCount();
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.pending);
    expect(res.status).toBe(200);
    expect(store!.inspectScope(SCOPE).assertions).toBe(0);
    expect(store!.projectRecall(SCOPE)).toEqual({ includes: [], excludes: [] });
    // No durable record entry was appended for a pending.
    expect(store!.durableEntryCount()).toBe(before);
  });

  it('reject creates no admitted assertion', async () => {
    const { app, store } = buildApp();
    await post(app, ADMISSION_TRANSITION_INTENTS.reject);
    expect(store!.inspectScope(SCOPE).assertions).toBe(0);
  });

  it('malformed fails closed before the store is reached', async () => {
    const { app, store } = buildApp();
    const res = await post(app, ADMISSION_TRANSITION_INTENTS.malformed);
    expect(res.status).toBe(400);
    expect(store!.inspectScope(SCOPE).assertions).toBe(0);
  });
});

// ── Degraded / failed durable store fails closed (no residue, no leak) ─────────

describe('Phase 47A durable route — durable store failure fails closed (D.8)', () => {
  it('a throwing durable store collapses an accept to the stable 400 refusal, leaking nothing', async () => {
    let recordCalls = 0;
    const throwingStore: RouteStorageSpikeStore = {
      seedScope: () => undefined,
      record: () => {
        recordCalls += 1;
        throw new Error('synthetic durable write failure: secret /var/dev/aw-durable.json');
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
    // The synthetic error text / path never leak.
    expect(JSON.stringify(body)).not.toContain('synthetic durable write failure');
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(JSON.stringify(body)).not.toContain('.json');
    expect(findAdmissionPublicLeaks(body)).toEqual([]);
    expect(recordCalls).toBe(1);
  });
});
