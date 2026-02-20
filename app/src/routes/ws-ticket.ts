import { Hono } from 'hono';
import type { TicketStore } from '../services/ticket-store.js';
import { getRequestContext } from '../validation.js';

/**
 * WebSocket ticket routes — issues short-lived tickets for WS authentication.
 *
 * The ticket replaces passing the JWT directly in the WebSocket URL,
 * eliminating token leakage via server logs, browser history, and referrer headers.
 */
export function createWsTicketRoutes(ticketStore: TicketStore): Hono {
  const app = new Hono();

  /**
   * POST / — Issue a single-use WebSocket ticket.
   * Requires JWT authentication (wallet extracted by upstream middleware).
   */
  app.post('/', async (c) => {
    // ARCH-001: Consistent request context extraction via shared helper
    const { wallet } = getRequestContext(c);
    if (!wallet) {
      return c.json(
        { error: 'unauthorized', message: 'Authentication required' },
        401,
      );
    }

    const result = ticketStore.issue(wallet);
    if (!result) {
      return c.json(
        { error: 'rate_limited', message: 'Too many outstanding tickets for this wallet' },
        429,
      );
    }
    return c.json({ ticket: result.ticket, expires_in: result.expiresIn });
  });

  return app;
}
