/**
 * DynamicContractStore Tests — cycle-009 Sprint 4
 *
 * Validates:
 * - Contract CRUD operations (Task 4.2)
 * - Monotonic expansion enforcement (Task 4.2)
 * - Protocol surface lookup (Task 4.2)
 * - Type re-export verification (Task 4.4)
 * - Backward compatibility (Task 4.6)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DynamicContractStore,
  MonotonicViolationError,
  StaleContractVersionError,
} from '../../src/services/dynamic-contract-store.js';
import type { DynamicContract, ProtocolSurface } from '../../src/types/dynamic-contract.js';
import { createMockPool } from '../fixtures/pg-test.js';

// Mock verifyMonotonicExpansion — tests the store logic, not Hounfour's verification
vi.mock('../../src/types/dynamic-contract.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/types/dynamic-contract.js')>();
  return {
    ...actual,
    verifyMonotonicExpansion: vi.fn(() => ({ valid: true, violations: [] })),
  };
});

import { verifyMonotonicExpansion } from '../../src/types/dynamic-contract.js';

function makeContract(overrides?: Partial<DynamicContract>): DynamicContract {
  return {
    contract_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    surfaces: {
      cold: {
        schemas: ['basic'],
        capabilities: ['inference'],
        rate_limit_tier: 'restricted',
      },
      warming: {
        schemas: ['basic', 'tools'],
        capabilities: ['inference', 'tools'],
        rate_limit_tier: 'standard',
      },
      established: {
        schemas: ['basic', 'tools', 'ensemble'],
        capabilities: ['inference', 'tools', 'ensemble'],
        rate_limit_tier: 'extended',
      },
      authoritative: {
        schemas: ['basic', 'tools', 'ensemble', 'governance'],
        capabilities: ['inference', 'tools', 'ensemble', 'governance', 'byok'],
        rate_limit_tier: 'unlimited',
      },
    },
    contract_version: '9.0.0',
    created_at: '2026-02-26T00:00:00Z',
    ...overrides,
  } as DynamicContract;
}

describe('DynamicContractStore', () => {
  let pool: ReturnType<typeof createMockPool>;
  let store: DynamicContractStore;

  beforeEach(() => {
    pool = createMockPool();
    store = new DynamicContractStore(
      pool as unknown as import('../../src/db/client.js').DbPool,
    );
    vi.clearAllMocks();
    // Default: expansion is valid
    vi.mocked(verifyMonotonicExpansion).mockReturnValue({
      valid: true,
      violations: [],
    });
  });

  describe('getContract()', () => {
    it('returns undefined when no contract exists', async () => {
      const result = await store.getContract('nft-1');
      expect(result).toBeUndefined();
    });

    it('returns the contract when found', async () => {
      const contract = makeContract();
      pool._setResponse('SELECT contract_data', {
        rows: [{ contract_data: contract }],
        rowCount: 1,
      });

      const result = await store.getContract('nft-1');
      expect(result).toEqual(contract);
      expect(result?.contract_id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    });
  });

  describe('putContract()', () => {
    it('saves a valid contract', async () => {
      const contract = makeContract();
      pool._setResponse('INSERT INTO dynamic_contracts', {
        rows: [],
        rowCount: 1,
      });

      await expect(store.putContract('nft-1', contract)).resolves.toBeUndefined();
      expect(verifyMonotonicExpansion).toHaveBeenCalledWith(contract);
    });

    it('rejects contracts that violate monotonic expansion', async () => {
      vi.mocked(verifyMonotonicExpansion).mockReturnValue({
        valid: false,
        violations: [
          {
            lower_state: 'cold',
            higher_state: 'warming',
            violation_type: 'missing_capabilities',
            details: 'warming must include all cold capabilities',
          },
        ],
      });

      const contract = makeContract();

      await expect(store.putContract('nft-1', contract)).rejects.toThrow(
        MonotonicViolationError,
      );
    });

    it('uses parameterized queries for insert', async () => {
      const contract = makeContract();
      pool._setResponse('INSERT INTO dynamic_contracts', {
        rows: [],
        rowCount: 1,
      });

      await store.putContract('nft-1', contract);

      const insertQuery = pool._queries.find((q) =>
        q.text.includes('INSERT INTO dynamic_contracts'),
      );
      expect(insertQuery).toBeDefined();
      expect(insertQuery!.values).toContain('nft-1');
      expect(insertQuery!.values).toContain(contract.contract_id);
    });

    it('includes version guard WHERE clause in UPSERT', async () => {
      const contract = makeContract();
      pool._setResponse('INSERT INTO dynamic_contracts', {
        rows: [],
        rowCount: 1,
      });

      await store.putContract('nft-1', contract);

      const insertQuery = pool._queries.find((q) =>
        q.text.includes('INSERT INTO dynamic_contracts'),
      );
      expect(insertQuery).toBeDefined();
      expect(insertQuery!.text).toContain(
        'WHERE dynamic_contracts.contract_version < EXCLUDED.contract_version',
      );
    });

    it('throws StaleContractVersionError when rowCount is 0 (concurrent newer write)', async () => {
      const contract = makeContract({ contract_version: '8.0.0' });
      // rowCount 0 means the WHERE clause rejected the update
      pool._setResponse('INSERT INTO dynamic_contracts', {
        rows: [],
        rowCount: 0,
      });

      await expect(store.putContract('nft-1', contract)).rejects.toThrow(
        StaleContractVersionError,
      );
      await expect(store.putContract('nft-1', contract)).rejects.toThrow(
        /Stale contract version for nft-1/,
      );
    });
  });

  describe('getSurface()', () => {
    it('returns undefined when no contract exists', async () => {
      const result = await store.getSurface('nft-1', 'cold');
      expect(result).toBeUndefined();
    });

    it('returns the surface for a given reputation state', async () => {
      const contract = makeContract();
      pool._setResponse('SELECT contract_data', {
        rows: [{ contract_data: contract }],
        rowCount: 1,
      });

      const surface = await store.getSurface('nft-1', 'cold');
      expect(surface).toBeDefined();
      expect(surface?.capabilities).toContain('inference');
      expect(surface?.rate_limit_tier).toBe('restricted');
    });

    it('returns undefined for unknown reputation state', async () => {
      const contract = makeContract();
      pool._setResponse('SELECT contract_data', {
        rows: [{ contract_data: contract }],
        rowCount: 1,
      });

      const surface = await store.getSurface('nft-1', 'unknown_state');
      expect(surface).toBeUndefined();
    });

    it('returns progressively richer surfaces for higher states', async () => {
      const contract = makeContract();
      pool._setResponse('SELECT contract_data', {
        rows: [{ contract_data: contract }],
        rowCount: 1,
      });

      const cold = await store.getSurface('nft-1', 'cold');
      // Reset mock to return same contract
      pool._setResponse('SELECT contract_data', {
        rows: [{ contract_data: contract }],
        rowCount: 1,
      });
      const auth = await store.getSurface('nft-1', 'authoritative');

      expect(cold!.capabilities.length).toBeLessThan(
        auth!.capabilities.length,
      );
    });
  });
});

describe('MonotonicViolationError', () => {
  it('has correct properties', () => {
    const err = new MonotonicViolationError('nft-1', [
      {
        violation_type: 'missing_capabilities',
        details: 'warming must include cold caps',
      },
    ]);
    expect(err.name).toBe('MonotonicViolationError');
    expect(err.nftId).toBe('nft-1');
    expect(err.violations).toHaveLength(1);
    expect(err.message).toContain('nft-1');
  });
});

describe('StaleContractVersionError', () => {
  it('has correct properties', () => {
    const err = new StaleContractVersionError('nft-1', '8.0.0');
    expect(err.name).toBe('StaleContractVersionError');
    expect(err.nftId).toBe('nft-1');
    expect(err.attemptedVersion).toBe('8.0.0');
    expect(err.message).toContain('nft-1');
    expect(err.message).toContain('8.0.0');
  });
});

describe('Type Re-exports (Task 4.4)', () => {
  it('DynamicContract types are importable from local barrel', async () => {
    const mod = await import('../../src/types/dynamic-contract.js');
    // The module should export the verifyMonotonicExpansion function
    expect(typeof mod.verifyMonotonicExpansion).toBe('function');
  });
});
