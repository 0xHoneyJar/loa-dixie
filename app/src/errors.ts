/**
 * BffError — Structured HTTP error class for the Dixie BFF.
 *
 * Extends native Error to provide `.stack` traces for monitoring tools
 * (Sentry, Datadog) while carrying HTTP `status` and structured `body`
 * for downstream error handling.
 *
 * Replaces plain `{ status, body }` objects thrown throughout the BFF.
 * Catch handlers can use `err instanceof BffError` for type-safe matching.
 *
 * v8.2.0: GovernanceError → BffError conversion via toBffError() from
 * governance-errors.ts. Re-exported here for consumer convenience.
 *
 * @since Sprint 5 — LOW-3 (Bridge iter1 deferred finding)
 * @since cycle-007 — Sprint 74, Task S2-T5 (GovernanceError integration)
 */
import type { ErrorResponse } from './types.js';

/**
 * Extended error body that may include additional diagnostic fields
 * beyond the base ErrorResponse (e.g., violation lists from validators).
 */
export type BffErrorBody = ErrorResponse & Record<string, unknown>;

export class BffError extends Error {
  /**
   * HTTP status code for the error response.
   */
  readonly status: number;

  /**
   * Structured response body matching the ErrorResponse shape,
   * potentially with additional diagnostic fields.
   */
  readonly body: BffErrorBody;

  /**
   * @param status - HTTP status code (e.g., 400, 402, 403, 429, 502, 503)
   * @param body - Structured error body with `error` and `message` fields
   */
  constructor(status: number, body: BffErrorBody) {
    super(`BffError(${status}): ${body.message}`);
    this.name = 'BffError';
    this.status = status;
    this.body = body;

    // Ensure prototype chain is correct for instanceof checks
    // (required when extending built-in classes in TypeScript)
    Object.setPrototypeOf(this, BffError.prototype);
  }

  /**
   * Produce a human-readable string representation for logging.
   */
  override toString(): string {
    return `BffError(${this.status}): ${this.body.error} — ${this.body.message}`;
  }

  /**
   * Type guard: check if an unknown error is a BffError.
   * Useful in catch blocks where the error type is unknown.
   */
  static isBffError(err: unknown): err is BffError {
    return err instanceof BffError;
  }
}

// Re-export governance error conversion for consumer convenience
export { toBffError } from './services/governance-errors.js';
export type { GovernanceError } from '@0xhoneyjar/loa-hounfour/commons';
