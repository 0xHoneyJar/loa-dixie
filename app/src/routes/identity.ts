import { Hono } from 'hono';
import type { FinnClient } from '../proxy/finn-client.js';

/**
 * ADR: Hono sub-app typing
 *
 * Route handlers read wallet and requestId from HTTP headers (x-wallet-address,
 * x-request-id) instead of Hono's typed context (c.get('wallet')).
 *
 * Reason: Hono's `app.route()` creates a sub-app boundary that resets typed
 * context. Variables set via `c.set()` in parent middleware are not type-safe
 * across this boundary. Using headers as the communication channel between
 * middleware and route handlers is explicit, testable, and framework-agnostic.
 *
 * If Hono adds typed context propagation across `app.route()` boundaries,
 * search for "ADR: Hono sub-app typing" to find all files that can be simplified.
 */

interface OracleIdentity {
  nftId: string;
  name: string;
  damp96_summary: Record<string, unknown> | null;
  beauvoir_hash: string | null;
}

/** Cached oracle identity (stable data, 5 minute cache) */
let cachedIdentity: { data: OracleIdentity; expiresAt: number } | null = null;
const IDENTITY_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Identity routes — Oracle dNFT identity via loa-finn identity graph.
 */
export function createIdentityRoutes(finnClient: FinnClient): Hono {
  const app = new Hono();

  /** GET /oracle — Oracle identity information */
  app.get('/oracle', async (c) => {
    const requestId = c.req.header('x-request-id') ?? '';

    // Check cache
    const now = Date.now();
    if (cachedIdentity && now < cachedIdentity.expiresAt) {
      return c.json(cachedIdentity.data);
    }

    try {
      const result = await finnClient.request<OracleIdentity>(
        'GET',
        '/api/identity/oracle',
        { headers: { 'X-Request-Id': requestId } },
      );

      cachedIdentity = { data: result, expiresAt: now + IDENTITY_CACHE_TTL_MS };
      return c.json(result);
    } catch {
      // Graceful degradation — return placeholder if identity graph not populated
      const fallback: OracleIdentity = {
        nftId: 'oracle',
        name: 'The Oracle',
        damp96_summary: null,
        beauvoir_hash: null,
      };
      return c.json(fallback);
    }
  });

  return app;
}

/** Reset cache — useful for testing */
export function resetIdentityCache(): void {
  cachedIdentity = null;
}
