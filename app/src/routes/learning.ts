import { Hono } from 'hono';
import type { CompoundLearningEngine } from '../services/compound-learning.js';
import { isValidPathParam, getRequestContext } from '../validation.js';

export interface LearningRouteDeps {
  learningEngine: CompoundLearningEngine;
}

/**
 * Learning routes — compound learning insights and knowledge gaps.
 *
 * See: SDD §4.5, PRD FR-11
 */
export function createLearningRoutes(deps: LearningRouteDeps): Hono {
  const { learningEngine } = deps;
  const app = new Hono();

  /** GET /:nftId/insights — Get learning insights for an NFT */
  app.get('/:nftId/insights', async (c) => {
    const nftId = c.req.param('nftId');
    if (!isValidPathParam(nftId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid NFT ID' }, 400);
    }

    const { wallet } = getRequestContext(c);
    if (!wallet) {
      return c.json({ error: 'unauthorized', message: 'Wallet required' }, 401);
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

  /** GET /:nftId/gaps — Get knowledge gaps for an NFT */
  app.get('/:nftId/gaps', async (c) => {
    const nftId = c.req.param('nftId');
    if (!isValidPathParam(nftId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid NFT ID' }, 400);
    }

    const { wallet } = getRequestContext(c);
    if (!wallet) {
      return c.json({ error: 'unauthorized', message: 'Wallet required' }, 401);
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
