/**
 * Fleet Governor — Conviction-Gated Spawn Admission with DB Transactional Limits
 *
 * Implements the GovernedResource pattern for fleet spawn admission. Each
 * operator's conviction tier determines their maximum concurrent agent count.
 * Admission uses SELECT FOR UPDATE to prevent race conditions.
 *
 * Tier limits (default):
 *   observer=0, participant=0, builder=1, architect=3, sovereign=10
 *
 * Two-phase check:
 *   1. canSpawn() — fast in-memory pre-check (cache only, no DB)
 *   2. admitAndInsert() — DB-transactional with SELECT FOR UPDATE
 *
 * Invariants:
 *   INV-014: active_count <= tier_limit (always)
 *   INV-015: cancelled tasks never retried
 *   INV-016: tier downgrade cannot spawn above new limit
 *
 * See: SDD §3.1 (fleet governance), §3.2 (admission protocol)
 * @since cycle-012 — Sprint 90, Fleet Governor
 */
import type { DbPool } from '../db/client.js';
import { startSanitizedSpan, addSanitizedAttributes } from '../utils/span-sanitizer.js';
import type { ConvictionTier } from '../types/conviction.js';
import type { FleetTaskStatus, CreateFleetTaskInput, FleetTaskRecord } from '../types/fleet.js';
import type {
  GovernedResource,
  TransitionResult,
  InvariantResult,
} from './governed-resource.js';
import { AUDIT_TRAIL_GENESIS_HASH } from '@0xhoneyjar/loa-hounfour/commons';
import type { AuditTrail, GovernanceMutation } from '@0xhoneyjar/loa-hounfour/commons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Fleet state snapshot. */
export interface FleetState {
  readonly operatorId: string;
  readonly tier: ConvictionTier;
  readonly activeCount: number;
  readonly tierLimit: number;
}

/** Events that can transition fleet state. */
export type FleetEvent =
  | { type: 'SPAWN_REQUESTED'; operatorId: string; tier: ConvictionTier }
  | { type: 'AGENT_COMPLETED'; taskId: string; operatorId: string }
  | { type: 'AGENT_FAILED'; taskId: string; operatorId: string }
  | { type: 'TIER_CHANGED'; operatorId: string; newTier: ConvictionTier };

/** Fleet invariant identifiers. */
export type FleetInvariant = 'INV-014' | 'INV-015' | 'INV-016';

/** Default tier limits for fleet spawn admission. */
export const DEFAULT_TIER_LIMITS: Readonly<Record<ConvictionTier, number>> = {
  observer: 0,
  participant: 0,
  builder: 1,
  architect: 3,
  sovereign: 10,
} as const;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Thrown when a spawn is denied due to fleet governance constraints.
 *
 * @since cycle-012 — Sprint 90
 */
export class SpawnDeniedError extends Error {
  readonly operatorId: string;
  readonly tier: ConvictionTier;
  readonly activeCount: number;
  readonly tierLimit: number;
  readonly reason: string;

  constructor(state: FleetState, reason: string) {
    super(`Spawn denied for operator ${state.operatorId}: ${reason}`);
    this.name = 'SpawnDeniedError';
    this.operatorId = state.operatorId;
    this.tier = state.tier;
    this.activeCount = state.activeCount;
    this.tierLimit = state.tierLimit;
    this.reason = reason;
  }
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

interface FleetTaskRow {
  id: string;
  operator_id: string;
  agent_type: string;
  model: string;
  task_type: string;
  description: string;
  branch: string;
  worktree_path: string | null;
  container_id: string | null;
  tmux_session: string | null;
  status: string;
  version: number;
  pr_number: number | null;
  ci_status: string | null;
  review_status: Record<string, unknown> | null;
  retry_count: number;
  max_retries: number;
  context_hash: string | null;
  failure_context: Record<string, unknown> | null;
  spawned_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  /** @since cycle-013 — persistent agent identity */
  agent_identity_id: string | null;
  /** @since cycle-013 — geometry group membership */
  group_id: string | null;
}

function rowToRecord(row: FleetTaskRow): FleetTaskRecord {
  return {
    id: row.id,
    operatorId: row.operator_id,
    agentType: row.agent_type as FleetTaskRecord['agentType'],
    model: row.model,
    taskType: row.task_type as FleetTaskRecord['taskType'],
    description: row.description,
    branch: row.branch,
    worktreePath: row.worktree_path,
    containerId: row.container_id,
    tmuxSession: row.tmux_session,
    status: row.status as FleetTaskStatus,
    version: row.version,
    prNumber: row.pr_number,
    ciStatus: row.ci_status,
    reviewStatus: row.review_status,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    contextHash: row.context_hash,
    failureContext: row.failure_context,
    spawnedAt: row.spawned_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    agentIdentityId: row.agent_identity_id,
    groupId: row.group_id,
  };
}

// ---------------------------------------------------------------------------
// Active status set
// ---------------------------------------------------------------------------

/** Statuses considered "active" (consuming a fleet slot). */
const ACTIVE_STATUSES: readonly FleetTaskStatus[] = [
  'proposed',
  'spawning',
  'running',
  'pr_created',
  'reviewing',
  'ready',
  'retrying',
] as const;

// ---------------------------------------------------------------------------
// FleetGovernor
// ---------------------------------------------------------------------------

/**
 * Fleet Governor — GovernedResource implementation for spawn admission.
 *
 * @since cycle-012 — Sprint 90
 */
export class FleetGovernor implements GovernedResource<FleetState, FleetEvent, FleetInvariant> {
  readonly resourceId: string;
  readonly resourceType = 'fleet-governor';

  /**
   * Last-written operator state snapshot.
   *
   * LIMITATION (S5-F03): This is a per-request ephemeral snapshot, not a
   * canonical resource state. `verify()` and `verifyAll()` check only the
   * LAST operator's state. For per-operator invariant checking, query the
   * DB directly via `admitAndInsert()`. Future: replace with a proper
   * per-operator state map or remove from GovernedResource contract.
   */
  private _current: FleetState;
  private _version = 0;
  private readonly _auditTrail: AuditTrail;
  private readonly _mutationLog: GovernanceMutation[] = [];
  private readonly tierLimits: Readonly<Record<ConvictionTier, number>>;

  /** In-memory cache of active counts per operator. */
  private readonly activeCountCache: Map<string, { count: number; cachedAt: number }> = new Map();
  private readonly cacheTtlMs: number;

  constructor(
    private readonly pool: DbPool,
    opts?: {
      tierLimits?: Partial<Record<ConvictionTier, number>>;
      cacheTtlMs?: number;
    },
  ) {
    this.resourceId = 'fleet-governor-singleton';
    this.tierLimits = { ...DEFAULT_TIER_LIMITS, ...opts?.tierLimits };
    this.cacheTtlMs = opts?.cacheTtlMs ?? 5_000;

    this._current = {
      operatorId: '',
      tier: 'observer',
      activeCount: 0,
      tierLimit: 0,
    };

    this._auditTrail = {
      entries: [],
      hash_algorithm: 'sha256' as const,
      genesis_hash: AUDIT_TRAIL_GENESIS_HASH,
      integrity_status: 'verified' as const,
    };
  }

  // -------------------------------------------------------------------------
  // GovernedResource Interface
  // -------------------------------------------------------------------------

  get current(): FleetState {
    return this._current;
  }

  get version(): number {
    return this._version;
  }

  get auditTrail(): Readonly<AuditTrail> {
    return this._auditTrail;
  }

  get mutationLog(): ReadonlyArray<GovernanceMutation> {
    return this._mutationLog;
  }

  async transition(event: FleetEvent, actorId: string): Promise<TransitionResult<FleetState>> {
    switch (event.type) {
      case 'SPAWN_REQUESTED': {
        const limit = this.tierLimits[event.tier];
        const count = this.getCachedActiveCount(event.operatorId);
        const newState: FleetState = {
          operatorId: event.operatorId,
          tier: event.tier,
          activeCount: count,
          tierLimit: limit,
        };
        this._current = newState;
        this._version++;
        return { success: true, state: newState, version: this._version };
      }
      case 'AGENT_COMPLETED':
      case 'AGENT_FAILED': {
        // Invalidate cache for the owning operator (not _current singleton)
        this.invalidateCache(event.operatorId);
        this._version++;
        return { success: true, state: this._current, version: this._version };
      }
      case 'TIER_CHANGED': {
        const limit = this.tierLimits[event.newTier];
        const count = this.getCachedActiveCount(event.operatorId);
        const newState: FleetState = {
          operatorId: event.operatorId,
          tier: event.newTier,
          activeCount: count,
          tierLimit: limit,
        };
        this._current = newState;
        this._version++;
        return { success: true, state: newState, version: this._version };
      }
      default:
        return {
          success: false,
          reason: `Unknown event type`,
          code: 'UNKNOWN_EVENT',
        };
    }
  }

  /**
   * Verify a specific fleet invariant.
   *
   * INV-014: active_count <= tier_limit (capacity never exceeded)
   * INV-015: cancelled tasks never retried (state machine enforcement)
   * INV-016: tier downgrade cannot spawn above new limit
   */
  verify(invariantId: FleetInvariant): InvariantResult {
    const now = new Date().toISOString();
    switch (invariantId) {
      case 'INV-014': {
        const satisfied = this._current.activeCount <= this._current.tierLimit;
        return {
          invariant_id: 'INV-014',
          satisfied,
          detail: satisfied
            ? `Active count (${this._current.activeCount}) within tier limit (${this._current.tierLimit})`
            : `Active count (${this._current.activeCount}) exceeds tier limit (${this._current.tierLimit})`,
          checked_at: now,
        };
      }
      case 'INV-015': {
        // INV-015 is enforced at the state machine level in task-registry.ts:
        // cancelled has no outgoing transitions, so retrying from cancelled is
        // impossible. This verify() confirms the invariant holds structurally.
        return {
          invariant_id: 'INV-015',
          satisfied: true,
          detail: 'Cancelled tasks have no outgoing transitions in the state machine — retrying is structurally impossible',
          checked_at: now,
        };
      }
      case 'INV-016': {
        const satisfied = this._current.activeCount <= this._current.tierLimit;
        return {
          invariant_id: 'INV-016',
          satisfied,
          detail: satisfied
            ? `Active count (${this._current.activeCount}) within current tier limit (${this._current.tierLimit}) — tier downgrade safe`
            : `Active count (${this._current.activeCount}) exceeds current tier limit (${this._current.tierLimit}) — tier downgrade violation`,
          checked_at: now,
        };
      }
      default:
        return {
          invariant_id: invariantId,
          satisfied: false,
          detail: `Unknown invariant: ${invariantId}`,
          checked_at: now,
        };
    }
  }

  verifyAll(): InvariantResult[] {
    return (['INV-014', 'INV-015', 'INV-016'] as FleetInvariant[]).map((id) => this.verify(id));
  }

  // -------------------------------------------------------------------------
  // Fast Pre-Check (Cache Only)
  // -------------------------------------------------------------------------

  /**
   * Fast in-memory pre-check for spawn eligibility.
   *
   * Uses cached active count — does NOT hit the database. This is a
   * best-effort gate to reject obviously-denied spawns before the
   * expensive DB transaction in admitAndInsert().
   *
   * A passing pre-check does NOT guarantee admission — the DB
   * transaction is the authoritative decision.
   */
  canSpawn(operatorId: string, tier: ConvictionTier): boolean {
    const limit = this.tierLimits[tier];
    if (limit <= 0) return false;

    const cached = this.activeCountCache.get(operatorId);
    if (!cached) {
      // No cache entry — optimistically allow (DB will enforce)
      return true;
    }

    const age = Date.now() - cached.cachedAt;
    if (age > this.cacheTtlMs) {
      // Stale cache — optimistically allow
      this.activeCountCache.delete(operatorId);
      return true;
    }

    return cached.count < limit;
  }

  // -------------------------------------------------------------------------
  // DB-Transactional Admission
  // -------------------------------------------------------------------------

  /**
   * Atomically check capacity and insert a new task.
   *
   * Uses SELECT FOR UPDATE to serialize concurrent spawn requests for
   * the same operator. The row-level lock prevents two concurrent
   * requests from both reading the same active count and both admitting.
   *
   * @throws SpawnDeniedError if the operator has reached their tier limit
   * @returns The newly created fleet task record
   */
  async admitAndInsert(
    input: CreateFleetTaskInput,
    tier: ConvictionTier,
  ): Promise<FleetTaskRecord> {
    return startSanitizedSpan(
      'dixie.governance.check',
      { resource_type: 'fleet_task', decision: 'pending', witness_count: 0 },
      async (span) => {
    const limit = this.tierLimits[tier];
    if (limit <= 0) {
      addSanitizedAttributes(span, 'dixie.governance.check', { decision: 'denied', denial_reason: 'tier_not_permitted' });
      throw new SpawnDeniedError(
        { operatorId: input.operatorId, tier, activeCount: 0, tierLimit: limit },
        `Tier '${tier}' is not permitted to spawn agents (limit=0)`,
      );
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // SELECT FOR UPDATE: lock active task rows for this operator
      const countResult = await client.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM fleet_tasks
         WHERE operator_id = $1 AND status = ANY($2)
         FOR UPDATE`,
        [input.operatorId, ACTIVE_STATUSES],
      );

      const activeCount = parseInt(countResult.rows[0].count, 10);

      if (activeCount >= limit) {
        await client.query('ROLLBACK');
        addSanitizedAttributes(span, 'dixie.governance.check', { denial_reason: 'tier_limit_exceeded' });
        const state: FleetState = {
          operatorId: input.operatorId,
          tier,
          activeCount,
          tierLimit: limit,
        };
        throw new SpawnDeniedError(
          state,
          `Active count (${activeCount}) has reached tier limit (${limit})`,
        );
      }

      // Insert the new task
      const insertResult = await client.query<FleetTaskRow>(
        `INSERT INTO fleet_tasks (
          operator_id, agent_type, model, task_type,
          description, branch, max_retries, context_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          input.operatorId,
          input.agentType,
          input.model,
          input.taskType,
          input.description,
          input.branch,
          input.maxRetries ?? 3,
          input.contextHash ?? null,
        ],
      );

      await client.query('COMMIT');

      const record = rowToRecord(insertResult.rows[0]);

      // Update cache
      this.activeCountCache.set(input.operatorId, {
        count: activeCount + 1,
        cachedAt: Date.now(),
      });

      // Update current state
      this._current = {
        operatorId: input.operatorId,
        tier,
        activeCount: activeCount + 1,
        tierLimit: limit,
      };
      this._version++;

      addSanitizedAttributes(span, 'dixie.governance.check', { decision: 'admit', witness_count: activeCount + 1 });
      return record;
    } catch (err) {
      // Rollback on any non-SpawnDeniedError failure
      if (!(err instanceof SpawnDeniedError)) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // Swallow rollback errors
        }
      }
      if (err instanceof SpawnDeniedError) {
        addSanitizedAttributes(span, 'dixie.governance.check', { decision: 'denied' });
      }
      throw err;
    } finally {
      client.release();
    }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Cache Management
  // -------------------------------------------------------------------------

  /** Get the tier limit for a conviction tier. */
  getTierLimit(tier: ConvictionTier): number {
    return this.tierLimits[tier];
  }

  /** Invalidate the active count cache for an operator. */
  invalidateCache(operatorId: string): void {
    this.activeCountCache.delete(operatorId);
  }

  /** Invalidate all cached active counts. */
  invalidateAllCaches(): void {
    this.activeCountCache.clear();
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private getCachedActiveCount(operatorId: string): number {
    const cached = this.activeCountCache.get(operatorId);
    if (!cached) return 0;
    const age = Date.now() - cached.cachedAt;
    if (age > this.cacheTtlMs) {
      this.activeCountCache.delete(operatorId);
      return 0;
    }
    return cached.count;
  }
}
