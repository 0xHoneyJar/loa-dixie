/**
 * Conformance Violation Signal Pipeline — Sprint 7, Task 7.3
 *
 * Wires conformance violations from the middleware (Task 7.1) into the
 * existing NATS signal pipeline. Violations are emitted as
 * `ConformanceViolationSignal` on the `dixie.signal.conformance` subject.
 *
 * Pattern: Follows the same fire-and-forget architecture as the interaction
 * signal in chat.ts — NATS publish failures are logged but never block
 * the request path.
 *
 * Observable via the same telemetry infrastructure (NATS JetStream consumer,
 * CloudWatch metric filter on `conformance_violation` event name).
 *
 * See: SDD §4.5 (Signal Pipeline)
 * @since Sprint 7 — Level 5 Foundation
 */

import type { SignalEmitter } from './signal-emitter.js';
import type { ConformanceViolationEvent } from '../middleware/conformance-middleware.js';

/** NATS subject for conformance violation signals. */
export const CONFORMANCE_SIGNAL_SUBJECT = 'dixie.signal.conformance' as const;

/**
 * Conformance violation signal extending the InteractionSignal pattern.
 *
 * Includes all fields from `ConformanceViolationEvent` plus signal-level
 * metadata for NATS routing and telemetry.
 */
export interface ConformanceViolationSignal {
  /** Signal type identifier for NATS consumers / CloudWatch filters. */
  readonly signal_type: 'conformance_violation';

  /** Schema that was violated. */
  readonly schema: string;

  /** JSON path to the violating field. */
  readonly error_path: string;

  /** Human-readable error message. */
  readonly error_message: string;

  /** Request endpoint that produced the violating response. */
  readonly endpoint: string;

  /** HTTP status code of the response. */
  readonly response_status: number;

  /** Sample rate at which this validation was performed. */
  readonly sample_rate: number;

  /** ISO 8601 timestamp of the violation. */
  readonly timestamp: string;
}

/**
 * Create a signal callback that publishes conformance violations to NATS.
 *
 * Returns a function suitable for the `onSignal` option of
 * `createConformanceMiddleware`. When `signalEmitter` is null (NATS not
 * configured), returns a no-op.
 *
 * Usage:
 * ```ts
 * const onSignal = createConformanceSignalCallback(signalEmitter);
 * app.use('/api/*', createConformanceMiddleware({
 *   sampleRate: 1.0,
 *   schemas: [...],
 *   onViolation: 'signal',
 *   onSignal,
 *   log,
 * }));
 * ```
 */
export function createConformanceSignalCallback(
  signalEmitter: SignalEmitter | null,
): (violation: ConformanceViolationEvent) => void {
  if (!signalEmitter) {
    return () => {}; // No-op when NATS not configured
  }

  return (violation: ConformanceViolationEvent) => {
    const signal: ConformanceViolationSignal = {
      signal_type: 'conformance_violation',
      schema: violation.schema,
      error_path: violation.path,
      error_message: violation.error,
      endpoint: violation.endpoint,
      response_status: violation.response_status,
      sample_rate: violation.sample_rate,
      timestamp: violation.timestamp,
    };

    // Fire-and-forget — matches chat.ts signal emission pattern
    signalEmitter.publish(
      CONFORMANCE_SIGNAL_SUBJECT,
      signal as unknown as Record<string, unknown>,
    ).catch(() => {});
  };
}
