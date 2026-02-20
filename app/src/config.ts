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
}

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

  // Validate JWT key — an empty or short key allows trivial token forgery.
  // In test mode, allow empty key for convenience but warn.
  if (nodeEnv === 'test' && !jwtPrivateKey) {
    process.stderr.write('WARNING: DIXIE_JWT_PRIVATE_KEY is empty (test mode)\n');
  } else if (jwtPrivateKey.length < 32) {
    throw new Error(
      `DIXIE_JWT_PRIVATE_KEY must be at least 32 characters (got ${jwtPrivateKey.length})`,
    );
  }

  const port = parseInt(process.env.DIXIE_PORT ?? '3001', 10);
  const finnWsUrl = process.env.FINN_WS_URL ?? finnUrl.replace(/^http/, 'ws');

  const corsOriginsRaw = process.env.DIXIE_CORS_ORIGINS ?? `http://localhost:${port}`;
  const corsOrigins = corsOriginsRaw.split(',').map(o => o.trim());

  return {
    port,
    finnUrl,
    finnWsUrl,
    corsOrigins,
    allowlistPath: process.env.DIXIE_ALLOWLIST_PATH ?? '/data/allowlist.json',
    adminKey: process.env.DIXIE_ADMIN_KEY ?? '',
    jwtPrivateKey,
    nodeEnv,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    rateLimitRpm: parseInt(process.env.DIXIE_RATE_LIMIT_RPM ?? '100', 10),
    otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? null,
  };
}
