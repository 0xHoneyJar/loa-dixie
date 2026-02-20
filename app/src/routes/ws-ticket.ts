import { Hono } from 'hono';
import type { TicketStore } from '../services/ticket-store.js';

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
    // Wallet set by JWT middleware via header (Hono sub-app boundary)
    const wallet = c.req.header('x-wallet-address');
    if (!wallet) {
      return c.json(
        { error: 'unauthorized', message: 'Authentication required' },
        401,
      );
    }

    const { ticket, expiresIn } = ticketStore.issue(wallet);
    return c.json({ ticket, expires_in: expiresIn });
  });

  return app;
}
