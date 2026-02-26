/**
 * Service-to-service JWT middleware — ES256 (ECDSA P-256) verification.
 *
 * Used by loa-finn to authenticate requests to dixie's reputation API.
 * Unlike the user-facing HS256 middleware (jwt.ts), this uses asymmetric
 * keys so finn can prove identity without dixie sharing signing secrets.
 *
 * Required claims: iss = 'loa-finn', aud = 'loa-dixie'
 * Clock skew tolerance: 30s (configurable)
 *
 * @since cycle-011 — Sprint 83, Task T2.4b
 * @see ADR in jwt.ts lines 4–19 for ES256 migration context
 */
import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceJwtConfig {
  /** ES256 public key in SPKI PEM format, or raw JWK */
  publicKey: string | jose.JWK;
  /** Expected issuer claim. Default: 'loa-finn' */
  issuer?: string;
  /** Expected audience claim. Default: 'loa-dixie' */
  audience?: string;
  /** Clock tolerance in seconds. Default: 30 */
  clockToleranceSec?: number;
}

// ---------------------------------------------------------------------------
// Key import helper
// ---------------------------------------------------------------------------

let _cachedKey: jose.KeyLike | Uint8Array | null = null;

async function resolveKey(raw: string | jose.JWK): Promise<jose.KeyLike | Uint8Array> {
  if (_cachedKey) return _cachedKey;

  if (typeof raw === 'string') {
    // PEM-encoded SPKI public key
    _cachedKey = await jose.importSPKI(raw, 'ES256');
  } else {
    // JWK format
    _cachedKey = await jose.importJWK(raw, 'ES256');
  }
  return _cachedKey;
}

/** Reset cached key — for testing only */
export function _resetKeyCache(): void {
  _cachedKey = null;
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

export function createServiceJwtMiddleware(config: ServiceJwtConfig) {
  const issuer = config.issuer ?? 'loa-finn';
  const audience = config.audience ?? 'loa-dixie';
  const clockTolerance = config.clockToleranceSec ?? 30;

  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'unauthorized', message: 'Bearer token required' }, 401);
    }

    const token = authHeader.slice(7);

    try {
      const key = await resolveKey(config.publicKey);
      const { payload } = await jose.jwtVerify(token, key, {
        issuer,
        audience,
        clockTolerance,
        algorithms: ['ES256'],
      });

      // Set service identity on context for downstream handlers
      c.set('serviceIssuer', payload.iss);
      c.set('serviceSubject', payload.sub ?? null);
    } catch (err) {
      const errorType =
        err instanceof jose.errors.JWTExpired ? 'expired' :
        err instanceof jose.errors.JWTClaimValidationFailed ? 'invalid_claims' :
        err instanceof jose.errors.JWSSignatureVerificationFailed ? 'invalid_signature' :
        'malformed';

      process.stderr.write(
        JSON.stringify({
          level: 'warn',
          event: 'service_jwt_verification_failed',
          error_type: errorType,
          timestamp: new Date().toISOString(),
          service: 'dixie-bff',
        }) + '\n',
      );

      const status = errorType === 'expired' ? 401 : 403;
      return c.json({ error: 'forbidden', message: `Service JWT ${errorType}` }, status);
    }

    await next();
  });
}
