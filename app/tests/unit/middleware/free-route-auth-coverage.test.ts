/**
 * Auth/abuse coverage for every payment-free route prefix (issues #206, #223).
 *
 * The payment gate exempts FREE_ROUTE_POLICY prefixes from x402 enforcement.
 * These tests prove — against the REAL app assembly (createDixieApp), with
 * x402 enabled — that payment-free never means guard-free:
 *
 * - each free prefix is reachable without a payment header (no 402), and
 * - each free prefix still enforces its own independent guard
 *   (admin key, allowlist, or public-by-design), and
 * - near-prefix routes stay behind the allowlist gate (boundary regression).
 */
import { describe, expect, it } from 'vitest';
import { createDixieApp, type DixieApp } from '../../../src/server.js';
import type { DixieConfig } from '../../../src/config.js';
import { FREE_ROUTE_POLICY } from '../../../src/middleware/payment.js';

function paymentEnabledConfig(): DixieConfig {
  return {
    port: 3098,
    finnUrl: 'http://localhost:14000',
    finnWsUrl: 'ws://localhost:14000',
    corsOrigins: ['*'],
    allowlistPath: '',
    adminKey: 'admin-key',
    jwtPrivateKey: 'test-jwt-secret-32-characters-long',
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
    scheduleCallbackSecret: '',
    x402Enabled: true,
    x402FacilitatorUrl: 'https://freeside.example.com',
    billingJwtSecret: null,
    pricingApiUrl: null,
    pricingTtlSec: 300,
    recallIntakeEnabled: false,
    straylightRuntimeDixieKey: '',
    recallIntakeBodyMaxBytes: 32_768,
    recallIntakeRateRpm: 30,
    recallIntakeMaxAssertionsPerTenant: 512,
    recallIntakeMaxAssertionBytesPerTenant: 1_048_576,
    recallIntakeIdempotencyTtlSec: 900,
    recallIntakeIdempotencyMaxEntries: 4_096,
    recallIntakeDevSeedEnabled: false,
    recallIntakeDevSeedTenantId: '',
    admissionIntakeSpikeEnabled: false,
    admissionIntakeSpikeServiceToken: '',
    admissionIntakeSpikeOperatorIds: [],
    admissionIntakeStorageSpikeEnabled: false,
    admissionIntakeDurableStorageSpikeEnabled: false,
    admissionIntakeDurableStorageSpikeDir: '',
  };
}

function buildApp(): DixieApp {
  return createDixieApp(paymentEnabledConfig());
}

/**
 * Representative request per policy prefix. Every FREE_ROUTE_POLICY entry
 * MUST have an entry here — a new free prefix without coverage fails the
 * exhaustiveness test below (issue #223 acceptance criterion).
 */
const FREE_PREFIX_COVERAGE: Record<string, { path: string; method?: string }> = {
  '/api/health': { path: '/api/health' },
  '/api/auth/': { path: '/api/auth/.well-known/jwks.json' },
  '/.well-known/': { path: '/.well-known/probe' },
  '/api/admin/': { path: '/api/admin/allowlist' },
  '/api/reputation/': { path: '/api/reputation/query?nft_id=test' },
  '/api/identity/': { path: '/api/identity/oracle' },
};

describe('free-prefix coverage inventory (issue #223)', () => {
  it('covers every FREE_ROUTE_POLICY prefix — new free prefixes fail until classified here', () => {
    for (const entry of FREE_ROUTE_POLICY) {
      expect(
        FREE_PREFIX_COVERAGE[entry.prefix],
        `payment-free prefix ${entry.prefix} has no auth-coverage entry`,
      ).toBeDefined();
    }
  });

  it('never returns 402 for any payment-free prefix', async () => {
    const dixie = buildApp();
    for (const entry of FREE_ROUTE_POLICY) {
      const coverage = FREE_PREFIX_COVERAGE[entry.prefix];
      const res = await dixie.app.request(coverage.path, { method: coverage.method ?? 'GET' });
      expect(res.status, `${entry.prefix} must be exempt from payment`).not.toBe(402);
    }
  });
});

describe('independent guards on payment-free prefixes (issue #206)', () => {
  it('/api/health is public by design (liveness probe)', async () => {
    const dixie = buildApp();
    const res = await dixie.app.request('/api/health');
    expect(res.status).toBe(200);
  });

  it('/api/health/governance requires the admin key', async () => {
    const dixie = buildApp();
    const anonymous = await dixie.app.request('/api/health/governance');
    expect(anonymous.status).toBe(401);

    const wrongKey = await dixie.app.request('/api/health/governance', {
      headers: { authorization: 'Bearer wrong-key' },
    });
    expect(wrongKey.status).toBe(403);
  });

  it('/api/auth JWKS is public by design (key discovery)', async () => {
    const dixie = buildApp();
    const res = await dixie.app.request('/api/auth/.well-known/jwks.json');
    expect(res.status).toBe(200);
  });

  it('/api/admin requires the admin key', async () => {
    const dixie = buildApp();
    const anonymous = await dixie.app.request('/api/admin/allowlist');
    expect(anonymous.status).toBe(401);

    const wrongKey = await dixie.app.request('/api/admin/allowlist', {
      headers: { authorization: 'Bearer wrong-key' },
    });
    expect(wrongKey.status).toBe(403);
  });

  it('/api/reputation requires allowlist membership', async () => {
    const dixie = buildApp();
    const anonymous = await dixie.app.request('/api/reputation/query?nft_id=test');
    expect(anonymous.status).toBe(401);

    const unknownKey = await dixie.app.request('/api/reputation/query?nft_id=test', {
      headers: { authorization: 'Bearer dxk_not_on_allowlist' },
    });
    expect(unknownKey.status).toBe(403);
  });

  it('/api/identity requires allowlist membership', async () => {
    const dixie = buildApp();
    const anonymous = await dixie.app.request('/api/identity/oracle');
    expect(anonymous.status).toBe(401);

    const unknownKey = await dixie.app.request('/api/identity/oracle', {
      headers: { authorization: 'Bearer dxk_not_on_allowlist' },
    });
    expect(unknownKey.status).toBe(403);
  });
});

describe('near-prefix routes stay guarded (issue #208 regression)', () => {
  it('/api/autonomous does NOT inherit the /api/auth allowlist skip', async () => {
    const dixie = buildApp();
    const res = await dixie.app.request('/api/autonomous/status');
    expect(res.status).toBe(401);
  });

  it('near-prefix paths of free routes are not exempt from the allowlist gate', async () => {
    const dixie = buildApp();
    for (const path of ['/api/healthzzz', '/api/administrator/x', '/api/authors/1']) {
      const res = await dixie.app.request(path);
      expect(res.status, `${path} must not bypass the allowlist gate`).toBe(401);
    }
  });

  it('near-prefix paths with an allowlisted key still hit the payment gate', async () => {
    const dixie = buildApp();
    dixie.allowlistStore.addEntry('apiKey', 'dxk_free_route_coverage');
    const res = await dixie.app.request('/api/healthzzz', {
      headers: { authorization: 'Bearer dxk_free_route_coverage' },
    });
    expect(res.status).toBe(402);
  });
});
