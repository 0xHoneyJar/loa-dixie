import { Hono } from 'hono';
import type { FinnClient } from '../proxy/finn-client.js';

/**
 * Session routes — proxies session list/get to loa-finn.
 */
export function createSessionRoutes(finnClient: FinnClient): Hono {
  const app = new Hono();

  /** GET / — List sessions */
  app.get('/', async (c) => {
    const wallet = c.req.header('x-wallet-address');
    const requestId = c.req.header('x-request-id') ?? '';

    try {
      const result = await finnClient.request<unknown>('GET', '/api/sessions', {
        headers: {
          'X-Request-Id': requestId,
          ...(wallet ? { 'X-Wallet-Address': wallet } : {}),
        },
      });
      return c.json(result);
    } catch (err) {
      if (err instanceof Object && 'status' in err && 'body' in err) {
        const bffErr = err as { status: number; body: unknown };
        return c.json(bffErr.body, bffErr.status as 400);
      }
      return c.json(
        { error: 'internal_error', message: 'Failed to list sessions' },
        500,
      );
    }
  });

  /** GET /:id — Get session details */
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const requestId = c.req.header('x-request-id') ?? '';

    try {
      const result = await finnClient.request<unknown>(
        'GET',
        `/api/sessions/${id}`,
        { headers: { 'X-Request-Id': requestId } },
      );
      return c.json(result);
    } catch (err) {
      if (err instanceof Object && 'status' in err && 'body' in err) {
        const bffErr = err as { status: number; body: unknown };
        return c.json(bffErr.body, bffErr.status as 400);
      }
      return c.json(
        { error: 'internal_error', message: 'Failed to get session' },
        500,
      );
    }
  });

  return app;
}
