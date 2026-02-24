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

  /**
   * Record a scoring path entry, computing its hash and linking to the chain.
   *
   * @param entry - Partial ScoringPathLog with content fields (path, model_id, task_type, reason)
   * @returns Complete ScoringPathLog with entry_hash, previous_hash, and scored_at
   */
  record(entry: Pick<ScoringPathLog, 'path' | 'model_id' | 'task_type' | 'reason'>): ScoringPathLog {
    const scored_at = new Date().toISOString();
    const hashInput = {
      path: entry.path,
      ...(entry.model_id !== undefined && { model_id: entry.model_id }),
      ...(entry.task_type !== undefined && { task_type: entry.task_type }),
      ...(entry.reason !== undefined && { reason: entry.reason }),
      scored_at,
    };

    const entry_hash = computeScoringPathHash(hashInput);
    const previous_hash = this.lastHash;
    this.lastHash = entry_hash;

    return {
      path: entry.path,
      ...(entry.model_id !== undefined && { model_id: entry.model_id }),
      ...(entry.task_type !== undefined && { task_type: entry.task_type }),
      ...(entry.reason !== undefined && { reason: entry.reason }),
      scored_at,
      entry_hash,
      previous_hash,
    };
  }

  /** Reset the chain to genesis state. */
  reset(): void {
    this.lastHash = SCORING_PATH_GENESIS_HASH;
  }

  /** Get the current chain tip hash. */
  get tipHash(): string {
    return this.lastHash;
  }
}
