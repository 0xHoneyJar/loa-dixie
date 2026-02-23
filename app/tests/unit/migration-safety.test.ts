/**
 * Migration Safety Test Suite — Sprint 1, Task 1.7
 *
 * Validates behavioral parity between the old hand-rolled validators/utilities
 * and their hounfour v7.9.2 replacements. Each test vector captures the
 * expected behavior and confirms the hounfour-backed implementation
 * handles the same inputs correctly.
 *
 * Key architectural note: Dixie's validateAccessPolicy and validateSealingPolicy
 * wrappers use hounfour's compiled TypeBox schemas (validators.xxx().Check()),
 * which enforce STRUCTURAL validation only. Cross-field invariants (e.g.,
 * "time_limited requires duration_hours", "encryption requires key_reference")
 * are registered separately in hounfour and invoked via the top-level validate()
 * function, NOT via compiled.Check(). The migration safety tests verify the
 * actual behavior of the schema validators as deployed.
 *
 * Coverage:
 * - validateAccessPolicy: 5 vectors across all 6 policy types
 * - validateSealingPolicy: 4 vectors covering schema structure validation
 * - checksumAddress (via wallet comparison): 3 vectors for EIP-55 normalization
 *
 * @see SDD §12.2, §13 (Hounfour Level 2)
 */
import { describe, it, expect } from 'vitest';
import { validateAccessPolicy, assertValidAccessPolicy } from '../../src/services/access-policy-validator.js';
import { authorizeMemoryAccess, validateSealingPolicy } from '../../src/services/memory-auth.js';

// ─── AccessPolicy Validation (5 vectors) ──────────────────────────────────

describe('Migration Safety: validateAccessPolicy', () => {
  /**
   * Vector 1: All 6 valid policy types pass schema validation.
   *
   * Old behavior: hand-rolled validator checked `type` against a string enum.
   * New behavior: hounfour TypeBox schema validates `type` as a union of literals.
   * Parity: both accept exactly the same 6 values (none, read_only, time_limited,
   *   role_based, reputation_gated, compound).
   */
  it('V1: accepts all 6 valid policy types', () => {
    const validPolicies = [
      { type: 'none', audit_required: false, revocable: false },
      { type: 'read_only', audit_required: true, revocable: true },
      { type: 'time_limited', duration_hours: 720, audit_required: true, revocable: true },
      { type: 'role_based', roles: ['admin'], audit_required: true, revocable: false },
      {
        type: 'reputation_gated',
        min_reputation_score: 0.7,
        audit_required: true,
        revocable: true,
      },
      {
        type: 'compound',
        operator: 'AND',
        policies: [
          { type: 'role_based', roles: ['team'], audit_required: true, revocable: false },
          { type: 'reputation_gated', min_reputation_score: 0.5, audit_required: true, revocable: true },
        ],
        audit_required: true,
        revocable: true,
      },
    ] as const;

    for (const policy of validPolicies) {
      const result = validateAccessPolicy(policy as any);
      expect(result.valid, `Expected type="${policy.type}" to be valid, got errors: ${result.errors.join('; ')}`).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  /**
   * Vector 2: Invalid policy type is rejected.
   *
   * Old behavior: hand-rolled validator returned { valid: false } for unknown types.
   * New behavior: hounfour schema rejects via union literal mismatch.
   * Parity: both reject unknown types with at least one error.
   */
  it('V2: rejects an invalid policy type', () => {
    const invalid = { type: 'full_access', audit_required: false, revocable: false };
    const result = validateAccessPolicy(invalid as any);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /**
   * Vector 3: Missing required fields are caught.
   *
   * Old behavior: hand-rolled validator checked for audit_required and revocable.
   * New behavior: hounfour schema marks audit_required and revocable as TBoolean (required).
   * Parity: both reject policies missing required boolean fields.
   */
  it('V3: rejects policy missing required fields (audit_required, revocable)', () => {
    const missingFields = { type: 'none' };
    const result = validateAccessPolicy(missingFields as any);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /**
   * Vector 4: Schema rejects role_based with empty roles array (minItems: 1).
   *
   * Old behavior: hand-rolled validator checked `(!roles || roles.length === 0)`.
   * New behavior: hounfour schema defines roles with minItems: 1 constraint.
   *   The TypeBox compiled schema catches empty arrays at the structural level.
   * Parity: both reject role_based with empty roles array.
   *
   * Additionally, assertValidAccessPolicy wraps this into a 400 error response
   * with the standard error shape.
   */
  it('V4: assertValidAccessPolicy throws 400 for role_based with empty roles', () => {
    const roleBasedEmpty = {
      type: 'role_based',
      roles: [],
      audit_required: true,
      revocable: false,
    };

    expect(() => assertValidAccessPolicy(roleBasedEmpty as any)).toThrow();

    try {
      assertValidAccessPolicy(roleBasedEmpty as any);
    } catch (e: any) {
      expect(e.status).toBe(400);
      expect(e.body.error).toBe('invalid_policy');
      expect(e.body.violations.length).toBeGreaterThan(0);
    }
  });

  /**
   * Vector 5: Schema rejects additional properties not in the schema.
   *
   * Old behavior: hand-rolled validator was lenient with extra fields.
   * New behavior: hounfour schema uses additionalProperties: false.
   * Migration change: stricter validation catches unrecognized fields.
   * This is a deliberate tightening for protocol compliance.
   */
  it('V5: rejects policy with additional properties not in schema', () => {
    const extraFields = {
      type: 'none',
      audit_required: false,
      revocable: false,
      custom_field: 'should_not_be_here',
    };

    const result = validateAccessPolicy(extraFields as any);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ─── SealingPolicy Validation (4 vectors) ─────────────────────────────────

describe('Migration Safety: validateSealingPolicy', () => {
  /**
   * Vector 1: Valid sealing policy with encryption enabled.
   *
   * Old behavior: hand-rolled validator checked encryption_scheme, key_derivation, access_policy.
   * New behavior: hounfour TypeBox schema validates structure including required
   *   fields (encryption_scheme, key_derivation, access_audit).
   * Parity: both accept a well-formed encrypted sealing policy.
   */
  it('V1: accepts valid encrypted sealing policy', () => {
    const validPolicy = {
      encryption_scheme: 'aes-256-gcm',
      key_derivation: 'hkdf-sha256',
      key_reference: 'kms://keys/soul-memory-001',
      access_audit: true,
      access_policy: {
        type: 'read_only',
        audit_required: true,
        revocable: true,
      },
    };

    const result = validateSealingPolicy(validPolicy);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * Vector 2: Missing required field access_audit is rejected.
   *
   * Old behavior: hand-rolled validator had its own required field checks.
   * New behavior: hounfour schema marks access_audit as TBoolean (required).
   *   The compiled schema rejects missing required fields.
   * Parity: both enforce that access_audit is present.
   */
  it('V2: rejects sealing policy missing required access_audit field', () => {
    const missingAudit = {
      encryption_scheme: 'aes-256-gcm',
      key_derivation: 'hkdf-sha256',
      key_reference: 'kms://keys/soul-memory-001',
      // access_audit intentionally missing
    };

    const result = validateSealingPolicy(missingAudit);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /**
   * Vector 3: Invalid encryption_scheme literal is rejected.
   *
   * Old behavior: hand-rolled validator checked against allowed schemes.
   * New behavior: hounfour schema defines encryption_scheme as TUnion of
   *   TLiteral('aes-256-gcm') | TLiteral('none'). Other values are rejected.
   * Parity: both reject invalid encryption schemes.
   */
  it('V3: rejects invalid encryption_scheme value', () => {
    const invalidScheme = {
      encryption_scheme: 'aes-128-gcm',
      key_derivation: 'hkdf-sha256',
      access_audit: true,
    };

    const result = validateSealingPolicy(invalidScheme);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /**
   * Vector 4: No-encryption policy is accepted without key fields.
   *
   * Old behavior: hand-rolled validator allowed encryption_scheme: 'none' without key fields.
   * New behavior: hounfour schema accepts 'none' for both encryption_scheme and
   *   key_derivation. key_reference is TOptional so its absence is fine.
   * Parity: both accept a plaintext sealing policy.
   */
  it('V4: accepts no-encryption policy without key fields', () => {
    const plaintextPolicy = {
      encryption_scheme: 'none',
      key_derivation: 'none',
      access_audit: false,
    };

    const result = validateSealingPolicy(plaintextPolicy);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ─── Wallet Comparison via checksumAddress (3 vectors) ─────────────────────

describe('Migration Safety: checksumAddress (wallet comparison)', () => {
  /**
   * Vector 1: Case-insensitive owner matching via EIP-55 normalization.
   *
   * Old behavior: hand-rolled comparison lowercased both sides.
   * New behavior: hounfour checksumAddress produces EIP-55 canonical form;
   *   comparing checksummed outputs achieves case-insensitive matching.
   * Parity: both treat mixed-case and lowercase forms of the same address as equal.
   *
   * Uses Vitalik's well-known address (0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045)
   * as a real-world EIP-55 test vector.
   */
  it('V1: owner match is case-insensitive via checksumAddress', () => {
    const result = authorizeMemoryAccess({
      wallet: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      ownerWallet: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
      delegatedWallets: [],
      accessPolicy: { type: 'none' } as any,
      operation: 'read',
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('owner');
  });

  /**
   * Vector 2: Delegated wallet matching is case-insensitive.
   *
   * Old behavior: hand-rolled comparison lowercased both sides.
   * New behavior: hounfour checksumAddress normalizes before comparison.
   * Parity: both recognize delegated wallets regardless of case.
   *
   * Uses the Ethereum Foundation multisig address as a second real-world vector.
   */
  it('V2: delegated wallet match is case-insensitive via checksumAddress', () => {
    const result = authorizeMemoryAccess({
      wallet: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
      ownerWallet: '0x0000000000000000000000000000000000000001',
      delegatedWallets: ['0xab5801a7d398351b8be11c439e05c5b3259aec9b'],
      accessPolicy: { type: 'none' } as any,
      operation: 'read',
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('delegated');
  });

  /**
   * Vector 3: Non-matching wallets remain distinct after checksumming.
   *
   * Old behavior: hand-rolled comparison correctly distinguished different addresses.
   * New behavior: hounfour checksumAddress produces distinct outputs for different addresses.
   * Parity: both deny access when wallet matches neither owner nor delegates,
   *   falling through to the access policy (which is 'none' -> denied).
   */
  it('V3: distinct wallets remain distinct after checksumming', () => {
    const result = authorizeMemoryAccess({
      wallet: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
      ownerWallet: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      delegatedWallets: ['0x0000000000000000000000000000000000000001'],
      accessPolicy: { type: 'none' } as any,
      operation: 'read',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('access_policy_none');
  });
});
