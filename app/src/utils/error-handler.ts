import { BffError } from '../errors.js';

/**
 * Shared route error handler — maps BffError and legacy error objects
 * to structured JSON responses.
 *
 * Replaces the duplicate catch pattern across chat.ts and agent.ts.
 *
 * @since Sprint 55 — Task 1.3 (Bridgebuilder finding: inconsistent route error handling)
 */
export function handleRouteError(
  c: { json: (data: unknown, status: number) => unknown },
  err: unknown,
  fallbackMessage = 'Internal server error',
): unknown {
  if (BffError.isBffError(err)) {
    return c.json(err.body, err.status);
  }
  // Legacy pattern: plain objects with { status, body } (pre-BffError code paths).
  // Deprecation warning — measure usage to determine when this branch can be removed.
  // See: Bridgebuilder finding #1 — this accepts any object with status+body properties.
  if (err instanceof Object && 'status' in err && 'body' in err) {
    const bffErr = err as { status: number; body: unknown };
    const status = Number.isInteger(bffErr.status) && bffErr.status >= 100 && bffErr.status < 600
      ? bffErr.status
      : 500;
    console.warn('[error-handler] legacy error pattern', { status });
    return c.json(bffErr.body, status);
  }
  return c.json({ error: 'internal_error', message: fallbackMessage }, 500);
}
