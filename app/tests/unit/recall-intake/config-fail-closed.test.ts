// ADR-026D §4.a + ADR-026C §3.4: when the endpoint is enabled, missing or
// empty STRAYLIGHT_RUNTIME_DIXIE_KEY MUST cause loadConfig() to throw at
// startup (no fall-back-to-allow).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../../../src/config.js';

const REQUIRED = {
  FINN_URL: 'http://localhost:3000',
  DIXIE_JWT_PRIVATE_KEY: 'a'.repeat(64),
  NODE_ENV: 'test',
};

describe('config — recall-intake fail-closed (ADR-026D §4.a)', () => {
  const saved: Record<string, string | undefined> = {};
  const TOUCH = [
    ...Object.keys(REQUIRED),
    'DIXIE_RECALL_INTAKE_ENABLED',
    'STRAYLIGHT_RUNTIME_DIXIE_KEY',
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

  it('disabled by default; absence of STRAYLIGHT_RUNTIME_DIXIE_KEY is OK', () => {
    const c = loadConfig();
    expect(c.recallIntakeEnabled).toBe(false);
  });

  it('enabled + empty key → throws', () => {
    process.env.DIXIE_RECALL_INTAKE_ENABLED = 'true';
    process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY = '';
    expect(() => loadConfig()).toThrow(/STRAYLIGHT_RUNTIME_DIXIE_KEY/);
  });

  it('enabled + missing key → throws', () => {
    process.env.DIXIE_RECALL_INTAKE_ENABLED = 'true';
    delete process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY;
    expect(() => loadConfig()).toThrow(/STRAYLIGHT_RUNTIME_DIXIE_KEY/);
  });

  it('enabled + non-empty key → loads with enabled=true', () => {
    process.env.DIXIE_RECALL_INTAKE_ENABLED = 'true';
    process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY = 'k'.repeat(32);
    const c = loadConfig();
    expect(c.recallIntakeEnabled).toBe(true);
    expect(c.straylightRuntimeDixieKey).toHaveLength(32);
  });
});
