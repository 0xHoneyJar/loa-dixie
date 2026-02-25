/**
 * AuditTrailStore Tests — cycle-009 Sprint 2, Tasks 2.4 + 2.5
 *
 * Validates:
 * - Hash chain append with Hounfour computeAuditEntryHash()
 * - Tip hash retrieval (empty chain + populated chain)
 * - Entry retrieval with ordering
 * - Chain integrity verification
 * - Tamper detection
 * - Cross-chain verification (scoring path vs audit trail)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuditTrailStore,
  AUDIT_TRAIL_GENESIS_HASH,
} from '../../src/services/audit-trail-store.js';
import type { AuditEntry } from '../../src/services/audit-trail-store.js';
import { createMockPool } from '../fixtures/pg-test.js';

// We need to mock the Hounfour computeAuditEntryHash since it depends on
// @noble/hashes which may not be available in the unit test environment.
// In integration tests, we'd use the real implementation.
vi.mock('@0xhoneyjar/loa-hounfour/commons', () => ({
  computeAuditEntryHash: vi.fn((entry: { entry_id: string }, domainTag: string) => {
    // Deterministic mock: hash based on entry_id + domain tag
    return `sha256:mock_${entry.entry_id}_${domainTag.split(':')[2] ?? 'unknown'}`;
  }),
  AUDIT_TRAIL_GENESIS_HASH:
    'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
}));

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
    it('appends an entry with computed hash and genesis as previous', async () => {
      // getTipHash returns genesis (empty chain)
      // Then INSERT succeeds
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
      expect(entry.hash_domain_tag).toBe('loa-dixie:audit:reputation:9.0.0');
    });

    it('links to the previous entry hash in the chain', async () => {
      // getTipHash returns a previous hash
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
      expect(entry.hash_domain_tag).toBe('loa-dixie:audit:knowledge:9.0.0');
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

      // Verify LIMIT was in the query
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
      // Build a valid 2-entry chain
      const hash1 = 'sha256:mock_e1_reputation';
      const hash2 = 'sha256:mock_e2_reputation';

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

    it('detects tampered entry hash (content modification)', async () => {
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
      expect(result.detail).toContain('Content hash mismatch');
    });

    it('detects broken chain linkage', async () => {
      const hash1 = 'sha256:mock_e1_reputation';

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
            entry_hash: 'sha256:mock_e2_reputation',
            previous_hash: 'sha256:WRONG_PREVIOUS',
            hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
          },
        ],
        rowCount: 2,
      });

      const result = await store.verifyIntegrity('reputation');
      expect(result.valid).toBe(false);
      expect(result.detail).toContain('Chain linkage broken');
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
