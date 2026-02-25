/**
 * Knowledge Governance Types — The Third Witness.
 *
 * Defines types for knowledge freshness governance, aligned with
 * Hounfour's GovernedFreshness schema. Knowledge becomes the third
 * ResourceGovernor<T> implementation alongside reputation and scoring.
 *
 * @since cycle-009 Sprint 3 — Task 3.1 (FR-4)
 */

/** Knowledge freshness lifecycle states. */
export type KnowledgeFreshnessState = 'fresh' | 'decaying' | 'stale' | 'expired';

/**
 * A single knowledge corpus item under governance.
 * Aligned with Hounfour GovernedFreshness schema fields.
 */
export interface KnowledgeItem {
  readonly corpus_id: string;
  readonly source_count: number;
  readonly citation_count: number;
  readonly freshness_score: number;
  readonly freshness_state: KnowledgeFreshnessState;
  readonly last_ingested: string;
  readonly decay_rate: number;
  readonly minimum_freshness: number;
  readonly dimension_scores: {
    accuracy: number;
    coverage: number;
    recency: number;
  };
}

/**
 * Knowledge governance events — discriminated union.
 * Tracks all mutations to knowledge freshness state.
 */
export type KnowledgeEvent =
  | KnowledgeIngestEvent
  | KnowledgeDecayEvent
  | KnowledgeCitationEvent
  | KnowledgeRetractionEvent;

export interface KnowledgeIngestEvent {
  readonly type: 'knowledge.ingest';
  readonly corpus_id: string;
  readonly timestamp: string;
  readonly source_count_delta: number;
  readonly new_freshness_score: number;
}

export interface KnowledgeDecayEvent {
  readonly type: 'knowledge.decay';
  readonly corpus_id: string;
  readonly timestamp: string;
  readonly previous_score: number;
  readonly new_score: number;
  readonly previous_state: KnowledgeFreshnessState;
  readonly new_state: KnowledgeFreshnessState;
}

export interface KnowledgeCitationEvent {
  readonly type: 'knowledge.citation';
  readonly corpus_id: string;
  readonly timestamp: string;
  readonly citation_source: string;
  readonly citation_count_delta: number;
}

export interface KnowledgeRetractionEvent {
  readonly type: 'knowledge.retraction';
  readonly corpus_id: string;
  readonly timestamp: string;
  readonly reason: string;
  readonly sources_removed: number;
}

/**
 * Factory for creating a default (fresh) knowledge item.
 */
export function createKnowledgeItem(
  corpusId: string,
  overrides?: Partial<KnowledgeItem>,
): KnowledgeItem {
  return {
    corpus_id: corpusId,
    source_count: 0,
    citation_count: 0,
    freshness_score: 1.0,
    freshness_state: 'fresh',
    last_ingested: new Date().toISOString(),
    decay_rate: 0.023,
    minimum_freshness: 0.1,
    dimension_scores: { accuracy: 0, coverage: 0, recency: 1.0 },
    ...overrides,
  };
}
