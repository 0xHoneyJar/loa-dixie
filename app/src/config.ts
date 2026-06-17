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
  /** Shared secret for S2S JWT to freeside settlement API */
  billingJwtSecret: string | null;

  // Phase 3: Dynamic pricing
  pricingApiUrl: string | null;
  pricingTtlSec: number;

  // Phase 26E: Straylight recall-intake endpoint (ADR-026D)
  recallIntakeEnabled: boolean;
  straylightRuntimeDixieKey: string;
  recallIntakeBodyMaxBytes: number;
  recallIntakeRateRpm: number;
  recallIntakeMaxAssertionsPerTenant: number;
  recallIntakeMaxAssertionBytesPerTenant: number;
  recallIntakeIdempotencyTtlSec: number;
  recallIntakeIdempotencyMaxEntries: number;

  // Phase 32K: dev/operator-only seeded live estate (default-off smoke).
  // When enabled, the server seeds ONE synthetic dev/operator tenant slot
  // into the process-local bounded estate store after createBoundedEstateStore
  // so a direct POST /api/recall/intake smoke for that tenant can return a
  // served recall instead of seam.storage_unavailable. dev/operator ONLY,
  // never production admission. See
  // docs/RECALL-WEDGE-SEEDED-LIVE-ESTATE-STORAGE-DESIGN.md §11 (Phase 32K).
  recallIntakeDevSeedEnabled: boolean;
  /** Synthetic dev/operator tenant id to seed (empty when disabled). */
  recallIntakeDevSeedTenantId: string;

  // Phase 33N: dev/operator-only Admission Wedge route spike (default OFF;
  // NON-PRODUCTION). Authorized narrowly by Phase 33M
  // (docs/ADMISSION-WEDGE-DEV-OPERATOR-ROUTE-SPIKE-AUTHORIZATION-GATE.md
  // §7–§15). Uses Storage Option A — no durable Admission Wedge storage, no DB
  // writes, no migrations; safe future-intent receipts / public-safe outcomes
  // only. The route is mounted in server.ts ONLY when this flag is true. This
  // does NOT authorize production admission/storage/auth/consent, Freeside
  // runtime integration, Discord ingestion, public remember-this, a final
  // schema, or a completed Straylight primitive review.
  admissionIntakeSpikeEnabled: boolean;
  /** Dev/operator service token, checked constant-time against the dedicated
   *  `x-admission-service-token` header — NOT `Authorization: Bearer`. The
   *  global `/api/*` allowlist gate already owns `Authorization` (JWT wallet or
   *  `Bearer dxk_` key) and is not exempt for `/api/admission`, so the admission
   *  dev gate is layered behind that allowlist via a dedicated header to avoid
   *  collision. '' when unset. NOT production auth; never logged or echoed
   *  publicly. */
  admissionIntakeSpikeServiceToken: string;
  /** Dev/operator id allowlist (checked against the `x-admission-operator-id`
   *  header); [] when unset. An empty token AND empty allowlist rejects all. */
  admissionIntakeSpikeOperatorIds: string[];

  // Phase 46V: dev/operator-only Admission Wedge ROUTE-STORAGE spike gate
  // (DRAFT / non-final; default OFF; NON-PRODUCTION). Authorized narrowly by
  // Phase 46U (docs/ADMISSION-WEDGE-ROUTE-STORAGE-SPIKE-AUTHORIZATION-GATE.md
  // §3–§16). This is a SEPARATE gate from the base route gate: the route-storage
  // spike does NOT activate merely because route intake is enabled — it engages
  // ONLY when BOTH this flag AND admissionIntakeSpikeEnabled are exactly 'true'
  // (the AND is applied at the server mount site). Storage Mode 1 only
  // (no-migration, bounded-synthetic, in-process): NO durable write, NO DB, NO
  // migration. The env name DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED is a
  // DRAFT / non-final proposal (Phase 46U §5). This does NOT authorize production
  // storage/admission/auth/consent, a final schema, or a route-contract freeze.
  /** Phase 46V draft route-storage-spike gate (`=== 'true'`); default false.
   *  Inert unless admissionIntakeSpikeEnabled is also true (ANDed at mount). */
  admissionIntakeStorageSpikeEnabled: boolean;
}

/**
 * EVM-address-shaped tenant/session identity check.
 *
 * Phase 32K: the dev-seed tenant id must match the wallet/address format the
 * recall-intake route's tenant/session identity uses (the JWT `sub` wallet,
 * normalized via viem `getAddress` in the allowlist middleware). We validate
 * the canonical `0x` + 40-hex shape at config load so an enabled-but-malformed
 * seed fails closed at startup instead of silently seeding nothing.
 */
const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Environment variables:
 *
 * FINN_URL              (required) — loa-finn backend URL (e.g. http://localhost:3000)
 * FINN_WS_URL           (optional) — WebSocket URL for loa-finn; defaults to FINN_URL with ws:// scheme
 * PORT                  (optional) — Railway/platform-injected HTTP listen port; takes precedence over DIXIE_PORT
 * DIXIE_PORT            (optional) — local/dev fallback & legacy override for the HTTP listen port; default 3001 (used only when PORT is unset)
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
 * BILLING_INTERNAL_JWT_SECRET  (optional) — shared secret for S2S JWT to freeside settlement API
 * DIXIE_PRICING_API_URL        (optional) — freeside dynamic pricing API URL; null uses hardcoded rates
 * DIXIE_PRICING_TTL            (optional) — pricing cache TTL in seconds; default 300
 *
 * Phase 32K additions (dev/operator-only seeded live estate; default OFF):
 * DIXIE_RECALL_INTAKE_DEV_SEED_ENABLED   (optional) — when 'true', seed ONE synthetic
 *                                          dev/operator tenant into the in-process bounded
 *                                          estate store so a direct recall-intake smoke can
 *                                          return a served recall. Default 'false'. Requires
 *                                          DIXIE_RECALL_INTAKE_ENABLED=true. dev/operator
 *                                          ONLY — never production memory admission.
 * DIXIE_RECALL_INTAKE_DEV_SEED_TENANT_ID (required when the dev seed is enabled) — synthetic
 *                                          0x-prefixed 40-hex dev/operator wallet/address to
 *                                          seed. Must match the recall-intake tenant/session
 *                                          identity format. Enabled + missing/invalid → throws
 *                                          at startup (fail-closed; never silently seed nothing).
 *                                          Provide via env/secret — do NOT commit a live id.
 *
 * Phase 33N additions (dev/operator-only Admission Wedge route SPIKE; default OFF; NON-PRODUCTION):
 * DIXIE_ADMISSION_INTAKE_ENABLED         (optional) — when 'true', mount the dev/operator-only
 *                                          POST /api/admission/intake route SPIKE. Default 'false';
 *                                          when off the route is NOT registered at all. dev/operator
 *                                          ONLY — NOT production admission. Uses no durable storage
 *                                          (Storage Option A). Authorized narrowly by Phase 33M.
 * DIXIE_ADMISSION_INTAKE_SERVICE_TOKEN   (optional) — dev/operator service token checked against
 *                                          the dedicated `x-admission-service-token` header
 *                                          (constant-time); NOT `Authorization` (avoids colliding
 *                                          with the global /api/* allowlist gate). Empty when
 *                                          unset. NOT production auth; never logged/echoed.
 * DIXIE_ADMISSION_INTAKE_OPERATOR_IDS    (optional) — comma-separated dev/operator id allowlist
 *                                          checked against the `x-admission-operator-id` header.
 *                                          Empty when unset. With BOTH the token and the operator
 *                                          allowlist empty, the enabled spike rejects ALL calls
 *                                          (fail-closed; no production default).
 *
 * Phase 46V additions (dev/operator-only Admission Wedge ROUTE-STORAGE spike; DRAFT / non-final;
 * default OFF; NON-PRODUCTION):
 * DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED (optional) — when 'true', AND DIXIE_ADMISSION_INTAKE_ENABLED
 *                                          is also 'true', wire the dev/operator-only route-storage spike
 *                                          (Storage Mode 1: no-migration, bounded-synthetic, in-process —
 *                                          NO durable write, NO DB, NO migration) behind the existing
 *                                          dev/operator gate. Default 'false'; anything other than the
 *                                          literal 'true' (incl. blank/malformed) leaves it OFF
 *                                          (fail-closed; never a production storage path). The storage
 *                                          spike NEVER activates on the base route gate alone. This name is
 *                                          a DRAFT / non-final proposal (Phase 46U §5). Authorized narrowly
 *                                          by Phase 46U; does NOT authorize production storage/admission,
 *                                          a final schema, or a route-contract freeze.
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

  // Railway (and most PaaS) inject PORT and expect the web service to listen on it.
  // PORT takes precedence; DIXIE_PORT is the local/dev fallback & legacy override; default 3001.
  // A present-but-invalid PORT is selected by ?? and falls through safeParseInt to the default
  // (it does not fall back to DIXIE_PORT) — the simpler, predictable behavior.
  const port = safeParseInt(process.env.PORT ?? process.env.DIXIE_PORT, 3001, 65535);
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
    billingJwtSecret: process.env.BILLING_INTERNAL_JWT_SECRET ?? null,

    // Phase 3: Dynamic pricing
    pricingApiUrl: process.env.DIXIE_PRICING_API_URL ?? null,
    pricingTtlSec: safeParseInt(process.env.DIXIE_PRICING_TTL, 300, 86_400),

    // Phase 26E: Straylight recall-intake (ADR-026D §4.a fail-closed startup
    // when enabled with empty key — handled below before return).
    recallIntakeEnabled: (() => {
      const enabled = process.env.DIXIE_RECALL_INTAKE_ENABLED === 'true';
      if (enabled) {
        const key = process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY ?? '';
        if (key.length === 0) {
          throw new Error(
            'DIXIE_RECALL_INTAKE_ENABLED=true requires non-empty STRAYLIGHT_RUNTIME_DIXIE_KEY (ADR-026D §4.a fail-closed)',
          );
        }
      }
      return enabled;
    })(),
    straylightRuntimeDixieKey: process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY ?? '',
    recallIntakeBodyMaxBytes: safeParseInt(process.env.DIXIE_RECALL_INTAKE_BODY_MAX_BYTES, 32_768, 1_048_576),
    recallIntakeRateRpm: safeParseInt(process.env.DIXIE_RECALL_INTAKE_RATE_RPM, 30, 10_000),
    recallIntakeMaxAssertionsPerTenant: safeParseInt(
      process.env.DIXIE_RECALL_INTAKE_MAX_ASSERTIONS_PER_TENANT,
      512,
      1_000_000,
    ),
    recallIntakeMaxAssertionBytesPerTenant: safeParseInt(
      process.env.DIXIE_RECALL_INTAKE_MAX_ASSERTION_BYTES_PER_TENANT,
      1_048_576,
      268_435_456,
    ),
    recallIntakeIdempotencyTtlSec: safeParseInt(
      process.env.DIXIE_RECALL_INTAKE_IDEMPOTENCY_TTL,
      900,
      86_400,
    ),
    recallIntakeIdempotencyMaxEntries: safeParseInt(
      process.env.DIXIE_RECALL_INTAKE_IDEMPOTENCY_MAX_ENTRIES,
      4_096,
      1_000_000,
    ),

    // Phase 32K: dev/operator seeded live estate gate (default off; fail-closed
    // at startup when enabled with a missing/invalid synthetic tenant id).
    // Validation runs in the IIFE below; the parsed pair is spread in after.
    ...(() => {
      const enabled = process.env.DIXIE_RECALL_INTAKE_DEV_SEED_ENABLED === 'true';
      if (!enabled) {
        return {
          recallIntakeDevSeedEnabled: false,
          recallIntakeDevSeedTenantId: '',
        };
      }
      // The dev seed only makes sense when the recall route is mounted; an
      // enabled seed without an enabled route would seed a store nothing
      // reads. Fail closed rather than silently no-op.
      const routeEnabled = process.env.DIXIE_RECALL_INTAKE_ENABLED === 'true';
      if (!routeEnabled) {
        throw new Error(
          'DIXIE_RECALL_INTAKE_DEV_SEED_ENABLED=true requires DIXIE_RECALL_INTAKE_ENABLED=true (Phase 32K dev/operator seed)',
        );
      }
      const tenantId = (process.env.DIXIE_RECALL_INTAKE_DEV_SEED_TENANT_ID ?? '').trim();
      if (!EVM_ADDRESS_RE.test(tenantId)) {
        // Do NOT echo the raw value — it may be operator-provided. Report the
        // expected shape only.
        throw new Error(
          'DIXIE_RECALL_INTAKE_DEV_SEED_ENABLED=true requires a valid DIXIE_RECALL_INTAKE_DEV_SEED_TENANT_ID (0x + 40 hex chars); fail-closed (Phase 32K)',
        );
      }
      return {
        recallIntakeDevSeedEnabled: true,
        recallIntakeDevSeedTenantId: tenantId,
      };
    })(),

    // Phase 33N: dev/operator-only Admission Wedge route spike (default off,
    // NON-PRODUCTION). The gate is the explicit enable flag; all spike config
    // defaults to off/false/empty. The token and operator-id allowlist are
    // parsed unconditionally (so they are inert when the spike is disabled);
    // the route handler enforces the fail-closed "empty token AND empty
    // allowlist rejects all" rule, and the route is only mounted in server.ts
    // when admissionIntakeSpikeEnabled is true. No production defaults.
    admissionIntakeSpikeEnabled: process.env.DIXIE_ADMISSION_INTAKE_ENABLED === 'true',
    admissionIntakeSpikeServiceToken:
      process.env.DIXIE_ADMISSION_INTAKE_SERVICE_TOKEN ?? '',
    admissionIntakeSpikeOperatorIds: (process.env.DIXIE_ADMISSION_INTAKE_OPERATOR_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0),

    // Phase 46V: dev/operator-only route-storage spike gate (DRAFT; default off,
    // NON-PRODUCTION). Strict `=== 'true'`, so blank/malformed/any-other value is
    // off (fail-closed; never a production storage path). This flag is inert on
    // its own — the server only wires the storage spike when BOTH this flag AND
    // admissionIntakeSpikeEnabled are true (ANDed at the mount site, server.ts),
    // so storage never activates merely because route intake is enabled.
    admissionIntakeStorageSpikeEnabled:
      process.env.DIXIE_ADMISSION_INTAKE_STORAGE_SPIKE_ENABLED === 'true',
  };
}
