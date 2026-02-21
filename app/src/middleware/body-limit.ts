import { createMiddleware } from 'hono/factory';

/**
 * Body size limit middleware.
 * Rejects requests with Content-Length exceeding the limit.
 *
 * Uses the Content-Length header for an early, zero-copy rejection before the
 * body is buffered. This is intentional: streaming body inspection would require
 * consuming the request body (expensive for large payloads we want to reject).
 * Trade-off: clients that omit Content-Length bypass this check — the upstream
 * body parser or runtime will enforce limits at read time.
 */
export function createBodyLimit(maxBytes: number = 102_400) {
  return createMiddleware(async (c, next) => {
    const contentLength = c.req.header('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      return c.json(
        { error: 'payload_too_large', message: `Body exceeds ${maxBytes} bytes` },
        413,
      );
    }
    await next();
  });
}
