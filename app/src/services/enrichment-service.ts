/**
 * Enrichment Service — Governance Context Assembly for Review Prompt Enrichment
 *
 * Assembles governance context from in-memory caches for injection into
 * review prompts (bridge, flatline, audit). The enrichment context provides
 * reviewers with live governance state so their recommendations are grounded
 * in the community's actual conviction, reputation, and conformance data.
 *
 * All data is sourced from in-memory caches — no database calls in the hot
 * path. This ensures the enrichment service meets the 50ms latency budget
 * defined in the endpoint specification.
 *
 * Context dimensions:
 * - Conviction tier distribution: agent counts per tier, aggregate BGT staked
 * - Conformance metrics: violation rate, top violated schemas, sample rate
 * - Reputation trajectories: trending up/down/stable for requesting agent's tier
 * - Knowledge governance: active votes, priority rankings
 *
 * See: SDD §2.3 (Autopoietic Loop), PRD FR-3 (Self-Improving Quality)
 * @since Sprint 11 (Global 53) — Enrichment Endpoint & Self-Improving Loop Activation
 */

import type { ReputationService, ReputationAggregate } from './reputation-service.js';
import type { ConvictionTier } from '../types/conviction.js';
import { TIER_ORDER } from '../types/conviction.js';

// ---------------------------------------------------------------------------
// Context Types
// ---------------------------------------------------------------------------

/** Conviction tier distribution snapshot for enrichment context. */
export interface ConvictionContext {
  /** Count of agents per conviction tier. */
  readonly tier_distribution: Record<ConvictionTier, number>;
  /** Total BGT staked across all tiers (approximation from tier thresholds). */
  readonly total_bgt_staked: number;
  /** Snapshot timestamp. */
  readonly snapshot_at: string;
}

/** Conformance metrics snapshot for enrichment context. */
export interface ConformanceContext {
  /** Violation rate as a fraction [0, 1]. */
  readonly violation_rate: number;
  /** Top violated schema names (up to 5). */
  readonly top_violated_schemas: string[];
  /** Current conformance sample rate. */
  readonly sample_rate: number;
  /** Total violations observed in the current window. */
  readonly total_violations: number;
  /** Snapshot timestamp. */
  readonly snapshot_at: string;
}

/** Reputation trajectory for enrichment context. */
export interface ReputationContext {
  /** Trend direction for the requesting agent. */
  readonly trajectory: 'improving' | 'declining' | 'stable' | 'cold';
  /** Current blended score (or null if cold). */
  readonly blended_score: number | null;
  /** Number of quality observations. */
  readonly sample_count: number;
  /** Reputation state. */
  readonly reputation_state: string;
  /** Snapshot timestamp. */
  readonly snapshot_at: string;
}

/** Knowledge governance state for enrichment context. */
export interface KnowledgeContext {
  /** Number of active priority votes. */
  readonly active_votes: number;
  /** Top-ranked knowledge sources by community priority. */
  readonly priority_rankings: Array<{ sourceId: string; score: number }>;
  /** Snapshot timestamp. */
  readonly snapshot_at: string;
}

/** Full enrichment context assembled by EnrichmentService. */
export interface EnrichmentContext {
  readonly conviction_context: ConvictionContext;
  readonly conformance_context: ConformanceContext;
  readonly reputation_context: ReputationContext;
  readonly knowledge_context: KnowledgeContext;
  /** ISO 8601 timestamp of assembly. */
  readonly assembled_at: string;
  /** Whether the context is partial (some sources timed out or were unavailable). */
  readonly partial: boolean;
}

// ---------------------------------------------------------------------------
// Metrics Source Interfaces (optional injection)
// ---------------------------------------------------------------------------

/**
 * Interface for conformance metrics source.
 * Implementations provide in-memory conformance state without database calls.
 */
export interface ConformanceMetricsSource {
  getViolationRate(): number;
  getTopViolatedSchemas(limit: number): string[];
  getSampleRate(): number;
  getTotalViolations(): number;
}

/**
 * Interface for knowledge governance metrics source.
 * Implementations provide in-memory vote/priority state.
 */
export interface KnowledgeMetricsSource {
  getActiveVoteCount(): number;
  getTopPriorities(limit: number): Array<{ sourceId: string; score: number }>;
}

// ---------------------------------------------------------------------------
// Default (Stub) Metrics Sources
// ---------------------------------------------------------------------------

/** No-op conformance metrics source for when no conformance data is available. */
class DefaultConformanceMetrics implements ConformanceMetricsSource {
  getViolationRate(): number { return 0; }
  getTopViolatedSchemas(_limit: number): string[] { return []; }
  getSampleRate(): number { return 0; }
  getTotalViolations(): number { return 0; }
}

/** No-op knowledge metrics source for when no knowledge governance data is available. */
class DefaultKnowledgeMetrics implements KnowledgeMetricsSource {
  getActiveVoteCount(): number { return 0; }
  getTopPriorities(_limit: number): Array<{ sourceId: string; score: number }> { return []; }
}

// ---------------------------------------------------------------------------
// EnrichmentService
// ---------------------------------------------------------------------------

export interface EnrichmentServiceDeps {
  reputationService: ReputationService;
  conformanceMetrics?: ConformanceMetricsSource;
  knowledgeMetrics?: KnowledgeMetricsSource;
}

/**
 * EnrichmentService — assembles governance context for review prompt enrichment.
 *
 * All assembly methods operate on in-memory data. No I/O in the hot path
 * ensures sub-50ms assembly times for the enrichment endpoint.
 *
 * @since Sprint 11 (Global 53) — Task 11.1
 */
export class EnrichmentService {
  private readonly reputationService: ReputationService;
  private readonly conformanceMetrics: ConformanceMetricsSource;
  private readonly knowledgeMetrics: KnowledgeMetricsSource;

  constructor(deps: EnrichmentServiceDeps) {
    this.reputationService = deps.reputationService;
    this.conformanceMetrics = deps.conformanceMetrics ?? new DefaultConformanceMetrics();
    this.knowledgeMetrics = deps.knowledgeMetrics ?? new DefaultKnowledgeMetrics();
  }

  /**
   * Assemble the full enrichment context for a given nftId.
   *
   * Gathers conviction distribution, conformance metrics, reputation
   * trajectories, and knowledge governance state into a single structured
   * context suitable for injection into review prompts.
   *
   * @param nftId - The dNFT ID of the requesting agent
   * @returns Structured governance context for review enrichment
   */
  async assembleContext(nftId: string): Promise<EnrichmentContext> {
    const now = new Date().toISOString();

    // All assembly methods are in-memory — no I/O latency
    const [convictionContext, conformanceContext, reputationContext, knowledgeContext] =
      await Promise.all([
        this.assembleConvictionContext(now),
        this.assembleConformanceContext(now),
        this.assembleReputationContext(nftId, now),
        this.assembleKnowledgeContext(now),
      ]);

    return {
      conviction_context: convictionContext,
      conformance_context: conformanceContext,
      reputation_context: reputationContext,
      knowledge_context: knowledgeContext,
      assembled_at: now,
      partial: false,
    };
  }

  // -----------------------------------------------------------------------
  // Private Assembly Methods
  // -----------------------------------------------------------------------

  /** Cached tier distribution — refreshed every 5 minutes */
  private tierDistCache: { distribution: Record<ConvictionTier, number>; expiresAt: number } | null = null;
  private static readonly TIER_DIST_TTL_MS = 5 * 60 * 1000;

  /**
   * Assemble conviction tier distribution from reputation store.
   *
   * Scans all aggregates and maps reputation state to tier:
   * - cold → observer
   * - warming → participant
   * - established → builder (default) or architect (blended_score >= 0.7)
   * - authoritative → sovereign
   *
   * Results are cached in-memory for 5 minutes to avoid repeated scans.
   * Falls back to hardcoded estimate if store is empty.
   */
  private async assembleConvictionContext(now: string): Promise<ConvictionContext> {
    const distribution = await this.getTierDistribution();

    return {
      tier_distribution: distribution,
      total_bgt_staked: 0, // Not available from in-memory caches; requires freeside aggregation
      snapshot_at: now,
    };
  }

  private async getTierDistribution(): Promise<Record<ConvictionTier, number>> {
    const nowMs = Date.now();
    if (this.tierDistCache && nowMs < this.tierDistCache.expiresAt) {
      return this.tierDistCache.distribution;
    }

    const distribution: Record<ConvictionTier, number> = {
      observer: 0,
      participant: 0,
      builder: 0,
      architect: 0,
      sovereign: 0,
    };

    const aggregates = await this.reputationService.store.listAll();

    if (aggregates.length === 0) {
      // No data — use hardcoded estimate based on total count
      const count = await this.reputationService.store.count();
      if (count > 0) {
        distribution.observer = Math.max(1, Math.floor(count * 0.3));
        distribution.participant = Math.max(1, Math.floor(count * 0.3));
        distribution.builder = Math.max(1, Math.floor(count * 0.25));
        distribution.architect = Math.floor(count * 0.1);
        distribution.sovereign = Math.floor(count * 0.05);
      }
    } else {
      for (const { aggregate } of aggregates) {
        switch (aggregate.state) {
          case 'cold':
            distribution.observer++;
            break;
          case 'warming':
            distribution.participant++;
            break;
          case 'established':
            // Differentiate builder/architect by blended score
            if (aggregate.blended_score !== null && aggregate.blended_score >= 0.7) {
              distribution.architect++;
            } else {
              distribution.builder++;
            }
            break;
          case 'authoritative':
            distribution.sovereign++;
            break;
          default:
            distribution.observer++;
        }
      }
    }

    this.tierDistCache = { distribution, expiresAt: nowMs + EnrichmentService.TIER_DIST_TTL_MS };
    return distribution;
  }

  /**
   * Assemble conformance metrics from the conformance metrics source.
   */
  private async assembleConformanceContext(now: string): Promise<ConformanceContext> {
    return {
      violation_rate: this.conformanceMetrics.getViolationRate(),
      top_violated_schemas: this.conformanceMetrics.getTopViolatedSchemas(5),
      sample_rate: this.conformanceMetrics.getSampleRate(),
      total_violations: this.conformanceMetrics.getTotalViolations(),
      snapshot_at: now,
    };
  }

  /**
   * Assemble reputation trajectory for the requesting agent.
   *
   * Derives trajectory from the event history: compares recent score
   * direction to determine if reputation is improving, declining, or stable.
   */
  private async assembleReputationContext(nftId: string, now: string): Promise<ReputationContext> {
    const aggregate = await this.reputationService.store.get(nftId);

    if (!aggregate || aggregate.personal_score === null) {
      return {
        trajectory: 'cold',
        blended_score: null,
        sample_count: 0,
        reputation_state: 'cold',
        snapshot_at: now,
      };
    }

    // Determine trajectory from event history
    const trajectory = await this.computeTrajectory(nftId, aggregate);

    return {
      trajectory,
      blended_score: aggregate.blended_score,
      sample_count: aggregate.sample_count,
      reputation_state: aggregate.state,
      snapshot_at: now,
    };
  }

  /**
   * Compute reputation trajectory from event history.
   *
   * Compares the first half vs second half of recent events to determine
   * whether the agent's reputation is trending up, down, or stable.
   * Returns 'stable' when insufficient data exists to determine a trend.
   */
  private async computeTrajectory(
    nftId: string,
    aggregate: ReputationAggregate,
  ): Promise<'improving' | 'declining' | 'stable'> {
    const events = await this.reputationService.store.getEventHistory(nftId);

    if (events.length < 2) {
      return 'stable';
    }

    // Look at quality_signal events only for trajectory
    const qualityEvents = events.filter(e => e.type === 'quality_signal');
    if (qualityEvents.length < 2) {
      return 'stable';
    }

    // Simple trend: compare average score of first half vs second half
    const mid = Math.floor(qualityEvents.length / 2);
    const firstHalf = qualityEvents.slice(0, mid);
    const secondHalf = qualityEvents.slice(mid);

    const avgScore = (evts: typeof qualityEvents): number => {
      const scores = evts
        .map(e => {
          const payload = e.payload as { score?: number } | null;
          return payload?.score ?? null;
        })
        .filter((s): s is number => s !== null);
      if (scores.length === 0) return 0;
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    };

    const firstAvg = avgScore(firstHalf);
    const secondAvg = avgScore(secondHalf);
    const delta = secondAvg - firstAvg;

    // Threshold: 5% change is significant
    if (delta > 0.05) return 'improving';
    if (delta < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * Assemble knowledge governance state from the knowledge metrics source.
   */
  private async assembleKnowledgeContext(now: string): Promise<KnowledgeContext> {
    return {
      active_votes: this.knowledgeMetrics.getActiveVoteCount(),
      priority_rankings: this.knowledgeMetrics.getTopPriorities(10),
      snapshot_at: now,
    };
  }
}
