/**
 * Meeting Geometry Router Unit Tests
 *
 * Tests geometry resolution, group lifecycle, auto-detection based on
 * keyword overlap, and pure helper functions (extractKeywords, overlap).
 *
 * @since cycle-013 — Sprint 98
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MeetingGeometryRouter,
  InvalidGeometryError,
  GroupNotFoundError,
  extractKeywords,
  computeKeywordOverlap,
  isValidGeometry,
} from '../meeting-geometry-router.js';

// ---------------------------------------------------------------------------
// Mock Factory
// ---------------------------------------------------------------------------

function makeGroupRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'group-1',
    geometry: 'jam',
    operator_id: 'op-1',
    created_at: '2026-02-26T00:00:00Z',
    dissolved_at: null,
    ...overrides,
  };
}

function createMockPool() {
  return {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MeetingGeometryRouter', () => {
  let pool: ReturnType<typeof createMockPool>;
  let router: MeetingGeometryRouter;

  beforeEach(() => {
    pool = createMockPool();
    router = new MeetingGeometryRouter(pool as any);
  });

  // -------------------------------------------------------------------------
  // resolveGeometry()
  // -------------------------------------------------------------------------

  describe('resolveGeometry()', () => {
    it('returns explicit geometry as-is', async () => {
      const result = await router.resolveGeometry({ geometry: 'jam' });

      expect(result.geometry).toBe('jam');
      expect(result.autoDetected).toBe(false);
    });

    it('returns explicit geometry with groupId when both provided', async () => {
      const result = await router.resolveGeometry({
        geometry: 'study_group',
        groupId: 'group-42',
      });

      expect(result.geometry).toBe('study_group');
      expect(result.groupId).toBe('group-42');
      expect(result.autoDetected).toBe(false);
    });

    it('returns factory geometry explicitly when requested', async () => {
      const result = await router.resolveGeometry({ geometry: 'factory' });

      expect(result.geometry).toBe('factory');
      expect(result.autoDetected).toBe(false);
    });

    it('throws InvalidGeometryError for invalid geometry', async () => {
      await expect(
        router.resolveGeometry({ geometry: 'invalid' as any }),
      ).rejects.toThrow(InvalidGeometryError);
    });

    it('looks up group when groupId is provided without geometry', async () => {
      // First query: SELECT group
      pool.query
        .mockResolvedValueOnce({ rows: [makeGroupRow()] })
        // Second query: SELECT task IDs
        .mockResolvedValueOnce({ rows: [{ id: 'task-1' }, { id: 'task-2' }] });

      const result = await router.resolveGeometry({ groupId: 'group-1' });

      expect(result.geometry).toBe('jam');
      expect(result.groupId).toBe('group-1');
      expect(result.autoDetected).toBe(false);
    });

    it('throws GroupNotFoundError when groupId does not exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        router.resolveGeometry({ groupId: 'nonexistent' }),
      ).rejects.toThrow(GroupNotFoundError);
    });

    it('returns factory with null groupId as default', async () => {
      const result = await router.resolveGeometry({});

      expect(result.geometry).toBe('factory');
      expect(result.groupId).toBeNull();
      expect(result.autoDetected).toBe(false);
    });

    it('returns factory default when both geometry and groupId are undefined', async () => {
      const result = await router.resolveGeometry({
        geometry: undefined,
        groupId: undefined,
      });

      expect(result.geometry).toBe('factory');
      expect(result.groupId).toBeNull();
      expect(result.autoDetected).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Group Lifecycle
  // -------------------------------------------------------------------------

  describe('createGroup()', () => {
    it('inserts and returns group with generated ID', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [makeGroupRow({ id: 'group-new', geometry: 'study_group' })],
      });

      const result = await router.createGroup('study_group', 'op-1');

      expect(result.groupId).toBe('group-new');
      expect(result.geometry).toBe('study_group');
      expect(result.operatorId).toBe('op-1');
      expect(result.taskIds).toEqual([]);
      expect(result.dissolvedAt).toBeNull();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO geometry_groups'),
        ['study_group', 'op-1'],
      );
    });

    it('creates jam group', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [makeGroupRow({ geometry: 'jam' })],
      });

      const result = await router.createGroup('jam', 'op-2');

      expect(result.geometry).toBe('jam');
    });
  });

  describe('addToGroup()', () => {
    it('updates task record with group_id', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await router.addToGroup('group-1', 'task-42');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE fleet_tasks SET group_id'),
        ['group-1', 'task-42'],
      );
    });
  });

  describe('getGroup()', () => {
    it('returns group info with task IDs', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [makeGroupRow()] })
        .mockResolvedValueOnce({
          rows: [{ id: 'task-1' }, { id: 'task-2' }, { id: 'task-3' }],
        });

      const result = await router.getGroup('group-1');

      expect(result).not.toBeNull();
      expect(result!.groupId).toBe('group-1');
      expect(result!.geometry).toBe('jam');
      expect(result!.taskIds).toEqual(['task-1', 'task-2', 'task-3']);
      expect(result!.operatorId).toBe('op-1');
    });

    it('returns null when group not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await router.getGroup('nonexistent');

      expect(result).toBeNull();
    });

    it('returns empty taskIds when group has no tasks', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [makeGroupRow()] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await router.getGroup('group-1');

      expect(result!.taskIds).toEqual([]);
    });
  });

  describe('dissolveGroup()', () => {
    it('sets dissolved_at via UPDATE', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await router.dissolveGroup('group-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE geometry_groups SET dissolved_at = NOW()'),
        ['group-1'],
      );
    });
  });

  // -------------------------------------------------------------------------
  // Auto-Detection
  // -------------------------------------------------------------------------

  describe('detectGeometry()', () => {
    it('returns factory when no recent tasks', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await router.detectGeometry('op-1', 'implement user auth');

      expect(result.geometry).toBe('factory');
      expect(result.groupId).toBeNull();
      expect(result.autoDetected).toBe(false);
    });

    it('returns factory when only one recent task (needs >= 2)', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ description: 'implement user auth module' }],
      });

      const result = await router.detectGeometry('op-1', 'implement user auth tests');

      expect(result.geometry).toBe('factory');
      expect(result.groupId).toBeNull();
      expect(result.autoDetected).toBe(false);
    });

    it('returns jam when >= 2 recent tasks with high overlap', async () => {
      // Recent tasks query
      pool.query.mockResolvedValueOnce({
        rows: [
          { description: 'implement user authentication module' },
          { description: 'implement user authentication tests' },
        ],
      });
      // Existing group lookup
      pool.query.mockResolvedValueOnce({ rows: [] });
      // Create new group
      pool.query.mockResolvedValueOnce({
        rows: [makeGroupRow({ id: 'group-auto', geometry: 'jam' })],
      });

      const result = await router.detectGeometry(
        'op-1',
        'implement user authentication validation',
      );

      expect(result.geometry).toBe('jam');
      expect(result.groupId).toBe('group-auto');
      expect(result.autoDetected).toBe(true);
    });

    it('returns factory when recent tasks have low keyword overlap', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { description: 'fix database connection pooling' },
          { description: 'update redis cache invalidation' },
        ],
      });

      const result = await router.detectGeometry(
        'op-1',
        'implement user authentication module',
      );

      expect(result.geometry).toBe('factory');
      expect(result.groupId).toBeNull();
      expect(result.autoDetected).toBe(false);
    });

    it('reuses existing undissolved jam group', async () => {
      // Recent tasks
      pool.query.mockResolvedValueOnce({
        rows: [
          { description: 'implement payment processing service' },
          { description: 'implement payment processing tests' },
        ],
      });
      // Existing group found
      pool.query.mockResolvedValueOnce({
        rows: [makeGroupRow({ id: 'group-existing', geometry: 'jam' })],
      });

      const result = await router.detectGeometry(
        'op-1',
        'implement payment processing validation',
      );

      expect(result.geometry).toBe('jam');
      expect(result.groupId).toBe('group-existing');
      expect(result.autoDetected).toBe(true);
    });

    it('queries with excluded statuses', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await router.detectGeometry('op-1', 'test task');

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('status NOT IN');
      expect(params).toContain('merged');
      expect(params).toContain('abandoned');
      expect(params).toContain('cancelled');
      expect(params).toContain('rejected');
      expect(params).toContain('failed');
    });

    it('queries with operator_id and parameterized time window (BF-013)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await router.detectGeometry('op-42', 'some task');

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('operator_id = $1');
      expect(sql).toContain("INTERVAL '1 minute'");
      expect(sql).toContain('$2');
      expect(params[0]).toBe('op-42');
      expect(params[1]).toBe(5); // DETECTION_WINDOW_MINUTES bound parameter
    });

    it('handles overlap at exactly 30% threshold', async () => {
      // Construct descriptions where overlap is exactly 30%
      // Current: 10 unique keywords, 3 overlap = 30%
      const current = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet';
      const overlapping = 'alpha bravo charlie kilo lima mike november oscar papa quebec';

      pool.query.mockResolvedValueOnce({
        rows: [
          { description: overlapping },
          { description: overlapping },
        ],
      });
      // No existing group
      pool.query.mockResolvedValueOnce({ rows: [] });
      // Create new group
      pool.query.mockResolvedValueOnce({
        rows: [makeGroupRow({ id: 'group-threshold' })],
      });

      const result = await router.detectGeometry('op-1', current);

      expect(result.geometry).toBe('jam');
      expect(result.autoDetected).toBe(true);
    });

    it('returns factory when overlap is just below 30%', async () => {
      // Current: 10 unique keywords, 2 overlap = 20%
      const current = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet';
      const lowOverlap = 'alpha bravo kilo lima mike november oscar papa quebec romeo';

      pool.query.mockResolvedValueOnce({
        rows: [
          { description: lowOverlap },
          { description: lowOverlap },
        ],
      });

      const result = await router.detectGeometry('op-1', current);

      expect(result.geometry).toBe('factory');
      expect(result.autoDetected).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// extractKeywords — Pure Function Tests
// ---------------------------------------------------------------------------

describe('extractKeywords()', () => {
  it('splits on whitespace', () => {
    const result = extractKeywords('implement user authentication');

    expect(result).toContain('implement');
    expect(result).toContain('user');
    expect(result).toContain('authentication');
  });

  it('filters stopwords', () => {
    const result = extractKeywords('the user is not authenticated and should be rejected');

    expect(result).not.toContain('the');
    expect(result).not.toContain('is');
    expect(result).not.toContain('not');
    expect(result).not.toContain('and');
    expect(result).not.toContain('be');
    expect(result).toContain('user');
    expect(result).toContain('authenticated');
    expect(result).toContain('rejected');
  });

  it('filters short words (< 3 chars)', () => {
    const result = extractKeywords('go do it up on at');

    expect(result).toHaveLength(0);
  });

  it('lowercases all tokens', () => {
    const result = extractKeywords('Implement USER Authentication');

    expect(result).toContain('implement');
    expect(result).toContain('user');
    expect(result).toContain('authentication');
    expect(result).not.toContain('Implement');
    expect(result).not.toContain('USER');
  });

  it('deduplicates keywords', () => {
    const result = extractKeywords('user user user authentication authentication');

    expect(result.filter((k) => k === 'user')).toHaveLength(1);
    expect(result.filter((k) => k === 'authentication')).toHaveLength(1);
  });

  it('splits on common punctuation', () => {
    const result = extractKeywords('implement:authentication,validation.module');

    expect(result).toContain('implement');
    expect(result).toContain('authentication');
    expect(result).toContain('validation');
    expect(result).toContain('module');
  });

  it('handles empty string', () => {
    const result = extractKeywords('');

    expect(result).toEqual([]);
  });

  it('handles string with only stopwords and short words', () => {
    const result = extractKeywords('the is a of to in on at by');

    expect(result).toEqual([]);
  });

  it('handles hyphens and underscores as separators', () => {
    const result = extractKeywords('user-authentication_module');

    expect(result).toContain('user');
    expect(result).toContain('authentication');
    expect(result).toContain('module');
  });
});

// ---------------------------------------------------------------------------
// computeKeywordOverlap — Pure Function Tests
// ---------------------------------------------------------------------------

describe('computeKeywordOverlap()', () => {
  it('returns 1.0 for identical keyword sets', () => {
    const keywords = ['user', 'authentication', 'module'];

    expect(computeKeywordOverlap(keywords, keywords)).toBe(1.0);
  });

  it('returns 0 for completely disjoint sets', () => {
    const current = ['user', 'authentication'];
    const other = ['database', 'migration'];

    expect(computeKeywordOverlap(current, other)).toBe(0);
  });

  it('returns correct ratio for partial overlap', () => {
    const current = ['user', 'authentication', 'module', 'service'];
    const other = ['user', 'authentication', 'testing'];

    // 2 overlap / 4 current = 0.5
    expect(computeKeywordOverlap(current, other)).toBe(0.5);
  });

  it('returns 0 for empty current keywords', () => {
    expect(computeKeywordOverlap([], ['user', 'auth'])).toBe(0);
  });

  it('returns 0 when other is empty', () => {
    expect(computeKeywordOverlap(['user', 'auth'], [])).toBe(0);
  });

  it('uses current length as denominator', () => {
    const current = ['alpha', 'bravo'];
    const other = ['alpha', 'bravo', 'charlie', 'delta'];

    // 2 overlap / 2 current = 1.0
    expect(computeKeywordOverlap(current, other)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// isValidGeometry — Pure Function Tests
// ---------------------------------------------------------------------------

describe('isValidGeometry()', () => {
  it('returns true for factory', () => {
    expect(isValidGeometry('factory')).toBe(true);
  });

  it('returns true for jam', () => {
    expect(isValidGeometry('jam')).toBe(true);
  });

  it('returns true for study_group', () => {
    expect(isValidGeometry('study_group')).toBe(true);
  });

  it('returns false for unknown geometry', () => {
    expect(isValidGeometry('circle')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidGeometry('')).toBe(false);
  });
});
