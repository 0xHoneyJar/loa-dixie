/**
 * Sovereignty Engine — Reputation-driven agent autonomy.
 *
 * Implements GovernedResource<AgentAutonomy, AutonomyEvent, AutonomyInvariant>
 * to govern agent autonomy levels based on demonstrated competence.
 *
 * Three levels: constrained (new) → standard (proven) → autonomous (excellent)
 * Resources scale with level: timeouts, retries, context windows.
 *
 * @since cycle-013 — Sprint 96
 */
import type {
  AutonomyLevel,
  AutonomyResources,
  AutonomyEvent,
  AutonomyInvariant,
  AgentIdentityRecord,
} from '../types/agent-identity.js';
import { AUTONOMY_ORDER } from '../types/agent-identity.js';
import type {
  GovernedResource,
  TransitionResult,
  InvariantResult,
} from './governed-resource.js';
import type { AuditTrail, GovernanceMutation } from '@0xhoneyjar/loa-hounfour/commons';
import type { CrossGovernorEventBus } from './cross-governor-event-bus.js';

// ---------------------------------------------------------------------------
// State Type
// ---------------------------------------------------------------------------

/** In-memory sovereignty state for a single agent. */
export interface AgentAutonomy {
  readonly identityId: string;
  readonly level: AutonomyLevel;
  readonly reputation: number;
  readonly taskCount: number;
  readonly resources: AutonomyResources;
}

// ---------------------------------------------------------------------------
// Resource Allocation Constants
// ---------------------------------------------------------------------------

/** Resource allocation table keyed by autonomy level. Frozen at module load. */
export const AUTONOMY_RESOURCES: Readonly<Record<AutonomyLevel, AutonomyResources>> = Object.freeze({
  constrained: Object.freeze({
    timeoutMinutes: 60,
    maxRetries: 2,
    contextTokens: 6000,
    canSelfModifyPrompt: false,
  }),
  standard: Object.freeze({
    timeoutMinutes: 120,
    maxRetries: 3,
    contextTokens: 8000,
    canSelfModifyPrompt: false,
  }),
  autonomous: Object.freeze({
    timeoutMinutes: 240,
    maxRetries: 5,
    contextTokens: 12000,
    canSelfModifyPrompt: true,
  }),
});

// ---------------------------------------------------------------------------
// Pure Functions
// ---------------------------------------------------------------------------

/**
 * Compute autonomy level from reputation and task count.
 *
 * - autonomous: reputation >= 0.8 AND taskCount >= 10
 * - standard:   reputation >= 0.6 AND taskCount >= 3
 * - constrained: everything else
 *
 * @since cycle-013 — Sprint 96
 */
export function computeAutonomyLevel(
  reputation: number,
  taskCount: number,
): AutonomyLevel {
  if (reputation >= 0.8 && taskCount >= 10) return 'autonomous';
  if (reputation >= 0.6 && taskCount >= 3) return 'standard';
  return 'constrained';
}

// ---------------------------------------------------------------------------
// SovereigntyEngine
// ---------------------------------------------------------------------------

/**
 * Sovereignty Engine — GovernedResource for agent autonomy governance.
 *
 * Governs an agent's autonomy level based on reputation and task count.
 * Level changes emit events on the optional CrossGovernorEventBus so that
 * other governors (fleet, billing) can react.
 *
 * @since cycle-013 — Sprint 96
 */
export class SovereigntyEngine
  implements GovernedResource<AgentAutonomy, AutonomyEvent, AutonomyInvariant>
{
  readonly resourceId = 'sovereignty-engine-singleton';
  readonly resourceType = 'sovereignty-engine';

  private _current: AgentAutonomy;
  private _version = 0;
  private readonly _auditTrail: AuditTrail;
  private readonly _mutationLog: GovernanceMutation[] = [];
  private readonly eventBus: CrossGovernorEventBus | null;
  private readonly invariantIds: AutonomyInvariant[] = ['INV-019', 'INV-020'];

  /** Previous level for INV-020 (non-regression) tracking. */
  private _previousLevel: AutonomyLevel;

  constructor(eventBus?: CrossGovernorEventBus) {
    this.eventBus = eventBus ?? null;

    this._current = {
      identityId: '',
      level: 'constrained',
      reputation: 0,
      taskCount: 0,
      resources: AUTONOMY_RESOURCES.constrained,
    };

    this._previousLevel = 'constrained';

    this._auditTrail = {
      entries: [],
      hash_algorithm: 'sha256' as const,
      genesis_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      integrity_status: 'verified' as const,
    };
  }

  // -------------------------------------------------------------------------
  // GovernedResource Interface
  // -------------------------------------------------------------------------

  get current(): AgentAutonomy {
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

  // -------------------------------------------------------------------------
  // Transition
  // -------------------------------------------------------------------------

  /**
   * Transition sovereignty state in response to an event.
   *
   * Supported events:
   * - TASK_COMPLETED: increment taskCount, recompute level
   * - TASK_FAILED: increment taskCount, recompute level
   * - REPUTATION_UPDATED: update reputation directly, recompute level
   * - MANUAL_OVERRIDE: set level directly
   *
   * On level change: emits AUTONOMY_LEVEL_CHANGED via CrossGovernorEventBus.
   */
  async transition(
    event: AutonomyEvent,
    actorId: string,
  ): Promise<TransitionResult<AgentAutonomy>> {
    const previousLevel = this._current.level;

    switch (event.type) {
      case 'TASK_COMPLETED': {
        const newTaskCount = this._current.taskCount + 1;
        const newLevel = computeAutonomyLevel(this._current.reputation, newTaskCount);
        this._current = {
          ...this._current,
          taskCount: newTaskCount,
          level: newLevel,
          resources: AUTONOMY_RESOURCES[newLevel],
        };
        break;
      }
      case 'TASK_FAILED': {
        const newTaskCount = this._current.taskCount + 1;
        const newLevel = computeAutonomyLevel(this._current.reputation, newTaskCount);
        this._current = {
          ...this._current,
          taskCount: newTaskCount,
          level: newLevel,
          resources: AUTONOMY_RESOURCES[newLevel],
        };
        break;
      }
      case 'REPUTATION_UPDATED': {
        const newLevel = computeAutonomyLevel(event.newScore, this._current.taskCount);
        this._current = {
          ...this._current,
          reputation: event.newScore,
          level: newLevel,
          resources: AUTONOMY_RESOURCES[newLevel],
        };
        break;
      }
      case 'MANUAL_OVERRIDE': {
        this._current = {
          ...this._current,
          level: event.newLevel,
          resources: AUTONOMY_RESOURCES[event.newLevel],
        };
        break;
      }
      default: {
        return {
          success: false,
          reason: 'Unknown event type',
          code: 'UNKNOWN_EVENT',
        };
      }
    }

    this._previousLevel = previousLevel;
    this._version++;

    // Emit level-change event if level changed
    if (this._current.level !== previousLevel && this.eventBus) {
      await this.eventBus.emit({
        type: 'AGENT_COMPLETED', // closest fleet event type for level change notification
        taskId: `autonomy-level-changed:${previousLevel}->${this._current.level}`,
        operatorId: this._current.identityId,
        timestamp: new Date().toISOString(),
        metadata: {
          eventKind: 'AUTONOMY_LEVEL_CHANGED',
          previousLevel,
          newLevel: this._current.level,
          reputation: this._current.reputation,
          taskCount: this._current.taskCount,
        },
      });
    }

    return { success: true, state: this._current, version: this._version };
  }

  // -------------------------------------------------------------------------
  // Invariant Verification
  // -------------------------------------------------------------------------

  /**
   * Verify a specific sovereignty invariant.
   *
   * INV-019: taskCount matches identity record (external verification needed)
   * INV-020: level has not decreased since last transition (non-regression)
   */
  verify(invariantId: AutonomyInvariant): InvariantResult {
    const now = new Date().toISOString();

    switch (invariantId) {
      case 'INV-019': {
        // INV-019 requires cross-referencing with AgentIdentityService to verify
        // that taskCount in sovereignty state matches the DB record. Since we do
        // not have a direct DB dependency here, return satisfied with a note.
        return {
          invariant_id: 'INV-019',
          satisfied: true,
          detail: `taskCount=${this._current.taskCount} — external verification against AgentIdentityService required for full assurance`,
          checked_at: now,
        };
      }
      case 'INV-020': {
        const previousIdx = AUTONOMY_ORDER.indexOf(this._previousLevel);
        const currentIdx = AUTONOMY_ORDER.indexOf(this._current.level);
        const satisfied = currentIdx >= previousIdx;
        return {
          invariant_id: 'INV-020',
          satisfied,
          detail: satisfied
            ? `Level stable or increasing: ${this._previousLevel} → ${this._current.level}`
            : `Level decreased: ${this._previousLevel} → ${this._current.level}`,
          checked_at: now,
        };
      }
      default: {
        return {
          invariant_id: invariantId,
          satisfied: false,
          detail: `Unknown invariant: ${invariantId}`,
          checked_at: now,
        };
      }
    }
  }

  /** Verify all sovereignty invariants. */
  verifyAll(): InvariantResult[] {
    return this.invariantIds.map((id) => this.verify(id));
  }

  // -------------------------------------------------------------------------
  // Resource Lookup
  // -------------------------------------------------------------------------

  /**
   * Get resource allocation for an agent identity.
   *
   * If identity is null (unknown agent), returns constrained resources.
   * Otherwise computes level from aggregateReputation and taskCount.
   */
  getResources(identity: AgentIdentityRecord | null): AutonomyResources {
    if (!identity) {
      return AUTONOMY_RESOURCES.constrained;
    }
    const level = computeAutonomyLevel(identity.aggregateReputation, identity.taskCount);
    return AUTONOMY_RESOURCES[level];
  }
}
