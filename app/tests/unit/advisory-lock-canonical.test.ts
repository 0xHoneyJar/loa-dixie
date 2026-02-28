/**
 * Advisory Lock Canonical Migration Tests — Sprint 122, Task T7.2
 *
 * Validates:
 * - computeAdvisoryLockKey returns valid 32-bit signed integer for 'dixie-bff:migration'
 * - Lock key is passed to pg_advisory_lock during migration
 * - Documents old→new lock ID mapping for operational awareness
 *
 * @since cycle-019 Sprint 122 — T7.2
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeAdvisoryLockKey } from '@0xhoneyjar/loa-hounfour/commons';
import { createHash } from 'node:crypto';

// Mock fs/promises (required by migrate module)
vi.mock('node:fs/promises', () => ({
  readdir: vi.fn().mockResolvedValue([]),
  readFile: vi.fn(),
}));

import { migrate } from '../../src/db/migrate.js';
import { createMockPool } from '../fixtures/pg-test.js';

// ---------------------------------------------------------------------------
// computeAdvisoryLockKey — canonical FNV-1a 32-bit signed
// ---------------------------------------------------------------------------

describe('computeAdvisoryLockKey (canonical)', () => {
  it('returns a valid 32-bit signed integer for dixie migration key', () => {
    const key = computeAdvisoryLockKey('dixie-bff:migration');
    expect(typeof key).toBe('number');
    expect(Number.isInteger(key)).toBe(true);
    // 32-bit signed integer range: -2^31 to 2^31 - 1
    expect(key).toBeGreaterThanOrEqual(-2_147_483_648);
    expect(key).toBeLessThanOrEqual(2_147_483_647);
  });

  it('is deterministic (same input → same output)', () => {
    const key1 = computeAdvisoryLockKey('dixie-bff:migration');
    const key2 = computeAdvisoryLockKey('dixie-bff:migration');
    expect(key1).toBe(key2);
  });

  it('differs from other app domains (collision resistance)', () => {
    const dixieKey = computeAdvisoryLockKey('dixie-bff:migration');
    const finnKey = computeAdvisoryLockKey('finn:migration');
    expect(dixieKey).not.toBe(finnKey);
  });
});

// ---------------------------------------------------------------------------
// Old → New lock ID mapping documentation
// ---------------------------------------------------------------------------

describe('Lock ID migration documentation', () => {
  /**
   * Documents the lock ID change for operational awareness.
   *
   * OLD (Sprint 105): SHA-256 first 4 bytes → 31-bit unsigned
   *   computeLockId('dixie-bff:migration') → SHA-256 & 0x7FFFFFFF
   *
   * NEW (Sprint 122): FNV-1a 32-bit signed
   *   computeAdvisoryLockKey('dixie-bff:migration') → FNV-1a | 0
   *
   * Both are valid PostgreSQL bigint advisory lock parameters.
   * The change is safe because advisory locks prevent concurrent migrations
   * (single-writer), and blue-green deploy ensures atomic cutover.
   */
  it('old and new lock IDs differ (expected during migration)', () => {
    // Reproduce the OLD algorithm (SHA-256 → 31-bit unsigned)
    const oldHash = createHash('sha256').update('dixie-bff:migration').digest();
    const oldLockId = oldHash.readUInt32BE(0) & 0x7FFFFFFF;

    // NEW algorithm (canonical FNV-1a 32-bit signed)
    const newLockId = computeAdvisoryLockKey('dixie-bff:migration');

    // They MUST differ — different algorithms
    expect(oldLockId).not.toBe(newLockId);

    // Both are valid for pg_advisory_lock
    expect(Number.isInteger(oldLockId)).toBe(true);
    expect(Number.isInteger(newLockId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// migrate() — passes canonical lock key to pg_advisory_lock
// ---------------------------------------------------------------------------

describe('migrate() advisory lock integration', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    pool = createMockPool();
    vi.clearAllMocks();

    pool._setResponse('SELECT filename, checksum', {
      rows: [],
      rowCount: 0,
    });
  });

  it('passes canonical lock key to pg_advisory_lock', async () => {
    pool._mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

    await migrate(pool as unknown as import('../../src/db/client.js').DbPool);

    // Find the pg_advisory_lock call
    const lockCall = pool._mockClient.query.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('pg_advisory_lock('),
    );
    expect(lockCall).toBeDefined();

    // Verify the lock ID matches canonical computation
    const expectedLockId = computeAdvisoryLockKey('dixie-bff:migration');
    expect(lockCall![1]).toEqual([expectedLockId]);
  });

  it('passes canonical lock key to pg_advisory_unlock on cleanup', async () => {
    pool._mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

    await migrate(pool as unknown as import('../../src/db/client.js').DbPool);

    // Find the pg_advisory_unlock call
    const unlockCall = pool._mockClient.query.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('pg_advisory_unlock('),
    );
    expect(unlockCall).toBeDefined();

    const expectedLockId = computeAdvisoryLockKey('dixie-bff:migration');
    expect(unlockCall![1]).toEqual([expectedLockId]);
  });
});
