/**
 * Hounfour v8.3.1 Compatibility — Integration Test (Real Module, No Mocks)
 *
 * Validates that the v8.3.0 → v8.3.1 dependency bump preserves:
 * 1. buildDomainTag sanitization behavior
 * 2. computeChainBoundHash determinism and output format
 * 3. computeAuditEntryHash determinism
 * 4. verifyAuditTrailIntegrity across mixed domain tag formats
 * 5. @noble/hashes transitive dependency version
 * 6. resourceType validation (Red Team RT-2)
 *
 * @since cycle-021 — Hounfour v8.3.1 Bump (Issue #71)
 * @see SDD v21.0.0 §2.3, §4.3
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildDomainTag,
  computeAuditEntryHash,
  computeChainBoundHash,
  verifyAuditTrailIntegrity,
  AUDIT_TRAIL_GENESIS_HASH,
} from '@0xhoneyjar/loa-hounfour/commons';
import { VALID_RESOURCE_TYPE } from '../../src/services/audit-trail-store.js';

// ---------------------------------------------------------------------------
// 1. buildDomainTag sanitization
// ---------------------------------------------------------------------------

describe('hounfour v8.3.1 — buildDomainTag sanitization', () => {
  it('sanitizes dots to hyphens in version segment', () => {
    const tag = buildDomainTag('ScoringPathLog', '8.2.0');
    expect(tag).toContain('8-2-0');
    expect(tag).not.toContain('8.2.0');
  });

  it('produces consistent lowercase format', () => {
    const tag = buildDomainTag('ScoringPathLog', '8.2.0');
    expect(tag).toBe(tag.toLowerCase());
  });

  it('returns a colon-separated string with expected segments', () => {
    const tag = buildDomainTag('ScoringPathLog', '8.2.0');
    const segments = tag.split(':');
    expect(segments.length).toBeGreaterThanOrEqual(3);
  });

  it('is deterministic (same input → same output)', () => {
    const tag1 = buildDomainTag('ScoringPathLog', '8.2.0');
    const tag2 = buildDomainTag('ScoringPathLog', '8.2.0');
    expect(tag1).toBe(tag2);
  });
});

// ---------------------------------------------------------------------------
// 2. computeChainBoundHash determinism and format
// ---------------------------------------------------------------------------

describe('hounfour v8.3.1 — computeChainBoundHash', () => {
  const sampleEntry = {
    entry_id: 'test-entry-001',
    timestamp: '2026-02-28T12:00:00.000Z',
    event_type: 'test_event',
  };

  const domainTag = 'loa-dixie:audit:test:v10';

  it('produces a string starting with sha256:', () => {
    const hash = computeChainBoundHash(sampleEntry, domainTag, AUDIT_TRAIL_GENESIS_HASH);
    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    const hash1 = computeChainBoundHash(sampleEntry, domainTag, AUDIT_TRAIL_GENESIS_HASH);
    const hash2 = computeChainBoundHash(sampleEntry, domainTag, AUDIT_TRAIL_GENESIS_HASH);
    expect(hash1).toBe(hash2);
  });

  it('changes when previous_hash changes', () => {
    const hash1 = computeChainBoundHash(sampleEntry, domainTag, AUDIT_TRAIL_GENESIS_HASH);
    const hash2 = computeChainBoundHash(sampleEntry, domainTag, 'sha256:' + '0'.repeat(64));
    expect(hash1).not.toBe(hash2);
  });

  it('changes when domain tag changes', () => {
    const hash1 = computeChainBoundHash(sampleEntry, 'loa-dixie:audit:test:v10', AUDIT_TRAIL_GENESIS_HASH);
    const hash2 = computeChainBoundHash(sampleEntry, 'loa-dixie:audit:other:v10', AUDIT_TRAIL_GENESIS_HASH);
    expect(hash1).not.toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// 3. computeAuditEntryHash determinism
// ---------------------------------------------------------------------------

describe('hounfour v8.3.1 — computeAuditEntryHash', () => {
  it('produces a sha256 hash string', () => {
    const hash = computeAuditEntryHash(
      { entry_id: 'e1', timestamp: '2026-02-28T12:00:00.000Z', event_type: 'test' },
      'loa-dixie:audit:test:v10',
    );
    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    const entry = { entry_id: 'e1', timestamp: '2026-02-28T12:00:00.000Z', event_type: 'test' };
    const tag = 'loa-dixie:audit:test:v10';
    expect(computeAuditEntryHash(entry, tag)).toBe(computeAuditEntryHash(entry, tag));
  });
});

// ---------------------------------------------------------------------------
// 4. verifyAuditTrailIntegrity with mixed domain tag formats
// ---------------------------------------------------------------------------

describe('hounfour v8.3.1 — verifyAuditTrailIntegrity (content-hash model)', () => {
  // NOTE: hounfour's verifyAuditTrailIntegrity uses a two-phase model:
  //   Phase 1 (content): entry_hash = computeAuditEntryHash (content-only, no chain binding)
  //   Phase 2 (chain): previous_hash linkage via trail.genesis_hash
  // This differs from Dixie's model where entry_hash is the chain-bound hash.
  // Dixie's audit-trail-store.verifyIntegrity() uses its own version-aware dispatch.

  it('verifies a chain with consistent v10 domain tags', () => {
    const domainTag = 'loa-dixie:audit:test:v10';
    const entry1 = {
      entry_id: 'e1',
      timestamp: '2026-02-28T12:00:00.000Z',
      event_type: 'test_event',
    };
    const contentHash1 = computeAuditEntryHash(entry1, domainTag);

    const trail = {
      domain_tag: domainTag,
      genesis_hash: AUDIT_TRAIL_GENESIS_HASH,
      entries: [
        {
          ...entry1,
          entry_hash: contentHash1,
          previous_hash: AUDIT_TRAIL_GENESIS_HASH,
          hash_domain_tag: domainTag,
        },
      ],
      checkpoints: [],
    };

    const result = verifyAuditTrailIntegrity(trail);
    expect(result.valid).toBe(true);
  });

  it('verifies a multi-entry chain', () => {
    const domainTag = 'loa-dixie:audit:test:v10';

    const entry1 = {
      entry_id: 'e1',
      timestamp: '2026-02-28T12:00:00.000Z',
      event_type: 'test_event',
    };
    const contentHash1 = computeAuditEntryHash(entry1, domainTag);

    const entry2 = {
      entry_id: 'e2',
      timestamp: '2026-02-28T12:01:00.000Z',
      event_type: 'test_event_2',
    };
    const contentHash2 = computeAuditEntryHash(entry2, domainTag);

    const trail = {
      domain_tag: domainTag,
      genesis_hash: AUDIT_TRAIL_GENESIS_HASH,
      entries: [
        {
          ...entry1,
          entry_hash: contentHash1,
          previous_hash: AUDIT_TRAIL_GENESIS_HASH,
          hash_domain_tag: domainTag,
        },
        {
          ...entry2,
          entry_hash: contentHash2,
          previous_hash: contentHash1,
          hash_domain_tag: domainTag,
        },
      ],
      checkpoints: [],
    };

    const result = verifyAuditTrailIntegrity(trail);
    expect(result.valid).toBe(true);
  });

  it('detects tampered entry in chain', () => {
    const domainTag = 'loa-dixie:audit:test:v10';
    const entry1 = {
      entry_id: 'e1',
      timestamp: '2026-02-28T12:00:00.000Z',
      event_type: 'test_event',
    };

    const trail = {
      domain_tag: domainTag,
      genesis_hash: AUDIT_TRAIL_GENESIS_HASH,
      entries: [
        {
          ...entry1,
          entry_hash: 'sha256:' + 'f'.repeat(64), // TAMPERED
          previous_hash: AUDIT_TRAIL_GENESIS_HASH,
          hash_domain_tag: domainTag,
        },
      ],
      checkpoints: [],
    };

    const result = verifyAuditTrailIntegrity(trail);
    expect(result.valid).toBe(false);
  });

  it('rejects chain-bound hash used as entry_hash (model difference proof)', () => {
    // Proves hounfour expects content-only hashes, not Dixie's chain-bound hashes.
    // If this test ever passes, hounfour changed its verification model. (HF831-MED-02)
    const domainTag = 'loa-dixie:audit:test:v10';
    const entry1 = {
      entry_id: 'e1',
      timestamp: '2026-02-28T12:00:00.000Z',
      event_type: 'test_event',
    };
    const chainBoundHash = computeChainBoundHash(entry1, domainTag, AUDIT_TRAIL_GENESIS_HASH);

    const trail = {
      domain_tag: domainTag,
      genesis_hash: AUDIT_TRAIL_GENESIS_HASH,
      entries: [
        {
          ...entry1,
          entry_hash: chainBoundHash, // chain-bound, NOT content-only
          previous_hash: AUDIT_TRAIL_GENESIS_HASH,
          hash_domain_tag: domainTag,
        },
      ],
      checkpoints: [],
    };

    const result = verifyAuditTrailIntegrity(trail);
    // hounfour's verifyAuditTrailIntegrity expects content-only hash
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. @noble/hashes transitive dependency version
// ---------------------------------------------------------------------------

describe('hounfour v8.3.1 — transitive dependency stability', () => {
  // INTENTIONAL exact-version pin: @noble/hashes provides the SHA-256
  // implementation backing all audit chain hashes. A version change could
  // alter hash output, breaking existing stored chains. This test MUST be
  // updated manually on any @noble/hashes bump after verifying hash
  // determinism is preserved. (HF831-MED-04)
  it('@noble/hashes version is 2.0.1 (unchanged from v8.3.0)', () => {
    const lockfilePath = resolve(__dirname, '../../package-lock.json');
    const lockfile = JSON.parse(readFileSync(lockfilePath, 'utf-8'));

    // Check nested @noble/hashes under hounfour (npm lockfile v3 structure)
    const nobleVersion =
      lockfile.packages?.['node_modules/@0xhoneyjar/loa-hounfour/node_modules/@noble/hashes']?.version
      ?? lockfile.packages?.['node_modules/@noble/hashes']?.version;

    expect(nobleVersion).toBe('2.0.1');
  });
});

// ---------------------------------------------------------------------------
// 6. resourceType validation (Red Team RT-2)
// ---------------------------------------------------------------------------

describe('resourceType validation pattern (production regex)', () => {
  // Tests the ACTUAL production regex exported from audit-trail-store (HF831-MED-01)

  it('accepts valid resource types', () => {
    expect(VALID_RESOURCE_TYPE.test('reputation')).toBe(true);
    expect(VALID_RESOURCE_TYPE.test('scoring-path')).toBe(true);
    expect(VALID_RESOURCE_TYPE.test('access-policy')).toBe(true);
    expect(VALID_RESOURCE_TYPE.test('mutation-log')).toBe(true);
  });

  it('rejects colon injection (ATTACK-3)', () => {
    expect(VALID_RESOURCE_TYPE.test('foo:bar')).toBe(false);
    expect(VALID_RESOURCE_TYPE.test('reputation:9.0.0')).toBe(false);
  });

  it('rejects dot injection', () => {
    expect(VALID_RESOURCE_TYPE.test('test.v9.0.0')).toBe(false);
    expect(VALID_RESOURCE_TYPE.test('a.b')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(VALID_RESOURCE_TYPE.test('')).toBe(false);
  });

  it('rejects strings starting with non-alpha', () => {
    expect(VALID_RESOURCE_TYPE.test('1test')).toBe(false);
    expect(VALID_RESOURCE_TYPE.test('-test')).toBe(false);
    expect(VALID_RESOURCE_TYPE.test('_test')).toBe(false);
  });

  it('rejects oversized resource types (>64 chars, HF831-MED-03)', () => {
    const longType = 'a' + 'b'.repeat(64); // 65 chars
    expect(VALID_RESOURCE_TYPE.test(longType)).toBe(false);
    // Max allowed: 64 chars (1 leading + 63 trailing)
    const maxType = 'a' + 'b'.repeat(63); // 64 chars
    expect(VALID_RESOURCE_TYPE.test(maxType)).toBe(true);
  });
});
