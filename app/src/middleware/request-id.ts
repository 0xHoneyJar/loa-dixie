import { createMiddleware } from 'hono/factory';
import { randomUUID } from 'node:crypto';

/**
 * Generates a unique X-Request-Id for every request.
 * If the incoming request already has one, it is preserved.
 */
export const requestId = () =>
  createMiddleware(async (c, next) => {
    const id = c.req.header('x-request-id') ?? randomUUID();
    c.set('requestId', id);
    c.header('X-Request-Id', id);
    await next();
  });
