import { cors as honoCors } from 'hono/cors';

/**
 * CORS middleware configured with allowed origins.
 */
export function createCors(origins: string[]) {
  return honoCors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposeHeaders: ['X-Request-Id', 'X-Response-Time'],
    maxAge: 3600,
    credentials: true,
  });
}
