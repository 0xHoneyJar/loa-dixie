import { Hono } from 'hono';
import type { ScheduleStore } from '../services/schedule-store.js';
import type { ConvictionResolver } from '../services/conviction-resolver.js';
import { isValidPathParam, getRequestContext } from '../validation.js';
import { tierMeetsRequirement } from '../types/conviction.js';

export interface ScheduleRouteDeps {
  scheduleStore: ScheduleStore;
  convictionResolver: ConvictionResolver;
}

/**
 * Schedule routes — NL scheduling with loa-finn cron integration.
 *
 * All endpoints gated to builder+ conviction tier.
 *
 * See: SDD §6.1.2, PRD FR-5
 */
export function createScheduleRoutes(deps: ScheduleRouteDeps): Hono {
  const { scheduleStore, convictionResolver } = deps;
  const app = new Hono();

  /** POST / — Create a schedule from NL expression */
  app.post('/', async (c) => {
    const { wallet } = getRequestContext(c);
    if (!wallet) {
      return c.json({ error: 'unauthorized', message: 'Wallet required' }, 401);
    }

    // Gate to builder+ tier
    const conviction = await convictionResolver.resolve(wallet);
    if (!tierMeetsRequirement(conviction.tier, 'builder')) {
      return c.json(
        { error: 'forbidden', message: 'Builder conviction tier or higher required for scheduling' },
        403,
      );
    }

    const body = await c.req.json().catch(() => null);
    if (!body || !body.nlExpression || !body.prompt || !body.nftId) {
      return c.json(
        { error: 'invalid_request', message: 'Required: nftId, nlExpression, prompt' },
        400,
      );
    }

    if (!isValidPathParam(body.nftId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid NFT ID' }, 400);
    }

    try {
      const result = await scheduleStore.createSchedule(body.nftId, wallet, {
        nlExpression: body.nlExpression,
        prompt: body.prompt,
        name: body.name,
        maxFires: body.maxFires,
      });
      return c.json(result, 201);
    } catch (err) {
      if (err instanceof Object && 'status' in err && 'body' in err) {
        const bffErr = err as { status: number; body: unknown };
        return c.json(bffErr.body, bffErr.status as 400);
      }
      return c.json({ error: 'internal_error', message: 'Failed to create schedule' }, 500);
    }
  });

  /** GET /:nftId — List schedules for an NFT */
  app.get('/:nftId', async (c) => {
    const nftId = c.req.param('nftId');
    if (!isValidPathParam(nftId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid NFT ID' }, 400);
    }

    const { wallet } = getRequestContext(c);
    if (!wallet) {
      return c.json({ error: 'unauthorized', message: 'Wallet required' }, 401);
    }

    const schedules = scheduleStore.getSchedulesForNft(nftId);
    return c.json({ nftId, schedules, count: schedules.length });
  });

  /** DELETE /:scheduleId — Cancel a schedule */
  app.delete('/:scheduleId', async (c) => {
    const scheduleId = c.req.param('scheduleId');
    if (!isValidPathParam(scheduleId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid schedule ID' }, 400);
    }

    const { wallet } = getRequestContext(c);
    if (!wallet) {
      return c.json({ error: 'unauthorized', message: 'Wallet required' }, 401);
    }

    const cancelled = await scheduleStore.cancelSchedule(scheduleId, wallet);
    if (!cancelled) {
      return c.json({ error: 'not_found', message: 'Schedule not found or not owned by this wallet' }, 404);
    }

    return c.json({ status: 'cancelled', scheduleId });
  });

  /** GET /:scheduleId/history — Get execution history */
  app.get('/:scheduleId/history', async (c) => {
    const scheduleId = c.req.param('scheduleId');
    if (!isValidPathParam(scheduleId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid schedule ID' }, 400);
    }

    const { wallet } = getRequestContext(c);
    if (!wallet) {
      return c.json({ error: 'unauthorized', message: 'Wallet required' }, 401);
    }

    const executions = scheduleStore.getExecutions(scheduleId);
    return c.json({ scheduleId, executions, count: executions.length });
  });

  /** POST /callback — Receive loa-finn cron fire events */
  app.post('/callback', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || !body.scheduleId) {
      return c.json({ error: 'invalid_request', message: 'scheduleId required' }, 400);
    }

    const execution = scheduleStore.handleCallback(body.scheduleId, body.messageId);
    return c.json(execution);
  });

  return app;
}
