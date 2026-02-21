import type { MiddlewareHandler } from 'hono';

/**
 * Economic metadata middleware — position 15 in the middleware pipeline.
 *
 * Sets up cost tracking context for downstream handlers.
 * The stream enricher reads this context to compute per-response economic metadata.
 *
 * Per SDD §2.3: After memory context (position 14), before routes.
 * Attaches model pool and economic tracking headers.
 *
 * Graceful degradation: if middleware fails, request proceeds without economic tracking.
 */
export function createEconomicMetadata(): MiddlewareHandler {
  return async (c, next) => {
    const startTime = Date.now();

    // Set start time for duration tracking
    c.req.raw.headers.set('x-economic-start-ms', String(startTime));

    // Default model pool — will be overridden by conviction tier middleware when available
    if (!c.req.header('x-model-pool')) {
      c.req.raw.headers.set('x-model-pool', 'default');
    }

    await next();

    // After response: set economic headers
    const durationMs = Date.now() - startTime;
    c.header('X-Duration-Ms', String(durationMs));

    // These headers are populated by the stream enricher or route handlers
    // when economic metadata is available
    const cost = c.req.header('x-response-cost-micro-usd');
    if (cost) {
      c.header('X-Cost-Micro-USD', cost);
    }

    const model = c.req.header('x-response-model');
    if (model) {
      c.header('X-Model-Used', model);
    }
  };
}
