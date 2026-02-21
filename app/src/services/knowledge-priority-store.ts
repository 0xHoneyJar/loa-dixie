import type { ConvictionTier } from '../types/conviction.js';

/**
 * Knowledge Priority Store — Communitarian Knowledge Governance
 *
 * Task 21.1 (Sprint 21, Global 40): In-memory store tracking community
 * priority votes on knowledge sources. Each vote is wallet → sourceId → priority,
 * weighted by conviction tier. Implements Ostrom Principle 3: collective-choice
 * arrangements — those affected by the rules can participate in modifying them.
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

  /** Cast or update a priority vote. Key: `${wallet}:${sourceId}` (latest wins). */
  vote(v: PriorityVote): void {
    const key = `${v.wallet}:${v.sourceId}`;
    this.votes.set(key, v);
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
}
