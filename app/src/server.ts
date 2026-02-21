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
import { createPaymentGate } from './middleware/payment.js';
import { createWalletBridge } from './middleware/wallet-bridge.js';
import { createHealthRoutes } from './routes/health.js';
import { createAuthRoutes } from './routes/auth.js';
import { createAdminRoutes } from './routes/admin.js';
import { createChatRoutes } from './routes/chat.js';
import { createSessionRoutes } from './routes/sessions.js';
import { createIdentityRoutes } from './routes/identity.js';
import { createWsTicketRoutes } from './routes/ws-ticket.js';
import { FinnClient } from './proxy/finn-client.js';
import { TicketStore } from './services/ticket-store.js';
import type { DixieConfig } from './config.js';
import type { LogLevel } from './middleware/logger.js';

export interface DixieApp {
  app: Hono;
  finnClient: FinnClient;
  allowlistStore: AllowlistStore;
  ticketStore: TicketStore;
}

/**
 * Create and configure the Dixie BFF Hono application.
 */
export function createDixieApp(config: DixieConfig): DixieApp {
  const app = new Hono();
  const { middleware: loggerMiddleware, log } = createLogger(
    'dixie-bff',
    (config.logLevel || 'info') as LogLevel,
  );
  const finnClient = new FinnClient(config.finnUrl, { log });
  const allowlistStore = new AllowlistStore(config.allowlistPath, {
    watch: config.nodeEnv !== 'test',
  });
  const ticketStore = new TicketStore();

  // DECISION: Middleware pipeline as constitutional ordering (communitarian architecture)
  // The middleware sequence is not arbitrary — it encodes governance priorities.
  // Allowlist (community membership) gates payment (economic access), which gates
  // routes (capability access). This ordering ensures community governance controls
  // economic flows, not the other way around. Reordering is an architectural decision.
  // See: grimoires/loa/context/adr-communitarian-agents.md
  // See: grimoires/loa/context/adr-conway-positioning.md
  //
  // Middleware ordering rationale:
  // 1. requestId — generates trace ID before anything else
  // 2. tracing — OpenTelemetry spans need the request ID
  // 3. secureHeaders — security headers on every response
  // 4. cors — CORS must precede body parsing
  // 5. bodyLimit — reject oversized payloads early
  // 6. responseTime — wraps all downstream processing
  // 7. logger — logs with response time available
  // 8. jwt — extracts wallet from token
  // 9. rateLimit — rate-limit by wallet/IP
  // 10. allowlist — gate by wallet/API key
  // 11. payment — x402 micropayment hook (noop)
  // 12. routes — business logic

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

  // --- Wallet bridge (SEC-003: copy wallet from context to request header) ---
  // JWT middleware stores wallet via c.set('wallet'), but Hono sub-app boundaries
  // reset typed context. Route handlers read x-wallet-address header.
  app.use('/api/*', createWalletBridge());

  // --- Rate limiting ---
  app.use('/api/*', createRateLimit(config.rateLimitRpm));

  // --- Allowlist gate (after JWT extraction so wallet is available) ---
  app.use('/api/*', createAllowlistMiddleware(allowlistStore));

  // HOOK: x402 payment gate — micropayment middleware slot (loa-freeside #62)
  // Position: after allowlist (don't bill denied requests), before routes
  // Replace with @x402/hono when ready. See: app/src/middleware/payment.ts
  app.use('/api/*', createPaymentGate());

  // --- Routes ---
  app.route('/api/health', createHealthRoutes(finnClient));
  app.route('/api/auth', createAuthRoutes(allowlistStore, {
    jwtPrivateKey: config.jwtPrivateKey,
    issuer: 'dixie-bff',
    expiresIn: '1h',
  }));
  app.route('/api/admin', createAdminRoutes(allowlistStore, config.adminKey));
  app.route('/api/ws/ticket', createWsTicketRoutes(ticketStore));
  app.route('/api/chat', createChatRoutes(finnClient));
  app.route('/api/sessions', createSessionRoutes(finnClient));
  app.route('/api/identity', createIdentityRoutes(finnClient));

  // --- SPA fallback (placeholder — web build integrated later) ---
  app.get('/', (c) =>
    c.json({ service: 'dixie-bff', status: 'running', version: '1.0.0' }),
  );

  return { app, finnClient, allowlistStore, ticketStore };
}
