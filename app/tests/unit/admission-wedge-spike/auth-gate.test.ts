// Phase 33N — dev/operator-only Admission Wedge spike auth gate (NOT
// production auth). Proves the fail-closed gate semantics:
//   * empty token AND empty allowlist → reject ALL;
//   * configured token → matching `x-admission-service-token` required;
//   * configured operator allowlist → allowlisted `x-admission-operator-id`
//     required;
//   * both configured → both required;
//   * non-operator / missing / invalid → denied.
//
// The service token is read from a DEDICATED header (NOT `Authorization`) to
// avoid colliding with the global /api/* allowlist gate — see auth-gate.ts.
// All ids/tokens are synthetic and public-safe.

import { describe, expect, it } from 'vitest';
import { authorizeAdmissionSpike } from '../../../src/services/admission-wedge-spike/index.js';

const TOKEN = 'dev-operator-token-synthetic-0001';

describe('Phase 33N — admission spike auth gate (dev/operator-only, fail-closed)', () => {
  it('empty token AND empty allowlist rejects all (no production default)', () => {
    const gate = { serviceToken: '', operatorIds: [] };
    expect(authorizeAdmissionSpike(gate, { serviceToken: undefined, operatorId: undefined })).toBe(false);
    // Even a plausible-looking credential cannot pass when nothing is configured.
    expect(
      authorizeAdmissionSpike(gate, { serviceToken: TOKEN, operatorId: 'op-alice' }),
    ).toBe(false);
  });

  describe('service token only configured', () => {
    const gate = { serviceToken: TOKEN, operatorIds: [] };

    it('matching token authorizes', () => {
      expect(authorizeAdmissionSpike(gate, { serviceToken: TOKEN, operatorId: undefined })).toBe(true);
    });
    it('missing token denies', () => {
      expect(authorizeAdmissionSpike(gate, { serviceToken: undefined, operatorId: undefined })).toBe(false);
    });
    it('wrong token denies', () => {
      expect(authorizeAdmissionSpike(gate, { serviceToken: 'wrong-token-value-xxxx', operatorId: undefined })).toBe(false);
    });
    it('almost-right token (prefix) denies', () => {
      expect(authorizeAdmissionSpike(gate, { serviceToken: TOKEN.slice(0, -1), operatorId: undefined })).toBe(false);
    });
    it('empty token string denies', () => {
      expect(authorizeAdmissionSpike(gate, { serviceToken: '', operatorId: undefined })).toBe(false);
    });
  });

  describe('operator allowlist only configured', () => {
    const gate = { serviceToken: '', operatorIds: ['op-alice', 'op-bob'] };

    it('allowlisted operator authorizes', () => {
      expect(authorizeAdmissionSpike(gate, { serviceToken: undefined, operatorId: 'op-bob' })).toBe(true);
    });
    it('non-allowlisted operator denies', () => {
      expect(authorizeAdmissionSpike(gate, { serviceToken: undefined, operatorId: 'op-mallory' })).toBe(false);
    });
    it('missing operator id denies', () => {
      expect(authorizeAdmissionSpike(gate, { serviceToken: undefined, operatorId: undefined })).toBe(false);
    });
    it('empty operator id denies', () => {
      expect(authorizeAdmissionSpike(gate, { serviceToken: undefined, operatorId: '' })).toBe(false);
    });
  });

  describe('both token and operator allowlist configured', () => {
    const gate = { serviceToken: TOKEN, operatorIds: ['op-alice'] };

    it('both valid authorizes', () => {
      expect(authorizeAdmissionSpike(gate, { serviceToken: TOKEN, operatorId: 'op-alice' })).toBe(true);
    });
    it('valid token but non-operator denies', () => {
      expect(authorizeAdmissionSpike(gate, { serviceToken: TOKEN, operatorId: 'op-mallory' })).toBe(false);
    });
    it('valid operator but wrong token denies', () => {
      expect(authorizeAdmissionSpike(gate, { serviceToken: 'wrong', operatorId: 'op-alice' })).toBe(false);
    });
    it('valid operator but missing token denies', () => {
      expect(authorizeAdmissionSpike(gate, { serviceToken: undefined, operatorId: 'op-alice' })).toBe(false);
    });
  });
});
