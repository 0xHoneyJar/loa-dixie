import { describe, it, expect } from 'vitest';
import { authorizeMemoryAccess, validateSealingPolicy } from '../../src/services/memory-auth.js';
import type { MemoryOperation } from '../../src/services/memory-auth.js';

describe('services/memory-auth', () => {
  describe('authorizeMemoryAccess', () => {
    const baseParams = {
      wallet: '0xuser',
      ownerWallet: '0xowner',
      delegatedWallets: ['0xdelegate1', '0xdelegate2'],
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
            wallet: '0xOwner', // Case insensitive
            operation,
          });
          expect(result.allowed).toBe(true);
          expect(result.reason).toBe('owner');
        }
      });

      it('handles case-insensitive wallet comparison', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          wallet: '0xOWNER',
          ownerWallet: '0xowner',
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
          wallet: '0xDelegate1', // Case insensitive
          operation: 'read',
        });
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('delegated');
      });

      it('allows delegated wallets to view history', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          wallet: '0xdelegate2',
          operation: 'history',
        });
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('delegated');
      });

      it('denies delegated wallets from sealing', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          wallet: '0xdelegate1',
          operation: 'seal',
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('delegated_wallets_cannot_modify');
      });

      it('denies delegated wallets from deleting', () => {
        const result = authorizeMemoryAccess({
          ...baseParams,
          wallet: '0xdelegate1',
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
    const validPolicy = {
      encryption_scheme: 'aes-256-gcm',
      key_derivation: 'hkdf-sha256',
      access_policy: { type: 'none' },
    };

    it('accepts a valid policy', () => {
      const result = validateSealingPolicy(validPolicy);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects missing encryption_scheme', () => {
      const result = validateSealingPolicy({ ...validPolicy, encryption_scheme: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('encryption_scheme is required');
    });

    it('rejects invalid encryption_scheme', () => {
      const result = validateSealingPolicy({ ...validPolicy, encryption_scheme: 'aes-128-gcm' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('encryption_scheme must be aes-256-gcm');
    });

    it('rejects missing key_derivation', () => {
      const result = validateSealingPolicy({ ...validPolicy, key_derivation: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('key_derivation is required');
    });

    it('rejects invalid key_derivation', () => {
      const result = validateSealingPolicy({ ...validPolicy, key_derivation: 'pbkdf2' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('key_derivation must be hkdf-sha256');
    });

    it('rejects missing access_policy', () => {
      const result = validateSealingPolicy({ ...validPolicy, access_policy: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('access_policy is required');
    });

    it('rejects time_limited without duration_hours', () => {
      const result = validateSealingPolicy({
        ...validPolicy,
        access_policy: { type: 'time_limited' },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('time_limited access_policy requires duration_hours > 0');
    });

    it('rejects time_limited with zero duration_hours', () => {
      const result = validateSealingPolicy({
        ...validPolicy,
        access_policy: { type: 'time_limited', duration_hours: 0 },
      });
      expect(result.valid).toBe(false);
    });

    it('accepts time_limited with valid duration_hours', () => {
      const result = validateSealingPolicy({
        ...validPolicy,
        access_policy: { type: 'time_limited', duration_hours: 24 },
      });
      expect(result.valid).toBe(true);
    });

    it('rejects role_based without roles', () => {
      const result = validateSealingPolicy({
        ...validPolicy,
        access_policy: { type: 'role_based' },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('role_based access_policy requires non-empty roles array');
    });

    it('rejects role_based with empty roles', () => {
      const result = validateSealingPolicy({
        ...validPolicy,
        access_policy: { type: 'role_based', roles: [] },
      });
      expect(result.valid).toBe(false);
    });

    it('accepts role_based with valid roles', () => {
      const result = validateSealingPolicy({
        ...validPolicy,
        access_policy: { type: 'role_based', roles: ['admin'] },
      });
      expect(result.valid).toBe(true);
    });

    it('collects multiple errors', () => {
      const result = validateSealingPolicy({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
