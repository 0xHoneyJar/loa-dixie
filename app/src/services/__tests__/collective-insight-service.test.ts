/**
 * Collective Insight Service Unit Tests
 *
 * Tests InsightPool bounds, harvest mechanics, relevance scoring,
 * group filtering, pruning, and pool statistics.
 *
 * @since cycle-013 — Sprint 95, CollectiveInsightService
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

import {
  InsightPool,
  CollectiveInsightService,
  extractKeywords,
} from '../collective-insight-service.js';
import type { AgentInsight } from '../../types/insight.js';

// ---------------------------------------------------------------------------
// Mock: child_process.execFile
// ---------------------------------------------------------------------------

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

// We need the promisified version to actually resolve, so mock at the
// module level. The import above mocks the raw execFile; promisify wraps it.
// vitest replaces the module, so we import after mock setup.
import { execFile } from 'node:child_process';

const mockExecFile = execFile as unknown as Mock;

/**
 * Helper: make execFile call the callback with given stdout.
 * promisify(execFile) expects (cmd, args, cb) where cb = (err, {stdout, stderr}).
 */
function mockExecFileSuccess(stdout: string): void {
  mockExecFile.mockImplementation(
    (_cmd: string, _args: string[], cb: (err: Error | null, result: { stdout: string; stderr: string }) => void) => {
      cb(null, { stdout, stderr: '' });
    },
  );
}

function mockExecFileFailure(error: Error): void {
  mockExecFile.mockImplementation(
    (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
      cb(error);
    },
  );
}

// ---------------------------------------------------------------------------
// Mock: DbPool
// ---------------------------------------------------------------------------

function createMockPool() {
  return {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInsight(overrides: Partial<AgentInsight> = {}): AgentInsight {
  return {
    id: 'insight-1',
    sourceTaskId: 'task-1',
    sourceAgentId: 'agent-1',
    groupId: null,
    content: 'implement auth service',
    keywords: ['implement', 'auth', 'service'],
    relevanceContext: 'Commits from task task-1',
    capturedAt: '2026-02-26T00:00:00.000Z',
    expiresAt: '2026-02-26T04:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// extractKeywords — Pure Function Tests
// ---------------------------------------------------------------------------

describe('extractKeywords', () => {
  it('lowercases and splits on non-word boundaries', () => {
    const result = extractKeywords('Hello World');
    expect(result).toEqual(['hello', 'world']);
  });

  it('filters stopwords', () => {
    const result = extractKeywords('the quick and dirty fix for the bug');
    expect(result).not.toContain('the');
    expect(result).not.toContain('and');
    expect(result).not.toContain('for');
    expect(result).toContain('quick');
    expect(result).toContain('dirty');
    expect(result).toContain('fix');
    expect(result).toContain('bug');
  });

  it('deduplicates keywords', () => {
    const result = extractKeywords('fix the fix again fix');
    expect(result).toEqual(['fix', 'again']);
  });

  it('handles empty string', () => {
    const result = extractKeywords('');
    expect(result).toEqual([]);
  });

  it('handles string with only stopwords', () => {
    const result = extractKeywords('the a an is are');
    expect(result).toEqual([]);
  });

  it('splits on special characters', () => {
    const result = extractKeywords('feat(auth): add login-flow');
    expect(result).toContain('feat');
    expect(result).toContain('auth');
    expect(result).toContain('add');
    expect(result).toContain('login');
    expect(result).toContain('flow');
  });
});

// ---------------------------------------------------------------------------
// InsightPool Tests
// ---------------------------------------------------------------------------

describe('InsightPool', () => {
  let pool: InsightPool;

  beforeEach(() => {
    pool = new InsightPool();
  });

  describe('basic operations', () => {
    it('add and get an insight', () => {
      const insight = makeInsight();
      pool.add(insight);

      expect(pool.get('insight-1')).toEqual(insight);
      expect(pool.size).toBe(1);
    });

    it('get returns null for missing ID', () => {
      expect(pool.get('nonexistent')).toBeNull();
    });

    it('getAll returns all insights', () => {
      pool.add(makeInsight({ id: 'a' }));
      pool.add(makeInsight({ id: 'b' }));

      const all = pool.getAll();
      expect(all).toHaveLength(2);
    });

    it('remove deletes an insight', () => {
      pool.add(makeInsight());
      expect(pool.remove('insight-1')).toBe(true);
      expect(pool.get('insight-1')).toBeNull();
      expect(pool.size).toBe(0);
    });

    it('remove returns false for missing ID', () => {
      expect(pool.remove('nonexistent')).toBe(false);
    });

    it('clear removes all insights', () => {
      pool.add(makeInsight({ id: 'a' }));
      pool.add(makeInsight({ id: 'b' }));
      pool.clear();

      expect(pool.size).toBe(0);
      expect(pool.getAll()).toEqual([]);
    });

    it('replacing existing insight does not change size', () => {
      pool.add(makeInsight({ id: 'x', content: 'original' }));
      pool.add(makeInsight({ id: 'x', content: 'updated' }));

      expect(pool.size).toBe(1);
      expect(pool.get('x')!.content).toBe('updated');
    });
  });

  describe('INV-021: pool capacity bounds', () => {
    it('caps at 1000 entries (default max)', () => {
      const bigPool = new InsightPool(1000);

      for (let i = 0; i < 1001; i++) {
        bigPool.add(
          makeInsight({
            id: `insight-${i}`,
            capturedAt: new Date(Date.now() + i * 1000).toISOString(),
          }),
        );
      }

      expect(bigPool.size).toBe(1000);
    });

    it('evicts oldest by capturedAt when at capacity (FIFO)', () => {
      const smallPool = new InsightPool(3);

      smallPool.add(makeInsight({ id: 'oldest', capturedAt: '2026-02-26T00:00:00Z' }));
      smallPool.add(makeInsight({ id: 'middle', capturedAt: '2026-02-26T01:00:00Z' }));
      smallPool.add(makeInsight({ id: 'newest', capturedAt: '2026-02-26T02:00:00Z' }));

      // Pool is full (3/3). Adding one more should evict 'oldest'
      smallPool.add(makeInsight({ id: 'extra', capturedAt: '2026-02-26T03:00:00Z' }));

      expect(smallPool.size).toBe(3);
      expect(smallPool.get('oldest')).toBeNull();
      expect(smallPool.get('middle')).not.toBeNull();
      expect(smallPool.get('newest')).not.toBeNull();
      expect(smallPool.get('extra')).not.toBeNull();
    });

    it('add 1001 entries to default pool, verify capped at 1000', () => {
      // Use default max (1000)
      for (let i = 0; i < 1001; i++) {
        pool.add(
          makeInsight({
            id: `ins-${i}`,
            capturedAt: new Date(1700000000000 + i * 1000).toISOString(),
          }),
        );
      }

      expect(pool.size).toBe(1000);
      // The first (oldest) should have been evicted
      expect(pool.get('ins-0')).toBeNull();
      // The latest should still be present
      expect(pool.get('ins-1000')).not.toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// CollectiveInsightService Tests
// ---------------------------------------------------------------------------

describe('CollectiveInsightService', () => {
  let dbPool: ReturnType<typeof createMockPool>;
  let service: CollectiveInsightService;

  beforeEach(() => {
    dbPool = createMockPool();
    service = new CollectiveInsightService({ pool: dbPool as any });
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Harvest
  // -------------------------------------------------------------------------

  describe('harvest()', () => {
    it('harvests insight from git commit messages', async () => {
      mockExecFileSuccess('feat: add auth service\nfix: login validation\nchore: update deps\n');
      dbPool.query.mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await service.harvest('task-42', '/tmp/worktree');

      expect(result).not.toBeNull();
      expect(result!.sourceTaskId).toBe('task-42');
      expect(result!.content).toContain('feat');
      expect(result!.content).toContain('auth');
      expect(result!.keywords.length).toBeGreaterThan(0);
      // BF-023: Deterministic ID = taskId-hourBucket
      expect(result!.id).toMatch(/^task-42-\d+$/);
      expect(service.poolRef.size).toBe(1);
    });

    it('sets expiresAt to ~4 hours from capturedAt', async () => {
      mockExecFileSuccess('feat: implement feature\n');
      dbPool.query.mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await service.harvest('task-1', '/tmp/wt');

      expect(result).not.toBeNull();
      const captured = new Date(result!.capturedAt).getTime();
      const expires = new Date(result!.expiresAt).getTime();
      const fourHoursMs = 4 * 60 * 60 * 1000;
      expect(expires - captured).toBe(fourHoursMs);
    });

    it('passes agentId and groupId through to insight', async () => {
      mockExecFileSuccess('feat: something\n');
      dbPool.query.mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await service.harvest('task-1', '/tmp/wt', 'agent-42', 'group-7');

      expect(result!.sourceAgentId).toBe('agent-42');
      expect(result!.groupId).toBe('group-7');
    });

    it('returns null on git failure (graceful)', async () => {
      mockExecFileFailure(new Error('not a git repository'));

      const result = await service.harvest('task-1', '/invalid/path');

      expect(result).toBeNull();
      expect(service.poolRef.size).toBe(0);
    });

    it('returns null when git log returns empty output', async () => {
      mockExecFileSuccess('');

      const result = await service.harvest('task-1', '/tmp/empty');

      expect(result).toBeNull();
    });

    it('still adds to pool even if DB persist fails', async () => {
      mockExecFileSuccess('feat: resilient harvest\n');
      dbPool.query.mockRejectedValue(new Error('DB down'));

      const result = await service.harvest('task-1', '/tmp/wt');

      expect(result).not.toBeNull();
      expect(service.poolRef.size).toBe(1);
    });

    it('calls git with correct arguments', async () => {
      mockExecFileSuccess('feat: test\n');
      dbPool.query.mockResolvedValue({ rows: [], rowCount: 1 });

      await service.harvest('task-1', '/my/worktree');

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['-C', '/my/worktree', 'log', '--oneline', '-5', '--format=%s'],
        expect.any(Function),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Relevance Scoring
  // -------------------------------------------------------------------------

  describe('getRelevantInsights()', () => {
    beforeEach(() => {
      // Pre-populate pool with diverse insights
      service.poolRef.add(makeInsight({
        id: 'auth-insight',
        content: 'implement auth service with JWT tokens',
        keywords: ['implement', 'auth', 'service', 'jwt', 'tokens'],
        groupId: null,
      }));
      service.poolRef.add(makeInsight({
        id: 'db-insight',
        content: 'add database migration for users table',
        keywords: ['add', 'database', 'migration', 'users', 'table'],
        groupId: null,
      }));
      service.poolRef.add(makeInsight({
        id: 'ui-insight',
        content: 'create react component for dashboard',
        keywords: ['create', 'react', 'component', 'dashboard'],
        groupId: 'group-A',
      }));
    });

    it('returns insights with keyword overlap above threshold', () => {
      const results = service.getRelevantInsights('implement auth tokens');

      expect(results.length).toBeGreaterThan(0);
      // 'auth-insight' shares: implement, auth, tokens (3/3 = 1.0)
      expect(results[0].id).toBe('auth-insight');
    });

    it('scores perfect match highest', () => {
      const results = service.getRelevantInsights('implement auth service jwt tokens');

      expect(results[0].id).toBe('auth-insight');
    });

    it('returns partial matches above threshold', () => {
      // 'database migration' matches db-insight: database, migration (2/2 = 1.0)
      const results = service.getRelevantInsights('database migration');

      expect(results.some((r) => r.id === 'db-insight')).toBe(true);
    });

    it('excludes insights below relevance threshold (0.2)', () => {
      // 'completely unrelated topic xyz' shares no keywords with any insight
      const results = service.getRelevantInsights('completely unrelated topic xyz');

      expect(results).toHaveLength(0);
    });

    it('returns empty array for empty pool', () => {
      const emptyService = new CollectiveInsightService({ pool: dbPool as any });
      const results = emptyService.getRelevantInsights('auth service');

      expect(results).toEqual([]);
    });

    it('sorts by relevance descending', () => {
      // Add another insight with partial auth overlap
      service.poolRef.add(makeInsight({
        id: 'partial-auth',
        content: 'auth middleware setup',
        keywords: ['auth', 'middleware', 'setup'],
        groupId: null,
      }));

      // 'implement auth service' against:
      // auth-insight: implement, auth, service (3/3 = 1.0)
      // partial-auth: auth (1/3 ~ 0.33)
      const results = service.getRelevantInsights('implement auth service');

      expect(results[0].id).toBe('auth-insight');
      if (results.length > 1) {
        expect(results[1].id).toBe('partial-auth');
      }
    });

    it('handles task description with only stopwords gracefully', () => {
      // denominator = max(0, 1) = 1, intersection = 0 → relevance = 0
      const results = service.getRelevantInsights('the is and or but');

      expect(results).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // INV-024: groupId Filtering
  // -------------------------------------------------------------------------

  describe('getRelevantInsights() — groupId filtering (INV-024)', () => {
    beforeEach(() => {
      service.poolRef.clear();
      service.poolRef.add(makeInsight({
        id: 'factory-insight',
        content: 'implement auth service',
        keywords: ['implement', 'auth', 'service'],
        groupId: null,
      }));
      service.poolRef.add(makeInsight({
        id: 'group-a-insight',
        content: 'implement auth middleware',
        keywords: ['implement', 'auth', 'middleware'],
        groupId: 'group-A',
      }));
      service.poolRef.add(makeInsight({
        id: 'group-b-insight',
        content: 'implement auth handler',
        keywords: ['implement', 'auth', 'handler'],
        groupId: 'group-B',
      }));
    });

    it('groupId=null returns only factory geometry insights (groupId is null)', () => {
      const results = service.getRelevantInsights('implement auth', null);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('factory-insight');
    });

    it('groupId="group-A" returns only group-A insights', () => {
      const results = service.getRelevantInsights('implement auth', 'group-A');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('group-a-insight');
    });

    it('groupId=undefined returns all matching insights (no filter)', () => {
      const results = service.getRelevantInsights('implement auth');

      expect(results.length).toBe(3);
    });

    it('groupId with no matching insights returns empty', () => {
      const results = service.getRelevantInsights('implement auth', 'nonexistent-group');

      expect(results).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // INV-022: Limit Parameter (max 5)
  // -------------------------------------------------------------------------

  describe('getRelevantInsights() — limit parameter (INV-022)', () => {
    beforeEach(() => {
      service.poolRef.clear();
      // Add 10 matching insights
      for (let i = 0; i < 10; i++) {
        service.poolRef.add(makeInsight({
          id: `insight-${i}`,
          content: `implement feature ${i}`,
          keywords: ['implement', 'feature', `kw${i}`],
          groupId: null,
        }));
      }
    });

    it('defaults to 3 results', () => {
      const results = service.getRelevantInsights('implement feature');

      expect(results).toHaveLength(3);
    });

    it('respects explicit limit', () => {
      const results = service.getRelevantInsights('implement feature', undefined, 2);

      expect(results).toHaveLength(2);
    });

    it('caps at 5 even if higher limit requested', () => {
      const results = service.getRelevantInsights('implement feature', undefined, 100);

      expect(results).toHaveLength(5);
    });

    it('limit of 1 returns single result', () => {
      const results = service.getRelevantInsights('implement feature', undefined, 1);

      expect(results).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Pruning
  // -------------------------------------------------------------------------

  describe('pruneExpired()', () => {
    it('removes expired insights from pool', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();

      service.poolRef.add(makeInsight({
        id: 'expired',
        expiresAt: pastDate,
      }));
      service.poolRef.add(makeInsight({
        id: 'active',
        expiresAt: futureDate,
      }));

      dbPool.query.mockResolvedValue({ rowCount: 1 });

      const removed = await service.pruneExpired();

      expect(removed).toBe(1);
      expect(service.poolRef.get('expired')).toBeNull();
      expect(service.poolRef.get('active')).not.toBeNull();
    });

    it('also calls pruneExpiredFromDb', async () => {
      dbPool.query.mockResolvedValue({ rowCount: 0 });

      await service.pruneExpired();

      expect(dbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM fleet_insights WHERE expires_at < NOW()'),
      );
    });

    it('survives DB failure during prune', async () => {
      dbPool.query.mockRejectedValue(new Error('DB down'));

      const removed = await service.pruneExpired();

      expect(removed).toBe(0);
    });
  });

  describe('pruneByTask()', () => {
    it('removes all insights for a specific task', () => {
      service.poolRef.add(makeInsight({ id: 'a', sourceTaskId: 'task-42' }));
      service.poolRef.add(makeInsight({ id: 'b', sourceTaskId: 'task-42' }));
      service.poolRef.add(makeInsight({ id: 'c', sourceTaskId: 'task-99' }));

      const removed = service.pruneByTask('task-42');

      expect(removed).toBe(2);
      expect(service.poolRef.size).toBe(1);
      expect(service.poolRef.get('c')).not.toBeNull();
    });

    it('returns 0 when no insights match the task', () => {
      service.poolRef.add(makeInsight({ id: 'a', sourceTaskId: 'task-1' }));

      const removed = service.pruneByTask('nonexistent');

      expect(removed).toBe(0);
      expect(service.poolRef.size).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // DB Persistence
  // -------------------------------------------------------------------------

  describe('persist()', () => {
    it('inserts insight into fleet_insights table', async () => {
      dbPool.query.mockResolvedValue({ rows: [], rowCount: 1 });

      const insight = makeInsight();
      await service.persist(insight);

      expect(dbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fleet_insights'),
        expect.arrayContaining([insight.id, insight.sourceTaskId]),
      );
    });

    it('throws on DB error', async () => {
      dbPool.query.mockRejectedValue(new Error('constraint violation'));

      await expect(service.persist(makeInsight())).rejects.toThrow('constraint violation');
    });
  });

  describe('loadFromDb()', () => {
    it('loads insights and adds them to pool', async () => {
      dbPool.query.mockResolvedValue({
        rows: [
          {
            id: 'db-insight-1',
            source_task_id: 'task-1',
            source_agent_id: 'agent-1',
            group_id: null,
            content: 'from database',
            keywords: ['database', 'content'],
            relevance_context: 'test',
            captured_at: '2026-02-26T00:00:00Z',
            expires_at: '2026-02-26T04:00:00Z',
          },
        ],
      });

      const insights = await service.loadFromDb();

      expect(insights).toHaveLength(1);
      expect(insights[0].id).toBe('db-insight-1');
      expect(insights[0].keywords).toEqual(['database', 'content']);
      expect(service.poolRef.size).toBe(1);
    });

    it('passes limit to SQL query', async () => {
      dbPool.query.mockResolvedValue({ rows: [] });

      await service.loadFromDb(50);

      expect(dbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [50],
      );
    });
  });

  describe('pruneExpiredFromDb()', () => {
    it('deletes expired rows from database', async () => {
      dbPool.query.mockResolvedValue({ rowCount: 3 });

      const count = await service.pruneExpiredFromDb();

      expect(count).toBe(3);
      expect(dbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM fleet_insights WHERE expires_at < NOW()'),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Pool Stats
  // -------------------------------------------------------------------------

  describe('getPoolStats()', () => {
    it('returns zeros for empty pool', () => {
      const stats = service.getPoolStats();

      expect(stats.count).toBe(0);
      expect(stats.totalSizeBytes).toBe(0);
      expect(stats.oldestCapturedAt).toBeNull();
      expect(stats.newestCapturedAt).toBeNull();
    });

    it('returns correct stats for populated pool', () => {
      service.poolRef.add(makeInsight({
        id: 'old',
        capturedAt: '2026-02-26T00:00:00Z',
      }));
      service.poolRef.add(makeInsight({
        id: 'new',
        capturedAt: '2026-02-26T03:00:00Z',
      }));

      const stats = service.getPoolStats();

      expect(stats.count).toBe(2);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
      expect(stats.oldestCapturedAt).toBe('2026-02-26T00:00:00Z');
      expect(stats.newestCapturedAt).toBe('2026-02-26T03:00:00Z');
    });
  });
});
