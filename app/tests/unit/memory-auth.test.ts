import { describe, it, expect } from 'vitest';
import { authorizeMemoryAccess, validateSealingPolicy } from '../../src/services/memory-auth.js';
import type { MemoryOperation } from '../../src/services/memory-auth.js';

// Valid Ethereum addresses for test fixtures (42-char hex, EIP-55 checksummed)
const OWNER   = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'; // Vitalik-esque
const USER    = '0x1234567890abcdef1234567890abcdef12345678';
const DELEG1  = '0xdead000000000000000000000000000000000001';
const DELEG2  = '0xdead000000000000000000000000000000000002';

describe('services/memory-auth', () => {
  describe('authorizeMemoryAccess', () => {
    const baseParams = {
      wallet: USER,
      ownerWallet: OWNER,
      delegatedWallets: [DELEG1, DELEG2],
      accessPolicy: { type: 'none' } as any,
      operation: 'read' as MemoryOperation,
    };

    // ─── Owner Access ──────────────────────────────────────────────

    describe('owner access', () => {
      it('allows owner full access for all operations', () => {
        const operations: MemoryOperation[] = ['read', 'seal', 'delete', 'history'];
        for (const operation of operations) {
          const result = authorizeMemoryAccess({
            ...baseParams,
            wallet: OWNER,
            operation,
          });
          expect(result.allowed).toBe(true);
          expect(result.reason).toBe('owner');
        }
      });

      it('handles case-insensitive wallet comparison', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          wallet: OWNER.toLowerCase(),
          ownerWallet: OWNER.toUpperCase().replace('0X', '0x'),
          operation: 'seal',
        });
        expect(result.allowed).toBe(true);
      });
    });

    // ─── Delegated Access ──────────────────────────────────────────

    describe('delegated wallet access', () => {
      it('allows delegated wallets to read', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          wallet: DELEG1,
          operation: 'read',
        });
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('delegated');
      });

      it('allows delegated wallets to view history', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          wallet: DELEG2,
          operation: 'history',
        });
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('delegated');
      });

      it('denies delegated wallets from sealing', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          wallet: DELEG1,
          operation: 'seal',
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('delegated_wallets_cannot_modify');
      });

      it('denies delegated wallets from deleting', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          wallet: DELEG1,
          operation: 'delete',
        });
        expect(result.allowed).toBe(false);
      });
    });

    // ─── AccessPolicy: none ────────────────────────────────────────

    describe('access_policy: none', () => {
      it('denies all operations', () => {
        const operations: MemoryOperation[] = ['read', 'seal', 'delete', 'history'];
        for (const operation of operations) {
          const result = authorizeMemoryAccess({
            ...baseParams,
            accessPolicy: { type: 'none' } as any,
            operation,
          });
          expect(result.allowed).toBe(false);
          expect(result.reason).toBe('access_policy_none');
        }
      });
    });

    // ─── AccessPolicy: read_only ───────────────────────────────────

    describe('access_policy: read_only', () => {
      const readOnlyParams = { ...baseParams, accessPolicy: { type: 'read_only' } as any };

      it('allows read', () => {
        const result = authorizeMemoryAccess({ ...readOnlyParams, operation: 'read' });
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('access_policy_read_only');
      });

      it('allows history', () => {
        const result = authorizeMemoryAccess({ ...readOnlyParams, operation: 'history' });
        expect(result.allowed).toBe(true);
      });

      it('denies seal', () => {
        const result = authorizeMemoryAccess({ ...readOnlyParams, operation: 'seal' });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('read_only_no_modify');
      });

      it('denies delete', () => {
        const result = authorizeMemoryAccess({ ...readOnlyParams, operation: 'delete' });
        expect(result.allowed).toBe(false);
      });
    });

    // ─── AccessPolicy: time_limited ────────────────────────────────

    describe('access_policy: time_limited', () => {
      it('allows read when not expired', () => {
        const future = new Date(Date.now() + 3600_000).toISOString();
        const result = authorizeMemoryAccess({
          ...baseParams,
          accessPolicy: { type: 'time_limited', expires_at: future } as any,
          operation: 'read',
        });
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('access_policy_time_limited');
      });

      it('denies read when expired', () => {
        const past = new Date(Date.now() - 3600_000).toISOString();
        const result = authorizeMemoryAccess({
          ...baseParams,
          accessPolicy: { type: 'time_limited', expires_at: past } as any,
          operation: 'read',
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('access_policy_expired');
      });

      it('denies modify operations even when not expired', () => {
        const future = new Date(Date.now() + 3600_000).toISOString();
        const result = authorizeMemoryAccess({
          ...baseParams,
          accessPolicy: { type: 'time_limited', expires_at: future } as any,
          operation: 'seal',
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('time_limited_no_modify');
      });
    });

    // ─── AccessPolicy: role_based ──────────────────────────────────

    describe('access_policy: role_based', () => {
      it('allows read with matching role', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          accessPolicy: { type: 'role_based', roles: ['admin', 'viewer'] } as any,
          operation: 'read',
          roles: ['viewer'],
        });
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('access_policy_role_based');
      });

      it('denies when no matching role', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          accessPolicy: { type: 'role_based', roles: ['admin'] } as any,
          operation: 'read',
          roles: ['viewer'],
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('role_based_insufficient_role');
      });

      it('denies when no roles provided', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          accessPolicy: { type: 'role_based', roles: ['admin'] } as any,
          operation: 'read',
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('role_based_no_roles_provided');
      });

      it('denies when policy has no roles defined', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          accessPolicy: { type: 'role_based', roles: [] } as any,
          operation: 'read',
          roles: ['admin'],
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('role_based_no_roles_defined');
      });

      it('denies modify operations even with matching role', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          accessPolicy: { type: 'role_based', roles: ['admin'] } as any,
          operation: 'delete',
          roles: ['admin'],
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('role_based_no_modify');
      });
    });

    // ─── Unknown policy type ───────────────────────────────────────

    describe('unknown access policy', () => {
      it('denies access for unknown policy types', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          accessPolicy: { type: 'future_type' } as any,
          operation: 'read',
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('unknown_access_policy_type');
      });
    });
  });

  // ─── Sealing Policy Validation ─────────────────────────────────

  describe('validateSealingPolicy', () => {
    // Hounfour v7.9.2 schema requires access_audit (boolean) on sealing policy,
    // and audit_required + revocable (boolean) on access_policy.
    // access_policy is optional; encryption_scheme allows 'aes-256-gcm' | 'none'.
    const validPolicy = {
      encryption_scheme: 'aes-256-gcm',
      key_derivation: 'hkdf-sha256',
      key_reference: 'kms://test-key-001',
      access_audit: true,
      access_policy: { type: 'none', audit_required: false, revocable: false },
    };

    it('accepts a valid policy', () => {
      const result = validateSealingPolicy(validPolicy);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects missing encryption_scheme', () => {
      const { encryption_scheme: _, ...withoutField } = validPolicy;
      const result = validateSealingPolicy(withoutField);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects invalid encryption_scheme', () => {
      const result = validateSealingPolicy({ ...validPolicy, encryption_scheme: 'aes-128-gcm' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects missing key_derivation', () => {
      const { key_derivation: _, ...withoutField } = validPolicy;
      const result = validateSealingPolicy(withoutField);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects invalid key_derivation', () => {
      const result = validateSealingPolicy({ ...validPolicy, key_derivation: 'pbkdf2' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects missing access_audit', () => {
      const { access_audit: _, ...withoutField } = validPolicy;
      const result = validateSealingPolicy(withoutField);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects time_limited without duration_hours', () => {
      const result = validateSealingPolicy({
        ...validPolicy,
        access_policy: { type: 'time_limited', audit_required: false, revocable: false },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects time_limited with zero duration_hours', () => {
      const result = validateSealingPolicy({
        ...validPolicy,
        access_policy: { type: 'time_limited', duration_hours: 0, audit_required: false, revocable: false },
      });
      expect(result.valid).toBe(false);
    });

    it('accepts time_limited with valid duration_hours', () => {
      const result = validateSealingPolicy({
        ...validPolicy,
        access_policy: { type: 'time_limited', duration_hours: 24, audit_required: false, revocable: false },
      });
      expect(result.valid).toBe(true);
    });

    it('rejects role_based without roles', () => {
      const result = validateSealingPolicy({
        ...validPolicy,
        access_policy: { type: 'role_based', audit_required: false, revocable: false },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects role_based with empty roles', () => {
      const result = validateSealingPolicy({
        ...validPolicy,
        access_policy: { type: 'role_based', roles: [], audit_required: false, revocable: false },
      });
      expect(result.valid).toBe(false);
    });

    it('accepts role_based with valid roles', () => {
      const result = validateSealingPolicy({
        ...validPolicy,
        access_policy: { type: 'role_based', roles: ['admin'], audit_required: false, revocable: false },
      });
      expect(result.valid).toBe(true);
    });

    it('collects multiple errors', () => {
      const result = validateSealingPolicy({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});
