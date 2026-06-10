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
  };
}

function hasAdmissionRoute(app: ReturnType<typeof createDixieApp>): boolean {
  return app.app.routes.some((r) => r.path.includes('/api/admission'));
}

// Some env may leak the enable flag in; neutralize for determinism.
beforeEach(() => {
  delete process.env.DIXIE_ADMISSION_INTAKE_ENABLED;
});
afterEach(() => {
  delete process.env.DIXIE_ADMISSION_INTAKE_ENABLED;
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
