/**
 * Input validation utilities for request parameters.
 *
 * SEC-002: Path parameters interpolated into URLs must be validated
 * to prevent path traversal (e.g., ../../admin/allowlist).
 */

import type { Context } from 'hono';

const PATH_PARAM_RE = /^[a-zA-Z0-9_-]+$/;

// ---------------------------------------------------------------------------
// Agent API validation limits — extracted from agent.ts to named constants.
// When multi-model routing lands (loa-finn RFC #31), maxTokens ceiling should
// derive from the model pool's capabilities instead of a static constant.
// See: Bridgebuilder finding #4 (Bridge Iter 2).
// ---------------------------------------------------------------------------
/** Maximum query string length for agent API requests. */
export const AGENT_QUERY_MAX_LENGTH = 10_000;
/** Minimum value for maxTokens parameter. */
export const AGENT_MAX_TOKENS_MIN = 1;
/** Maximum value for maxTokens parameter. */
export const AGENT_MAX_TOKENS_MAX = 4_096;
/** Maximum length of knowledgeDomain parameter. */
export const AGENT_KNOWLEDGE_DOMAIN_MAX_LENGTH = 100;

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
