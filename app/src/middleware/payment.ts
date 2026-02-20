import { createMiddleware } from 'hono/factory';

/**
 * x402 Payment Gate — Micropayment Middleware Hook Point
 *
 * This middleware slot is reserved for `@x402/hono` integration (loa-freeside #62).
 * Currently a pass-through noop. When activated, it will:
 *
 * 1. Read the wallet address from the JWT context (set by jwt.ts)
 * 2. Check the x402 payment status for the request
 * 3. Return 402 Payment Required if the user's balance is insufficient
 * 4. Attach payment receipt to the response on success
 *
 * Pipeline position: ... → rateLimit → allowlist → **payment** → routes
 * This MUST be after JWT extraction (needs wallet) and after allowlist (don't bill denied requests).
 *
 * See: https://github.com/0xHoneyJar/loa-freeside/issues/62
 */
export function createPaymentGate() {
  // HOOK: x402/hono — replace this noop with @x402/hono middleware when ready
  return createMiddleware(async (_c, next) => {
    await next();
  });
}
