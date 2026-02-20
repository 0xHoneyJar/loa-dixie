import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';

// ADR: HS256 JWT — Phase 1 single-service auth
//
// Current: HS256 (symmetric HMAC). The same secret signs and verifies.
// This is correct for Phase 1 where only dixie-bff issues and verifies tokens.
//
// Phase 2 migration to ES256 (asymmetric ECDSA) is required when loa-finn
// needs to verify dixie-issued tokens without being able to forge them.
//
// Migration steps (ref: SDD §7.1):
// 1. Generate EC P-256 keypair: openssl ecparam -genkey -name prime256v1 -noout -out private.pem
// 2. Extract public key: openssl ec -in private.pem -pubout -out public.pem
// 3. Update DIXIE_JWT_PRIVATE_KEY to PEM-encoded EC private key
// 4. Deploy public.pem to loa-finn for verification
// 5. Update this middleware: alg 'ES256', use importPKCS8/importSPKI
// 6. Add GET /api/auth/.well-known/jwks.json endpoint
// 7. Transition period: accept both HS256 and ES256 tokens for 1 release cycle

/**
 * JWT verification middleware.
 * Extracts wallet from JWT sub claim and sets it on the context.
 * Does not reject requests without JWT — that's the allowlist middleware's job.
 */
export function createJwtMiddleware(jwtSecret: string, issuer: string) {
  const secret = new TextEncoder().encode(jwtSecret);

  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header('authorization');

    if (authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer dxk_')) {
      const token = authHeader.slice(7);
      try {
        const { payload } = await jose.jwtVerify(token, secret, { issuer });
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
