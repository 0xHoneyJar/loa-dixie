import { createMiddleware } from 'hono/factory';
import { matchesRoutePrefix } from '../utils/route-prefix.js';

// DECISION: x402 as the Conway-Ostrom bridge (economic plumbing under community governance)
// See: grimoires/loa/context/adr-conway-positioning.md

export interface PaymentGateConfig {
  /** Enable x402 payment enforcement. Default: false */
  x402Enabled: boolean;
  /** Freeside facilitator URL for x402 settlement */
  x402FacilitatorUrl: string | null;
  /** Current environment (payment enforcement is fail-closed in production) */
  nodeEnv: string;
  /** Settlement-backed validator for x402 payment headers. */
  validatePaymentHeader?: (
    paymentHeader: string,
    context: { path: string },
  ) => Promise<boolean>;
}

/** One payment-free prefix: why it is free, and which guards still apply. */
export interface FreeRoutePolicyEntry {
  /** Route prefix, matched at exact `/` boundaries after normalization. */
  prefix: string;
  /** Why this prefix is exempt from payment enforcement. */
  reason: string;
  /** Independent guards that still protect this prefix (payment-free ≠ unguarded). */
  guards: readonly string[];
}

/**
 * Payment-free route policy — the single inventory of payment exemptions.
 *
 * Everything NOT listed here is payment-protected (default-deny). Each entry
 * documents why the exemption exists and which auth/abuse guards remain, so
 * "payment-free" never silently becomes "capability-free". Adding a prefix
 * here without corresponding coverage fails
 * `tests/unit/middleware/free-route-auth-coverage.test.ts`.
 *
 * Position in the governance pipeline (ADR-001): the payment gate is
 * position 12 — allowlist (community membership, position 11) has already
 * run for every prefix except those in the allowlist's own skip list
 * (health/auth/admin, which carry their own gates). Free-route policy is
 * therefore a payment-layer exemption only; it never bypasses the earlier
 * pipeline positions (rate limit, allowlist) or the routes' own guards.
 *
 * See: app/docs/payment-route-policy.md (behavior matrix + evidence).
 */
export const FREE_ROUTE_POLICY: readonly FreeRoutePolicyEntry[] = [
  {
    prefix: '/api/health',
    reason: 'Liveness/readiness probes must work before payment negotiation.',
    guards: ['rate limit', 'admin key on /api/health/governance'],
  },
  {
    prefix: '/api/auth/',
    reason: 'SIWE auth + JWKS must be reachable pre-payment to establish identity.',
    guards: ['rate limit', 'SIWE signature verification'],
  },
  {
    prefix: '/.well-known/',
    reason: 'Public discovery metadata (e.g. JWKS) is free by design.',
    guards: ['rate limit'],
  },
  {
    prefix: '/api/admin/',
    reason: 'Operator surface; billing operator actions is meaningless.',
    guards: ['admin key (constant-time comparison)', 'rate limit'],
  },
  {
    prefix: '/api/reputation/',
    reason: 'Reputation query bridge consumed by loa-finn; gated by its own tiers.',
    guards: ['allowlist (wallet/API key)', 'builder+ conviction tier', 'admin key on /population', 'rate limit'],
  },
  {
    prefix: '/api/identity/',
    reason: 'Identity read needed by clients before payment negotiation.',
    guards: ['allowlist (wallet/API key)', 'JWT wallet extraction', 'rate limit'],
  },
];

/** Routes that are always free — everything else is protected (default-deny) */
const FREE_PREFIXES = FREE_ROUTE_POLICY.map((entry) => entry.prefix);

function isProtectedRoute(path: string): boolean {
  // Default-deny: only routes in FREE_PREFIXES are exempt from payment.
  // Matching normalizes the path and requires exact route boundaries, so
  // near-prefix paths (e.g. /api/healthzzz) stay protected and malformed
  // paths fail closed. See src/utils/route-prefix.ts.
  return !matchesRoutePrefix(path, FREE_PREFIXES);
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

  // SEC-2: Production payment enforcement must use a real settlement-backed
  // validator. Header presence alone is acceptable only for non-production
  // shadow/dev paths.
  if (config.nodeEnv === 'production' && !config.validatePaymentHeader) {
    throw new Error(
      'DIXIE_X402_ENABLED=true in production requires settlement-backed payment validation. ' +
      'Payment enforcement without validatePaymentHeader is fail-open in disguise.',
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

    if (config.validatePaymentHeader) {
      let validPayment = false;
      try {
        validPayment = await config.validatePaymentHeader(paymentHeader, { path });
      } catch {
        return c.json({
          error: 'payment_validation_unavailable',
          message: 'Payment validation is temporarily unavailable',
        }, 503);
      }

      if (!validPayment) {
        return c.json({
          error: 'invalid_payment',
          message: 'Payment header could not be validated',
          facilitator: config.x402FacilitatorUrl,
        }, 402);
      }
    }

    await next();
  });
}

/** Exported for testing */
export { isProtectedRoute as _isProtectedRoute };
