/**
 * Meeting Geometry Router — Context-aware collaboration patterns.
 *
 * Three geometries:
 *   factory:     Independent parallel execution (default, no cross-comms)
 *   jam:         Shared InsightPool, real-time discovery sharing
 *   study_group: Structured implement-review rotation
 *
 * Auto-detection: >=2 tasks from same operator with >=30% keyword overlap
 * within 5 minutes suggests 'jam' geometry.
 *
 * @since cycle-013 — Sprint 98
 */
import type { DbPool } from '../db/client.js';
import type { MeetingGeometry, GeometryGroup } from '../types/insight.js';
import { MEETING_GEOMETRIES } from '../types/insight.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum keyword overlap ratio to suggest jam geometry. */
const OVERLAP_THRESHOLD = 0.3;

/** Minimum number of recent tasks required for auto-detection. */
const MIN_RECENT_TASKS = 2;

/** Time window for recent task detection (minutes). */
const DETECTION_WINDOW_MINUTES = 5;

/** Terminal task statuses excluded from auto-detection. */
const EXCLUDED_STATUSES = [
  'merged',
  'abandoned',
  'cancelled',
  'rejected',
  'failed',
] as const;

/** Common English stopwords filtered from keyword extraction. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'to', 'in',
  'for', 'on', 'with', 'at', 'by', 'from', 'and', 'or', 'but', 'not',
  'this', 'that', 'it', 'be', 'has', 'have', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'shall',
]);

/** Minimum character length for a keyword to be retained. */
const MIN_KEYWORD_LENGTH = 3;

// ---------------------------------------------------------------------------
// Row Mapping
// ---------------------------------------------------------------------------

interface GeometryGroupRow {
  id: string;
  geometry: string;
  operator_id: string;
  created_at: string;
  dissolved_at: string | null;
}

interface GeometryGroupWithCountRow extends GeometryGroupRow {
  task_count: string;
}

interface RecentTaskRow {
  description: string;
}

function rowToGroup(
  row: GeometryGroupRow | GeometryGroupWithCountRow,
  taskIds: readonly string[] = [],
): GeometryGroup {
  return {
    groupId: row.id,
    geometry: row.geometry as MeetingGeometry,
    taskIds,
    operatorId: row.operator_id,
    createdAt: row.created_at,
    dissolvedAt: row.dissolved_at,
  };
}

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

/** Result of geometry resolution. */
export interface GeometryResolution {
  readonly geometry: MeetingGeometry;
  readonly groupId: string | null;
  readonly autoDetected: boolean;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class InvalidGeometryError extends Error {
  constructor(geometry: string) {
    super(`Invalid meeting geometry: ${geometry}`);
    this.name = 'InvalidGeometryError';
  }
}

export class GroupNotFoundError extends Error {
  constructor(groupId: string) {
    super(`Geometry group not found: ${groupId}`);
    this.name = 'GroupNotFoundError';
  }
}

// ---------------------------------------------------------------------------
// MeetingGeometryRouter
// ---------------------------------------------------------------------------

export class MeetingGeometryRouter {
  constructor(private readonly pool: DbPool) {}

  // -------------------------------------------------------------------------
  // Resolution
  // -------------------------------------------------------------------------

  /**
   * Resolve the meeting geometry for a spawn request.
   *
   * Priority:
   *   1. Explicit geometry in request (validated against MEETING_GEOMETRIES)
   *   2. Group lookup if groupId is provided
   *   3. Default: factory
   */
  async resolveGeometry(request: {
    geometry?: MeetingGeometry;
    groupId?: string;
  }): Promise<GeometryResolution> {
    // 1. Explicit geometry
    if (request.geometry != null) {
      if (!isValidGeometry(request.geometry)) {
        throw new InvalidGeometryError(request.geometry);
      }
      return {
        geometry: request.geometry,
        groupId: request.groupId ?? null,
        autoDetected: false,
      };
    }

    // 2. Group lookup
    if (request.groupId != null) {
      const group = await this.getGroup(request.groupId);
      if (group == null) {
        throw new GroupNotFoundError(request.groupId);
      }
      return {
        geometry: group.geometry,
        groupId: group.groupId,
        autoDetected: false,
      };
    }

    // 3. Default
    return { geometry: 'factory', groupId: null, autoDetected: false };
  }

  // -------------------------------------------------------------------------
  // Group CRUD
  // -------------------------------------------------------------------------

  /** Create a new geometry group for an operator. */
  async createGroup(
    geometry: MeetingGeometry,
    operatorId: string,
  ): Promise<GeometryGroup> {
    const result = await this.pool.query<GeometryGroupRow>(
      `INSERT INTO geometry_groups (geometry, operator_id)
       VALUES ($1, $2)
       RETURNING *`,
      [geometry, operatorId],
    );
    return rowToGroup(result.rows[0], []);
  }

  /** Add a task to a geometry group. */
  async addToGroup(groupId: string, taskId: string): Promise<void> {
    await this.pool.query(
      'UPDATE fleet_tasks SET group_id = $1 WHERE id = $2',
      [groupId, taskId],
    );
  }

  /** Retrieve a geometry group with its task IDs. Returns null if not found. */
  async getGroup(groupId: string): Promise<GeometryGroup | null> {
    const result = await this.pool.query<GeometryGroupRow>(
      'SELECT * FROM geometry_groups WHERE id = $1',
      [groupId],
    );
    if (result.rows.length === 0) {
      return null;
    }
    const taskResult = await this.pool.query<{ id: string }>(
      'SELECT id FROM fleet_tasks WHERE group_id = $1',
      [groupId],
    );
    const taskIds = taskResult.rows.map((r) => r.id);
    return rowToGroup(result.rows[0], taskIds);
  }

  /** Dissolve a geometry group by setting dissolved_at. */
  async dissolveGroup(groupId: string): Promise<void> {
    await this.pool.query(
      'UPDATE geometry_groups SET dissolved_at = NOW() WHERE id = $1',
      [groupId],
    );
  }

  // -------------------------------------------------------------------------
  // Auto-Detection
  // -------------------------------------------------------------------------

  /**
   * Detect optimal geometry based on recent task similarity.
   *
   * Checks tasks from the same operator in the last 5 minutes.
   * If >= 2 recent tasks share >= 30% keyword overlap with the new
   * task description, suggests 'jam' geometry and finds or creates a group.
   */
  async detectGeometry(
    operatorId: string,
    taskDescription: string,
  ): Promise<GeometryResolution> {
    const placeholders = EXCLUDED_STATUSES.map((_, i) => `$${i + 2}`).join(', ');
    const recentResult = await this.pool.query<RecentTaskRow>(
      `SELECT description FROM fleet_tasks
       WHERE operator_id = $1
         AND created_at > NOW() - INTERVAL '${DETECTION_WINDOW_MINUTES} minutes'
         AND status NOT IN (${placeholders})`,
      [operatorId, ...EXCLUDED_STATUSES],
    );

    const recentTasks = recentResult.rows;
    if (recentTasks.length < MIN_RECENT_TASKS) {
      return { geometry: 'factory', groupId: null, autoDetected: false };
    }

    const currentKeywords = extractKeywords(taskDescription);
    const hasOverlap = recentTasks.some((task) => {
      const taskKeywords = extractKeywords(task.description);
      const overlap = computeKeywordOverlap(currentKeywords, taskKeywords);
      return overlap >= OVERLAP_THRESHOLD;
    });

    if (!hasOverlap) {
      return { geometry: 'factory', groupId: null, autoDetected: false };
    }

    // Find existing undissolved group or create new one
    const existingGroup = await this.pool.query<GeometryGroupRow>(
      `SELECT * FROM geometry_groups
       WHERE operator_id = $1
         AND geometry = 'jam'
         AND dissolved_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [operatorId],
    );

    let groupId: string;
    if (existingGroup.rows.length > 0) {
      groupId = existingGroup.rows[0].id;
    } else {
      const newGroup = await this.createGroup('jam', operatorId);
      groupId = newGroup.groupId;
    }

    return { geometry: 'jam', groupId, autoDetected: true };
  }
}

// ---------------------------------------------------------------------------
// Pure Functions (exported for testing)
// ---------------------------------------------------------------------------

/** Validate that a string is a recognized MeetingGeometry. */
export function isValidGeometry(value: string): value is MeetingGeometry {
  return (MEETING_GEOMETRIES as readonly string[]).includes(value);
}

/**
 * Extract meaningful keywords from text.
 *
 * Splits on whitespace and common punctuation, lowercases, filters
 * stopwords and short words (< 3 chars), and deduplicates.
 */
export function extractKeywords(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .split(/[\s,.:;!?()[\]{}"'`/\\|~@#$%^&*+=<>_-]+/)
    .filter((token) => token.length >= MIN_KEYWORD_LENGTH)
    .filter((token) => !STOPWORDS.has(token));

  return [...new Set(tokens)];
}

/**
 * Compute keyword overlap ratio: |intersection| / max(|current|, 1).
 *
 * Returns a value between 0 and 1.
 */
export function computeKeywordOverlap(
  current: readonly string[],
  other: readonly string[],
): number {
  if (current.length === 0) return 0;
  const otherSet = new Set(other);
  const intersectionCount = current.filter((kw) => otherSet.has(kw)).length;
  return intersectionCount / Math.max(current.length, 1);
}
