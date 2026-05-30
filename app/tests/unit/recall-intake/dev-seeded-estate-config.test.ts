// Phase 32K — dev/operator seeded live estate config gate.
//
// Mirrors the fail-closed posture of config-fail-closed.test.ts for the
// recall route key. The dev-seed gate is default-OFF; when enabled it
// requires DIXIE_RECALL_INTAKE_ENABLED=true and a valid synthetic
// 0x-prefixed 40-hex tenant id, and fails closed (throws at loadConfig)
// otherwise — it must never silently seed nothing.
//
// dev/operator-only smoke mechanism. NOT production memory admission. No
// live ids/secrets appear in this test; the tenant id below is a synthetic,
// public-safe address.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../../../src/config.js';

const REQUIRED = {
  FINN_URL: 'http://localhost:3000',
  DIXIE_JWT_PRIVATE_KEY: 'a'.repeat(64),
  NODE_ENV: 'test',
};

// Synthetic, public-safe dev/operator address (not a live wallet).
const SYNTH_TENANT = '0xabcdef0000000000000000000000000000000032';

describe('config — Phase 32K dev-seeded estate gate (default off, fail-closed)', () => {
  const saved: Record<string, string | undefined> = {};
  const TOUCH = [
    ...Object.keys(REQUIRED),
    'DIXIE_RECALL_INTAKE_ENABLED',
    'STRAYLIGHT_RUNTIME_DIXIE_KEY',
    'DIXIE_RECALL_INTAKE_DEV_SEED_ENABLED',
    'DIXIE_RECALL_INTAKE_DEV_SEED_TENANT_ID',
  ];

  beforeEach(() => {
    for (const k of TOUCH) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    Object.assign(process.env, REQUIRED);
  });
  afterEach(() => {
    for (const k of TOUCH) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('default-off: dev seed disabled and tenant id empty when unset', () => {
    const c = loadConfig();
    expect(c.recallIntakeDevSeedEnabled).toBe(false);
    expect(c.recallIntakeDevSeedTenantId).toBe('');
  });

  it('default-off: a configured tenant id alone does NOT enable the seed', () => {
    // Presence of the tenant id without the enable flag must not turn the
    // seed on — the gate is the explicit enable flag, default off.
    process.env.DIXIE_RECALL_INTAKE_DEV_SEED_TENANT_ID = SYNTH_TENANT;
    const c = loadConfig();
    expect(c.recallIntakeDevSeedEnabled).toBe(false);
    expect(c.recallIntakeDevSeedTenantId).toBe('');
  });

  it('enabled without the recall route enabled → throws (fail-closed)', () => {
    process.env.DIXIE_RECALL_INTAKE_DEV_SEED_ENABLED = 'true';
    process.env.DIXIE_RECALL_INTAKE_DEV_SEED_TENANT_ID = SYNTH_TENANT;
    // DIXIE_RECALL_INTAKE_ENABLED intentionally unset.
    expect(() => loadConfig()).toThrow(/DIXIE_RECALL_INTAKE_ENABLED/);
  });

  it('enabled + missing tenant id → throws (fail-closed, no silent no-op)', () => {
    process.env.DIXIE_RECALL_INTAKE_ENABLED = 'true';
    process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY = 'k'.repeat(32);
    process.env.DIXIE_RECALL_INTAKE_DEV_SEED_ENABLED = 'true';
    // tenant id intentionally unset.
    expect(() => loadConfig()).toThrow(/DEV_SEED_TENANT_ID/);
  });

  it('enabled + invalid tenant id → throws (fail-closed)', () => {
    process.env.DIXIE_RECALL_INTAKE_ENABLED = 'true';
    process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY = 'k'.repeat(32);
    process.env.DIXIE_RECALL_INTAKE_DEV_SEED_ENABLED = 'true';
    process.env.DIXIE_RECALL_INTAKE_DEV_SEED_TENANT_ID = 'not-an-address';
    expect(() => loadConfig()).toThrow(/DEV_SEED_TENANT_ID/);
  });

  it('enabled + valid tenant id → loads with seed enabled and tenant captured', () => {
    process.env.DIXIE_RECALL_INTAKE_ENABLED = 'true';
    process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY = 'k'.repeat(32);
    process.env.DIXIE_RECALL_INTAKE_DEV_SEED_ENABLED = 'true';
    process.env.DIXIE_RECALL_INTAKE_DEV_SEED_TENANT_ID = SYNTH_TENANT;
    const c = loadConfig();
    expect(c.recallIntakeDevSeedEnabled).toBe(true);
    expect(c.recallIntakeDevSeedTenantId).toBe(SYNTH_TENANT);
  });

  it('fail-closed error message does NOT echo the raw invalid tenant id', () => {
    process.env.DIXIE_RECALL_INTAKE_ENABLED = 'true';
    process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY = 'k'.repeat(32);
    process.env.DIXIE_RECALL_INTAKE_DEV_SEED_ENABLED = 'true';
    const leaky = '0xLEAKYBADVALUE-do-not-echo-me';
    process.env.DIXIE_RECALL_INTAKE_DEV_SEED_TENANT_ID = leaky;
    try {
      loadConfig();
      throw new Error('expected loadConfig to throw');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).not.toContain(leaky);
      expect(msg).toMatch(/DEV_SEED_TENANT_ID/);
    }
  });
});
