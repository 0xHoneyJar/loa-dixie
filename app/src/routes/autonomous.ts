import { Hono } from 'hono';
import type { AutonomousEngine } from '../services/autonomous-engine.js';
import type { ConvictionResolver } from '../services/conviction-resolver.js';
import { isValidPathParam, getRequestContext } from '../validation.js';
import { tierMeetsRequirement } from '../types/conviction.js';

/**
 * ADR: Hono sub-app typing
 * Route handlers read wallet from x-wallet-address header.
 * See chat.ts for full ADR explanation.
 */

export interface AutonomousRouteDeps {
  autonomousEngine: AutonomousEngine;
  convictionResolver: ConvictionResolver;
}

/**
 * Autonomous mode routes — manage owner-delegated agent autonomy.
 *
 * All endpoints require wallet authentication.
 * Autonomous mode management requires sovereign conviction tier.
 *
 * See: SDD §6.1.4, PRD FR-8
 */
export function createAutonomousRoutes(deps: AutonomousRouteDeps): Hono {
  const { autonomousEngine, convictionResolver } = deps;
  const app = new Hono();

  /**
   * GET /:nftId/permissions — Get current autonomous permissions.
   * Requires authenticated wallet (owner or delegate).
   */
  app.get('/:nftId/permissions', async (c) => {
    const nftId = c.req.param('nftId');
    if (!isValidPathParam(nftId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid NFT ID' }, 400);
    }

    const { wallet } = getRequestContext(c);
    if (!wallet) {
      return c.json({ error: 'unauthorized', message: 'Wallet required' }, 401);
    }

    const permissions = await autonomousEngine.getPermissions(nftId);
    return c.json(permissions);
  });

  /**
   * PUT /:nftId/permissions — Update autonomous permissions.
   * Requires sovereign conviction tier + owner wallet.
   */
  app.put('/:nftId/permissions', async (c) => {
    const nftId = c.req.param('nftId');
    if (!isValidPathParam(nftId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid NFT ID' }, 400);
    }

    const { wallet } = getRequestContext(c);
    if (!wallet) {
      return c.json({ error: 'unauthorized', message: 'Wallet required' }, 401);
    }

    // Require sovereign tier for autonomous mode management
    const conviction = await convictionResolver.resolve(wallet);
    if (!tierMeetsRequirement(conviction.tier, 'sovereign')) {
      return c.json(
        { error: 'forbidden', message: 'Sovereign conviction tier required for autonomous mode' },
        403,
      );
    }

    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return c.json({ error: 'invalid_request', message: 'Invalid request body' }, 400);
    }

    try {
      const updated = await autonomousEngine.updatePermissions(nftId, wallet, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof Object && 'status' in err && 'body' in err) {
        const bffErr = err as { status: number; body: unknown };
        return c.json(bffErr.body, bffErr.status as 403);
      }
      return c.json({ error: 'internal_error', message: 'Failed to update permissions' }, 500);
    }
  });

  /**
   * GET /:nftId/audit — Get audit trail for autonomous actions.
   * Requires authenticated wallet (owner or delegate).
   */
  app.get('/:nftId/audit', async (c) => {
    const nftId = c.req.param('nftId');
    if (!isValidPathParam(nftId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid NFT ID' }, 400);
    }

    const { wallet } = getRequestContext(c);
    if (!wallet) {
      return c.json({ error: 'unauthorized', message: 'Wallet required' }, 401);
    }

    const limit = parseInt(c.req.query('limit') ?? '100', 10);
    const entries = autonomousEngine.getAuditLog(nftId, Math.min(limit, 500));

    return c.json({
      nftId,
      entries,
      count: entries.length,
    });
  });

  /**
   * GET /:nftId/summary — Get daily summary of autonomous activity.
   * Requires authenticated wallet (owner or delegate).
   */
  app.get('/:nftId/summary', async (c) => {
    const nftId = c.req.param('nftId');
    if (!isValidPathParam(nftId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid NFT ID' }, 400);
    }

    const { wallet } = getRequestContext(c);
    if (!wallet) {
      return c.json({ error: 'unauthorized', message: 'Wallet required' }, 401);
    }

    const summary = autonomousEngine.getDailySummary(nftId);
    return c.json(summary);
  });

  return app;
}
