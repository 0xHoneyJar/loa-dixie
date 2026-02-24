/**
 * Quality Feedback Loop — Review Outcome → Reputation Update Wiring
 *
 * Closes the autopoietic loop: review outcomes (bridge, flatline, audit)
 * generate quality events that update agent reputation via ReputationService.
 * The next enrichment context reflects the updated reputation, enabling
 * self-improving review quality.
 *
 * The feedback loop:
 * 1. Review produces findings (bridge/flatline/audit)
 * 2. Findings are converted to QualityEvent
 * 3. emitQualityEvent() appends to reputation event store
 * 4. Next enrichment context reflects updated reputation trajectory
 *
 * Guard against infinite recursion: quality events are one-directional.
 * Enrichment context assembly reads reputation but never emits events.
 * Event emission happens only at review completion, not during enrichment.
 *
 * See: SDD §2.3 (Autopoietic Loop), PRD FR-3 (Self-Improving Quality)
 * @since Sprint 11 (Global 53) — Task 11.4
 */

import type { ReputationService } from './reputation-service.js';
import type { ReputationEvent } from '../types/reputation-evolution.js';

// ---------------------------------------------------------------------------
// Quality Event Types
// ---------------------------------------------------------------------------

/** Source of a quality event — which review system produced the findings. */
export type QualityEventSource = 'bridge' | 'flatline' | 'audit';

/**
 * QualityEvent — a discrete quality observation from a review process.
 *
 * Captures the output of a review cycle: how many findings, their severity
 * distribution, and which agent produced the reviewed artifact. These events
 * feed into the reputation system to adjust the agent's reputation trajectory.
 */
export interface QualityEvent {
  /** Which review system produced this event. */
  readonly source: QualityEventSource;
  /** Total number of findings in the review. */
  readonly finding_count: number;
  /** Distribution of findings by severity level. */
  readonly severity_distribution: Record<string, number>;
  /** The dNFT ID of the agent whose work was reviewed. */
  readonly nft_id: string;
  /** ISO 8601 timestamp of the review completion. */
  readonly timestamp: string;
}

// ---------------------------------------------------------------------------
// Quality Score Computation
// ---------------------------------------------------------------------------

/**
 * Severity weights for computing a quality score from finding distributions.
 *
 * Higher severity findings have a greater negative impact on the quality
 * score. The weights are normalized so that a single BLOCKER finding
 * produces a score near 0, while zero findings produce a score of 1.0.
 */
const SEVERITY_WEIGHTS: Record<string, number> = {
  blocker: 1.0,
  high: 0.7,
  medium: 0.4,
  low: 0.15,
  info: 0.05,
};

/**
 * Compute a quality score [0, 1] from a quality event.
 *
 * The score is derived from the severity-weighted finding count:
 * - 0 findings → score = 1.0 (perfect)
 * - Many high-severity findings → score approaches 0.0
 *
 * Formula: score = 1 / (1 + weighted_count)
 * This is a soft sigmoid that asymptotically approaches 0 as findings
 * increase, but never reaches exactly 0 (no amount of findings should
 * permanently destroy reputation — Ostrom's graduated sanctions).
 */
export function computeQualityScore(event: QualityEvent): number {
  let weightedCount = 0;

  for (const [severity, count] of Object.entries(event.severity_distribution)) {
    const weight = SEVERITY_WEIGHTS[severity.toLowerCase()] ?? 0.1;
    weightedCount += count * weight;
  }

  // Soft sigmoid: 1 / (1 + weighted_count)
  return 1 / (1 + weightedCount);
}

// ---------------------------------------------------------------------------
// Quality Event Emission
// ---------------------------------------------------------------------------

/**
 * Emit a quality event into the reputation system.
 *
 * Converts the QualityEvent into a ReputationEvent and appends it to
 * the agent's event log via ReputationService. This closes the feedback
 * loop: review findings → reputation update → future enrichment context.
 *
 * Guard: This function does NOT trigger enrichment context assembly.
 * It only writes to the event store. The enrichment service reads from
 * the store independently, preventing infinite recursion.
 *
 * @param event - The quality event from a review process
 * @param reputationService - The reputation service for event storage
 */
export async function emitQualityEvent(
  event: QualityEvent,
  reputationService: ReputationService,
): Promise<void> {
  const score = computeQualityScore(event);

  const reputationEvent: ReputationEvent = {
    type: 'quality_signal',
    timestamp: event.timestamp,
    payload: {
      source: event.source,
      finding_count: event.finding_count,
      severity_distribution: event.severity_distribution,
      score,
    },
  };

  await reputationService.store.appendEvent(event.nft_id, reputationEvent);
}

/**
 * Create a quality event from review findings.
 *
 * Convenience factory that constructs a QualityEvent with the current
 * timestamp. Callers provide the source, finding count, and severity
 * breakdown.
 *
 * @param source - Which review system produced the findings
 * @param nftId - The dNFT ID of the agent whose work was reviewed
 * @param findingCount - Total number of findings
 * @param severityDistribution - Distribution of findings by severity
 * @returns A timestamped QualityEvent
 */
export function createQualityEvent(
  source: QualityEventSource,
  nftId: string,
  findingCount: number,
  severityDistribution: Record<string, number>,
): QualityEvent {
  return {
    source,
    finding_count: findingCount,
    severity_distribution: severityDistribution,
    nft_id: nftId,
    timestamp: new Date().toISOString(),
  };
}
