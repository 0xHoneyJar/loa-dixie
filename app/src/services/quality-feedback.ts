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
 * 2. Findings are converted to QualityObservation (v8.2.0)
 * 3. emitQualityEvent() / emitModelPerformanceEvent() appends to reputation event store
 * 4. Next enrichment context reflects updated reputation trajectory
 *
 * Guard against infinite recursion: quality events are one-directional.
 * Enrichment context assembly reads reputation but never emits events.
 * Event emission happens only at review completion, not during enrichment.
 *
 * v8.2.0 changes:
 * - QualityEvent replaced with QualityObservation (protocol schema)
 * - buildQualityObservation() produces structured quality results with dimensions
 * - emitModelPerformanceEvent() closes the autopoietic feedback loop (4th variant)
 * - emitQualityEvent() updated to construct v8.2.0 flat QualitySignalEvent format
 *
 * See: SDD §2.3 (Autopoietic Loop), PRD FR-1 (ModelPerformanceEvent), FR-2 (QualityObservation)
 * @since Sprint 11 (Global 53) — Task 11.4
 * @since cycle-007 — Sprint 73, Tasks S1-T2, S1-T3 (v8.2.0 adoption)
 */

import type { ReputationService } from './reputation-service.js';
import type {
  ReputationEvent,
  QualityObservation,
  ModelPerformanceEvent,
} from '../types/reputation-evolution.js';

// ---------------------------------------------------------------------------
// Quality Event Types
// ---------------------------------------------------------------------------

/** Source of a quality event — which review system produced the findings. */
export type QualityEventSource = 'bridge' | 'flatline' | 'audit';

/**
 * Envelope context for v8.2.0 reputation events.
 * Provides the required envelope fields (agent_id, collection_id) that
 * the v8.2.0 flat discriminated union requires on all event variants.
 *
 * @since cycle-007 — Sprint 73, Task S1-T2
 */
export interface QualityEventContext {
  /** The agent dNFT ID (personality_id). */
  readonly agent_id: string;
  /** The collection this agent belongs to. */
  readonly collection_id: string;
  /** Optional task type for the quality signal. */
  readonly task_type?: string;
}

/**
 * Input for model-specific quality feedback (4th variant: model_performance).
 * Provides all fields needed to construct a ModelPerformanceEvent.
 *
 * @since cycle-007 — Sprint 73, Task S1-T3
 */
export interface ModelQualityInput {
  /** Model alias (e.g., "gpt-4o", "claude-opus-4-20250514"). */
  readonly model_id: string;
  /** Provider name (e.g., "openai", "anthropic"). */
  readonly provider: string;
  /** Model pool identifier. */
  readonly pool_id: string;
  /** Task type for this inference. */
  readonly task_type: string;
  /** Inference latency in milliseconds. */
  readonly latency_ms?: number;
  /** Request ID for tracing. */
  readonly request_id?: string;
  /** Agent dNFT ID (personality_id). */
  readonly agent_id: string;
  /** Collection ID. */
  readonly collection_id: string;
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
 * Compute a quality score [0, 1] from a severity distribution.
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
export function computeQualityScore(severityDistribution: Record<string, number>): number {
  let weightedCount = 0;

  for (const [severity, count] of Object.entries(severityDistribution)) {
    const weight = SEVERITY_WEIGHTS[severity.toLowerCase()] ?? 0.1;
    weightedCount += count * weight;
  }

  // Soft sigmoid: 1 / (1 + weighted_count)
  return 1 / (1 + weightedCount);
}

/**
 * Build per-severity dimension scores from a severity distribution.
 *
 * Each dimension represents the quality impact of a single severity level,
 * using the same sigmoid formula as the overall score but scoped to that
 * severity's contribution. Dimension names use lowercase to match
 * hounfour's cross-variant dimension name pattern.
 *
 * @since cycle-007 — Sprint 73, Task S1-T2
 */
export function buildDimensionBreakdown(
  severityDistribution: Record<string, number>,
): Record<string, number> {
  const dimensions: Record<string, number> = {};
  for (const [severity, count] of Object.entries(severityDistribution)) {
    const key = severity.toLowerCase();
    const weight = SEVERITY_WEIGHTS[key] ?? 0.1;
    dimensions[key] = 1 / (1 + count * weight);
  }
  return dimensions;
}

// ---------------------------------------------------------------------------
// Quality Observation Builder (v8.2.0)
// ---------------------------------------------------------------------------

/**
 * Build a QualityObservation from review findings.
 *
 * Converts review output (source, finding count, severity distribution)
 * into the protocol QualityObservation schema. Preserves the existing
 * severity-weighted scoring algorithm (computeQualityScore).
 *
 * The QualityObservation is a reusable sub-schema that appears in:
 * - ModelPerformanceEvent.quality_observation (embedded)
 * - Standalone in batch evaluation reports
 *
 * @param source - Which review system produced the findings
 * @param severityDistribution - Distribution of findings by severity
 * @param latencyMs - Optional evaluation latency in milliseconds
 * @returns A protocol-conformant QualityObservation
 * @since cycle-007 — Sprint 73, Task S1-T2
 */
export function buildQualityObservation(
  source: QualityEventSource,
  severityDistribution: Record<string, number>,
  latencyMs?: number,
): QualityObservation {
  return {
    score: computeQualityScore(severityDistribution),
    dimensions: buildDimensionBreakdown(severityDistribution),
    latency_ms: latencyMs,
    evaluated_by: `dixie-quality-feedback:${source}`,
  };
}

// ---------------------------------------------------------------------------
// Quality Event Emission (v8.2.0 flat format)
// ---------------------------------------------------------------------------

/**
 * Emit a quality signal event into the reputation system.
 *
 * Constructs a v8.2.0 flat QualitySignalEvent (discriminated union variant)
 * and appends it to the agent's event log via ReputationService.
 *
 * Guard: This function does NOT trigger enrichment context assembly.
 * It only writes to the event store. The enrichment service reads from
 * the store independently, preventing infinite recursion.
 *
 * @param source - Which review system produced the findings
 * @param nftId - The dNFT ID of the agent whose work was reviewed
 * @param severityDistribution - Distribution of findings by severity
 * @param context - Envelope context (agent_id, collection_id, optional task_type)
 * @param reputationService - The reputation service for event storage
 * @since cycle-007 — Sprint 73, Task S1-T2 (updated to v8.2.0 flat format)
 */
export async function emitQualityEvent(
  source: QualityEventSource,
  nftId: string,
  severityDistribution: Record<string, number>,
  context: QualityEventContext,
  reputationService: ReputationService,
): Promise<void> {
  const observation = buildQualityObservation(source, severityDistribution);

  const reputationEvent: ReputationEvent = {
    type: 'quality_signal',
    score: observation.score,
    dimensions: observation.dimensions,
    task_type: context.task_type,
    event_id: crypto.randomUUID(),
    agent_id: context.agent_id,
    collection_id: context.collection_id,
    timestamp: new Date().toISOString(),
  };

  await reputationService.store.appendEvent(nftId, reputationEvent);
}

/**
 * Emit a model performance event into the reputation system.
 *
 * Creates the 4th ReputationEvent variant (model_performance) that closes
 * the autopoietic feedback loop: model inference → quality evaluation →
 * reputation update → future routing decisions.
 *
 * The event embeds a QualityObservation (built from review findings) and
 * identifies the specific model, provider, and pool that produced the
 * evaluated output.
 *
 * Emission is fire-and-forget: the Promise resolves once the event is
 * appended to the store. No latency impact on the response path.
 *
 * @param input - Model identification and context (model_id, provider, pool_id, etc.)
 * @param source - Which review system produced the findings
 * @param severityDistribution - Distribution of findings by severity
 * @param nftId - The dNFT ID of the agent
 * @param reputationService - The reputation service for event storage
 * @since cycle-007 — Sprint 73, Task S1-T3
 */
export async function emitModelPerformanceEvent(
  input: ModelQualityInput,
  source: QualityEventSource,
  severityDistribution: Record<string, number>,
  nftId: string,
  reputationService: ReputationService,
): Promise<void> {
  const observation = buildQualityObservation(source, severityDistribution, input.latency_ms);

  const event: ModelPerformanceEvent = {
    type: 'model_performance',
    model_id: input.model_id,
    provider: input.provider,
    pool_id: input.pool_id,
    task_type: input.task_type as ModelPerformanceEvent['task_type'],
    quality_observation: observation,
    request_context: input.request_id ? { request_id: input.request_id } : undefined,
    event_id: crypto.randomUUID(),
    agent_id: input.agent_id,
    collection_id: input.collection_id,
    timestamp: new Date().toISOString(),
  };

  await reputationService.store.appendEvent(nftId, event);
}

/**
 * Create a quality event from review findings.
 *
 * Convenience factory that constructs a QualityObservation with the current
 * timestamp. Callers provide the source, finding count, and severity breakdown.
 *
 * @param source - Which review system produced the findings
 * @param severityDistribution - Distribution of findings by severity
 * @param latencyMs - Optional evaluation latency
 * @returns A timestamped QualityObservation
 */
export function createQualityObservation(
  source: QualityEventSource,
  severityDistribution: Record<string, number>,
  latencyMs?: number,
): QualityObservation {
  return buildQualityObservation(source, severityDistribution, latencyMs);
}
