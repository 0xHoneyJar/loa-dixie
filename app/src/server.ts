import * as path from 'node:path';
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
import { createConvictionTierMiddleware } from './middleware/conviction-tier.js';
import { createPersonalityRoutes } from './routes/personality.js';
import { PersonalityCache } from './services/personality-cache.js';
import { ConvictionResolver } from './services/conviction-resolver.js';
import { AutonomousEngine } from './services/autonomous-engine.js';
import { createAutonomousRoutes } from './routes/autonomous.js';
import { ScheduleStore } from './services/schedule-store.js';
import { createScheduleRoutes } from './routes/schedule.js';
import { createTBAAuthMiddleware } from './middleware/tba-auth.js';
import { createAgentRoutes } from './routes/agent.js';
import { CompoundLearningEngine } from './services/compound-learning.js';
import { createLearningRoutes } from './routes/learning.js';
import { governorRegistry } from './services/governor-registry.js';
import { corpusMeta } from './services/corpus-meta.js';
import { KnowledgePriorityStore } from './services/knowledge-priority-store.js';
import { ReputationService, InMemoryReputationStore } from './services/reputation-service.js';
import { PostgresReputationStore } from './db/pg-reputation-store.js';
import { EnrichmentService } from './services/enrichment-service.js';
import { createEnrichmentRoutes } from './routes/enrich.js';
import type { TBAVerification } from './types/agent-api.js';
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
  /** Phase 2: Conviction tier resolver */
  convictionResolver: ConvictionResolver;
  /** Phase 2: Autonomous operation engine */
  autonomousEngine: AutonomousEngine;
  /** Phase 2: NL schedule store */
  scheduleStore: ScheduleStore;
  /** Phase 2: Compound learning engine */
  learningEngine: CompoundLearningEngine;
  /** Phase 2: Reputation service (Sprint 6) */
  reputationService: ReputationService;
  /** Phase 2: Enrichment service for autopoietic loop (Sprint 11) */
  enrichmentService: EnrichmentService;
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

  // Phase 2: Conviction resolver (uses projection cache with conviction prefix when Redis available)
  let convictionProjectionCache: ProjectionCache<import('./types/conviction.js').ConvictionResult> | null = null;
  if (redisClient) {
    convictionProjectionCache = new ProjectionCache(
      redisClient,
      'conviction',
      config.convictionTierTtlSec,
    );
  }
  const convictionResolver = new ConvictionResolver(
    finnClient,
    convictionProjectionCache,
    allowlistStore,
  );

  // Phase 2: Autonomous engine (uses projection cache with autonomous prefix when Redis available)
  let autonomousProjectionCache: ProjectionCache<import('./types/autonomous.js').AutonomousPermissions> | null = null;
  if (redisClient) {
    autonomousProjectionCache = new ProjectionCache(
      redisClient,
      'autonomous',
      config.autonomousPermissionTtlSec,
    );
  }
  const autonomousEngine = new AutonomousEngine(finnClient, autonomousProjectionCache, {
    budgetDefaultMicroUsd: config.autonomousBudgetDefaultMicroUsd,
  });

  // Phase 2: NL schedule store (uses finn client for cron registration)
  const scheduleStore = new ScheduleStore(finnClient);

  // Phase 2: Compound learning engine (batch processing every 10 interactions)
  const learningEngine = new CompoundLearningEngine();

  // Phase 3: Reputation service — PostgreSQL when DB available, InMemory fallback
  const reputationStore = dbPool
    ? new PostgresReputationStore(dbPool)
    : new InMemoryReputationStore();
  const reputationService = new ReputationService(reputationStore);

  // Phase 2: Enrichment service for autopoietic loop (Sprint 11, Task 11.1)
  // Assembles governance context from in-memory caches for review prompt enrichment.
  // All data sourced from in-memory caches — no database calls in the hot path.
  const enrichmentService = new EnrichmentService({ reputationService });

  // Phase 2: Knowledge priority store (conviction-weighted community governance, Task 21.4)
  // Task 22.4: Persist votes to disk so they survive restarts
  const priorityStore = new KnowledgePriorityStore({
    persistPath: path.join(process.cwd(), 'data', 'knowledge-priorities.json'),
  });

  // Phase 2: TBA verification cache (uses projection cache with tba prefix when Redis available)
  let tbaProjectionCache: ProjectionCache<TBAVerification> | null = null;
  if (redisClient) {
    tbaProjectionCache = new ProjectionCache(
      redisClient,
      'tba',
      300, // 5 minute TTL per SDD §7.2
    );
  }

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

  // --- Phase 2 Position 13: Conviction tier resolution ---
  // Resolves wallet → BGT staking → conviction tier (5-tier commons governance)
  // Graceful degradation: failure defaults to 'observer' tier
  app.use('/api/*', createConvictionTierMiddleware(convictionResolver));

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
    adminKey: config.adminKey,
    reputationService,
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
  app.route('/api/autonomous', createAutonomousRoutes({ autonomousEngine, convictionResolver }));
  app.route('/api/schedule', createScheduleRoutes({
    scheduleStore,
    convictionResolver,
    callbackSecret: config.scheduleCallbackSecret,
    // LIMITATION: Returns first NFT only — wallets with multiple dNFTs will only
    // resolve the primary. Multi-NFT support tracked in loa-finn issue
    // "Dixie Phase 2: API Contract Surfaces" (single-NFT limitation).
    resolveNftOwnership: async (wallet: string) => {
      try {
        const result = await finnClient.request<{ nftId: string }>(
          'GET',
          `/api/identity/wallet/${encodeURIComponent(wallet)}/nft`,
        );
        return result;
      } catch {
        return null;
      }
    },
  }));

  // --- Phase 2: Enrichment API — autopoietic loop activation (Sprint 11) ---
  // Assembles governance context for review prompt enrichment.
  // Conviction-gated: builder+ tier required. 50ms latency budget enforced.
  app.route('/api/enrich', createEnrichmentRoutes({ enrichmentService }));

  // --- Phase 2: Agent API with TBA authentication ---
  // TBA auth middleware applies only to /api/agent/* routes
  app.use('/api/agent/*', createTBAAuthMiddleware({
    cache: tbaProjectionCache,
    verifyTBA: async (tbaAddress, signature, message) => {
      // Verify via loa-finn/freeside TBA verification endpoint
      try {
        const result = await finnClient.request<TBAVerification>(
          'POST',
          '/api/auth/verify-tba',
          { body: { tbaAddress, signature, message } },
        );
        return result;
      } catch {
        return null;
      }
    },
  }));
  app.route('/api/agent', createAgentRoutes({
    finnClient,
    convictionResolver,
    memoryStore,
    priorityStore,
  }));
  app.route('/api/learning', createLearningRoutes({
    learningEngine,
    // LIMITATION: Returns first NFT only — wallets with multiple dNFTs will only
    // resolve the primary. Multi-NFT support tracked in loa-finn issue
    // "Dixie Phase 2: API Contract Surfaces" (single-NFT limitation).
    resolveNftOwnership: async (wallet: string) => {
      try {
        const result = await finnClient.request<{ nftId: string }>(
          'GET',
          `/api/identity/wallet/${encodeURIComponent(wallet)}/nft`,
        );
        return result;
      } catch {
        return null;
      }
    },
  }));
  app.route('/api/memory', createMemoryRoutes({
    memoryStore,
    // LIMITATION: Returns first NFT only — wallets with multiple dNFTs will only
    // resolve the primary. Multi-NFT support tracked in loa-finn issue
    // "Dixie Phase 2: API Contract Surfaces" (single-NFT limitation).
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

  // --- Resource governance registration (Task 20.5) ---
  // Register all resource governors for unified observability via GET /health/governance.
  // Additional governors (model pools, memory quotas, etc.) will register here as built.
  // Idempotent: skip if already registered (e.g., multiple createDixieApp calls in tests).
  if (!governorRegistry.get(corpusMeta.resourceType)) {
    governorRegistry.register(corpusMeta);
  }

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
    convictionResolver,
    autonomousEngine,
    scheduleStore,
    learningEngine,
    reputationService,
    enrichmentService,
  };
}
