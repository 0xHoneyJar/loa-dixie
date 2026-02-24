import { createMiddleware } from 'hono/factory';

/**
 * Payment Rail Types — Multi-rail payment scaffold.
 *
 * Three revenue paths from Freeside #62:
 * - x402: Micropayments via the x402 protocol (primary rail)
 * - nowpayments: Crypto subscription payments via NOWPayments
 * - stripe-connect: Fiat bridge via Stripe Connect
 * - conviction-gated: Free access gated by BGT conviction tier
 *
 * @since Sprint 7 (G-71) — Task 7.6: Multi-rail payment type scaffold
 */
export type PaymentRail = 'x402' | 'nowpayments' | 'stripe-connect' | 'conviction-gated';

/**
 * Payment context attached to requests when payment processing is active.
 *
 * Extensible for future payment rails — each rail can add rail-specific
 * fields via intersection types.
 *
 * @since Sprint 7 (G-71) — Task 7.6
 */
export interface PaymentContext {
  readonly rail: PaymentRail;
  readonly currency: string;
  readonly wallet?: string;
  readonly communityId?: string;
}

/**
 * x402 Payment Gate — Config-gated micropayment middleware.
 *
 * When x402Enabled is false (default): pass-through noop.
 * When x402Enabled is true: sets X-Payment-Status and X-Payment-Rail headers on responses.
 * Full payment enforcement requires @x402/hono integration (loa-freeside #62).
 *
 * Pipeline position: ... → rateLimit → allowlist → **payment** → routes
 * This MUST be after JWT extraction (needs wallet) and after allowlist (don't bill denied requests).
 *
 * @since cycle-006 Sprint 3 — FR-3 Payment Middleware Scaffold
 * @since Sprint 7 (G-71) — Task 7.6: Multi-rail payment type scaffold
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
    // Scaffold: set headers indicating payment scaffold is active.
    // When @x402/hono is integrated, this middleware will enforce payment
    // and return 402 Payment Required for insufficient balance.
    c.header('X-Payment-Status', 'scaffold');
    c.header('X-Payment-Rail', 'x402');
    const wallet = c.get('wallet') as string | undefined;
    if (wallet) {
      c.header('X-Payment-Wallet', wallet);
    }
  });
}
