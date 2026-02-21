import { Hono } from 'hono';
import type { CompoundLearningEngine } from '../services/compound-learning.js';
import { isValidPathParam, getRequestContext } from '../validation.js';

export interface LearningRouteDeps {
  learningEngine: CompoundLearningEngine;
  /** Resolve NFT ownership for authorization checks (Bridge medium-9) */
  resolveNftOwnership?: (wallet: string) => Promise<{ nftId: string } | null>;
}

/**
 * Learning routes — compound learning insights and knowledge gaps.
 * All endpoints verify NFT ownership (Bridge medium-9).
 *
 * See: SDD §4.5, PRD FR-11
 */
export function createLearningRoutes(deps: LearningRouteDeps): Hono {
  const { learningEngine, resolveNftOwnership } = deps;
  const app = new Hono();

  /** GET /:nftId/insights — Get learning insights for an NFT (ownership-verified) */
  app.get('/:nftId/insights', async (c) => {
    const nftId = c.req.param('nftId');
    if (!isValidPathParam(nftId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid NFT ID' }, 400);
    }

    const { wallet } = getRequestContext(c);
    if (!wallet) {
      return c.json({ error: 'unauthorized', message: 'Wallet required' }, 401);
    }

    // Verify wallet owns this NFT (Bridge medium-9)
    if (resolveNftOwnership) {
      const ownership = await resolveNftOwnership(wallet);
      if (!ownership || ownership.nftId !== nftId) {
        return c.json({ error: 'forbidden', message: 'Not authorized for this NFT' }, 403);
      }
    }

    const limit = parseInt(c.req.query('limit') ?? '10', 10);
    const insights = learningEngine.getInsights(nftId, limit);

    return c.json({
      nftId,
      insights,
      count: insights.length,
      pendingSignals: learningEngine.getPendingCount(nftId),
    });
  });

  /** GET /:nftId/gaps — Get knowledge gaps for an NFT (ownership-verified) */
  app.get('/:nftId/gaps', async (c) => {
    const nftId = c.req.param('nftId');
    if (!isValidPathParam(nftId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid NFT ID' }, 400);
    }

    const { wallet } = getRequestContext(c);
    if (!wallet) {
      return c.json({ error: 'unauthorized', message: 'Wallet required' }, 401);
    }

    // Verify wallet owns this NFT (Bridge medium-9)
    if (resolveNftOwnership) {
      const ownership = await resolveNftOwnership(wallet);
      if (!ownership || ownership.nftId !== nftId) {
        return c.json({ error: 'forbidden', message: 'Not authorized for this NFT' }, 403);
      }
    }

    const gaps = learningEngine.getKnowledgeGaps(nftId);
    const alerting = gaps.filter((g) => g.missRate > 0.3);

    return c.json({
      nftId,
      gaps,
      alerting: alerting.length > 0,
      alertCount: alerting.length,
    });
  });

  return app;
}
