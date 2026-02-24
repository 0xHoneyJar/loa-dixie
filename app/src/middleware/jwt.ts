import { createMiddleware } from 'hono/factory';
import { createPrivateKey, createPublicKey, type KeyObject } from 'node:crypto';
import * as jose from 'jose';

/**
 * JWT verification middleware.
 * Extracts wallet from JWT sub claim and sets it on the context.
 * Does not reject requests without JWT — that's the allowlist middleware's job.
 *
 * Supports both HS256 (symmetric) and ES256 (asymmetric) algorithms.
 * When isEs256 is true, the jwtSecret is a PEM-encoded EC private key
 * and verification uses the derived public key.
 */
export function createJwtMiddleware(
  jwtSecret: string,
  issuer: string,
  isEs256?: boolean,
  /** HS256 secret for transition-period fallback when isEs256 is true. */
  hs256FallbackSecret?: string,
  /** Previous ES256 PEM key for key rotation fallback chain. */
  previousEs256Key?: string,
) {
  const hs256Secret = new TextEncoder().encode(hs256FallbackSecret ?? jwtSecret);

  // Lazy-cached ES256 public keys — derived from PEM private key on first use.
  let es256PublicKey: KeyObject | null = null;
  function getPublicKey(): KeyObject {
    if (!es256PublicKey) {
      es256PublicKey = createPublicKey(createPrivateKey(jwtSecret));
    }
    return es256PublicKey;
  }

  let es256PreviousPublicKey: KeyObject | null = null;
  function getPreviousPublicKey(): KeyObject | null {
    if (!previousEs256Key) return null;
    if (!es256PreviousPublicKey) {
      es256PreviousPublicKey = createPublicKey(createPrivateKey(previousEs256Key));
    }
    return es256PreviousPublicKey;
  }

  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header('authorization');

    if (authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer dxk_')) {
      const token = authHeader.slice(7);
      try {
        if (isEs256) {
          // Three-step verification chain:
          // 1. Current ES256 key (primary)
          // 2. Previous ES256 key (rotation grace period)
          // 3. HS256 fallback (migration transition)
          try {
            const { payload } = await jose.jwtVerify(token, getPublicKey(), { issuer });
            if (payload.sub) c.set('wallet', payload.sub);
            await next();
            return;
          } catch {
            // Step 2: Try previous ES256 key if configured
            const prevKey = getPreviousPublicKey();
            if (prevKey) {
              try {
                const { payload } = await jose.jwtVerify(token, prevKey, { issuer });
                if (payload.sub) c.set('wallet', payload.sub);
                await next();
                return;
              } catch {
                // Fall through to HS256
              }
            }
          }
        }
        // HS256 verification (primary when !isEs256, fallback when isEs256)
        const { payload } = await jose.jwtVerify(token, hs256Secret, { issuer });
        if (payload.sub) {
          c.set('wallet', payload.sub);
        }
      } catch (err) {
        // Invalid JWT — continue without setting wallet.
        // Allowlist middleware will handle 401/403.
        const errorType =
          err instanceof jose.errors.JWTExpired ? 'expired' :
          err instanceof jose.errors.JWTClaimValidationFailed ? 'invalid_claims' :
          err instanceof jose.errors.JWSSignatureVerificationFailed ? 'invalid_signature' :
          'malformed';
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
    }

    await next();
  });
}
