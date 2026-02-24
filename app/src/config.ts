export interface DixieConfig {
  port: number;
  finnUrl: string;
  finnWsUrl: string;
  corsOrigins: string[];
  allowlistPath: string;
  adminKey: string;
  jwtPrivateKey: string;
  nodeEnv: string;
  logLevel: string;
  rateLimitRpm: number;
  otelEndpoint: string | null;

  // Phase 2: Infrastructure connections
  databaseUrl: string | null;
  redisUrl: string | null;
  natsUrl: string | null;

  // Phase 2: Memory configuration
  memoryProjectionTtlSec: number;
  memoryMaxEventsPerQuery: number;

  /** Cache TTL for conviction tier lookups (seconds). Default 300.
   *  5 minutes balances freshness (BGT staking changes are infrequent)
   *  against freeside API load. Invalidated on staking events. */
  convictionTierTtlSec: number;

  // Phase 2: BEAUVOIR personality cache
  personalityTtlSec: number;

  // Phase 2: Autonomous mode
  /** Cache TTL for autonomous permission lookups (seconds). Default 300.
   *  Separate config key allows independent tuning if permission revocation
   *  propagation needs to be faster than tier change propagation (staking is slow).
   *  Defaults match conviction TTL (300s) as a reasonable launch baseline. */
  autonomousPermissionTtlSec: number;
  autonomousBudgetDefaultMicroUsd: number;

  // Phase 2: Rate limiting backend
  rateLimitBackend: 'memory' | 'redis';

  // Phase 2: Schedule callback HMAC secret (Bridge high-2)
  scheduleCallbackSecret: string;

  // Phase 3: ES256 JWT detection
  /** True when jwtPrivateKey is PEM-encoded (ES256 mode). */
  isEs256: boolean;

  // Phase 3: x402 payment scaffold
  /** When true, payment scaffold is active (sets X-Payment-Status header). Default false. */
  x402Enabled: boolean;

  /** Old HS256 secret for the ES256 transition period. Null when not in transition. */
  hs256FallbackSecret: string | null;

  /** Previous ES256 PEM key for key rotation grace period. Null when not rotating. */
  jwtPreviousKey: string | null;
}

/**
 * Environment variables:
 *
 * FINN_URL              (required) — loa-finn backend URL (e.g. http://localhost:3000)
 * FINN_WS_URL           (optional) — WebSocket URL for loa-finn; defaults to FINN_URL with ws:// scheme
 * DIXIE_PORT            (optional) — HTTP listen port; default 3001
 * DIXIE_JWT_PRIVATE_KEY (required) — HS256 secret for JWT signing; min 32 chars (empty allowed in test)
 * DIXIE_CORS_ORIGINS    (optional) — comma-separated allowed origins; default http://localhost:{port}
 * DIXIE_ALLOWLIST_PATH  (optional) — path to allowlist JSON file; default /data/allowlist.json
 * DIXIE_ADMIN_KEY       (optional) — admin API key for /api/admin endpoints
 * DIXIE_RATE_LIMIT_RPM  (optional) — max requests per minute per identity; default 100
 * NODE_ENV              (optional) — runtime environment; default 'development'
 * LOG_LEVEL             (optional) — structured log level; default 'info'
 * OTEL_EXPORTER_OTLP_ENDPOINT (optional) — OpenTelemetry collector endpoint; null disables tracing export
 *
 * Phase 2 additions:
 * DATABASE_URL           (optional) — PostgreSQL connection string; null disables DB features
 * REDIS_URL              (optional) — Redis connection string; null disables Redis features
 * NATS_URL               (optional) — NATS server URL; null disables NATS features
 * DIXIE_MEMORY_PROJECTION_TTL (optional) — projection cache TTL in seconds; default 300
 * DIXIE_MEMORY_MAX_EVENTS     (optional) — max events per query; default 100
 * DIXIE_CONVICTION_TIER_TTL   (optional) — conviction tier cache TTL in seconds; default 300
 * DIXIE_PERSONALITY_TTL       (optional) — BEAUVOIR personality cache TTL in seconds; default 1800
 * DIXIE_AUTONOMOUS_PERMISSION_TTL (optional) — autonomous permission cache TTL in seconds; default 300
 * DIXIE_AUTONOMOUS_BUDGET     (optional) — default autonomous budget in micro-USD; default 100000
 * DIXIE_RATE_LIMIT_BACKEND    (optional) — 'memory' or 'redis'; default 'memory' (auto-upgrades to 'redis' when REDIS_URL set)
 * DIXIE_SCHEDULE_CALLBACK_SECRET (optional) — HMAC secret for schedule callback verification; default '' (rejects all callbacks in production)
 */
export function loadConfig(): DixieConfig {
  const finnUrl = process.env.FINN_URL;
  if (!finnUrl) {
    throw new Error('FINN_URL is required');
  }

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  // ADR: JWT key format — currently a raw string for HS256.
  // For ES256 migration (Phase 2), this becomes a PEM-encoded EC private key.
  // The validation below (≥32 chars) applies to HS256 raw secrets.
  // For ES256, update validation to check for '-----BEGIN EC PRIVATE KEY-----' prefix.
  const jwtPrivateKey = process.env.DIXIE_JWT_PRIVATE_KEY ?? '';

  // Phase 3: ES256 auto-detection — PEM prefix indicates asymmetric key
  const isEs256 = jwtPrivateKey.startsWith('-----BEGIN');

  // Validate JWT key — an empty or short key allows trivial token forgery.
  // In test mode, allow empty key for convenience but warn.
  // For ES256 (PEM keys), skip the length check — PEM format is self-validating.
  if (nodeEnv === 'test' && !jwtPrivateKey) {
    process.stderr.write('WARNING: DIXIE_JWT_PRIVATE_KEY is empty (test mode)\n');
  } else if (!isEs256 && jwtPrivateKey.length < 32) {
    throw new Error(
      `DIXIE_JWT_PRIVATE_KEY must be at least 32 characters (got ${jwtPrivateKey.length})`,
    );
  }

  const port = parseInt(process.env.DIXIE_PORT ?? '3001', 10);
  const finnWsUrl = process.env.FINN_WS_URL
    ?? finnUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');

  // SEC-001: Validate admin key is non-empty in production.
  // An empty DIXIE_ADMIN_KEY combined with safeEqual('','') === true opens the admin API.
  const adminKey = process.env.DIXIE_ADMIN_KEY ?? '';
  if (!adminKey && nodeEnv === 'production') {
    throw new Error('DIXIE_ADMIN_KEY is required in production (empty key allows unauthenticated admin access)');
  }

  const corsOriginsRaw = process.env.DIXIE_CORS_ORIGINS ?? `http://localhost:${port}`;
  const corsOrigins = corsOriginsRaw.split(',').map(o => o.trim());

  const redisUrl = process.env.REDIS_URL ?? null;

  // Rate limit backend: explicit override, or auto-upgrade when Redis available
  const rateLimitBackendRaw = process.env.DIXIE_RATE_LIMIT_BACKEND;
  let rateLimitBackend: 'memory' | 'redis' = 'memory';
  if (rateLimitBackendRaw === 'redis' || rateLimitBackendRaw === 'memory') {
    rateLimitBackend = rateLimitBackendRaw;
  } else if (redisUrl) {
    rateLimitBackend = 'redis';
  }

  return {
    port,
    finnUrl,
    finnWsUrl,
    corsOrigins,
    allowlistPath: process.env.DIXIE_ALLOWLIST_PATH ?? '/data/allowlist.json',
    adminKey,
    jwtPrivateKey,
    nodeEnv,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    rateLimitRpm: parseInt(process.env.DIXIE_RATE_LIMIT_RPM ?? '100', 10),
    otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? null,

    // Phase 2: Infrastructure
    databaseUrl: process.env.DATABASE_URL ?? null,
    redisUrl,
    natsUrl: process.env.NATS_URL ?? null,

    // Phase 2: Memory config
    memoryProjectionTtlSec: parseInt(process.env.DIXIE_MEMORY_PROJECTION_TTL ?? '300', 10),
    memoryMaxEventsPerQuery: parseInt(process.env.DIXIE_MEMORY_MAX_EVENTS ?? '100', 10),

    // Phase 2: Conviction
    convictionTierTtlSec: parseInt(process.env.DIXIE_CONVICTION_TIER_TTL ?? '300', 10),

    // Phase 2: Personality
    personalityTtlSec: parseInt(process.env.DIXIE_PERSONALITY_TTL ?? '1800', 10),

    // Phase 2: Autonomous
    autonomousPermissionTtlSec: parseInt(process.env.DIXIE_AUTONOMOUS_PERMISSION_TTL ?? '300', 10),
    autonomousBudgetDefaultMicroUsd: parseInt(process.env.DIXIE_AUTONOMOUS_BUDGET ?? '100000', 10),

    // Phase 2: Rate limiting
    rateLimitBackend,

    // Phase 2: Schedule callback HMAC
    scheduleCallbackSecret: process.env.DIXIE_SCHEDULE_CALLBACK_SECRET ?? '',

    // Phase 3: ES256 detection
    isEs256,

    // Phase 3: x402 payment scaffold
    x402Enabled: process.env.DIXIE_X402_ENABLED === 'true',

    // Phase 3: HS256 fallback for ES256 transition period
    // Set to the old HS256 secret during migration so in-flight tokens still verify.
    hs256FallbackSecret: process.env.DIXIE_HS256_FALLBACK_SECRET ?? null,

    // Phase 3: Previous ES256 key for key rotation grace period.
    // Set to the previous PEM key during rotation so in-flight tokens still verify.
    // JWKS serves both keys when this is set. See key rotation runbook in jwks.ts.
    jwtPreviousKey: process.env.DIXIE_JWT_PREVIOUS_KEY ?? null,
  };
}
