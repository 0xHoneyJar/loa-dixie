import { createMiddleware } from 'hono/factory';

/**
 * Body size limit middleware.
 * Rejects requests with Content-Length exceeding the limit.
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
