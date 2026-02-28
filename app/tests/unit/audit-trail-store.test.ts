/**
 * AuditTrailStore Tests — cycle-009 Sprint 2, Tasks 2.4 + 2.5
 *
 * Validates:
 * - Chain-bound hash computation (content + previous_hash)
 * - Serialized append via transaction (TOCTOU fix)
 * - Tip hash retrieval (empty chain + populated chain)
 * - Entry retrieval with ordering
 * - Chain integrity verification
 * - Tamper detection
 * - Cross-chain verification (scoring path vs audit trail)
 *
 * @since bridge-iter1: Updated for chain-bound hashing and transactional appends
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuditTrailStore,
  AUDIT_TRAIL_GENESIS_HASH,
} from '../../src/services/audit-trail-store.js';
import { createMockPool } from '../fixtures/pg-test.js';

// Mock Hounfour — deterministic hashes for both v9 (legacy) and canonical algorithms.
// computeAuditEntryHash: used by v9 chain-bound hash (double-hash via synthetic entry)
// computeChainBoundHash: canonical algorithm (direct concatenation) — Sprint 121
vi.mock('@0xhoneyjar/loa-hounfour/commons', () => ({
  computeAuditEntryHash: vi.fn(
    (entry: { entry_id: string; timestamp: string; event_type: string }, domainTag: string) => {
      const tag = domainTag.split(':')[2] ?? 'unknown';
      if (entry.event_type === 'chain_binding') {
        // Chain binding call (v9 only): entry_id=contentHash, timestamp=previousHash
        return `sha256:chain_${entry.entry_id}_${entry.timestamp.slice(0, 20)}`;
      }
      // Content hash call
      return `sha256:content_${entry.entry_id}_${tag}`;
    },
  ),
  computeChainBoundHash: vi.fn(
    (entry: { entry_id: string }, domainTag: string, previousHash: string) => {
      const tag = domainTag.split(':')[2] ?? 'unknown';
      // Canonical mock: 'canonical_' prefix distinguishes from v9 'chain_' prefix
      return `sha256:canonical_${entry.entry_id}_${tag}_${previousHash.slice(0, 20)}`;
    },
  ),
  validateAuditTimestamp: vi.fn((input: string) => {
    // Pass-through validation: accept valid ISO 8601 timestamps used in tests
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(input);
    if (!iso) return { valid: false, normalized: '', error: 'Timestamp must be strict ISO 8601 format' };
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return { valid: false, normalized: '', error: 'Timestamp is not a valid date' };
    return { valid: true, normalized: d.toISOString() };
  }),
  AUDIT_TRAIL_GENESIS_HASH:
    'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
}));

/**
 * Helper: compute expected chain-bound hash for a test entry.
 * Mirrors the production computeChainBoundHash logic using our mock.
 */
function expectedChainHash(
  entryId: string,
  resourceType: string,
  previousHash: string,
): string {
  const contentHash = `sha256:content_${entryId}_${resourceType}`;
  return `sha256:chain_${contentHash}_${previousHash.slice(0, 20)}`;
}

describe('AuditTrailStore', () => {
  let pool: ReturnType<typeof createMockPool>;
  let store: AuditTrailStore;

  beforeEach(() => {
    pool = createMockPool();
    store = new AuditTrailStore(
      pool as unknown as import('../../src/db/client.js').DbPool,
    );
    vi.clearAllMocks();
  });

  describe('getTipHash()', () => {
    it('returns GENESIS hash when chain is empty', async () => {
      const tip = await store.getTipHash('reputation');
      expect(tip).toBe(AUDIT_TRAIL_GENESIS_HASH);
    });

    it('returns the latest entry hash when chain has entries', async () => {
      pool._setResponse('SELECT entry_hash', {
        rows: [{ entry_hash: 'sha256:latest_hash' }],
        rowCount: 1,
      });

      const tip = await store.getTipHash('reputation');
      expect(tip).toBe('sha256:latest_hash');
    });
  });

  describe('append()', () => {
    it('appends an entry with chain-bound hash and genesis as previous', async () => {
      // The transactional client will issue: BEGIN, SELECT (tip), INSERT, COMMIT
      pool._setResponse('INSERT INTO audit_entries', {
        rows: [],
        rowCount: 1,
      });

      const entry = await store.append('reputation', {
        entry_id: 'entry-001',
        timestamp: '2026-02-26T00:00:00Z',
        event_type: 'governance.reputation.quality_update',
        actor_id: 'wallet-0x123',
        payload: { score: 0.85 },
      });

      expect(entry.entry_id).toBe('entry-001');
      expect(entry.resource_type).toBe('reputation');
      expect(entry.previous_hash).toBe(AUDIT_TRAIL_GENESIS_HASH);
      expect(entry.entry_hash).toContain('sha256:');
      expect(entry.hash_domain_tag).toBe('loa-dixie:audit:reputation:v10');
    });

    it('runs within a transaction (BEGIN/COMMIT)', async () => {
      pool._setResponse('INSERT INTO audit_entries', {
        rows: [],
        rowCount: 1,
      });

      await store.append('reputation', {
        entry_id: 'entry-tx',
        timestamp: '2026-02-26T00:00:00Z',
        event_type: 'governance.reputation.create',
      });

      // Verify transactional queries via the mock client
      const queryTexts = pool._queries.map((q) => q.text);
      expect(queryTexts).toContain('BEGIN');
      expect(queryTexts).toContain('COMMIT');
    });

    it('uses FOR UPDATE lock for tip hash read', async () => {
      pool._setResponse('INSERT INTO audit_entries', {
        rows: [],
        rowCount: 1,
      });

      await store.append('reputation', {
        entry_id: 'entry-lock',
        timestamp: '2026-02-26T00:00:00Z',
        event_type: 'governance.reputation.create',
      });

      const tipQuery = pool._queries.find((q) =>
        q.text.includes('FOR UPDATE'),
      );
      expect(tipQuery).toBeDefined();
    });

    it('links to the previous entry hash in the chain', async () => {
      // Mock tip hash read (via FOR UPDATE query in transaction)
      pool._setResponse('SELECT entry_hash', {
        rows: [{ entry_hash: 'sha256:previous_entry_hash' }],
        rowCount: 1,
      });
      pool._setResponse('INSERT INTO audit_entries', {
        rows: [],
        rowCount: 1,
      });

      const entry = await store.append('reputation', {
        entry_id: 'entry-002',
        timestamp: '2026-02-26T01:00:00Z',
        event_type: 'governance.reputation.state_transition',
      });

      expect(entry.previous_hash).toBe('sha256:previous_entry_hash');
    });

    it('rejects entries with invalid timestamps (hounfour v8.3.0 validation)', async () => {
      await expect(
        store.append('reputation', {
          entry_id: 'entry-bad-ts',
          timestamp: 'not-a-timestamp',
          event_type: 'governance.reputation.create',
        }),
      ).rejects.toThrow('Invalid audit timestamp');
    });

    it('handles entries without optional fields', async () => {
      pool._setResponse('INSERT INTO audit_entries', {
        rows: [],
        rowCount: 1,
      });

      const entry = await store.append('knowledge', {
        entry_id: 'entry-003',
        timestamp: '2026-02-26T00:00:00Z',
        event_type: 'governance.knowledge.freshness_decay',
      });

      expect(entry.actor_id).toBeUndefined();
      expect(entry.payload).toBeUndefined();
      expect(entry.hash_domain_tag).toBe('loa-dixie:audit:knowledge:v10');
    });
  });

  describe('getEntries()', () => {
    it('returns empty array when no entries exist', async () => {
      const entries = await store.getEntries('reputation');
      expect(entries).toEqual([]);
    });

    it('returns entries ordered by created_at', async () => {
      const mockEntries = [
        {
          entry_id: 'e1',
          resource_type: 'reputation',
          timestamp: '2026-02-26T00:00:00Z',
          event_type: 'governance.reputation.create',
          actor_id: 'actor1',
          payload: null,
          entry_hash: 'sha256:h1',
          previous_hash: AUDIT_TRAIL_GENESIS_HASH,
          hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
        },
        {
          entry_id: 'e2',
          resource_type: 'reputation',
          timestamp: '2026-02-26T01:00:00Z',
          event_type: 'governance.reputation.update',
          actor_id: 'actor1',
          payload: { score: 0.9 },
          entry_hash: 'sha256:h2',
          previous_hash: 'sha256:h1',
          hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
        },
      ];
      pool._setResponse('SELECT * FROM audit_entries', {
        rows: mockEntries,
        rowCount: 2,
      });

      const entries = await store.getEntries('reputation');
      expect(entries).toHaveLength(2);
      expect(entries[0].entry_id).toBe('e1');
      expect(entries[1].entry_id).toBe('e2');
    });

    it('respects limit parameter', async () => {
      pool._setResponse('SELECT * FROM audit_entries', {
        rows: [
          {
            entry_id: 'e1',
            resource_type: 'reputation',
            timestamp: '2026-02-26T00:00:00Z',
            event_type: 'governance.reputation.create',
            actor_id: null,
            payload: null,
            entry_hash: 'sha256:h1',
            previous_hash: AUDIT_TRAIL_GENESIS_HASH,
            hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
          },
        ],
        rowCount: 1,
      });

      const entries = await store.getEntries('reputation', 1);
      expect(entries).toHaveLength(1);

      const selectQuery = pool._queries.find((q) =>
        q.text.includes('LIMIT'),
      );
      expect(selectQuery).toBeDefined();
    });
  });

  describe('verifyIntegrity()', () => {
    it('returns valid for empty chain', async () => {
      const result = await store.verifyIntegrity('reputation');
      expect(result.valid).toBe(true);
      expect(result.entries_checked).toBe(0);
    });

    it('returns valid for a properly linked chain', async () => {
      // Build a valid 2-entry chain with chain-bound hashes
      const hash1 = expectedChainHash('e1', 'reputation', AUDIT_TRAIL_GENESIS_HASH);
      const hash2 = expectedChainHash('e2', 'reputation', hash1);

      pool._setResponse('SELECT * FROM audit_entries', {
        rows: [
          {
            entry_id: 'e1',
            resource_type: 'reputation',
            timestamp: '2026-02-26T00:00:00Z',
            event_type: 'governance.reputation.create',
            actor_id: null,
            payload: null,
            entry_hash: hash1,
            previous_hash: AUDIT_TRAIL_GENESIS_HASH,
            hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
          },
          {
            entry_id: 'e2',
            resource_type: 'reputation',
            timestamp: '2026-02-26T01:00:00Z',
            event_type: 'governance.reputation.update',
            actor_id: null,
            payload: null,
            entry_hash: hash2,
            previous_hash: hash1,
            hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
          },
        ],
        rowCount: 2,
      });

      const result = await store.verifyIntegrity('reputation');
      expect(result.valid).toBe(true);
      expect(result.entries_checked).toBe(2);
    });

    it('detects tampered entry hash (content or chain modification)', async () => {
      pool._setResponse('SELECT * FROM audit_entries', {
        rows: [
          {
            entry_id: 'e1',
            resource_type: 'reputation',
            timestamp: '2026-02-26T00:00:00Z',
            event_type: 'governance.reputation.create',
            actor_id: null,
            payload: null,
            entry_hash: 'sha256:TAMPERED_HASH',
            previous_hash: AUDIT_TRAIL_GENESIS_HASH,
            hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
          },
        ],
        rowCount: 1,
      });

      const result = await store.verifyIntegrity('reputation');
      expect(result.valid).toBe(false);
      expect(result.detail).toContain('Hash mismatch');
    });

    it('detects broken chain linkage via tampered previous_hash', async () => {
      const hash1 = expectedChainHash('e1', 'reputation', AUDIT_TRAIL_GENESIS_HASH);
      // Entry 2's hash is computed with the CORRECT previous (hash1),
      // but the stored previous_hash is wrong. The chain-bound hash
      // verification will pass (hash matches) but the explicit linkage
      // check will fail.
      const hash2WithCorrectPrev = expectedChainHash('e2', 'reputation', hash1);

      pool._setResponse('SELECT * FROM audit_entries', {
        rows: [
          {
            entry_id: 'e1',
            resource_type: 'reputation',
            timestamp: '2026-02-26T00:00:00Z',
            event_type: 'governance.reputation.create',
            actor_id: null,
            payload: null,
            entry_hash: hash1,
            previous_hash: AUDIT_TRAIL_GENESIS_HASH,
            hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
          },
          {
            entry_id: 'e2',
            resource_type: 'reputation',
            timestamp: '2026-02-26T01:00:00Z',
            event_type: 'governance.reputation.update',
            actor_id: null,
            payload: null,
            entry_hash: hash2WithCorrectPrev,
            previous_hash: 'sha256:WRONG_PREVIOUS',
            hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
          },
        ],
        rowCount: 2,
      });

      const result = await store.verifyIntegrity('reputation');
      expect(result.valid).toBe(false);
      // Should fail because stored previous_hash doesn't match expected
      expect(result.detail).toContain('linkage broken');
    });
  });

  describe('verifyCrossChain()', () => {
    it('returns consistent when hashes match', async () => {
      const tipHash = 'sha256:scoring_tip_hash';
      pool._setResponse('SELECT entry_hash', {
        rows: [{ entry_hash: tipHash }],
        rowCount: 1,
      });

      const result = await store.verifyCrossChain(tipHash);
      expect(result.consistent).toBe(true);
      expect(result.detail).toContain('match');
    });

    it('returns inconsistent when hashes diverge', async () => {
      pool._setResponse('SELECT entry_hash', {
        rows: [{ entry_hash: 'sha256:audit_tip_hash' }],
        rowCount: 1,
      });

      const result = await store.verifyCrossChain('sha256:different_scoring_tip');
      expect(result.consistent).toBe(false);
      expect(result.detail).toContain('divergence');
    });

    it('returns consistent when audit chain is empty', async () => {
      const result = await store.verifyCrossChain('sha256:any_hash');
      expect(result.consistent).toBe(true);
      expect(result.detail).toContain('empty');
    });
  });
});
