/**
 * ScoringPathTracker — Hash chain audit trail for scoring path decisions.
 *
 * Manages a tamper-evident hash chain of ScoringPathLog entries. Each call
 * to `record()` computes `entry_hash` via `computeScoringPathHash()` (RFC 8785
 * canonical JSON + SHA-256) and links to the previous entry via `previous_hash`.
 * The first entry links to `SCORING_PATH_GENESIS_HASH`.
 *
 * The hash chain provides:
 * 1. Tamper evidence: Any modification to a historical entry breaks the chain
 * 2. Ordering proof: Entries are provably sequential via hash linking
 * 3. Audit trail: Full history of scoring decisions with cryptographic integrity
 *
 * See: Hounfour v7.11.0 ADR-005 (Scoring Path Hash Chain), SDD §3.3
 * @since cycle-005 — Sprint 61 (Hash Chain Implementation)
 */
import {
  computeScoringPathHash,
  SCORING_PATH_GENESIS_HASH,
} from '@0xhoneyjar/loa-hounfour/governance';
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
 */
export interface RecordOptions {
  reputation_freshness?: ReputationFreshness;
}

/**
 * ScoringPathTracker — stateful hash chain manager.
 *
 * Usage:
 * ```ts
 * const tracker = new ScoringPathTracker();
 * const entry1 = tracker.record({ path: 'tier_default', reason: '...' });
 * // entry1.previous_hash === SCORING_PATH_GENESIS_HASH
 * const entry2 = tracker.record({ path: 'aggregate', reason: '...' });
 * // entry2.previous_hash === entry1.entry_hash
 * ```
 */
export class ScoringPathTracker {
  private lastHash: string = SCORING_PATH_GENESIS_HASH;
  private entryCount: number = 0;
  private _lastRecordOptions?: RecordOptions;

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

    return {
      ...contentFields,
      entry_hash,
      previous_hash,
    };
  }

  /** Reset the chain to genesis state. */
  reset(): void {
    this.lastHash = SCORING_PATH_GENESIS_HASH;
    this.entryCount = 0;
    this._lastRecordOptions = undefined;
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
