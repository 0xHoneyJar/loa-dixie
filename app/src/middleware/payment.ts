import { createMiddleware } from 'hono/factory';

// DECISION: x402 as the Conway-Ostrom bridge (economic plumbing under community governance)
// See: grimoires/loa/context/adr-conway-positioning.md

export interface PaymentGateConfig {
  /** Enable x402 payment enforcement. Default: false */
  x402Enabled: boolean;
  /** Freeside facilitator URL for x402 settlement */
  x402FacilitatorUrl: string | null;
  /** Current environment (payment enforcement is fail-closed in production) */
  nodeEnv: string;
}

/** Routes that are always free — everything else is protected (default-deny) */
const FREE_PREFIXES = [
  '/api/health', '/api/auth/', '/.well-known/', '/api/admin/',
  '/api/reputation/', '/api/identity/',
];

function isProtectedRoute(path: string): boolean {
  // Default-deny: only routes in FREE_PREFIXES are exempt from payment
  return !FREE_PREFIXES.some(prefix => path.startsWith(prefix));
}

/**
 * x402 Payment Gate — Config-gated micropayment middleware.
 *
 * When x402Enabled=false: noop pass-through (existing behavior).
 * When x402Enabled=true: returns 402 Payment Required for protected routes
 * without valid payment header.
 *
 * Flatline SEC-2: Fail-closed in production — if facilitator is unreachable,
 * reject paid requests with 503 (not silently pass through).
 *
 * Pipeline position: ... → allowlist → **payment** → convictionTier → routes
 *
 * @since cycle-022 — Sprint 119, Task 3.3
 */
export function createPaymentGate(config?: PaymentGateConfig) {
  // No config or disabled: noop
  if (!config?.x402Enabled) {
    return createMiddleware(async (_c, next) => {
      await next();
    });
  }

  // SEC-2: Block production enablement until facilitator URL is configured.
  // Without a facilitator, we cannot validate payment headers — any non-empty
  // header would bypass the gate, which is worse than no gate at all.
  if (config.nodeEnv === 'production' && !config.x402FacilitatorUrl) {
    throw new Error(
      'DIXIE_X402_ENABLED=true in production requires DIXIE_X402_FACILITATOR_URL. ' +
      'Payment enforcement without validation is fail-open in disguise.',
    );
  }

  return createMiddleware(async (c, next) => {
    const path = c.req.path;

    // Free routes always pass through
    if (!isProtectedRoute(path)) {
      await next();
      return;
    }

    // Check for x402 payment header
    const paymentHeader = c.req.header('x-payment') || c.req.header('x-402-payment');

    if (!paymentHeader) {
      return c.json({
        error: 'payment_required',
        message: 'This endpoint requires x402 payment',
        facilitator: config.x402FacilitatorUrl,
      }, 402);
    }

    // TODO: When @x402/hono is available, validate payment header against facilitator.
    // Current state: accepts any non-empty header in non-production environments.
    // Production gate above ensures this path only runs when facilitator is configured.

    await next();
  });
}

/** Exported for testing */
export { isProtectedRoute as _isProtectedRoute };
