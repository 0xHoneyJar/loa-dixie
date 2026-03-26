import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';
import { startSanitizedSpan, hashForSpan } from '../utils/span-sanitizer.js';

export interface JwtMiddlewareConfig {
  jwtPrivateKey: string;
  jwtAlgorithm: 'ES256' | 'HS256';
  issuer: string;
}

/** Cached verification keys — set at startup via initJwtKeys() */
let _es256PublicKey: CryptoKey | Uint8Array | null = null;
let _hs256Secret: Uint8Array | null = null;

/** ES256 public key in SPKI PEM format — for JWKS endpoint */
let _publicKeySpki: string | null = null;
/** ES256 public key as JWK — for JWKS endpoint */
let _publicKeyJwk: jose.JWK | null = null;
/** Key ID (SHA-256 thumbprint of JWK) */
let _kid: string | null = null;

/**
 * Initialize JWT keys at server startup.
 * Must be called before the middleware processes requests.
 */
export async function initJwtKeys(config: JwtMiddlewareConfig): Promise<void> {
  if (config.jwtAlgorithm === 'ES256') {
    const privateKey = await jose.importPKCS8(config.jwtPrivateKey, 'ES256', { extractable: true });
    // Extract public JWK from private key, then strip private component
    const fullJwk = await jose.exportJWK(privateKey);
    const publicJwk: jose.JWK = { kty: fullJwk.kty, crv: fullJwk.crv, x: fullJwk.x, y: fullJwk.y };
    publicJwk.alg = 'ES256';
    publicJwk.use = 'sig';
    _kid = await jose.calculateJwkThumbprint(publicJwk, 'sha256');
    publicJwk.kid = _kid;
    _publicKeyJwk = publicJwk;
    // Import public JWK as CryptoKey for verification
    _es256PublicKey = await jose.importJWK(publicJwk, 'ES256');
    _publicKeySpki = await jose.exportSPKI(_es256PublicKey as unknown as Parameters<typeof jose.exportSPKI>[0]);
  }
  _hs256Secret = new TextEncoder().encode(config.jwtPrivateKey);
}

/** Get the ES256 public key as JWK Set for the JWKS endpoint */
export function getJwks(): { keys: jose.JWK[] } {
  if (!_publicKeyJwk || !_kid) return { keys: [] };
  return { keys: [_publicKeyJwk] };
}

/** Get the key ID for ES256 token headers */
export function getKid(): string | null {
  return _kid;
}

/** Reset cached keys — for testing only */
export function _resetJwtKeys(): void {
  _es256PublicKey = null;
  _hs256Secret = null;
  _publicKeySpki = null;
  _publicKeyJwk = null;
  _kid = null;
}

/**
 * JWT verification middleware with dual-algorithm support.
 * Extracts wallet from JWT sub claim and sets it on the context.
 * Does not reject requests without JWT — that's the allowlist middleware's job.
 *
 * When jwtAlgorithm is 'ES256': tries ES256 first, falls back to HS256 for
 * in-flight tokens during the transition window.
 */
export function createJwtMiddleware(config: JwtMiddlewareConfig) {
  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header('authorization');

    if (authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer dxk_')) {
      const token = authHeader.slice(7);
      await startSanitizedSpan(
        'dixie.auth',
        { auth_type: 'jwt' },
        async (span) => {
          try {
            let payload: jose.JWTPayload;

            // Lazy init: if initJwtKeys hasn't been called yet, init HS256 inline
            if (!_hs256Secret) {
              _hs256Secret = new TextEncoder().encode(config.jwtPrivateKey);
            }

            if (config.jwtAlgorithm === 'ES256' && _es256PublicKey) {
              try {
                ({ payload } = await jose.jwtVerify(token, _es256PublicKey, {
                  issuer: config.issuer,
                  algorithms: ['ES256'],
                }));
                span.setAttribute('jwt_alg', 'ES256');
              } catch {
                // Dual-algorithm fallback: accept HS256 during transition
                ({ payload } = await jose.jwtVerify(token, _hs256Secret, {
                  issuer: config.issuer,
                  algorithms: ['HS256'],
                }));
                span.setAttribute('jwt_alg', 'HS256_fallback');
              }
            } else {
              ({ payload } = await jose.jwtVerify(token, _hs256Secret, {
                issuer: config.issuer,
              }));
              span.setAttribute('jwt_alg', 'HS256');
            }

            if (payload.sub) {
              c.set('wallet', payload.sub);
              span.setAttribute('wallet_hash', hashForSpan(payload.sub));
            }
          } catch (err) {
            const errorType =
              err instanceof jose.errors.JWTExpired ? 'expired' :
              err instanceof jose.errors.JWTClaimValidationFailed ? 'invalid_claims' :
              err instanceof jose.errors.JWSSignatureVerificationFailed ? 'invalid_signature' :
              'malformed';
            span.setAttribute('auth_type', errorType);
            process.stderr.write(
              JSON.stringify({
                level: 'warn',
                event: 'jwt_verification_failed',
                error_type: errorType,
                timestamp: new Date().toISOString(),
                service: 'dixie-bff',
              }) + '\n',
            );
          }
        },
      );
    }

    await next();
  });
}
