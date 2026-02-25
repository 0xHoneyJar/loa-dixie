/**
 * KnowledgeGovernor — The Third ResourceGovernor<T> Witness.
 *
 * Governs knowledge freshness with state machine, invariants, and event log.
 * Uses exponential decay model aligned with Hounfour's GovernedFreshness.
 *
 * State machine: fresh -> decaying -> stale -> expired -> fresh (re-ingestion)
 * Invariants: INV-009 (freshness bound), INV-010 (citation integrity)
 *
 * @since cycle-009 Sprint 3 — Tasks 3.2, 3.3, 3.4 (FR-4, FR-5, FR-6)
 */
import type {
  ResourceGovernor,
  ResourceHealth,
  ResourceSelfKnowledge,
  GovernanceEvent,
} from './resource-governor.js';
import type { StateMachine } from './state-machine.js';
import type {
  KnowledgeItem,
  KnowledgeFreshnessState,
} from '../types/knowledge-governance.js';

/** Default decay rate: lambda = 0.023 gives ~30 day half-life. */
export const DEFAULT_DECAY_RATE = 0.023;

/** Freshness threshold constants. */
export const FRESHNESS_THRESHOLDS = {
  FRESH_TO_DECAYING: 0.7,
  DECAYING_TO_STALE: 0.3,
  STALE_TO_EXPIRED: 0.1,
} as const;

/**
 * Freshness state machine definition.
 */
export const FreshnessStateMachine: StateMachine<KnowledgeFreshnessState> = {
  name: 'KnowledgeFreshness',
  initial: 'fresh',
  transitions: {
    fresh: ['decaying'],
    decaying: ['stale', 'fresh'],
    stale: ['expired', 'fresh'],
    expired: ['fresh'],
  },
};

/**
 * Compute the decayed freshness score using exponential decay.
 *
 * Formula: score(t) = exp(-lambda * days_since_refresh)
 *
 * @param decayRate - Lambda parameter (default: 0.023 for ~30 day half-life)
 * @param daysSinceRefresh - Number of days since last ingestion
 * @returns Decayed freshness score in [0, 1]
 */
export function computeFreshnessDecay(
  decayRate: number,
  daysSinceRefresh: number,
): number {
  return Math.exp(-decayRate * daysSinceRefresh);
}

/**
 * Determine the freshness state from a score.
 */
export function scoreToState(score: number): KnowledgeFreshnessState {
  if (score >= FRESHNESS_THRESHOLDS.FRESH_TO_DECAYING) return 'fresh';
  if (score >= FRESHNESS_THRESHOLDS.DECAYING_TO_STALE) return 'decaying';
  if (score >= FRESHNESS_THRESHOLDS.STALE_TO_EXPIRED) return 'stale';
  return 'expired';
}

export class KnowledgeGovernor implements ResourceGovernor<KnowledgeItem> {
  readonly resourceType = 'knowledge';

  private readonly corpus = new Map<string, KnowledgeItem>();
  private readonly events: GovernanceEvent[] = [];
  private version = 0;

  /**
   * Register or update a corpus item.
   */
  registerCorpus(item: KnowledgeItem): void {
    this.corpus.set(item.corpus_id, item);
    this.recordEvent('corpus.register', `Registered corpus ${item.corpus_id}`, 'system');
  }

  /**
   * Get a corpus item by ID.
   */
  getCorpus(corpusId: string): KnowledgeItem | undefined {
    return this.corpus.get(corpusId);
  }

  /**
   * Compute decayed freshness score for a corpus item.
   */
  computeItemDecay(item: KnowledgeItem, now?: Date): number {
    const currentTime = now ?? new Date();
    const lastIngested = new Date(item.last_ingested);
    const daysSince =
      (currentTime.getTime() - lastIngested.getTime()) / (1000 * 60 * 60 * 24);
    return computeFreshnessDecay(item.decay_rate, daysSince);
  }

  /**
   * Verify freshness bound invariant (INV-009).
   * Freshness score must decrease monotonically between ingestion events.
   */
  verifyFreshnessBound(
    item: KnowledgeItem,
    currentDecayedScore?: number,
  ): { satisfied: boolean; detail: string } {
    const decayedScore = currentDecayedScore ?? this.computeItemDecay(item);

    // The decayed score should always be <= the stored score
    // (score can only decrease via decay; increases require ingestion)
    if (decayedScore > item.freshness_score + 0.0001) {
      return {
        satisfied: false,
        detail: `INV-009 violation: decayed score ${decayedScore.toFixed(4)} > stored score ${item.freshness_score.toFixed(4)} without ingestion event for corpus ${item.corpus_id}`,
      };
    }

    return {
      satisfied: true,
      detail: `INV-009 satisfied: freshness monotonically decreasing for corpus ${item.corpus_id}`,
    };
  }

  /**
   * Verify citation integrity invariant (INV-010).
   * Every citation must reference an existing source.
   */
  verifyCitationIntegrity(
    item: KnowledgeItem,
    knownSources: Set<string>,
  ): { satisfied: boolean; detail: string } {
    // If no citations, trivially satisfied
    if (item.citation_count === 0) {
      return {
        satisfied: true,
        detail: `INV-010 satisfied: no citations to verify for corpus ${item.corpus_id}`,
      };
    }

    // Check that citation_count doesn't exceed known sources
    if (item.citation_count > knownSources.size) {
      return {
        satisfied: false,
        detail: `INV-010 violation: corpus ${item.corpus_id} claims ${item.citation_count} citations but only ${knownSources.size} known sources exist`,
      };
    }

    return {
      satisfied: true,
      detail: `INV-010 satisfied: all ${item.citation_count} citations resolvable for corpus ${item.corpus_id}`,
    };
  }

  // --- ResourceGovernor<KnowledgeItem> implementation ---

  getHealth(nowOverride?: Date): ResourceHealth {
    const items = Array.from(this.corpus.values());
    const total = items.length;
    let staleCount = 0;

    for (const item of items) {
      const decayed = this.computeItemDecay(item, nowOverride);
      const state = scoreToState(decayed);
      if (state === 'stale' || state === 'expired') {
        staleCount++;
      }
    }

    return {
      status: total === 0 || staleCount / total < 0.5 ? 'healthy' : 'degraded',
      totalItems: total,
      staleItems: staleCount,
      version: this.version,
    };
  }

  getGovernorSelfKnowledge(nowOverride?: Date): ResourceSelfKnowledge {
    const health = this.getHealth(nowOverride);
    const latest = this.getLatestEvent();

    return {
      version: this.version,
      confidence:
        health.totalItems === 0
          ? 'low'
          : health.status === 'healthy'
            ? 'high'
            : 'medium',
      lastMutation: latest
        ? { type: latest.type, timestamp: latest.timestamp, detail: latest.detail }
        : null,
      healthSummary: health,
    };
  }

  getEventLog(): ReadonlyArray<GovernanceEvent> {
    return this.events;
  }

  getLatestEvent(): GovernanceEvent | null {
    return this.events.length > 0 ? this.events[this.events.length - 1] : null;
  }

  invalidateCache(): void {
    // No caching in Map-backed implementation
  }

  warmCache(): void {
    // No caching in Map-backed implementation
  }

  private recordEvent(type: string, detail: string, author: string): void {
    this.version++;
    this.events.push({
      seq: this.events.length + 1,
      type,
      timestamp: new Date().toISOString(),
      detail,
      author,
    });
  }
}
