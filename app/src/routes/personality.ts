import { Hono } from 'hono';
import type { PersonalityCache } from '../services/personality-cache.js';
import { isValidPathParam, getRequestContext } from '../validation.js';

/**
 * ADR: Hono sub-app typing
 *
 * Route handlers read wallet and requestId from HTTP headers (x-wallet-address,
 * x-request-id) instead of Hono's typed context (c.get('wallet')).
 *
 * If Hono adds typed context propagation across `app.route()` boundaries,
 * search for "ADR: Hono sub-app typing" to find all files that can be simplified.
 */

export interface PersonalityRouteDeps {
  personalityCache: PersonalityCache;
}

/**
 * Personality routes — BEAUVOIR personality display and evolution history.
 *
 * Per SDD §6.1.5:
 * - GET /:nftId — BEAUVOIR personality display (traits, anti-narration, dAMP-96)
 * - GET /:nftId/evolution — Personality change history (owner/delegated only)
 */
export function createPersonalityRoutes(deps: PersonalityRouteDeps): Hono {
  const app = new Hono();

  /** GET /:nftId — BEAUVOIR personality display */
  app.get('/:nftId', async (c) => {
    const nftId = c.req.param('nftId');

    if (!isValidPathParam(nftId)) {
      return c.json(
        { error: 'invalid_request', message: 'Invalid nftId format' },
        400,
      );
    }

    const personality = await deps.personalityCache.get(nftId);

    if (!personality) {
      return c.json(
        { error: 'not_found', message: 'Personality not found for this NFT' },
        404,
      );
    }

    return c.json(personality);
  });

  /** GET /:nftId/evolution — Personality evolution history */
  app.get('/:nftId/evolution', async (c) => {
    const nftId = c.req.param('nftId');
    const { wallet } = getRequestContext(c);

    if (!isValidPathParam(nftId)) {
      return c.json(
        { error: 'invalid_request', message: 'Invalid nftId format' },
        400,
      );
    }

    if (!wallet) {
      return c.json(
        { error: 'unauthorized', message: 'Wallet required for evolution history' },
        401,
      );
    }

    const evolution = await deps.personalityCache.getEvolution(nftId);

    return c.json({
      nftId,
      evolution,
      count: evolution.length,
    });
  });

  return app;
}
