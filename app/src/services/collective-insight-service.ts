/**
 * Collective Insight Service — Cross-Agent Insight Propagation
 *
 * Harvests insights from running agents (via git commit analysis) and makes
 * them available to other agents working on related tasks. Uses keyword-based
 * relevance scoring to surface the most useful cross-agent discoveries.
 *
 * Architecture:
 * - In-memory InsightPool (bounded Map, FIFO eviction at capacity)
 * - PostgreSQL persistence (fleet_insights table)
 * - Keyword extraction from commit messages with stopword filtering
 * - Relevance scoring via Jaccard-like keyword intersection
 *
 * Invariants:
 * - INV-021: InsightPool capped at 1000 entries
 * - INV-022: getRelevantInsights returns max 5 results
 * - INV-024: groupId filtering for meeting geometry scoping
 *
 * @since cycle-013 — Sprint 95, CollectiveInsightService
 */

import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import type { DbPool } from '../db/client.js';
import type { AgentInsight } from '../types/insight.js';
import { extractKeywords } from '../utils/keyword-extract.js';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of insights retained in the in-memory pool (INV-021). */
const MAX_POOL_SIZE = 1000;

/** Maximum results returned by getRelevantInsights (INV-022). */
const MAX_RELEVANT_RESULTS = 5;

/** Default number of relevant insights to return. */
const DEFAULT_RELEVANT_LIMIT = 3;

/** Minimum relevance score for an insight to be considered relevant. */
const RELEVANCE_THRESHOLD = 0.2;

/** Default insight TTL in milliseconds (4 hours). */
const INSIGHT_TTL_MS = 4 * 60 * 60 * 1000;

// Keyword extraction is now shared — see ../utils/keyword-extract.ts

// ---------------------------------------------------------------------------
// InsightPool — Bounded In-Memory Store
// ---------------------------------------------------------------------------

/**
 * Bounded in-memory insight store with FIFO eviction.
 *
 * When the pool reaches MAX_POOL_SIZE, the oldest insight (by capturedAt)
 * is evicted to make room for new entries.
 *
 * @since cycle-013 — Sprint 95
 */
export class InsightPool {
  private readonly entries: Map<string, AgentInsight> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number = MAX_POOL_SIZE) {
    this.maxSize = maxSize;
  }

  /**
   * Add an insight to the pool. If at capacity, evicts the oldest
   * entry by capturedAt (FIFO).
   *
   * @since cycle-013 — Sprint 95
   */
  add(insight: AgentInsight): void {
    if (this.entries.has(insight.id)) {
      // Replace existing entry (no capacity change)
      this.entries.set(insight.id, insight);
      return;
    }

    if (this.entries.size >= this.maxSize) {
      this.evictOldest();
    }

    this.entries.set(insight.id, insight);
  }

  /**
   * Get an insight by ID. Returns null if not found.
   *
   * @since cycle-013 — Sprint 95
   */
  get(id: string): AgentInsight | null {
    return this.entries.get(id) ?? null;
  }

  /**
   * Return all insights as an array.
   *
   * @since cycle-013 — Sprint 95
   */
  getAll(): AgentInsight[] {
    return Array.from(this.entries.values());
  }

  /**
   * Remove an insight by ID.
   *
   * @since cycle-013 — Sprint 95
   */
  remove(id: string): boolean {
    return this.entries.delete(id);
  }

  /** Current number of insights in the pool. */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Remove all insights from the pool.
   *
   * @since cycle-013 — Sprint 95
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Evict the oldest insight by capturedAt timestamp.
   * @internal
   */
  private evictOldest(): void {
    let oldestId: string | null = null;
    let oldestTime: string | null = null;

    for (const [id, insight] of this.entries) {
      if (oldestTime === null || insight.capturedAt < oldestTime) {
        oldestTime = insight.capturedAt;
        oldestId = id;
      }
    }

    if (oldestId !== null) {
      this.entries.delete(oldestId);
    }
  }
}

// ---------------------------------------------------------------------------
// Pool Stats
// ---------------------------------------------------------------------------

/** Statistics about the current InsightPool state. */
export interface PoolStats {
  readonly count: number;
  readonly totalSizeBytes: number;
  readonly oldestCapturedAt: string | null;
  readonly newestCapturedAt: string | null;
}

// ---------------------------------------------------------------------------
// Keyword Extraction (re-exported from shared utility)
// ---------------------------------------------------------------------------

export { extractKeywords } from '../utils/keyword-extract.js';

// ---------------------------------------------------------------------------
// CollectiveInsightService
// ---------------------------------------------------------------------------

/**
 * Service for harvesting, storing, and querying cross-agent insights.
 *
 * Usage:
 * ```ts
 * const service = new CollectiveInsightService({ pool: dbPool });
 * const insight = await service.harvest('task-42', '/path/to/worktree');
 * const relevant = service.getRelevantInsights('implement auth feature');
 * ```
 *
 * @since cycle-013 — Sprint 95
 */
export class CollectiveInsightService {
  private readonly pool: DbPool;
  private readonly insightPool: InsightPool;
  private readonly log?: (level: 'error' | 'warn' | 'info', data: Record<string, unknown>) => void;

  constructor(opts: {
    pool: DbPool;
    insightPool?: InsightPool;
    log?: (level: 'error' | 'warn' | 'info', data: Record<string, unknown>) => void;
  }) {
    this.pool = opts.pool;
    this.insightPool = opts.insightPool ?? new InsightPool();
    this.log = opts.log;
  }

  // -------------------------------------------------------------------------
  // In-Memory Pool Access
  // -------------------------------------------------------------------------

  /** Direct access to the underlying InsightPool for testing/diagnostics. */
  get poolRef(): InsightPool {
    return this.insightPool;
  }

  // -------------------------------------------------------------------------
  // DB Persistence
  // -------------------------------------------------------------------------

  /**
   * Persist an insight to the fleet_insights table.
   *
   * @since cycle-013 — Sprint 95
   */
  async persist(insight: AgentInsight): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO fleet_insights (id, source_task_id, source_agent_id, group_id, content, keywords, relevance_context, captured_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE
           SET content = EXCLUDED.content,
               keywords = EXCLUDED.keywords,
               expires_at = EXCLUDED.expires_at`,
        [
          insight.id,
          insight.sourceTaskId,
          insight.sourceAgentId,
          insight.groupId,
          insight.content,
          JSON.stringify(insight.keywords),
          insight.relevanceContext,
          insight.capturedAt,
          insight.expiresAt,
        ],
      );
    } catch (err) {
      this.log?.('error', {
        event: 'insight_persist_failed',
        insightId: insight.id,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Load insights from the database into the in-memory pool.
   *
   * @param limit - Maximum number of insights to load (default: 1000)
   * @since cycle-013 — Sprint 95
   */
  async loadFromDb(limit: number = MAX_POOL_SIZE): Promise<AgentInsight[]> {
    const result = await this.pool.query<{
      id: string;
      source_task_id: string;
      source_agent_id: string;
      group_id: string | null;
      content: string;
      keywords: string;
      relevance_context: string;
      captured_at: string;
      expires_at: string;
    }>(
      `SELECT id, source_task_id, source_agent_id, group_id, content, keywords, relevance_context, captured_at, expires_at
       FROM fleet_insights
       ORDER BY captured_at DESC
       LIMIT $1`,
      [limit],
    );

    const insights: AgentInsight[] = result.rows.map((row) => ({
      id: row.id,
      sourceTaskId: row.source_task_id,
      sourceAgentId: row.source_agent_id,
      groupId: row.group_id,
      content: row.content,
      keywords: JSON.parse(row.keywords),
      relevanceContext: row.relevance_context,
      capturedAt: row.captured_at,
      expiresAt: row.expires_at,
    }));

    for (const insight of insights) {
      this.insightPool.add(insight);
    }

    return insights;
  }

  /**
   * Remove expired insights from the database.
   *
   * @since cycle-013 — Sprint 95
   */
  async pruneExpiredFromDb(): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM fleet_insights WHERE expires_at < NOW()`,
    );
    return result.rowCount ?? 0;
  }

  // -------------------------------------------------------------------------
  // Harvest
  // -------------------------------------------------------------------------

  /**
   * Harvest an insight from a task's worktree by analyzing recent commits.
   *
   * Reads the last 5 commit subjects, extracts keywords, and builds an
   * insight with a 4-hour TTL. Gracefully returns null on any error
   * (git failures, empty worktrees, etc.).
   *
   * @param taskId - The task ID to associate the insight with
   * @param worktreePath - Absolute path to the worktree
   * @param agentId - The agent ID that produced the commits (default: 'unknown')
   * @param groupId - Optional meeting geometry group ID
   * @returns The created insight, or null on error
   *
   * @since cycle-013 — Sprint 95
   */
  async harvest(
    taskId: string,
    worktreePath: string,
    agentId: string = 'unknown',
    groupId: string | null = null,
  ): Promise<AgentInsight | null> {
    try {
      const { stdout } = await execFileAsync('git', [
        '-C', worktreePath,
        'log', '--oneline', '-5', '--format=%s',
      ]);

      const lines = stdout.trim().split('\n').filter((l) => l.length > 0);
      if (lines.length === 0) {
        return null;
      }

      const content = lines.join('; ');
      const keywords = extractKeywords(content);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + INSIGHT_TTL_MS);

      const insight: AgentInsight = {
        id: randomUUID(),
        sourceTaskId: taskId,
        sourceAgentId: agentId,
        groupId,
        content,
        keywords,
        relevanceContext: `Commits from task ${taskId}`,
        capturedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      this.insightPool.add(insight);

      try {
        await this.persist(insight);
      } catch {
        // Persist failure is non-fatal; insight is still in memory
        this.log?.('warn', {
          event: 'insight_harvest_persist_fallback',
          insightId: insight.id,
          taskId,
        });
      }

      return insight;
    } catch (err) {
      this.log?.('warn', {
        event: 'insight_harvest_failed',
        taskId,
        worktreePath,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Relevance Scoring
  // -------------------------------------------------------------------------

  /**
   * Get insights relevant to a task description, scored by keyword overlap.
   *
   * Relevance = |keywords(insight) intersection keywords(task)| / max(|keywords(task)|, 1)
   *
   * Filtering:
   * - Threshold: only insights with relevance >= 0.2
   * - groupId: if provided, only insights from the same group (INV-024)
   * - groupId null: only insights where groupId is null (factory geometry)
   *
   * @param taskDescription - Description of the task to find insights for
   * @param groupId - Optional group ID filter (null = factory geometry)
   * @param limit - Maximum results (default 3, capped at 5 per INV-022)
   * @returns Insights sorted by relevance descending
   *
   * @since cycle-013 — Sprint 95
   */
  getRelevantInsights(
    taskDescription: string,
    groupId?: string | null,
    limit: number = DEFAULT_RELEVANT_LIMIT,
  ): AgentInsight[] {
    const effectiveLimit = Math.min(limit, MAX_RELEVANT_RESULTS);
    const taskKeywords = extractKeywords(taskDescription);
    const taskKeywordSet = new Set(taskKeywords);
    const denominator = Math.max(taskKeywords.length, 1);

    const scored: Array<{ insight: AgentInsight; relevance: number }> = [];

    for (const insight of this.insightPool.getAll()) {
      // groupId filtering (INV-024)
      if (groupId !== undefined) {
        if (groupId === null) {
          // Factory geometry: only insights with null groupId
          if (insight.groupId !== null) continue;
        } else {
          // Specific group: only insights from same group
          if (insight.groupId !== groupId) continue;
        }
      }

      const insightKeywordSet = new Set(insight.keywords);
      let intersection = 0;
      for (const kw of taskKeywordSet) {
        if (insightKeywordSet.has(kw)) {
          intersection++;
        }
      }

      const relevance = intersection / denominator;
      if (relevance >= RELEVANCE_THRESHOLD) {
        scored.push({ insight, relevance });
      }
    }

    // Sort by relevance descending
    scored.sort((a, b) => b.relevance - a.relevance);

    return scored.slice(0, effectiveLimit).map((s) => s.insight);
  }

  // -------------------------------------------------------------------------
  // Pruning
  // -------------------------------------------------------------------------

  /**
   * Remove expired insights from both pool and database.
   *
   * @returns Number of insights removed from pool
   * @since cycle-013 — Sprint 95
   */
  async pruneExpired(): Promise<number> {
    const now = new Date().toISOString();
    let removed = 0;

    for (const insight of this.insightPool.getAll()) {
      if (insight.expiresAt < now) {
        this.insightPool.remove(insight.id);
        removed++;
      }
    }

    try {
      await this.pruneExpiredFromDb();
    } catch (err) {
      this.log?.('warn', {
        event: 'insight_prune_db_failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return removed;
  }

  /**
   * Remove all insights from a specific task.
   *
   * @param taskId - The task ID whose insights should be removed
   * @returns Number of insights removed
   * @since cycle-013 — Sprint 95
   */
  pruneByTask(taskId: string): number {
    let removed = 0;

    for (const insight of this.insightPool.getAll()) {
      if (insight.sourceTaskId === taskId) {
        this.insightPool.remove(insight.id);
        removed++;
      }
    }

    return removed;
  }

  // -------------------------------------------------------------------------
  // Diagnostics
  // -------------------------------------------------------------------------

  /**
   * Get statistics about the current insight pool state.
   *
   * @since cycle-013 — Sprint 95
   */
  getPoolStats(): PoolStats {
    const all = this.insightPool.getAll();

    if (all.length === 0) {
      return {
        count: 0,
        totalSizeBytes: 0,
        oldestCapturedAt: null,
        newestCapturedAt: null,
      };
    }

    let totalSizeBytes = 0;
    let oldest = all[0].capturedAt;
    let newest = all[0].capturedAt;

    for (const insight of all) {
      totalSizeBytes += JSON.stringify(insight).length;
      if (insight.capturedAt < oldest) {
        oldest = insight.capturedAt;
      }
      if (insight.capturedAt > newest) {
        newest = insight.capturedAt;
      }
    }

    return {
      count: all.length,
      totalSizeBytes,
      oldestCapturedAt: oldest,
      newestCapturedAt: newest,
    };
  }
}
