import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { requestId } from './middleware/request-id.js';
import { createCors } from './middleware/cors.js';
import { createJwtMiddleware } from './middleware/jwt.js';
import { AllowlistStore, createAllowlistMiddleware } from './middleware/allowlist.js';
import { createRateLimit } from './middleware/rate-limit.js';
import { createTracing } from './middleware/tracing.js';
import { createLogger } from './middleware/logger.js';
import { createBodyLimit } from './middleware/body-limit.js';
import { createHealthRoutes } from './routes/health.js';
import { createAuthRoutes } from './routes/auth.js';
import { createAdminRoutes } from './routes/admin.js';
import { createChatRoutes } from './routes/chat.js';
import { createSessionRoutes } from './routes/sessions.js';
import { createIdentityRoutes } from './routes/identity.js';
import { FinnClient } from './proxy/finn-client.js';
import type { DixieConfig } from './config.js';
import type { LogLevel } from './middleware/logger.js';

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
  const { middleware: loggerMiddleware } = createLogger(
    'dixie-bff',
    (config.logLevel || 'info') as LogLevel,
  );

  // --- Global middleware ---
  app.use('*', requestId());
  app.use('*', createTracing('dixie-bff'));
  app.use('*', secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'wss:'],
    },
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    xFrameOptions: 'DENY',
    referrerPolicy: 'strict-origin-when-cross-origin',
  }));
  app.use('/api/*', createCors(config.corsOrigins));
  app.use('/api/*', createBodyLimit(102_400)); // 100KB body limit

  // --- Response time header ---
  app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    c.header('X-Response-Time', `${Date.now() - start}ms`);
  });

  // --- Structured logging (after response time so latency is available) ---
  app.use('*', loggerMiddleware);

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
  app.route('/api/chat', createChatRoutes(finnClient));
  app.route('/api/sessions', createSessionRoutes(finnClient));
  app.route('/api/identity', createIdentityRoutes(finnClient));

  // --- SPA fallback (placeholder — web build integrated later) ---
  app.get('/', (c) =>
    c.json({ service: 'dixie-bff', status: 'running', version: '1.0.0' }),
  );

  return { app, finnClient, allowlistStore };
}
