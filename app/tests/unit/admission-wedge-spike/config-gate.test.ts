// Phase 33N — dev/operator-only Admission Wedge route spike config gate.
//
// The spike is default-OFF (NON-PRODUCTION). This test pins:
//   * production defaults are safe (disabled, empty token, empty allowlist);
//   * the explicit env flag is the gate (token/operator-ids alone do not
//     enable it);
//   * the operator-id allowlist parses comma-separated values and trims them;
//   * an enabled spike with NO token AND NO operator allowlist still LOADS
//     (config does not throw) — the fail-closed "reject all" rule is enforced
//     at the route layer, proven in route-gate.test.ts.
//
// No live ids/secrets appear here; all values are synthetic and public-safe.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../../../src/config.js';

const REQUIRED = {
  FINN_URL: 'http://localhost:3000',
  DIXIE_JWT_PRIVATE_KEY: 'a'.repeat(64),
  NODE_ENV: 'test',
};

describe('config — Phase 33N admission intake spike gate (default off, non-production)', () => {
  const saved: Record<string, string | undefined> = {};
  const TOUCH = [
    ...Object.keys(REQUIRED),
    'DIXIE_ADMISSION_INTAKE_ENABLED',
    'DIXIE_ADMISSION_INTAKE_SERVICE_TOKEN',
    'DIXIE_ADMISSION_INTAKE_OPERATOR_IDS',
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

  it('default-off: spike disabled, token empty, operator allowlist empty', () => {
    const c = loadConfig();
    expect(c.admissionIntakeSpikeEnabled).toBe(false);
    expect(c.admissionIntakeSpikeServiceToken).toBe('');
    expect(c.admissionIntakeSpikeOperatorIds).toEqual([]);
  });

  it('production defaults are safe even with a token/allowlist set but flag unset', () => {
    // Presence of a token or operator allowlist WITHOUT the enable flag must
    // not turn the spike on — the gate is the explicit enable flag.
    process.env.DIXIE_ADMISSION_INTAKE_SERVICE_TOKEN = 'dev-operator-token-synthetic';
    process.env.DIXIE_ADMISSION_INTAKE_OPERATOR_IDS = 'op-alice,op-bob';
    const c = loadConfig();
    expect(c.admissionIntakeSpikeEnabled).toBe(false);
  });

  it('enabled flag === "true" turns the spike on', () => {
    process.env.DIXIE_ADMISSION_INTAKE_ENABLED = 'true';
    process.env.DIXIE_ADMISSION_INTAKE_SERVICE_TOKEN = 'dev-operator-token-synthetic';
    const c = loadConfig();
    expect(c.admissionIntakeSpikeEnabled).toBe(true);
    expect(c.admissionIntakeSpikeServiceToken).toBe('dev-operator-token-synthetic');
  });

  it('any value other than the literal "true" leaves the spike off', () => {
    for (const v of ['1', 'TRUE', 'yes', 'on', '']) {
      process.env.DIXIE_ADMISSION_INTAKE_ENABLED = v;
      const c = loadConfig();
      expect(c.admissionIntakeSpikeEnabled).toBe(false);
    }
  });

  it('operator ids parse comma-separated and trim whitespace; blanks dropped', () => {
    process.env.DIXIE_ADMISSION_INTAKE_ENABLED = 'true';
    process.env.DIXIE_ADMISSION_INTAKE_OPERATOR_IDS = ' op-alice , op-bob ,, op-carol ';
    const c = loadConfig();
    expect(c.admissionIntakeSpikeOperatorIds).toEqual(['op-alice', 'op-bob', 'op-carol']);
  });

  it('enabled with NO token AND NO operator allowlist still loads (route rejects all)', () => {
    // Config does not throw; the fail-closed "empty token AND empty allowlist
    // rejects all calls" rule is enforced by the route auth gate, not config.
    process.env.DIXIE_ADMISSION_INTAKE_ENABLED = 'true';
    const c = loadConfig();
    expect(c.admissionIntakeSpikeEnabled).toBe(true);
    expect(c.admissionIntakeSpikeServiceToken).toBe('');
    expect(c.admissionIntakeSpikeOperatorIds).toEqual([]);
  });
});
