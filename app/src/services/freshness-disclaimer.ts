import type { SelfKnowledgeResponse } from './corpus-meta.js';

/**
 * Freshness disclaimer for Oracle responses (Task 19.2: Adaptive Retrieval).
 *
 * When the Oracle's knowledge confidence is degraded, responses should include
 * a disclaimer identifying potentially stale domains. This is the epistemic
 * equivalent of Google Spanner's TrueTime uncertainty — when you know your
 * knowledge is uncertain, communicate that uncertainty.
 *
 * See: Sprint 19 (Adaptive Retrieval from Self-Knowledge), PRD FR-10
 */

/** Freshness disclaimer generated from self-knowledge */
export interface FreshnessDisclaimer {
  /** Whether a disclaimer should be shown to the user */
  readonly shouldDisclaim: boolean;
  /** Knowledge confidence level */
  readonly confidence: 'high' | 'medium' | 'low';
  /** Human-readable disclaimer message, null if confidence is high */
  readonly message: string | null;
  /** Source IDs that are stale */
  readonly staleDomains: readonly string[];
}

/**
 * Generate a freshness disclaimer from self-knowledge data.
 *
 * Pure function — no side effects. Maps stale source IDs to human-readable
 * descriptions for inclusion in API responses.
 *
 * Disclaimer rules:
 * - confidence 'high' → no disclaimer
 * - confidence 'medium' → warning with stale source list
 * - confidence 'low' → strong disclaimer with stale domains
 */
export function generateDisclaimer(selfKnowledge: SelfKnowledgeResponse): FreshnessDisclaimer {
  const { confidence, freshness } = selfKnowledge;
  const staleDomains = freshness.staleSources;

  if (confidence === 'high') {
    return {
      shouldDisclaim: false,
      confidence,
      message: null,
      staleDomains: [],
    };
  }

  if (confidence === 'medium') {
    const sourceList = staleDomains.join(', ');
    return {
      shouldDisclaim: true,
      confidence,
      message: `Some knowledge sources may be outdated: ${sourceList}. Responses in these domains may not reflect the latest information.`,
      staleDomains,
    };
  }

  // confidence === 'low'
  const sourceList = staleDomains.join(', ');
  return {
    shouldDisclaim: true,
    confidence,
    message: `Knowledge freshness is degraded. The following sources may be stale: ${sourceList}. Responses should be verified against current data.`,
    staleDomains,
  };
}
