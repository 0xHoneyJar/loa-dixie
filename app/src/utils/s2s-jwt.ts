/**
 * S2S (Service-to-Service) JWT generation for freeside settlement API.
 *
 * Uses HS256 shared secret matching freeside's BILLING_INTERNAL_JWT_SECRET.
 * Tokens have 5-minute TTL and are issued per-request (no caching needed
 * since HMAC-SHA256 is fast).
 *
 * @since cycle-022 — Production wiring
 */
import { createHmac } from 'node:crypto';

export interface S2SJwtConfig {
  /** Shared secret (same as freeside's BILLING_INTERNAL_JWT_SECRET) */
  secret: string;
  /** Issuer claim. Default: 'loa-dixie' */
  issuer?: string;
  /** Audience claim. Default: 'arrakis-internal' */
  audience?: string;
  /** Subject claim (e.g., 'settlement-client') */
  subject?: string;
  /** Token TTL in seconds. Default: 300 (5 minutes) */
  ttlSec?: number;
}

/**
 * Create a factory function that generates S2S JWTs on demand.
 * Returns an async function matching SettlementClient's getServiceToken interface.
 */
export function createS2STokenProvider(config: S2SJwtConfig): () => Promise<string> {
  const { secret, issuer = 'loa-dixie', audience = 'arrakis-internal', subject = 'settlement-client', ttlSec = 300 } = config;

  return async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
      sub: subject,
      iss: issuer,
      aud: audience,
      iat: now,
      exp: now + ttlSec,
    })).toString('base64url');
    const signature = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
  };
}
