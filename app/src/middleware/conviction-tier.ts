import { createMiddleware } from 'hono/factory';
import type { ConvictionResolver } from '../services/conviction-resolver.js';

/**
 * Conviction tier middleware — Position 13 in middleware pipeline.
 *
 * Resolves wallet → conviction tier, injects tier info into request context
 * via headers for downstream route handlers:
 *   x-conviction-tier: observer|participant|builder|architect|sovereign
 *   x-model-pool: pool_observer|pool_standard|pool_premium
 *   x-conviction-source: freeside|legacy_allowlist|admin|default
 *
 * Graceful degradation: resolution failure defaults to 'observer' tier.
 * Never blocks requests — worst case is reduced capability access.
 *
 * See: SDD §2.3 (middleware position 13), §4.3 (conviction resolver)
 */
export function createConvictionTierMiddleware(resolver: ConvictionResolver) {
  return createMiddleware(async (c, next) => {
    const wallet = c.req.header('x-wallet-address') ?? '';

    if (!wallet) {
      // No wallet — set observer defaults and continue
      c.req.raw.headers.set('x-conviction-tier', 'observer');
      c.req.raw.headers.set('x-model-pool', 'pool_observer');
      c.req.raw.headers.set('x-conviction-source', 'default');
      await next();
      // Set response headers
      c.header('X-Conviction-Tier', 'observer');
      return;
    }

    try {
      const result = await resolver.resolve(wallet);

      // Inject into request headers for downstream route handlers
      c.req.raw.headers.set('x-conviction-tier', result.tier);
      c.req.raw.headers.set('x-model-pool', result.modelPool);
      c.req.raw.headers.set('x-conviction-source', result.source);

      await next();

      // Set response headers
      c.header('X-Conviction-Tier', result.tier);
    } catch {
      // Graceful degradation — never block on conviction failure
      c.req.raw.headers.set('x-conviction-tier', 'observer');
      c.req.raw.headers.set('x-model-pool', 'pool_observer');
      c.req.raw.headers.set('x-conviction-source', 'default');
      await next();
      c.header('X-Conviction-Tier', 'observer');
    }
  });
}
