/**
 * Input validation utilities for request parameters.
 *
 * SEC-002: Path parameters interpolated into URLs must be validated
 * to prevent path traversal (e.g., ../../admin/allowlist).
 */

import type { Context } from 'hono';

const PATH_PARAM_RE = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate a value is safe for URL path interpolation.
 * Rejects path traversal characters (/, ., ..) and special characters.
 */
export function isValidPathParam(value: string): boolean {
  return PATH_PARAM_RE.test(value) && value.length > 0 && value.length <= 128;
}

/**
 * ARCH-001: Extract request context from headers set by middleware.
 *
 * Hono's `app.route()` resets typed context across sub-app boundaries.
 * This helper provides consistent extraction of wallet and requestId
 * from the headers set by upstream middleware (JWT + wallet-bridge + request-id).
 *
 * See: "ADR: Hono sub-app typing" for background.
 */
export function getRequestContext(c: Context): { wallet: string | undefined; requestId: string } {
  return {
    wallet: c.req.header('x-wallet-address'),
    requestId: c.req.header('x-request-id') ?? '',
  };
}
