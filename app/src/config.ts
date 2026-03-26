/**
 * Parse an integer env var with bounds validation.
 * Returns defaultVal on NaN or negative. Clamps to max if provided.
 * Note: 0 is a valid return value (not treated as falsy/default).
 */
export function safeParseInt(raw: string | undefined, defaultVal: number, max?: number): number {
  const parsed = parseInt(raw ?? String(defaultVal), 10);
  if (Number.isNaN(parsed) || parsed < 0) return defaultVal;
  if (max !== undefined && parsed > max) return max;
  return parsed;
}

export interface DixieConfig {
  port: number;
  finnUrl: string;
  finnWsUrl: string;
  corsOrigins: string[];
  allowlistPath: string;
  adminKey: string;
  jwtPrivateKey: string;
  /** Derived JWT algorithm — 'ES256' for asymmetric (PEM key), 'HS256' for symmetric */
  jwtAlgorithm: 'ES256' | 'HS256';
  /** Legacy HS256 secret for dual-algorithm transition window. Only used when jwtAlgorithm='ES256'. */
  jwtLegacyHs256Secret: string | null;
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

  // Phase 2: Connection pool sizing
  databasePoolSize: number;

  // Phase 2: Rate limiting backend
  rateLimitBackend: 'memory' | 'redis';

  // Phase 2: Schedule callback HMAC secret (Bridge high-2)
  scheduleCallbackSecret: string;

  // Phase 3: x402 payment activation
  x402Enabled: boolean;
  x402FacilitatorUrl: string | null;

  // Phase 3: Dynamic pricing
  pricingApiUrl: string | null;
  pricingTtlSec: number;
}

/**
 * Environment variables:
 *
 * FINN_URL              (required) — loa-finn backend URL (e.g. http://localhost:3000)
 * FINN_WS_URL           (optional) — WebSocket URL for loa-finn; defaults to FINN_URL with ws:// scheme
 * DIXIE_PORT            (optional) — HTTP listen port; default 3001
 * DIXIE_JWT_PRIVATE_KEY (required) — JWT signing key; HS256 raw secret (min 32 chars) or EC P-256 PEM for ES256
 * DIXIE_JWT_ALG         (optional) — explicit algorithm override: 'ES256' or 'HS256'; auto-detected from key format if not set
 * DIXIE_JWT_LEGACY_HS256_SECRET (optional) — old HS256 secret for dual-algorithm transition; only used when JWT_ALG=ES256
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
 * DATABASE_POOL_SIZE          (optional) — max connections in PostgreSQL pool; default 10
 * DIXIE_RATE_LIMIT_BACKEND    (optional) — 'memory' or 'redis'; default 'memory' (auto-upgrades to 'redis' when REDIS_URL set)
 * DIXIE_SCHEDULE_CALLBACK_SECRET (optional) — HMAC secret for schedule callback verification; default '' (rejects all callbacks in production)
 *
 * Phase 3 additions:
 * DIXIE_X402_ENABLED           (optional) — enable x402 payment enforcement; default 'false'
 * DIXIE_X402_FACILITATOR_URL   (optional) — freeside x402 facilitator URL; null disables settlement
 * DIXIE_PRICING_API_URL        (optional) — freeside dynamic pricing API URL; null uses hardcoded rates
 * DIXIE_PRICING_TTL            (optional) — pricing cache TTL in seconds; default 300
 */
export function loadConfig(): DixieConfig {
  const finnUrl = process.env.FINN_URL;
  if (!finnUrl) {
    throw new Error('FINN_URL is required');
  }

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const jwtPrivateKey = process.env.DIXIE_JWT_PRIVATE_KEY ?? '';

  // Determine JWT algorithm: explicit env var takes precedence, then auto-detect from key format
  const jwtAlgRaw = process.env.DIXIE_JWT_ALG;
  let jwtAlgorithm: 'ES256' | 'HS256';
  const isPemKey = jwtPrivateKey.includes('-----BEGIN') && jwtPrivateKey.includes('PRIVATE KEY');

  if (jwtAlgRaw === 'ES256' || jwtAlgRaw === 'HS256') {
    jwtAlgorithm = jwtAlgRaw;
  } else if (jwtAlgRaw) {
    throw new Error(`DIXIE_JWT_ALG must be 'ES256' or 'HS256' (got '${jwtAlgRaw}')`);
  } else {
    jwtAlgorithm = isPemKey ? 'ES256' : 'HS256';
  }

  // Validate key material matches declared algorithm (Flatline SEC-1: prevent misclassification)
  if (nodeEnv === 'test' && !jwtPrivateKey) {
    process.stderr.write('WARNING: DIXIE_JWT_PRIVATE_KEY is empty (test mode)\n');
  } else if (jwtAlgorithm === 'ES256') {
    if (!isPemKey) {
      throw new Error(
        'DIXIE_JWT_ALG=ES256 requires a PEM-encoded EC private key (-----BEGIN EC PRIVATE KEY----- or -----BEGIN PRIVATE KEY-----)',
      );
    }
  } else {
    // HS256: raw secret, minimum 32 chars
    if (jwtPrivateKey.length < 32) {
      throw new Error(
        `DIXIE_JWT_PRIVATE_KEY must be at least 32 characters for HS256 (got ${jwtPrivateKey.length})`,
      );
    }
  }

  const port = safeParseInt(process.env.DIXIE_PORT, 3001, 65535);
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
    jwtAlgorithm,
    jwtLegacyHs256Secret: process.env.DIXIE_JWT_LEGACY_HS256_SECRET ?? null,
    nodeEnv,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    rateLimitRpm: safeParseInt(process.env.DIXIE_RATE_LIMIT_RPM, 100, 10_000),
    otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? null,

    // Phase 2: Infrastructure
    databaseUrl: process.env.DATABASE_URL ?? null,
    redisUrl,
    natsUrl: process.env.NATS_URL ?? null,

    // Phase 2: Memory config
    memoryProjectionTtlSec: safeParseInt(process.env.DIXIE_MEMORY_PROJECTION_TTL, 300, 86_400),
    memoryMaxEventsPerQuery: safeParseInt(process.env.DIXIE_MEMORY_MAX_EVENTS, 100, 10_000),

    // Phase 2: Conviction
    convictionTierTtlSec: safeParseInt(process.env.DIXIE_CONVICTION_TIER_TTL, 300, 86_400),

    // Phase 2: Personality
    personalityTtlSec: safeParseInt(process.env.DIXIE_PERSONALITY_TTL, 1800, 86_400),

    // Phase 2: Autonomous
    autonomousPermissionTtlSec: safeParseInt(process.env.DIXIE_AUTONOMOUS_PERMISSION_TTL, 300, 86_400),
    autonomousBudgetDefaultMicroUsd: safeParseInt(process.env.DIXIE_AUTONOMOUS_BUDGET, 100_000, 100_000_000),

    // Phase 2: Connection pool sizing (BF-011)
    databasePoolSize: safeParseInt(process.env.DATABASE_POOL_SIZE, 10, 100),

    // Phase 2: Rate limiting
    rateLimitBackend,

    // Phase 2: Schedule callback HMAC
    scheduleCallbackSecret: process.env.DIXIE_SCHEDULE_CALLBACK_SECRET ?? '',

    // Phase 3: x402 payment
    x402Enabled: process.env.DIXIE_X402_ENABLED === 'true',
    x402FacilitatorUrl: process.env.DIXIE_X402_FACILITATOR_URL ?? null,

    // Phase 3: Dynamic pricing
    pricingApiUrl: process.env.DIXIE_PRICING_API_URL ?? null,
    pricingTtlSec: safeParseInt(process.env.DIXIE_PRICING_TTL, 300, 86_400),
  };
}
