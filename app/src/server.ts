import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { requestId } from './middleware/request-id.js';
import { createCors } from './middleware/cors.js';
import { createHealthRoutes } from './routes/health.js';
import { FinnClient } from './proxy/finn-client.js';
import type { DixieConfig } from './config.js';

export interface DixieApp {
  app: Hono;
  finnClient: FinnClient;
}

/**
 * Create and configure the Dixie BFF Hono application.
 */
export function createDixieApp(config: DixieConfig): DixieApp {
  const app = new Hono();
  const finnClient = new FinnClient(config.finnUrl);

  // --- Global middleware ---
  app.use('*', requestId());
  app.use('*', secureHeaders());
  app.use('/api/*', createCors(config.corsOrigins));

  // --- Response time header ---
  app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    c.header('X-Response-Time', `${Date.now() - start}ms`);
  });

  // --- Routes ---
  app.route('/api/health', createHealthRoutes(finnClient));

  // --- SPA fallback (placeholder — web build integrated in Sprint 4) ---
  app.get('/', (c) =>
    c.json({ service: 'dixie-bff', status: 'running', version: '1.0.0' }),
  );

  return { app, finnClient };
}
