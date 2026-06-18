// Phase 33N — server-level conditional mount of the dev/operator-only
// Admission Wedge route spike. Proves the route is NOT registered at all when
// the spike is disabled (the default), and IS registered when enabled — the
// disabled-by-default registration posture (Phase 33M §9, mirroring
// recall-intake's server.ts:567 conditional mount).
//
// Uses a full DixieConfig built locally (mirroring dev-seeded-live-estate
// baseConfig) and inspects Hono's `app.routes` registration table — no network
// or DB. A mock finn is not needed because we never issue a request here; we
// only assert the route table.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDixieApp } from '../../../src/server.js';
import type { DixieConfig } from '../../../src/config.js';

const MOCK_FINN_PORT = 13900;

function baseConfig(): DixieConfig {
  return {
    port: 3777,
    finnUrl: `http://localhost:${MOCK_FINN_PORT}`,
    finnWsUrl: `ws://localhost:${MOCK_FINN_PORT}`,
    corsOrigins: ['*'],
    allowlistPath: '',
    adminKey: 'phase-33n-admin-key',
    jwtPrivateKey: 'phase-33n-jwt-secret-32-chars-aaaaaa!!',
    jwtAlgorithm: 'HS256',
    jwtLegacyHs256Secret: null,
    nodeEnv: 'test',
    logLevel: 'error',
    rateLimitRpm: 1000,
    otelEndpoint: null,
    databaseUrl: null,
    redisUrl: null,
    natsUrl: null,
    memoryProjectionTtlSec: 300,
    memoryMaxEventsPerQuery: 100,
    convictionTierTtlSec: 300,
    personalityTtlSec: 1800,
    autonomousPermissionTtlSec: 300,
    autonomousBudgetDefaultMicroUsd: 100_000,
    databasePoolSize: 10,
    rateLimitBackend: 'memory',
    scheduleCallbackSecret: 'phase-33n-callback-secret',
    x402Enabled: false,
    x402FacilitatorUrl: null,
    billingJwtSecret: null,
    pricingApiUrl: null,
    pricingTtlSec: 300,
    recallIntakeEnabled: false,
    straylightRuntimeDixieKey: '',
    recallIntakeBodyMaxBytes: 32_768,
    recallIntakeRateRpm: 1000,
    recallIntakeMaxAssertionsPerTenant: 512,
    recallIntakeMaxAssertionBytesPerTenant: 1_048_576,
    recallIntakeIdempotencyTtlSec: 900,
    recallIntakeIdempotencyMaxEntries: 4_096,
    recallIntakeDevSeedEnabled: false,
    recallIntakeDevSeedTenantId: '',
    // Phase 33N spike defaults (overridden per-case).
    admissionIntakeSpikeEnabled: false,
    admissionIntakeSpikeServiceToken: '',
    admissionIntakeSpikeOperatorIds: [],
    // Phase 46V route-storage spike gate (default off; overridden per-case).
    admissionIntakeStorageSpikeEnabled: false,
    // Phase 47A durable (Mode 2) route-storage spike gate + dir (default off/empty;
    // overridden per-case).
    admissionIntakeDurableStorageSpikeEnabled: false,
    admissionIntakeDurableStorageSpikeDir: '',
  };
}

function hasAdmissionRoute(app: ReturnType<typeof createDixieApp>): boolean {
  return app.app.routes.some((r) => r.path.includes('/api/admission'));
}

// Some env may leak the enable flag in; neutralize for determinism.
beforeEach(() => {
  delete process.env.DIXIE_ADMISSION_INTAKE_ENABLED;
  delete process.env.DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED;
  delete process.env.DIXIE_ADMISSION_INTAKE_DURABLE_STORAGE_SPIKE_ENABLED;
  delete process.env.DIXIE_ADMISSION_INTAKE_DURABLE_STORAGE_SPIKE_DIR;
});
afterEach(() => {
  delete process.env.DIXIE_ADMISSION_INTAKE_ENABLED;
  delete process.env.DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED;
  delete process.env.DIXIE_ADMISSION_INTAKE_DURABLE_STORAGE_SPIKE_ENABLED;
  delete process.env.DIXIE_ADMISSION_INTAKE_DURABLE_STORAGE_SPIKE_DIR;
});

describe('Phase 33N — admission spike route registration is gated and off by default', () => {
  it('default (disabled): NO /api/admission route is registered', () => {
    const app = createDixieApp(baseConfig());
    expect(hasAdmissionRoute(app)).toBe(false);
  });

  it('enabled: the /api/admission/intake route IS registered', () => {
    const app = createDixieApp({ ...baseConfig(), admissionIntakeSpikeEnabled: true });
    expect(hasAdmissionRoute(app)).toBe(true);
  });

  it('disabled spike does not register the route even with a token/allowlist set', () => {
    const app = createDixieApp({
      ...baseConfig(),
      admissionIntakeSpikeEnabled: false,
      admissionIntakeSpikeServiceToken: 'dev-token-synthetic',
      admissionIntakeSpikeOperatorIds: ['op-alice'],
    });
    expect(hasAdmissionRoute(app)).toBe(false);
  });

  it('a disabled-spike app never returns a spike body for the admission path', async () => {
    const app = createDixieApp(baseConfig());
    // With no admission route mounted, the request never reaches a spike
    // handler. The global /api/* allowlist middleware fails closed first
    // (401) for an unauthenticated caller; either way the response is NOT a
    // spike body and NOT a 200 success.
    const res = await app.app.request('/api/admission/intake', { method: 'POST' });
    expect(res.status).not.toBe(200);
    const text = await res.text();
    expect(text).not.toContain('admission.spike_disabled');
    expect(text).not.toContain('dev_operator_only_non_production');
  });
});

// ── Phase 46V: route-storage spike is SEPARATELY gated and ANDed ──────────────
//
// The route-storage spike (Mode 1) engages ONLY when BOTH the base route gate
// AND the storage-spike gate are enabled. The store is an internal closure with
// no route-table signal, so these assert the OBSERVABLE registration posture:
//   * the storage gate ALONE never mounts the route (base gate is the only thing
//     that registers the route at all);
//   * with the base gate on, the route registers WHETHER OR NOT the storage gate
//     is on (the storage spike is additive — it never disables the base route);
//   * `createDixieApp` constructs without throwing in every flag combination
//     (so the storage gate, when on with the base gate, builds + seeds the store
//     successfully).
describe('Phase 46V — route-storage spike is separately gated (storage gate ANDed with base gate)', () => {
  it('storage gate ON but base gate OFF → route NOT registered (storage gate alone does nothing)', () => {
    const app = createDixieApp({
      ...baseConfig(),
      admissionIntakeSpikeEnabled: false,
      admissionIntakeStorageSpikeEnabled: true,
    });
    expect(hasAdmissionRoute(app)).toBe(false);
  });

  it('base gate ON + storage gate OFF → route registered (no-store path), constructs cleanly', () => {
    const app = createDixieApp({
      ...baseConfig(),
      admissionIntakeSpikeEnabled: true,
      admissionIntakeStorageSpikeEnabled: false,
      admissionIntakeSpikeServiceToken: 'dev-token-synthetic',
    });
    expect(hasAdmissionRoute(app)).toBe(true);
  });

  it('base gate ON + storage gate ON → route registered; store built + seeded without throwing', () => {
    // If the store config or seed were malformed this would throw at construction
    // (fail-closed at startup). A clean construction proves the Mode-1 store wires
    // up under the AND of both gates.
    const app = createDixieApp({
      ...baseConfig(),
      admissionIntakeSpikeEnabled: true,
      admissionIntakeStorageSpikeEnabled: true,
      admissionIntakeSpikeServiceToken: 'dev-token-synthetic',
    });
    expect(hasAdmissionRoute(app)).toBe(true);
  });
});

// ── Phase 47A: DURABLE (Mode 2) store is gated behind a THIRD flag + a dir ─────
//
// The durable store engages ONLY when ALL of: base route gate AND Mode-1 storage
// gate AND durable gate are true AND a non-empty durable dir is set. Any missing
// leg leaves the spike on the Mode-1 (non-durable, in-process) path or the no-store
// path. The store has no route-table signal, so observable proof is: the app
// constructs cleanly in every combination, and ONLY the full conjunction writes a
// durable artifact to disk.
describe('Phase 47A — durable (Mode 2) store is gated behind a third flag + a dir', () => {
  let durableDir: string;
  beforeEach(() => {
    durableDir = mkdtempSync(join(tmpdir(), 'aw-durable-reg-'));
  });
  afterEach(() => {
    rmSync(durableDir, { recursive: true, force: true });
  });

  function durableArtifactWritten(): boolean {
    return existsSync(durableDir) && readdirSync(durableDir).length > 0;
  }

  it('durable gate ON but base+storage gates OFF → route NOT registered, no durable artifact', () => {
    const app = createDixieApp({
      ...baseConfig(),
      admissionIntakeSpikeEnabled: false,
      admissionIntakeStorageSpikeEnabled: false,
      admissionIntakeDurableStorageSpikeEnabled: true,
      admissionIntakeDurableStorageSpikeDir: durableDir,
    });
    expect(hasAdmissionRoute(app)).toBe(false);
    expect(durableArtifactWritten()).toBe(false);
  });

  it('base+storage ON, durable gate OFF → route registered (Mode 1), no durable artifact', () => {
    const app = createDixieApp({
      ...baseConfig(),
      admissionIntakeSpikeEnabled: true,
      admissionIntakeStorageSpikeEnabled: true,
      admissionIntakeDurableStorageSpikeEnabled: false,
      admissionIntakeDurableStorageSpikeDir: durableDir,
      admissionIntakeSpikeServiceToken: 'dev-token-synthetic',
    });
    expect(hasAdmissionRoute(app)).toBe(true);
    // Mode 1 store is in-process only — nothing is written to the durable dir.
    expect(durableArtifactWritten()).toBe(false);
  });

  it('base+storage+durable gates ON but dir EMPTY → fails closed to Mode 1 (no artifact)', () => {
    const app = createDixieApp({
      ...baseConfig(),
      admissionIntakeSpikeEnabled: true,
      admissionIntakeStorageSpikeEnabled: true,
      admissionIntakeDurableStorageSpikeEnabled: true,
      admissionIntakeDurableStorageSpikeDir: '', // no operator dir → fail closed to Mode 1
      admissionIntakeSpikeServiceToken: 'dev-token-synthetic',
    });
    expect(hasAdmissionRoute(app)).toBe(true);
    expect(durableArtifactWritten()).toBe(false);
  });

  it('ALL three gates ON + a dir → route registered; durable store built + seeded (artifact on disk)', () => {
    const app = createDixieApp({
      ...baseConfig(),
      admissionIntakeSpikeEnabled: true,
      admissionIntakeStorageSpikeEnabled: true,
      admissionIntakeDurableStorageSpikeEnabled: true,
      admissionIntakeDurableStorageSpikeDir: durableDir,
      admissionIntakeSpikeServiceToken: 'dev-token-synthetic',
    });
    expect(hasAdmissionRoute(app)).toBe(true);
    // The seed of the fixed synthetic scope is persisted → exactly one durable
    // artifact (the `.json` snapshot) exists, and it is NOT a `.sql` file.
    expect(durableArtifactWritten()).toBe(true);
    const files = readdirSync(durableDir);
    expect(files.some((f) => f.endsWith('.json'))).toBe(true);
    expect(files.some((f) => f.endsWith('.sql'))).toBe(false);
  });
});
