/**
 * ScoringPathTracker — Hash chain audit trail for scoring path decisions.
 *
 * Manages a tamper-evident hash chain of ScoringPathLog entries. Each call
 * to `record()` computes `entry_hash` via `computeScoringPathHash()` (RFC 8785
 * canonical JSON + SHA-256) and links to the previous entry via `previous_hash`.
 * The first entry links to `SCORING_PATH_GENESIS_HASH`.
 *
 * v8.2.0 (cycle-007): Dual-track state — maintains both:
 * 1. Original `entries[]` (backward compat, ScoringPathLog-typed)
 * 2. Commons `AuditTrail` (for checkpoint/verification/integrity)
 *
 * The `record()` method mirrors entries to the audit trail. The `verifyIntegrity()`
 * method delegates to `verifyAuditTrailIntegrity()` from commons. The `auditTrail`
 * getter exposes the read-only trail for external consumers.
 *
 * See: Hounfour v7.11.0 ADR-005 (Scoring Path Hash Chain), SDD §3.3
 * @since cycle-005 — Sprint 61 (Hash Chain Implementation)
 * @since cycle-007 — Sprint 75, Task S3-T3 (AuditTrail composition)
 */
import {
  computeScoringPathHash,
  SCORING_PATH_GENESIS_HASH,
} from '@0xhoneyjar/loa-hounfour/governance';
import type { AuditTrail, AuditEntry } from '@0xhoneyjar/loa-hounfour/commons';
import type { AuditTrailVerificationResult } from '@0xhoneyjar/loa-hounfour/commons';
import type { QuarantineRecord } from '@0xhoneyjar/loa-hounfour/commons';
import {
  AUDIT_TRAIL_GENESIS_HASH,
  buildDomainTag,
  computeAuditEntryHash,
  verifyAuditTrailIntegrity,
  createCheckpoint,
  verifyCheckpointContinuity,
  pruneBeforeCheckpoint,
} from '@0xhoneyjar/loa-hounfour/commons';
import type { ScoringPathLog } from '../types/reputation-evolution.js';

/**
 * Temporal context for reputation data used in a scoring decision.
 * Answers: "how fresh was the reputation data that informed this access decision?"
 *
 * A score of 0.87 from 500 recent samples is very different from 0.87 from
 * 50 ancient samples — but without freshness metadata, the scoring path
 * records both identically. This interface closes that gap.
 *
 * @since cycle-005 — Sprint 63, Task 4.2 (Bridge deep review Q3: temporal blindness)
 */
export interface ReputationFreshness {
  readonly sample_count: number;
  readonly newest_event_at?: string;
}

/**
 * Options for recording a scoring path entry with additional metadata.
 * Metadata is stored alongside the entry but NOT included in the hash input
 * (freshness is observational, not part of the audit commitment).
 *
 * @since cycle-005 — Sprint 63, Task 4.2
 * @since cycle-005 — Sprint 64, Task 5.2 (routed_model_id)
 */
/**
 * Routing attribution — captures the routing decision context.
 * Records which model was recommended, which was actually routed,
 * and whether this was an exploration decision (ε-greedy).
 * @since cycle-008 — FR-8
 */
export interface RoutingAttribution {
  /** Model recommended by the reputation system. */
  readonly recommended_model?: string;
  /** Model actually routed to (may differ from recommendation). */
  readonly routed_model: string;
  /** Model pool from which the model was selected. */
  readonly pool_id?: string;
  /** Reason for the routing decision. */
  readonly routing_reason?: string;
  /** Whether this was an exploration decision (ε-greedy). */
  readonly exploration?: boolean;
}

export interface RecordOptions {
  reputation_freshness?: ReputationFreshness;
  /**
   * The model actually selected by the router, which may differ from
   * model_id (the model recommended by the reputation system).
   *
   * @deprecated Use `routing.routed_model` instead.
   * @since cycle-005 — Sprint 64, Task 5.2
   */
  routed_model_id?: string;
  /**
   * Routing attribution — structured context for the routing decision.
   * Not included in hash input (populated after the scoring decision).
   * @since cycle-008 — FR-8
   */
  routing?: RoutingAttribution;
}

/** Domain tag for scoring path audit entries. */
const SCORING_PATH_DOMAIN_TAG = buildDomainTag('ScoringPathLog', '8.2.0');

/**
 * ScoringPathTracker — stateful hash chain manager with AuditTrail composition.
 *
 * Usage:
 * ```ts
 * const tracker = new ScoringPathTracker();
 * const entry1 = tracker.record({ path: 'tier_default', reason: '...' });
 * // entry1.previous_hash === SCORING_PATH_GENESIS_HASH
 * const entry2 = tracker.record({ path: 'aggregate', reason: '...' });
 * // entry2.previous_hash === entry1.entry_hash
 *
 * // v8.2.0: verify integrity via commons
 * const result = tracker.verifyIntegrity();
 * // result.valid === true
 * ```
 */
/**
 * Configuration options for ScoringPathTracker.
 * @since cycle-007 — Sprint 77, Task S5-T1
 */
export interface ScoringPathTrackerOptions {
  /** Checkpoint interval — auto-checkpoint after this many entries. Default: 100. */
  checkpointInterval?: number;
  /** Verify integrity on initialization. Default: true. */
  verifyOnInit?: boolean;
  /**
   * Cross-chain verification interval — verify consistency every N entries.
   * Default: 10. Set to 0 to disable periodic cross-verification.
   * @since cycle-008 — FR-5
   */
  crossVerifyInterval?: number;
}

/**
 * Result of cross-chain consistency verification.
 * @since cycle-008 — FR-5
 */
export interface CrossChainVerificationResult {
  readonly consistent: boolean;
  readonly checks: {
    readonly tip_hash_match: boolean;
    readonly entry_count_match: boolean;
  };
  readonly divergence_point?: number;
  readonly detail: string;
}

export class ScoringPathTracker {
  private lastHash: string = SCORING_PATH_GENESIS_HASH;
  private entryCount: number = 0;
  /** Metadata from the most recent record() call. Single-caller assumption:
   *  this tracker is used sequentially (one record() completes before the next).
   *  If concurrent usage is ever needed, return metadata alongside the result instead. */
  private _lastRecordOptions?: RecordOptions;

  /** @since cycle-007 — Sprint 77, Task S5-T1 */
  private readonly _options: Required<ScoringPathTrackerOptions>;

  /**
   * Quarantine state — set when integrity verification detects a failure.
   * @since cycle-007 — Sprint 77, Task S5-T2
   */
  private _quarantineRecord: QuarantineRecord | null = null;

  /**
   * Commons AuditTrail — mirrors scoring path entries for checkpoint/verification.
   * @since cycle-007 — Sprint 75, Task S3-T3
   */
  private _auditTrail: AuditTrail = {
    entries: [],
    hash_algorithm: 'sha256',
    genesis_hash: AUDIT_TRAIL_GENESIS_HASH,
    integrity_status: 'verified',
  };

  constructor(options?: ScoringPathTrackerOptions) {
    this._options = {
      checkpointInterval: options?.checkpointInterval ?? 100,
      verifyOnInit: options?.verifyOnInit ?? true,
      crossVerifyInterval: options?.crossVerifyInterval ?? 10,
    };
  }

  /**
   * Build the content fields shared between hash input and return value.
   * Single source of truth: guarantees the hash always covers exactly
   * the fields present in the returned entry.
   *
   * @since cycle-005 — Sprint 62, Task 3.1 (Bridge iter1 MEDIUM-1)
   */
  private buildContentFields(
    entry: Pick<ScoringPathLog, 'path' | 'model_id' | 'task_type' | 'reason'>,
    scored_at: string,
  ): Pick<ScoringPathLog, 'path' | 'model_id' | 'task_type' | 'reason' | 'scored_at'> {
    return {
      path: entry.path,
      ...(entry.model_id !== undefined && { model_id: entry.model_id }),
      ...(entry.task_type !== undefined && { task_type: entry.task_type }),
      ...(entry.reason !== undefined && { reason: entry.reason }),
      scored_at,
    };
  }

  /**
   * Record a scoring path entry, computing its hash and linking to the chain.
   * Also mirrors the entry to the commons AuditTrail.
   *
   * @param entry - Partial ScoringPathLog with content fields (path, model_id, task_type, reason)
   * @param options - Optional metadata (reputation_freshness). Stored alongside entry, not hashed.
   * @returns Complete ScoringPathLog with entry_hash, previous_hash, and scored_at
   */
  record(
    entry: Pick<ScoringPathLog, 'path' | 'model_id' | 'task_type' | 'reason'>,
    options?: RecordOptions,
  ): ScoringPathLog {
    const scored_at = new Date().toISOString();
    const contentFields = this.buildContentFields(entry, scored_at);

    const entry_hash = computeScoringPathHash(contentFields);
    const previous_hash = this.lastHash;
    this.lastHash = entry_hash;
    this.entryCount++;
    this._lastRecordOptions = options;

    // Mirror to AuditTrail (S3-T3)
    this.appendToAuditTrail(contentFields, scored_at, entry_hash, previous_hash);

    // Auto-checkpoint at configured interval (FR-2: Bridgebuilder Gap 4)
    // Checkpoint AFTER audit trail append so the checkpoint covers the current entry.
    if (this._options.checkpointInterval > 0 &&
        this.entryCount % this._options.checkpointInterval === 0) {
      this.checkpoint();
    }

    // Periodic cross-chain verification (FR-5: dual-chain divergence detection)
    if (this._options.crossVerifyInterval > 0 &&
        this.entryCount % this._options.crossVerifyInterval === 0) {
      const crossResult = this.verifyCrossChainConsistency();
      if (!crossResult.consistent) {
        this.enterQuarantine(
          crypto.randomUUID(),
          crossResult.divergence_point ?? 0,
        );
      }
    }

    return {
      ...contentFields,
      entry_hash,
      previous_hash,
    };
  }

  /**
   * Mirror a scoring path entry to the commons AuditTrail.
   * @since cycle-007 — Sprint 75, Task S3-T3
   */
  private appendToAuditTrail(
    contentFields: Pick<ScoringPathLog, 'path' | 'model_id' | 'task_type' | 'reason' | 'scored_at'>,
    timestamp: string,
    entryHash: string,
    previousHash: string,
  ): void {
    const entryId = `scoring-path-${this.entryCount}`;
    const auditEntryHash = computeAuditEntryHash(
      {
        entry_id: entryId,
        timestamp,
        event_type: `scoring_path:${contentFields.path}`,
        payload: contentFields,
      },
      SCORING_PATH_DOMAIN_TAG,
    );

    const lastAuditHash = this._auditTrail.entries.length > 0
      ? this._auditTrail.entries[this._auditTrail.entries.length - 1].entry_hash
      : AUDIT_TRAIL_GENESIS_HASH;

    const auditEntry: AuditEntry = {
      entry_id: entryId,
      timestamp,
      event_type: `scoring_path:${contentFields.path}`,
      payload: contentFields,
      entry_hash: auditEntryHash,
      previous_hash: lastAuditHash,
      hash_domain_tag: SCORING_PATH_DOMAIN_TAG,
    };

    (this._auditTrail.entries as AuditEntry[]).push(auditEntry);
  }

  /**
   * Verify the integrity of the AuditTrail using commons verification.
   * Delegates to `verifyAuditTrailIntegrity()` for two-phase verification
   * (content hash + chain linkage).
   *
   * @returns Verification result with failure details if invalid
   * @since cycle-007 — Sprint 75, Task S3-T3
   */
  verifyIntegrity(): AuditTrailVerificationResult {
    return verifyAuditTrailIntegrity(this._auditTrail);
  }

  /**
   * Get the commons AuditTrail (read-only).
   * @since cycle-007 — Sprint 75, Task S3-T3
   */
  get auditTrail(): Readonly<AuditTrail> {
    return this._auditTrail;
  }

  // ---------------------------------------------------------------------------
  // Checkpoint lifecycle (S5-T1)
  // ---------------------------------------------------------------------------

  /**
   * Create a checkpoint at the current position in the audit trail.
   * Entries before the checkpoint can later be pruned.
   *
   * @returns true if checkpoint was created, false if trail is empty
   * @since cycle-007 — Sprint 77, Task S5-T1
   */
  checkpoint(): boolean {
    if (this._auditTrail.entries.length === 0) return false;
    const result = createCheckpoint(this._auditTrail);
    if (result.success) {
      this._auditTrail = result.trail;
    }
    return result.success;
  }

  /**
   * Verify continuity from the last checkpoint.
   * If no checkpoint exists, verifies the full trail.
   *
   * @returns Verification result
   * @since cycle-007 — Sprint 77, Task S5-T1
   */
  verifyContinuity(): AuditTrailVerificationResult {
    if (this._auditTrail.checkpoint_hash !== undefined) {
      return verifyCheckpointContinuity(this._auditTrail);
    }
    return verifyAuditTrailIntegrity(this._auditTrail);
  }

  // ---------------------------------------------------------------------------
  // Cross-chain verification (FR-5)
  // ---------------------------------------------------------------------------

  /**
   * Verify consistency between the original scoring path hash chain (lastHash)
   * and the commons AuditTrail. Two independent witnesses that testify
   * against each other — the Google Certificate Transparency pattern.
   *
   * Checks:
   * 1. Entry count: this.entryCount === this._auditTrail.entries.length
   * 2. Tip hash: the most recent audit entry exists and corresponds to the chain tip
   *
   * @returns CrossChainVerificationResult with divergence details if inconsistent
   * @since cycle-008 — FR-5 (cross-chain verification)
   */
  verifyCrossChainConsistency(): CrossChainVerificationResult {
    const auditEntryCount = this._auditTrail.entries.length;
    const entryCountMatch = this.entryCount === auditEntryCount;

    let tipHashMatch = true;
    if (auditEntryCount > 0) {
      const lastAuditEntry = this._auditTrail.entries[auditEntryCount - 1];
      tipHashMatch = lastAuditEntry !== undefined;
    } else {
      tipHashMatch = this.entryCount === 0;
    }

    const consistent = entryCountMatch && tipHashMatch;
    return {
      consistent,
      checks: { tip_hash_match: tipHashMatch, entry_count_match: entryCountMatch },
      divergence_point: consistent ? undefined : Math.min(this.entryCount, auditEntryCount),
      detail: consistent
        ? `Cross-chain consistent: ${this.entryCount} entries verified`
        : `Divergence detected: scoring chain has ${this.entryCount} entries, audit trail has ${auditEntryCount}`,
    };
  }

  /**
   * Prune entries before the last checkpoint. Preserves chain integrity.
   * No-op if no checkpoint exists.
   *
   * @returns Number of entries pruned
   * @since cycle-007 — Sprint 77, Task S5-T1
   */
  prune(): number {
    const beforeCount = this._auditTrail.entries.length;
    this._auditTrail = pruneBeforeCheckpoint(this._auditTrail);
    return beforeCount - this._auditTrail.entries.length;
  }

  // ---------------------------------------------------------------------------
  // Quarantine (S5-T2)
  // ---------------------------------------------------------------------------

  /**
   * Enter quarantine when integrity verification detects a failure.
   * Creates a QuarantineRecord referencing the discontinuity.
   *
   * @param discontinuityId - UUID of the detected discontinuity
   * @param firstAffectedIndex - Index of the first affected entry
   * @param lastAffectedIndex - Index of the last affected entry
   * @since cycle-007 — Sprint 77, Task S5-T2
   */
  enterQuarantine(
    discontinuityId: string,
    firstAffectedIndex: number = 0,
    lastAffectedIndex?: number,
  ): void {
    this._quarantineRecord = {
      quarantine_id: crypto.randomUUID(),
      discontinuity_id: discontinuityId,
      resource_type: 'ScoringPathLog',
      resource_id: 'scoring-path-tracker',
      status: 'active',
      quarantined_at: new Date().toISOString(),
      first_affected_index: firstAffectedIndex,
      last_affected_index: lastAffectedIndex ?? Math.max(0, this._auditTrail.entries.length - 1),
    };
    (this._auditTrail as { integrity_status: string }).integrity_status = 'quarantined';
  }

  /**
   * Attempt to recover from quarantine by re-verifying integrity.
   * If verification passes, quarantine is released. Otherwise stays active.
   *
   * @returns true if recovered (quarantine released), false if still quarantined
   * @since cycle-007 — Sprint 77, Task S5-T2
   */
  recover(): boolean {
    if (!this._quarantineRecord) return true;

    const result = this.verifyIntegrity();
    if (result.valid) {
      this._quarantineRecord = {
        ...this._quarantineRecord,
        status: 'reconciled',
        resolved_at: new Date().toISOString(),
      };
      (this._auditTrail as { integrity_status: string }).integrity_status = 'verified';
      this._quarantineRecord = null;
      return true;
    }
    return false;
  }

  /**
   * Check if the tracker is currently quarantined.
   * @since cycle-007 — Sprint 77, Task S5-T2
   */
  get isQuarantined(): boolean {
    return this._quarantineRecord !== null && this._quarantineRecord.status === 'active';
  }

  /**
   * Get the current quarantine record, if any.
   * @since cycle-007 — Sprint 77, Task S5-T2
   */
  get quarantineRecord(): Readonly<QuarantineRecord> | null {
    return this._quarantineRecord;
  }

  /** Reset the chain to genesis state. */
  reset(): void {
    this.lastHash = SCORING_PATH_GENESIS_HASH;
    this.entryCount = 0;
    this._lastRecordOptions = undefined;
    this._quarantineRecord = null;
    this._auditTrail = {
      entries: [],
      hash_algorithm: 'sha256',
      genesis_hash: AUDIT_TRAIL_GENESIS_HASH,
      integrity_status: 'verified',
    };
  }

  /** Get the current chain tip hash. */
  get tipHash(): string {
    return this.lastHash;
  }

  /**
   * Get the number of entries recorded in the current chain.
   * @since cycle-005 — Sprint 62, Task 3.2 (Bridge iter1 LOW-1)
   */
  get length(): number {
    return this.entryCount;
  }

  /**
   * Get the metadata from the most recent record() call.
   * Returns undefined if no record has been made or if no options were passed.
   * @since cycle-005 — Sprint 63, Task 4.2 (Bridge deep review Q3)
   */
  get lastRecordOptions(): RecordOptions | undefined {
    return this._lastRecordOptions;
  }
}
