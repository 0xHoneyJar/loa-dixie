import type { MiddlewareHandler } from 'hono';

/**
 * Bridge middleware: copies wallet from Hono typed context to request header.
 *
 * SEC-003: The JWT middleware stores the authenticated wallet via c.set('wallet'),
 * but Hono sub-app boundaries reset typed context. Route handlers read wallet from
 * the x-wallet-address request header. This middleware bridges the gap.
 *
 * Must be registered AFTER the JWT middleware and BEFORE route handlers.
 */
export function createWalletBridge(): MiddlewareHandler {
  return async (c, next) => {
    const wallet = c.get('wallet');
    if (wallet) {
      c.req.raw.headers.set('x-wallet-address', wallet);
    }
    await next();
  };
}
