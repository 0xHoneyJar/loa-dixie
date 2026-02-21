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
import { createMemoryRoutes } from './routes/memory.js';
import { FinnClient } from './proxy/finn-client.js';
import { TicketStore } from './services/ticket-store.js';
import { MemoryStore } from './services/memory-store.js';
import { createMemoryContext } from './middleware/memory-context.js';
import { createEconomicMetadata } from './middleware/economic-metadata.js';
import { createPersonalityRoutes } from './routes/personality.js';
import { PersonalityCache } from './services/personality-cache.js';
import { createDbPool, type DbPool } from './db/client.js';
import { createRedisClient, type RedisClient } from './services/redis-client.js';
import { SignalEmitter } from './services/signal-emitter.js';
import { ProjectionCache } from './services/projection-cache.js';
import type { MemoryProjection } from './types/memory.js';
import type { DixieConfig } from './config.js';
import type { LogLevel } from './middleware/logger.js';

export interface DixieApp {
  app: Hono;
  finnClient: FinnClient;
  allowlistStore: AllowlistStore;
  ticketStore: TicketStore;
  /** Phase 2: PostgreSQL pool (null when DATABASE_URL not configured) */
  dbPool: DbPool | null;
  /** Phase 2: Redis client (null when REDIS_URL not configured) */
  redisClient: RedisClient | null;
  /** Phase 2: NATS signal emitter (null when NATS_URL not configured) */
  signalEmitter: SignalEmitter | null;
  /** Phase 2: Memory projection cache (null when Redis not configured) */
  projectionCache: ProjectionCache<MemoryProjection> | null;
  /** Phase 2: Soul memory store (null when finn/projection cache not available) */
  memoryStore: MemoryStore | null;
  /** Phase 2: BEAUVOIR personality cache */
  personalityCache: PersonalityCache;
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

  // Phase 2: Infrastructure clients (null when not configured — graceful degradation)
  let dbPool: DbPool | null = null;
  if (config.databaseUrl) {
    dbPool = createDbPool({
      connectionString: config.databaseUrl,
      log,
    });
  }

  let redisClient: RedisClient | null = null;
  if (config.redisUrl) {
    redisClient = createRedisClient({
      url: config.redisUrl,
      log,
    });
  }

  let signalEmitter: SignalEmitter | null = null;
  if (config.natsUrl) {
    signalEmitter = new SignalEmitter({
      url: config.natsUrl,
      log,
    });
    // Connect asynchronously — don't block startup
    signalEmitter.connect().catch((err) => {
      log('error', {
        event: 'nats_connect_error',
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // Phase 2: Projection cache (requires Redis)
  let projectionCache: ProjectionCache<MemoryProjection> | null = null;
  if (redisClient) {
    projectionCache = new ProjectionCache<MemoryProjection>(
      redisClient,
      'memory:projection',
      config.memoryProjectionTtlSec,
    );
  }

  // Phase 2: Soul memory store (requires finn client; projection cache optional)
  const memoryStore = new MemoryStore(finnClient, projectionCache);

  // Phase 2: Personality cache (uses projection cache with personality prefix when Redis available)
  let personalityProjectionCache: ProjectionCache<import('./services/personality-cache.js').PersonalityData> | null = null;
  if (redisClient) {
    personalityProjectionCache = new ProjectionCache(
      redisClient,
      'personality',
      config.personalityTtlSec,
    );
  }
  const personalityCache = new PersonalityCache(finnClient, personalityProjectionCache);

  // DECISION: Middleware pipeline as constitutional ordering (communitarian architecture)
  // The middleware sequence is not arbitrary — it encodes governance priorities.
  // Allowlist (community membership) gates payment (economic access), which gates
  // routes (capability access). This ordering ensures community governance controls
  // economic flows, not the other way around. Reordering is an architectural decision.
  // See: grimoires/loa/context/adr-communitarian-agents.md
  // See: grimoires/loa/context/adr-conway-positioning.md
  //
  // Phase 2 extends the pipeline from 12 to 15 positions.
  // See: SDD §2.3 Middleware Pipeline Evolution
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
  // 9. walletBridge — copy wallet to header for route handlers
  // 10. rateLimit — rate-limit by wallet/IP (now distributed via Redis)
  // 11. allowlist — gate by wallet/API key
  // 12. payment — x402 micropayment hook (noop for human users)
  // Phase 2 middleware positions:
  // 13. convictionTier — BGT conviction resolver (Sprint 5)
  // 14. memoryContext — soul memory injection (Sprint 2) ✅
  // 15. economicMetadata — cost tracking setup (Sprint 3)

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

  // --- Rate limiting (Phase 2: Redis-backed when available) ---
  app.use('/api/*', createRateLimit(config.rateLimitRpm, {
    redis: config.rateLimitBackend === 'redis' ? redisClient ?? undefined : undefined,
  }));

  // --- Allowlist gate (after JWT extraction so wallet is available) ---
  app.use('/api/*', createAllowlistMiddleware(allowlistStore));

  // HOOK: x402 payment gate — micropayment middleware slot (loa-freeside #62)
  // Position: after allowlist (don't bill denied requests), before routes
  // Replace with @x402/hono when ready. See: app/src/middleware/payment.ts
  app.use('/api/*', createPaymentGate());

  // --- Phase 2 Position 14: Memory context injection ---
  // Resolves wallet → nftId → projection → InjectionContext
  // Graceful degradation: failure doesn't block request
  app.use('/api/*', createMemoryContext({
    memoryStore,
    resolveNftId: async (wallet: string) => {
      // Resolve nftId from wallet via loa-finn identity graph
      // Returns null if wallet has no associated dNFT
      try {
        const result = await finnClient.request<{ nftId: string }>(
          'GET',
          `/api/identity/wallet/${encodeURIComponent(wallet)}/nft`,
        );
        return result.nftId;
      } catch {
        return null;
      }
    },
  }));

  // --- Phase 2 Position 15: Economic metadata ---
  // Sets up cost tracking context (x-economic-start-ms, x-model-pool)
  // After response: sets X-Duration-Ms, X-Cost-Micro-USD headers
  // Graceful degradation: failure doesn't block request
  app.use('/api/*', createEconomicMetadata());

  // --- Routes ---
  app.route('/api/health', createHealthRoutes({
    finnClient,
    dbPool,
    redisClient,
    signalEmitter,
  }));
  app.route('/api/auth', createAuthRoutes(allowlistStore, {
    jwtPrivateKey: config.jwtPrivateKey,
    issuer: 'dixie-bff',
    expiresIn: '1h',
  }));
  app.route('/api/admin', createAdminRoutes(allowlistStore, config.adminKey));
  app.route('/api/ws/ticket', createWsTicketRoutes(ticketStore));
  app.route('/api/chat', createChatRoutes(finnClient, { signalEmitter }));
  app.route('/api/sessions', createSessionRoutes(finnClient));
  app.route('/api/identity', createIdentityRoutes(finnClient));
  app.route('/api/personality', createPersonalityRoutes({ personalityCache }));
  app.route('/api/memory', createMemoryRoutes({
    memoryStore,
    resolveNftOwnership: async (wallet: string) => {
      try {
        const result = await finnClient.request<{
          nftId: string;
          ownerWallet: string;
          delegatedWallets: string[];
        }>('GET', `/api/identity/wallet/${encodeURIComponent(wallet)}/ownership`);
        return result;
      } catch {
        return null;
      }
    },
  }));

  // --- SPA fallback (placeholder — web build integrated later) ---
  app.get('/', (c) =>
    c.json({ service: 'dixie-bff', status: 'running', version: '2.0.0' }),
  );

  return {
    app,
    finnClient,
    allowlistStore,
    ticketStore,
    dbPool,
    redisClient,
    signalEmitter,
    projectionCache,
    memoryStore,
    personalityCache,
  };
}
