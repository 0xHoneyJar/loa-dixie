import { createMiddleware } from 'hono/factory';

/**
 * x402 Payment Gate — Config-gated micropayment middleware.
 *
 * When x402Enabled is false (default): pass-through noop.
 * When x402Enabled is true: sets X-Payment-Status header on responses.
 * Full payment enforcement requires @x402/hono integration (loa-freeside #62).
 *
 * Pipeline position: ... → rateLimit → allowlist → **payment** → routes
 * This MUST be after JWT extraction (needs wallet) and after allowlist (don't bill denied requests).
 *
 * @since cycle-006 Sprint 3 — FR-3 Payment Middleware Scaffold
 */
export function createPaymentGate(options?: { x402Enabled?: boolean }) {
  const enabled = options?.x402Enabled ?? false;

  if (!enabled) {
    return createMiddleware(async (_c, next) => {
      await next();
    });
  }

  return createMiddleware(async (c, next) => {
    await next();
    // Scaffold: set header indicating payment scaffold is active.
    // When @x402/hono is integrated, this middleware will enforce payment
    // and return 402 Payment Required for insufficient balance.
    c.header('X-Payment-Status', 'scaffold');
  });
}
