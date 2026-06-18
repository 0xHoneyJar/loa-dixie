// Phase 33N — the dev/operator-only Admission Wedge route spike, exercised
// through the FULL DixieApp middleware stack (global JWT + allowlist + the
// spike's own dev/operator gate). This proves:
//   * an allowlisted caller presenting the dedicated `x-admission-service-token`
//     header reaches the spike and gets a served outcome — the dedicated header
//     does NOT collide with the global `Authorization`-based allowlist gate;
//   * the global allowlist still fails closed for a non-allowlisted caller
//     (the dev/operator gate is layered ON TOP of the allowlist, not instead);
//   * with the spike disabled, the route is absent through the full stack.
//
// Mirrors the dev-seeded-live-estate full-stack pattern (JWT mint + allowlist
// addEntry + mock finn). All ids/tokens are synthetic and public-safe.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import * as jose from 'jose';
import { createDixieApp, type DixieApp } from '../../../src/server.js';
import type { DixieConfig } from '../../../src/config.js';
import {
  ADMISSION_SPIKE_BODY_MARKER,
  ADMISSION_TRANSITION_INTENTS,
  findAdmissionPublicLeaks,
} from '../../../src/services/admission-wedge-spike/index.js';

const JWT_SECRET = 'phase-33n-fullstack-jwt-secret-32chars!!';
const SERVICE_TOKEN = 'phase-33n-dev-operator-token-synthetic';
const OPERATOR = 'op-fullstack';
// Synthetic allowlisted wallet (lowercase 0x+40hex so viem getAddress accepts).
const ALLOWLISTED = '0xabcdef0000000000000000000000000000000033';
const NOT_ALLOWLISTED = '0xabcdef0000000000000000000000000000000044';

function baseConfig(finnPort: number): DixieConfig {
  return {
    port: 3601,
    finnUrl: `http://localhost:${finnPort}`,
    finnWsUrl: `ws://localhost:${finnPort}`,
    corsOrigins: ['*'],
    allowlistPath: '',
    adminKey: 'phase-33n-admin-key',
    jwtPrivateKey: JWT_SECRET,
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
    admissionIntakeSpikeEnabled: true,
    admissionIntakeSpikeServiceToken: SERVICE_TOKEN,
    admissionIntakeSpikeOperatorIds: [OPERATOR],
    // Phase 46V route-storage spike gate (default off for the base full-stack
    // suite; the dedicated registration suite proves the AND-gating).
    admissionIntakeStorageSpikeEnabled: false,
    // Phase 47A durable (Mode 2) route-storage spike gate + dir (default off/empty;
    // the dedicated registration suite proves the three-gate AND).
    admissionIntakeDurableStorageSpikeEnabled: false,
    admissionIntakeDurableStorageSpikeDir: '',
  };
}

function createMockFinn(): Hono {
  const mock = new Hono();
  mock.get('/api/health', (c) => c.json({ status: 'ok', version: '1.0.0-mock' }));
  return mock;
}

async function mintJwt(wallet: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT({ sub: wallet, tier: 'free' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .setIssuer('dixie-bff')
    .setAudience('dixie-bff')
    .sign(secret);
}

let mockFinnServer: ReturnType<typeof serve>;
const MOCK_FINN_PORT = 15600 + Math.floor(Math.random() * 600);

beforeAll(() => {
  mockFinnServer = serve({ fetch: createMockFinn().fetch, port: MOCK_FINN_PORT });
});
afterAll(() => {
  mockFinnServer?.close();
});

beforeEach(() => {
  delete process.env.DIXIE_ADMISSION_INTAKE_ENABLED;
});
afterEach(() => {
  delete process.env.DIXIE_ADMISSION_INTAKE_ENABLED;
});

function buildEnabledApp(): DixieApp {
  const app = createDixieApp(baseConfig(MOCK_FINN_PORT));
  app.allowlistStore.addEntry('wallet', ALLOWLISTED);
  return app;
}

function spikeBody(intent: string) {
  return JSON.stringify({ spike: ADMISSION_SPIKE_BODY_MARKER, transition_intent: intent });
}

describe('Phase 33N — admission spike through the full DixieApp stack', () => {
  it('allowlisted caller + dedicated service-token header reaches the spike (200 served)', async () => {
    const app = buildEnabledApp();
    const jwt = await mintJwt(ALLOWLISTED);
    const res = await app.app.request('/api/admission/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${jwt}`,
        'x-admission-service-token': SERVICE_TOKEN,
        'x-admission-operator-id': OPERATOR,
      },
      body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    const body = JSON.parse(text);
    expect(body.outcome_class).toBe('admitted');
    expect(body.spike).toBe('dev_operator_only_non_production');
    expect(findAdmissionPublicLeaks(body)).toEqual([]);
    // The dedicated header did not collide with the global Authorization gate,
    // and neither the JWT nor the dev token leaks into the public body.
    expect(text).not.toContain(SERVICE_TOKEN);
    expect(text).not.toContain(jwt);
    expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]+\./);
  });

  it('global allowlist still fails closed for a non-allowlisted caller (dev gate is layered on top)', async () => {
    const app = buildEnabledApp();
    const jwt = await mintJwt(NOT_ALLOWLISTED);
    const res = await app.app.request('/api/admission/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${jwt}`,
        'x-admission-service-token': SERVICE_TOKEN,
        'x-admission-operator-id': OPERATOR,
      },
      body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept),
    });
    // Rejected by the global allowlist gate BEFORE the spike runs — even with a
    // valid dev/operator token. The spike never serves a non-allowlisted caller.
    expect(res.status).toBe(403);
    const body = JSON.parse(await res.text());
    expect(body.spike).toBeUndefined();
    expect(body.outcome_class).toBeUndefined();
  });

  it('valid allowlist but wrong dev token → spike denies (403), no leak', async () => {
    const app = buildEnabledApp();
    const jwt = await mintJwt(ALLOWLISTED);
    const res = await app.app.request('/api/admission/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${jwt}`,
        'x-admission-service-token': 'wrong-dev-token',
        'x-admission-operator-id': OPERATOR,
      },
      body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept),
    });
    expect(res.status).toBe(403);
    const body = JSON.parse(await res.text());
    expect(body.error).toBe('admission.unauthorized_dev_operator');
    expect(findAdmissionPublicLeaks(body)).toEqual([]);
  });

  it('with the spike disabled, the route is absent through the full stack', async () => {
    const app = createDixieApp({ ...baseConfig(MOCK_FINN_PORT), admissionIntakeSpikeEnabled: false });
    app.allowlistStore.addEntry('wallet', ALLOWLISTED);
    expect(app.app.routes.some((r) => r.path.includes('/api/admission'))).toBe(false);
    const jwt = await mintJwt(ALLOWLISTED);
    const res = await app.app.request('/api/admission/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${jwt}`,
        'x-admission-service-token': SERVICE_TOKEN,
        'x-admission-operator-id': OPERATOR,
      },
      body: spikeBody(ADMISSION_TRANSITION_INTENTS.accept),
    });
    // No spike body is ever produced when disabled.
    const text = await res.text();
    expect(text).not.toContain('dev_operator_only_non_production');
    expect(res.status).not.toBe(200);
  });
});
