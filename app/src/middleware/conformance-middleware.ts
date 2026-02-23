/**
 * Runtime Conformance Middleware — Sprint 7, Task 7.1
 *
 * Hono middleware factory that validates outgoing response bodies against
 * hounfour schemas at a configurable sample rate. This is the Level 5 gate:
 * every payload crossing a protocol boundary is validated at runtime.
 *
 * Architecture:
 * - Opt-in per route or globally via `app.use()`
 * - `sampleRate: 1.0` in development/staging for full coverage
 * - `sampleRate: 0.001` in production for negligible latency impact
 * - `onViolation` controls response: log, reject (dev only), or signal (NATS)
 *
 * No measurable latency impact at production sample rate (0.1% of requests).
 * At sampleRate 0 the middleware is a passthrough (no-op).
 *
 * See: grimoires/loa/context/adr-hounfour-alignment.md (Level 5)
 * @since Sprint 7 — Level 5 Foundation
 */

import { createMiddleware } from 'hono/factory';
import { validators } from '@0xhoneyjar/loa-hounfour';

/**
 * Base fields shared between ConformanceViolationEvent and
 * ConformanceViolationSignal. Extracted to reduce duplication:
 * the Event uses `path`/`error` while the Signal renames them to
 * `error_path`/`error_message` for NATS consumer clarity.
 *
 * @since Sprint 7 — Bridge iter1 LOW-2
 */
export interface ConformanceViolationBase {
  /** Schema that was violated. */
  readonly schema: string;

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
 * A single conformance violation event for structured logging / signaling.
 * Extends the shared base type to reduce field duplication with
 * ConformanceViolationSignal (Bridge iter1 LOW-2).
 */
export interface ConformanceViolationEvent extends ConformanceViolationBase {
  readonly event: 'conformance_violation';
  /** JSON path to the violating field. */
  readonly path: string;
  /** Human-readable error message. */
  readonly error: string;
}

/** Schema definition for the conformance middleware. */
export interface ConformanceSchema {
  /** Schema name — must match a key in hounfour's `validators` object. */
  readonly name: string;
  /**
   * Extractor function: given the JSON response body, returns the
   * sub-object to validate, or `null` to skip validation for this schema.
   */
  readonly extract: (body: unknown) => unknown | null;
}

/** Violation handler mode. */
export type ViolationMode = 'log' | 'reject' | 'signal';

/** Log callback matching the project's existing pattern (logger.ts, finn-client.ts). */
export type ConformanceLogCallback = (
  level: 'error' | 'warn' | 'info',
  data: Record<string, unknown>,
) => void;

/** Signal callback for wiring violations into the NATS signal pipeline. */
export type ConformanceSignalCallback = (violation: ConformanceViolationEvent) => void;

/** Configuration for the conformance middleware factory. */
export interface ConformanceMiddlewareOptions {
  /**
   * Fraction of requests to validate (0.0 = none, 1.0 = all).
   * Default: 1.0 in development, 0.001 in production.
   */
  readonly sampleRate: number;

  /**
   * Schemas to validate outgoing responses against.
   * Each schema provides an extractor to pull the relevant sub-object
   * from the response body.
   */
  readonly schemas: ReadonlyArray<ConformanceSchema>;

  /**
   * What to do when a violation is detected:
   * - 'log': emit structured log (default)
   * - 'reject': replace response with 500 error (dev only — never use in prod)
   * - 'signal': emit to NATS signal pipeline via onSignal callback
   */
  readonly onViolation?: ViolationMode;

  /** Structured logger (matches project convention). */
  readonly log?: ConformanceLogCallback;

  /** Signal callback for 'signal' violation mode. */
  readonly onSignal?: ConformanceSignalCallback;
}

/**
 * Create a Hono middleware that validates outgoing response bodies
 * against hounfour schemas at a configurable sample rate.
 *
 * Usage:
 * ```ts
 * app.use('/api/*', createConformanceMiddleware({
 *   sampleRate: 1.0,
 *   schemas: [
 *     { name: 'accessPolicy', extract: (body) => body?.policy ?? null },
 *   ],
 *   onViolation: 'log',
 *   log,
 * }));
 * ```
 */
export function createConformanceMiddleware(opts: ConformanceMiddlewareOptions) {
  const { sampleRate, schemas, onViolation = 'log', log, onSignal } = opts;

  return createMiddleware(async (c, next) => {
    await next();

    // Skip non-JSON responses
    const contentType = c.res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return;
    }

    // Sample rate gate — skip most requests in production
    if (sampleRate <= 0) return;
    if (sampleRate < 1.0 && Math.random() >= sampleRate) return;

    // Clone the response to read the body without consuming it
    // (Hono responses are read-once by default)
    let body: unknown;
    try {
      const cloned = c.res.clone();
      body = await cloned.json();
    } catch {
      // Non-JSON or unparseable — skip
      return;
    }

    const endpoint = new URL(c.req.url).pathname;
    const responseStatus = c.res.status;

    for (const schema of schemas) {
      const extracted = schema.extract(body);
      if (extracted === null || extracted === undefined) continue;

      // Look up the hounfour validator
      const validatorFn = (validators as Record<string, (() => { Check: (d: unknown) => boolean; Errors: (d: unknown) => Iterable<{ path: string; message: string }> }) | undefined>)[schema.name];
      if (!validatorFn) {
        log?.('warn', {
          event: 'conformance_unknown_schema',
          schema: schema.name,
        });
        continue;
      }

      const compiled = validatorFn();
      if (compiled.Check(extracted)) continue;

      // Violation detected
      const errors = [...compiled.Errors(extracted)];
      const firstError = errors[0];

      const violation: ConformanceViolationEvent = {
        event: 'conformance_violation',
        schema: schema.name,
        path: firstError?.path ?? '/',
        error: firstError ? `${firstError.path}: ${firstError.message}` : 'Unknown validation error',
        endpoint,
        response_status: responseStatus,
        sample_rate: sampleRate,
        timestamp: new Date().toISOString(),
      };

      // Handle violation based on mode
      switch (onViolation) {
        case 'log':
          log?.('error', violation as unknown as Record<string, unknown>);
          break;

        case 'reject':
          log?.('error', violation as unknown as Record<string, unknown>);
          // Replace response with 500 error (dev only)
          c.res = new Response(
            JSON.stringify({
              error: 'conformance_violation',
              message: `Response violates ${schema.name} schema: ${violation.error}`,
              schema: schema.name,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          );
          return; // Stop checking further schemas — response already replaced

        case 'signal':
          log?.('error', violation as unknown as Record<string, unknown>);
          onSignal?.(violation);
          break;
      }
    }
  });
}
