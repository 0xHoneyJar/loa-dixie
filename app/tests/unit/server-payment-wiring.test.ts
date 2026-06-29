import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDixieApp } from '../../src/server.js';
import type { DixieConfig } from '../../src/config.js';

function baseConfig(): DixieConfig {
  return {
    port: 3099,
    finnUrl: 'http://localhost:14000',
    finnWsUrl: 'ws://localhost:14000',
    corsOrigins: ['*'],
    allowlistPath: '',
    adminKey: 'admin-key',
    jwtPrivateKey: 'test-jwt-secret-32-characters-long',
    jwtAlgorithm: 'HS256',
    jwtLegacyHs256Secret: null,
    nodeEnv: 'production',
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

describe('createDixieApp payment gate wiring', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the settlement-backed validator adapter in the real app payment path', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ valid: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const dixie = createDixieApp(baseConfig());
    dixie.allowlistStore.addEntry('apiKey', 'dxk_payment_wiring_test');

    const res = await dixie.app.request('/api/chat', {
      headers: {
        Authorization: 'Bearer dxk_payment_wiring_test',
        'x-payment': 'payment-token',
      },
    });

    expect(res.status).toBe(402);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://freeside.example.com/api/settlement/validate-payment',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          paymentHeader: 'payment-token',
          path: '/api/chat',
        }),
      }),
    );
  });
});
