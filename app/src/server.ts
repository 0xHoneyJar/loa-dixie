import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { requestId } from './middleware/request-id.js';
import { createCors } from './middleware/cors.js';
import { createJwtMiddleware } from './middleware/jwt.js';
import { AllowlistStore, createAllowlistMiddleware } from './middleware/allowlist.js';
import { createRateLimit } from './middleware/rate-limit.js';
import { createHealthRoutes } from './routes/health.js';
import { createAuthRoutes } from './routes/auth.js';
import { createAdminRoutes } from './routes/admin.js';
import { FinnClient } from './proxy/finn-client.js';
import type { DixieConfig } from './config.js';

export interface DixieApp {
  app: Hono;
  finnClient: FinnClient;
  allowlistStore: AllowlistStore;
}

/**
 * Create and configure the Dixie BFF Hono application.
 */
export function createDixieApp(config: DixieConfig): DixieApp {
  const app = new Hono();
  const finnClient = new FinnClient(config.finnUrl);
  const allowlistStore = new AllowlistStore(config.allowlistPath);

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

  // --- Auth middleware (extract wallet from JWT, set on context) ---
  app.use('/api/*', createJwtMiddleware(config.jwtPrivateKey, 'dixie-bff'));

  // --- Rate limiting ---
  app.use('/api/*', createRateLimit(config.rateLimitRpm));

  // --- Allowlist gate (after JWT extraction so wallet is available) ---
  app.use('/api/*', createAllowlistMiddleware(allowlistStore));

  // --- Routes ---
  app.route('/api/health', createHealthRoutes(finnClient));
  app.route('/api/auth', createAuthRoutes(allowlistStore, {
    jwtPrivateKey: config.jwtPrivateKey,
    issuer: 'dixie-bff',
    expiresIn: '1h',
  }));
  app.route('/api/admin', createAdminRoutes(allowlistStore, config.adminKey));

  // --- SPA fallback (placeholder — web build integrated in Sprint 4) ---
  app.get('/', (c) =>
    c.json({ service: 'dixie-bff', status: 'running', version: '1.0.0' }),
  );

  return { app, finnClient, allowlistStore };
}
