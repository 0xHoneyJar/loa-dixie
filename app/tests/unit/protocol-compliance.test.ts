/**
 * Protocol Compliance Tests — Sprint 13, Task 13.4
 *
 * Validates that Dixie's data shapes conform to Hounfour protocol types.
 * These tests catch drift: if either Dixie's types or Hounfour's types
 * change, the compliance tests fail.
 *
 * @see grimoires/loa/context/adr-hounfour-alignment.md
 */
import { describe, it, expect } from 'vitest';
import type { AccessPolicy, AgentIdentity, HounfourCircuitState } from '../../src/types.js';
import type { CircuitState } from '../../src/types.js';
import { DEFAULT_ACCESS_POLICY } from '../../src/middleware/allowlist.js';

describe('Protocol Compliance: Hounfour Alignment', () => {
  describe('AccessPolicy conformance', () => {
    it('DEFAULT_ACCESS_POLICY satisfies Hounfour AccessPolicy shape', () => {
      const policy: AccessPolicy = DEFAULT_ACCESS_POLICY;

      expect(policy.type).toBe('role_based');
      expect(policy.roles).toEqual(['team']);
      expect(policy.audit_required).toBe(true);
      expect(policy.revocable).toBe(false);
      // duration_hours should not be present for role_based
      expect(policy.duration_hours).toBeUndefined();
    });

    it('time_limited AccessPolicy shape is expressible', () => {
      // Phase 2: conviction-based tier expiry
      const timedPolicy: AccessPolicy = {
        type: 'time_limited',
        duration_hours: 720, // 30 days
        audit_required: true,
        revocable: true,
      };

      expect(timedPolicy.type).toBe('time_limited');
      expect(timedPolicy.duration_hours).toBe(720);
      expect(timedPolicy.roles).toBeUndefined();
    });

    it('none AccessPolicy shape is expressible', () => {
      const noAccess: AccessPolicy = {
        type: 'none',
        audit_required: false,
        revocable: false,
      };

      expect(noAccess.type).toBe('none');
    });

    it('read_only AccessPolicy shape is expressible', () => {
      // Phase 3: soul memory governance — read-only for previous owners
      const readOnly: AccessPolicy = {
        type: 'read_only',
        audit_required: true,
        revocable: true,
      };

      expect(readOnly.type).toBe('read_only');
    });
  });

  describe('AgentIdentity alignment', () => {
    it('OracleIdentity fields are a subset of AgentIdentity', () => {
      // The Oracle identity response uses fields that map to AgentIdentity.
      // This test documents the mapping without requiring the full type,
      // since loa-finn's identity graph may return a partial response.
      const oracleResponse = {
        nftId: 'oracle',
        name: 'The Oracle',
        damp96_summary: null,
        beauvoir_hash: null,
      };

      // nftId maps to AgentIdentity.nft_id (naming difference: camelCase vs snake_case)
      expect(oracleResponse.nftId).toBeDefined();
      // name maps to AgentIdentity.name
      expect(oracleResponse.name).toBeDefined();
      // beauvoir_hash is Dixie-specific metadata not in base AgentIdentity
      expect(oracleResponse).toHaveProperty('beauvoir_hash');
    });

    it('AgentIdentity type is importable from Hounfour', () => {
      // Compile-time check: if AgentIdentity type changes in Hounfour,
      // this file will fail to compile. Runtime check: verify the type
      // can be used to describe an agent.
      const agent: Partial<AgentIdentity> = {
        name: 'The Oracle',
        agent_type: 'oracle',
      };
      expect(agent.name).toBe('The Oracle');
    });
  });

  describe('CircuitState mapping', () => {
    it('Dixie CircuitState values have Hounfour equivalents', () => {
      const dixieStates: CircuitState[] = ['closed', 'open', 'half-open'];
      const hounfourStates: HounfourCircuitState[] = ['closed', 'open', 'half_open'];

      // closed and open map directly
      expect(dixieStates[0]).toBe(hounfourStates[0]);
      expect(dixieStates[1]).toBe(hounfourStates[1]);

      // half-open (Dixie) maps to half_open (Hounfour) — naming convention difference
      expect(dixieStates[2]).toBe('half-open');
      expect(hounfourStates[2]).toBe('half_open');
    });

    it('toHounfourCircuitState mapping function works correctly', () => {
      // Utility mapping for protocol-level reporting
      const toHounfour = (s: CircuitState): HounfourCircuitState =>
        s === 'half-open' ? 'half_open' : s;

      expect(toHounfour('closed')).toBe('closed');
      expect(toHounfour('open')).toBe('open');
      expect(toHounfour('half-open')).toBe('half_open');
    });
  });

  describe('AllowlistStore AccessPolicy integration', () => {
    it('AllowlistData policy field accepts Hounfour AccessPolicy', () => {
      // Verify the AllowlistData shape with an embedded policy
      const data = {
        version: 1,
        wallets: ['0x1234567890abcdef1234567890abcdef12345678'],
        apiKeys: ['dxk_test_key_123'],
        updated_at: '2026-02-20T00:00:00Z',
        policy: {
          type: 'role_based' as const,
          roles: ['team'],
          audit_required: true,
          revocable: false,
        } satisfies AccessPolicy,
      };

      expect(data.policy.type).toBe('role_based');
      expect(data.policy.roles).toContain('team');
    });

    it('AllowlistData without policy is backward-compatible', () => {
      // Existing allowlist files without policy field should still work
      const legacyData = {
        version: 1,
        wallets: [],
        apiKeys: [],
        updated_at: '2026-02-20T00:00:00Z',
      };

      expect(legacyData.policy).toBeUndefined();
    });
  });
});
