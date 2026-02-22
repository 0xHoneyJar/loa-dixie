import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ConvictionTier } from '../types/conviction.js';

/**
 * Knowledge Priority Store — Communitarian Knowledge Governance
 *
 * Task 21.1 (Sprint 21, Global 40): In-memory store tracking community
 * priority votes on knowledge sources. Each vote is wallet → sourceId → priority,
 * weighted by conviction tier. Implements Ostrom Principle 3: collective-choice
 * arrangements — those affected by the rules can participate in modifying them.
 *
 * Task 22.4 (Sprint 22, Global 41): Added debounced JSON file persistence.
 * Votes survive process restarts when persistPath is configured.
 *
 * Task 23.2 (Sprint 23, Global 42): Added schema versioning to persistence
 * format. Writes `{ version: 1, entries: [...] }`, reads both versioned and
 * legacy raw-array formats for backward compatibility.
 *
 * Score formula: sum(vote.priority * TIER_WEIGHTS[vote.tier]) per source.
 *
 * Pattern: Conviction-weighted quadratic governance. Higher stake = more weight,
 * but participation is gated at 'participant' tier (observers cannot vote).
 *
 * See: Deep Bridgebuilder Meditation §VII.3, Ostrom's Commons Governance
 */

/** A single priority vote from a wallet on a knowledge source */
export interface PriorityVote {
  readonly wallet: string;
  readonly sourceId: string;
  readonly priority: number; // 1 (low) to 5 (critical)
  readonly tier: ConvictionTier;
  readonly timestamp: string;
}

/** Aggregated priority for a knowledge source */
export interface AggregatedPriority {
  readonly sourceId: string;
  readonly score: number;
  readonly voteCount: number;
}

/** Construction options */
export interface KnowledgePriorityStoreOptions {
  /** Path for JSON file persistence. Omit for in-memory only. */
  persistPath?: string;
  /** Debounce interval in ms for writes (default: 5000) */
  persistDebounceMs?: number;
}

/** Versioned persistence format (Task 23.2) */
interface PersistedPriorityData {
  readonly version: 1;
  readonly entries: Array<[string, PriorityVote]>;
}

/** Tier weight multipliers — higher conviction = more governance weight */
const TIER_WEIGHTS: Record<ConvictionTier, number> = {
  observer: 0, // Cannot vote (Ostrom Principle 3: must participate to govern)
  participant: 1,
  builder: 3,
  architect: 10,
  sovereign: 25,
};

export class KnowledgePriorityStore {
  private readonly votes = new Map<string, PriorityVote>();
  private readonly persistPath: string | null;
  private readonly persistDebounceMs: number;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts?: KnowledgePriorityStoreOptions) {
    this.persistPath = opts?.persistPath ?? null;
    this.persistDebounceMs = opts?.persistDebounceMs ?? 5000;
    if (this.persistPath) {
      this.loadFromDisk();
    }
  }

  /** Cast or update a priority vote. Key: `${wallet}:${sourceId}` (latest wins). */
  vote(v: PriorityVote): void {
    const key = `${v.wallet}:${v.sourceId}`;
    this.votes.set(key, v);
    this.schedulePersist();
  }

  /** Get all votes for a specific source */
  getVotes(sourceId: string): ReadonlyArray<PriorityVote> {
    return [...this.votes.values()].filter((v) => v.sourceId === sourceId);
  }

  /** Compute conviction-weighted aggregate priorities across all sources */
  getAggregatedPriorities(): ReadonlyArray<AggregatedPriority> {
    const aggregates = new Map<string, { score: number; count: number }>();

    for (const vote of this.votes.values()) {
      const weight = TIER_WEIGHTS[vote.tier];
      if (weight === 0) continue; // Observers excluded

      const existing = aggregates.get(vote.sourceId) ?? { score: 0, count: 0 };
      existing.score += vote.priority * weight;
      existing.count += 1;
      aggregates.set(vote.sourceId, existing);
    }

    return [...aggregates.entries()]
      .map(([sourceId, { score, count }]) => ({
        sourceId,
        score,
        voteCount: count,
      }))
      .sort((a, b) => b.score - a.score); // Highest score first
  }

  /** Count of unique wallets that have cast at least one vote */
  getVoterCount(): number {
    const wallets = new Set<string>();
    for (const vote of this.votes.values()) {
      if (TIER_WEIGHTS[vote.tier] > 0) {
        wallets.add(vote.wallet);
      }
    }
    return wallets.size;
  }

  /** Clear all votes (testing utility) */
  clear(): void {
    this.votes.clear();
  }

  /** Flush pending writes and clear the debounce timer. Call before shutdown. */
  destroy(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.persistPath && this.votes.size > 0) {
      this.writeToDisk();
    }
  }

  /**
   * Load votes from disk on construction.
   * Handles both versioned format ({ version: 1, entries: [...] }) and
   * legacy raw-array format (Array<[string, PriorityVote]>).
   * Task 23.2: Schema versioning for forward-compatible migrations.
   */
  private loadFromDisk(): void {
    if (!this.persistPath) return;
    try {
      const raw = fs.readFileSync(this.persistPath, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedPriorityData | Array<[string, PriorityVote]>;

      let entries: Array<[string, PriorityVote]>;
      if (Array.isArray(parsed)) {
        // Legacy v0 format: raw array of [key, vote] tuples
        entries = parsed;
      } else if (parsed && typeof parsed === 'object' && 'version' in parsed) {
        // Versioned format (v1+)
        entries = parsed.entries;
      } else {
        // Unrecognized format — start fresh
        return;
      }

      for (const [key, vote] of entries) {
        this.votes.set(key, vote);
      }
    } catch {
      // File doesn't exist or is corrupt — start fresh
    }
  }

  /**
   * Write votes to disk with schema versioning.
   * Synchronous for simplicity — debounced to limit I/O.
   * Task 23.2: Wraps entries in { version: 1, entries: [...] }.
   */
  private writeToDisk(): void {
    if (!this.persistPath) return;
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data: PersistedPriorityData = {
        version: 1,
        entries: [...this.votes.entries()],
      };
      fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Persistence failure is non-fatal — votes remain in memory
    }
  }

  /** Schedule a debounced write to disk */
  private schedulePersist(): void {
    if (!this.persistPath) return;
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.writeToDisk();
      this.persistTimer = null;
    }, this.persistDebounceMs);
  }
}
