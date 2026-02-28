/**
 * Chain-Bound Hash Version-Aware Verification Tests — Sprint 121, Task T6.5
 *
 * Validates ADR-006 implementation:
 * - isLegacyDomainTag() version detection
 * - computeChainBoundHashVersionAware() algorithm dispatch
 * - Pure legacy chain verification (v9 domain tags)
 * - Pure canonical chain verification (v10 domain tags)
 * - Mixed chain verification (v9 → v10 transition boundary)
 * - Tamper detection across both algorithms
 *
 * @since cycle-019 Sprint 121 — T6.5
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuditTrailStore,
  AUDIT_TRAIL_GENESIS_HASH,
  computeChainBoundHash_v9,
  isLegacyDomainTag,
  computeChainBoundHashVersionAware,
} from '../../src/services/audit-trail-store.js';
import { createMockPool } from '../fixtures/pg-test.js';

// Same deterministic mock as main test — both algorithms distinguishable
vi.mock('@0xhoneyjar/loa-hounfour/commons', () => ({
  computeAuditEntryHash: vi.fn(
    (entry: { entry_id: string; timestamp: string; event_type: string }, domainTag: string) => {
      const tag = domainTag.split(':')[2] ?? 'unknown';
      if (entry.event_type === 'chain_binding') {
        return `sha256:chain_${entry.entry_id}_${entry.timestamp.slice(0, 20)}`;
      }
      return `sha256:content_${entry.entry_id}_${tag}`;
    },
  ),
  computeChainBoundHash: vi.fn(
    (entry: { entry_id: string }, domainTag: string, previousHash: string) => {
      const tag = domainTag.split(':')[2] ?? 'unknown';
      return `sha256:canonical_${entry.entry_id}_${tag}_${previousHash.slice(0, 20)}`;
    },
  ),
  validateAuditTimestamp: vi.fn(() => ({ valid: true, normalized: '' })),
  AUDIT_TRAIL_GENESIS_HASH:
    'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
}));

// ---------------------------------------------------------------------------
// Test helpers — mirrors production hash computation using mock
// ---------------------------------------------------------------------------

/** Compute expected v9 (legacy) chain-bound hash via mock. */
function expectedV9Hash(entryId: string, resourceType: string, previousHash: string): string {
  const contentHash = `sha256:content_${entryId}_${resourceType}`;
  return `sha256:chain_${contentHash}_${previousHash.slice(0, 20)}`;
}

/** Compute expected canonical chain-bound hash via mock. */
function expectedCanonicalHash(entryId: string, resourceType: string, previousHash: string): string {
  return `sha256:canonical_${entryId}_${resourceType}_${previousHash.slice(0, 20)}`;
}

// ---------------------------------------------------------------------------
// isLegacyDomainTag — version detection
// ---------------------------------------------------------------------------

describe('isLegacyDomainTag', () => {
  it('returns true for semver versions with dots (9.0.0)', () => {
    expect(isLegacyDomainTag('loa-dixie:audit:reputation:9.0.0')).toBe(true);
  });

  it('returns true for multi-digit semver (10.2.1)', () => {
    expect(isLegacyDomainTag('loa-dixie:audit:reputation:10.2.1')).toBe(true);
  });

  it('returns false for canonical v10 format (no dots)', () => {
    expect(isLegacyDomainTag('loa-dixie:audit:reputation:v10')).toBe(false);
  });

  it('returns false for other dot-free versions (v11, v12)', () => {
    expect(isLegacyDomainTag('loa-dixie:audit:scoring-path:v11')).toBe(false);
  });

  it('returns false for domain tags without a version segment (no dots)', () => {
    // Edge case: domain tag with fewer segments than expected
    expect(isLegacyDomainTag('loa-dixie:audit')).toBe(false);
    // "audit" doesn't contain dots, so it returns false
  });
});

// ---------------------------------------------------------------------------
// computeChainBoundHashVersionAware — algorithm dispatch
// ---------------------------------------------------------------------------

describe('computeChainBoundHashVersionAware', () => {
  const entry = {
    entry_id: 'test-001',
    timestamp: '2026-02-28T00:00:00Z',
    event_type: 'governance.test.create',
  };

  it('dispatches to v9 algorithm for legacy domain tags', () => {
    const hash = computeChainBoundHashVersionAware(
      entry,
      'loa-dixie:audit:reputation:9.0.0',
      AUDIT_TRAIL_GENESIS_HASH,
    );
    // v9 uses double-hash via chain_binding → 'sha256:chain_...' pattern
    expect(hash).toContain('sha256:chain_');
    expect(hash).not.toContain('canonical_');
  });

  it('dispatches to canonical algorithm for v10 domain tags', () => {
    const hash = computeChainBoundHashVersionAware(
      entry,
      'loa-dixie:audit:reputation:v10',
      AUDIT_TRAIL_GENESIS_HASH,
    );
    // Canonical uses direct mock → 'sha256:canonical_...' pattern
    expect(hash).toContain('sha256:canonical_');
    expect(hash).not.toContain('chain_sha256');
  });

  it('produces different hashes for same entry with different algorithms', () => {
    const v9Hash = computeChainBoundHashVersionAware(
      entry,
      'loa-dixie:audit:reputation:9.0.0',
      AUDIT_TRAIL_GENESIS_HASH,
    );
    const canonicalHash = computeChainBoundHashVersionAware(
      entry,
      'loa-dixie:audit:reputation:v10',
      AUDIT_TRAIL_GENESIS_HASH,
    );
    expect(v9Hash).not.toBe(canonicalHash);
  });
});

// ---------------------------------------------------------------------------
// computeChainBoundHash_v9 — legacy algorithm preserved
// ---------------------------------------------------------------------------

describe('computeChainBoundHash_v9', () => {
  it('produces double-hash via synthetic chain_binding entry', () => {
    const hash = computeChainBoundHash_v9(
      {
        entry_id: 'legacy-001',
        timestamp: '2026-02-28T00:00:00Z',
        event_type: 'governance.legacy.create',
      },
      'loa-dixie:audit:reputation:9.0.0',
      AUDIT_TRAIL_GENESIS_HASH,
    );
    // contentHash = sha256:content_legacy-001_reputation
    // chainHash = sha256:chain_{contentHash}_{genesis.slice(0,20)}
    expect(hash).toBe(expectedV9Hash('legacy-001', 'reputation', AUDIT_TRAIL_GENESIS_HASH));
  });
});

// ---------------------------------------------------------------------------
// Store.verifyIntegrity — pure legacy chain (all v9 entries)
// ---------------------------------------------------------------------------

describe('AuditTrailStore.verifyIntegrity — legacy chain', () => {
  let pool: ReturnType<typeof createMockPool>;
  let store: AuditTrailStore;

  beforeEach(() => {
    pool = createMockPool();
    store = new AuditTrailStore(
      pool as unknown as import('../../src/db/client.js').DbPool,
    );
    vi.clearAllMocks();
  });

  it('verifies a 3-entry legacy chain', async () => {
    const hash1 = expectedV9Hash('e1', 'reputation', AUDIT_TRAIL_GENESIS_HASH);
    const hash2 = expectedV9Hash('e2', 'reputation', hash1);
    const hash3 = expectedV9Hash('e3', 'reputation', hash2);

    pool._setResponse('SELECT * FROM audit_entries', {
      rows: [
        {
          entry_id: 'e1', resource_type: 'reputation',
          timestamp: '2026-02-28T00:00:00Z', event_type: 'governance.reputation.create',
          actor_id: null, payload: null,
          entry_hash: hash1, previous_hash: AUDIT_TRAIL_GENESIS_HASH,
          hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
        },
        {
          entry_id: 'e2', resource_type: 'reputation',
          timestamp: '2026-02-28T01:00:00Z', event_type: 'governance.reputation.update',
          actor_id: null, payload: null,
          entry_hash: hash2, previous_hash: hash1,
          hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
        },
        {
          entry_id: 'e3', resource_type: 'reputation',
          timestamp: '2026-02-28T02:00:00Z', event_type: 'governance.reputation.update',
          actor_id: null, payload: null,
          entry_hash: hash3, previous_hash: hash2,
          hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
        },
      ],
      rowCount: 3,
    });

    const result = await store.verifyIntegrity('reputation');
    expect(result.valid).toBe(true);
    expect(result.entries_checked).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Store.verifyIntegrity — pure canonical chain (all v10 entries)
// ---------------------------------------------------------------------------

describe('AuditTrailStore.verifyIntegrity — canonical chain', () => {
  let pool: ReturnType<typeof createMockPool>;
  let store: AuditTrailStore;

  beforeEach(() => {
    pool = createMockPool();
    store = new AuditTrailStore(
      pool as unknown as import('../../src/db/client.js').DbPool,
    );
    vi.clearAllMocks();
  });

  it('verifies a 3-entry canonical chain', async () => {
    const hash1 = expectedCanonicalHash('c1', 'reputation', AUDIT_TRAIL_GENESIS_HASH);
    const hash2 = expectedCanonicalHash('c2', 'reputation', hash1);
    const hash3 = expectedCanonicalHash('c3', 'reputation', hash2);

    pool._setResponse('SELECT * FROM audit_entries', {
      rows: [
        {
          entry_id: 'c1', resource_type: 'reputation',
          timestamp: '2026-02-28T00:00:00Z', event_type: 'governance.reputation.create',
          actor_id: null, payload: null,
          entry_hash: hash1, previous_hash: AUDIT_TRAIL_GENESIS_HASH,
          hash_domain_tag: 'loa-dixie:audit:reputation:v10',
        },
        {
          entry_id: 'c2', resource_type: 'reputation',
          timestamp: '2026-02-28T01:00:00Z', event_type: 'governance.reputation.update',
          actor_id: null, payload: null,
          entry_hash: hash2, previous_hash: hash1,
          hash_domain_tag: 'loa-dixie:audit:reputation:v10',
        },
        {
          entry_id: 'c3', resource_type: 'reputation',
          timestamp: '2026-02-28T02:00:00Z', event_type: 'governance.reputation.update',
          actor_id: null, payload: null,
          entry_hash: hash3, previous_hash: hash2,
          hash_domain_tag: 'loa-dixie:audit:reputation:v10',
        },
      ],
      rowCount: 3,
    });

    const result = await store.verifyIntegrity('reputation');
    expect(result.valid).toBe(true);
    expect(result.entries_checked).toBe(3);
  });

  it('detects tampered canonical entry', async () => {
    pool._setResponse('SELECT * FROM audit_entries', {
      rows: [
        {
          entry_id: 'c1', resource_type: 'reputation',
          timestamp: '2026-02-28T00:00:00Z', event_type: 'governance.reputation.create',
          actor_id: null, payload: null,
          entry_hash: 'sha256:TAMPERED_CANONICAL',
          previous_hash: AUDIT_TRAIL_GENESIS_HASH,
          hash_domain_tag: 'loa-dixie:audit:reputation:v10',
        },
      ],
      rowCount: 1,
    });

    const result = await store.verifyIntegrity('reputation');
    expect(result.valid).toBe(false);
    expect(result.detail).toContain('Hash mismatch');
  });
});

// ---------------------------------------------------------------------------
// Store.verifyIntegrity — mixed chain (v9 → v10 transition boundary)
// ---------------------------------------------------------------------------

describe('AuditTrailStore.verifyIntegrity — mixed chain (ADR-006 transition)', () => {
  let pool: ReturnType<typeof createMockPool>;
  let store: AuditTrailStore;

  beforeEach(() => {
    pool = createMockPool();
    store = new AuditTrailStore(
      pool as unknown as import('../../src/db/client.js').DbPool,
    );
    vi.clearAllMocks();
  });

  it('verifies chain with v9 → v10 transition at entry boundary', async () => {
    // Entry 1-2: legacy v9 domain tag
    const hash1 = expectedV9Hash('m1', 'reputation', AUDIT_TRAIL_GENESIS_HASH);
    const hash2 = expectedV9Hash('m2', 'reputation', hash1);
    // Entry 3: canonical v10 domain tag — links to v9 entry's hash
    const hash3 = expectedCanonicalHash('m3', 'reputation', hash2);

    pool._setResponse('SELECT * FROM audit_entries', {
      rows: [
        {
          entry_id: 'm1', resource_type: 'reputation',
          timestamp: '2026-02-28T00:00:00Z', event_type: 'governance.reputation.create',
          actor_id: null, payload: null,
          entry_hash: hash1, previous_hash: AUDIT_TRAIL_GENESIS_HASH,
          hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
        },
        {
          entry_id: 'm2', resource_type: 'reputation',
          timestamp: '2026-02-28T01:00:00Z', event_type: 'governance.reputation.update',
          actor_id: null, payload: null,
          entry_hash: hash2, previous_hash: hash1,
          hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
        },
        {
          entry_id: 'm3', resource_type: 'reputation',
          timestamp: '2026-02-28T02:00:00Z', event_type: 'governance.reputation.update',
          actor_id: null, payload: null,
          entry_hash: hash3, previous_hash: hash2,
          hash_domain_tag: 'loa-dixie:audit:reputation:v10',
        },
      ],
      rowCount: 3,
    });

    const result = await store.verifyIntegrity('reputation');
    expect(result.valid).toBe(true);
    expect(result.entries_checked).toBe(3);
  });

  it('detects tamper at v9 → v10 transition boundary', async () => {
    const hash1 = expectedV9Hash('m1', 'reputation', AUDIT_TRAIL_GENESIS_HASH);
    // Entry 2 (v10) has correct hash but wrong stored previous_hash
    const hash2 = expectedCanonicalHash('m2', 'reputation', hash1);

    pool._setResponse('SELECT * FROM audit_entries', {
      rows: [
        {
          entry_id: 'm1', resource_type: 'reputation',
          timestamp: '2026-02-28T00:00:00Z', event_type: 'governance.reputation.create',
          actor_id: null, payload: null,
          entry_hash: hash1, previous_hash: AUDIT_TRAIL_GENESIS_HASH,
          hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
        },
        {
          entry_id: 'm2', resource_type: 'reputation',
          timestamp: '2026-02-28T01:00:00Z', event_type: 'governance.reputation.update',
          actor_id: null, payload: null,
          entry_hash: hash2, previous_hash: 'sha256:WRONG_LINK',
          hash_domain_tag: 'loa-dixie:audit:reputation:v10',
        },
      ],
      rowCount: 2,
    });

    const result = await store.verifyIntegrity('reputation');
    expect(result.valid).toBe(false);
    // Stored previous_hash doesn't match expected → linkage check catches it
    expect(result.detail).toContain('linkage broken');
  });

  it('verifies a longer mixed chain (2 v9 + 3 v10)', async () => {
    const h1 = expectedV9Hash('x1', 'scoring-path', AUDIT_TRAIL_GENESIS_HASH);
    const h2 = expectedV9Hash('x2', 'scoring-path', h1);
    const h3 = expectedCanonicalHash('x3', 'scoring-path', h2);
    const h4 = expectedCanonicalHash('x4', 'scoring-path', h3);
    const h5 = expectedCanonicalHash('x5', 'scoring-path', h4);

    const makeEntry = (id: string, hash: string, prev: string, tag: string, idx: number) => ({
      entry_id: id,
      resource_type: 'scoring-path',
      timestamp: `2026-02-28T0${idx}:00:00Z`,
      event_type: 'governance.scoring.step',
      actor_id: null,
      payload: null,
      entry_hash: hash,
      previous_hash: prev,
      hash_domain_tag: tag,
    });

    pool._setResponse('SELECT * FROM audit_entries', {
      rows: [
        makeEntry('x1', h1, AUDIT_TRAIL_GENESIS_HASH, 'loa-dixie:audit:scoring-path:9.0.0', 0),
        makeEntry('x2', h2, h1, 'loa-dixie:audit:scoring-path:9.0.0', 1),
        makeEntry('x3', h3, h2, 'loa-dixie:audit:scoring-path:v10', 2),
        makeEntry('x4', h4, h3, 'loa-dixie:audit:scoring-path:v10', 3),
        makeEntry('x5', h5, h4, 'loa-dixie:audit:scoring-path:v10', 4),
      ],
      rowCount: 5,
    });

    const result = await store.verifyIntegrity('scoring-path');
    expect(result.valid).toBe(true);
    expect(result.entries_checked).toBe(5);
  });

  it('verifies chain with v10→v9 transition (reverse/downgrade scenario)', async () => {
    // Edge case: 2 canonical (v10) entries followed by 1 legacy (v9) entry.
    // This documents that the algorithm handles reverse transitions correctly
    // because chain binding uses stored hashes — each entry's hash is verified
    // against its own domain tag's algorithm, and linkage uses the stored
    // previous_hash regardless of version boundary direction.
    const h1 = expectedCanonicalHash('d1', 'reputation', AUDIT_TRAIL_GENESIS_HASH);
    const h2 = expectedCanonicalHash('d2', 'reputation', h1);
    const h3 = expectedV9Hash('d3', 'reputation', h2);

    pool._setResponse('SELECT * FROM audit_entries', {
      rows: [
        {
          entry_id: 'd1', resource_type: 'reputation',
          timestamp: '2026-02-28T00:00:00Z', event_type: 'governance.reputation.create',
          actor_id: null, payload: null,
          entry_hash: h1, previous_hash: AUDIT_TRAIL_GENESIS_HASH,
          hash_domain_tag: 'loa-dixie:audit:reputation:v10',
        },
        {
          entry_id: 'd2', resource_type: 'reputation',
          timestamp: '2026-02-28T01:00:00Z', event_type: 'governance.reputation.update',
          actor_id: null, payload: null,
          entry_hash: h2, previous_hash: h1,
          hash_domain_tag: 'loa-dixie:audit:reputation:v10',
        },
        {
          entry_id: 'd3', resource_type: 'reputation',
          timestamp: '2026-02-28T02:00:00Z', event_type: 'governance.reputation.update',
          actor_id: null, payload: null,
          entry_hash: h3, previous_hash: h2,
          hash_domain_tag: 'loa-dixie:audit:reputation:9.0.0',
        },
      ],
      rowCount: 3,
    });

    const result = await store.verifyIntegrity('reputation');
    expect(result.valid).toBe(true);
    expect(result.entries_checked).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Store.append — now produces v10 domain tag with canonical hash
// ---------------------------------------------------------------------------

describe('AuditTrailStore.append — canonical hash (Sprint 121)', () => {
  let pool: ReturnType<typeof createMockPool>;
  let store: AuditTrailStore;

  beforeEach(() => {
    pool = createMockPool();
    store = new AuditTrailStore(
      pool as unknown as import('../../src/db/client.js').DbPool,
    );
    vi.clearAllMocks();
  });

  it('uses v10 domain tag for new entries', async () => {
    pool._setResponse('INSERT INTO audit_entries', { rows: [], rowCount: 1 });

    const entry = await store.append('reputation', {
      entry_id: 'new-001',
      timestamp: '2026-02-28T00:00:00Z',
      event_type: 'governance.reputation.create',
    });

    expect(entry.hash_domain_tag).toBe('loa-dixie:audit:reputation:v10');
  });

  it('computes entry hash using canonical algorithm', async () => {
    pool._setResponse('INSERT INTO audit_entries', { rows: [], rowCount: 1 });

    const entry = await store.append('reputation', {
      entry_id: 'new-002',
      timestamp: '2026-02-28T00:00:00Z',
      event_type: 'governance.reputation.create',
    });

    // Canonical mock returns 'sha256:canonical_...' pattern
    expect(entry.entry_hash).toContain('sha256:canonical_');
    // v9 would produce 'sha256:chain_sha256:content_...' pattern
    expect(entry.entry_hash).not.toContain('sha256:chain_');
  });

  it('canonical hash links to previous entry in chain', async () => {
    const previousHash = 'sha256:existing_tip_hash_12345678';
    pool._setResponse('SELECT entry_hash', {
      rows: [{ entry_hash: previousHash }],
      rowCount: 1,
    });
    pool._setResponse('INSERT INTO audit_entries', { rows: [], rowCount: 1 });

    const entry = await store.append('reputation', {
      entry_id: 'new-003',
      timestamp: '2026-02-28T01:00:00Z',
      event_type: 'governance.reputation.update',
    });

    expect(entry.previous_hash).toBe(previousHash);
    expect(entry.entry_hash).toBe(
      expectedCanonicalHash('new-003', 'reputation', previousHash),
    );
  });
});
