/**
 * JWKS endpoint — serves the ES256 public key(s) for external verifiers (e.g. loa-finn).
 *
 * Only active when isEs256 is true (PEM-encoded EC private key configured).
 * When HS256 is active, returns an empty key set.
 *
 * KEY ROTATION RUNBOOK:
 * 1. Generate new EC P-256 keypair: openssl ecparam -genkey -name prime256v1 -noout
 * 2. Set DIXIE_JWT_PREVIOUS_KEY = current DIXIE_JWT_PRIVATE_KEY
 * 3. Set DIXIE_JWT_PRIVATE_KEY = new private key PEM
 * 4. Deploy — JWKS now serves both keys, new tokens signed with new key
 * 5. Wait for max JWT TTL (1 hour) to let old tokens expire
 * 6. Remove DIXIE_JWT_PREVIOUS_KEY — JWKS returns to single key
 * 7. Verify: curl /api/auth/.well-known/jwks.json | jq '.keys | length'
 *
 * @since cycle-006 Sprint 2 — FR-2 ES256 JWT Migration
 * @since Sprint 6 (G-70) — TTL-based cache + multi-key rotation support
 */
import { Hono } from 'hono';
import { createPrivateKey, createPublicKey } from 'node:crypto';
import * as jose from 'jose';

export interface JwksConfig {
  jwtPrivateKey: string;
  isEs256: boolean;
  /** Previous ES256 PEM key for key rotation grace period. Null when not rotating. */
  jwtPreviousKey?: string | null;
}

/**
 * TTL-based in-process cache for JWKS response.
 * Regenerated every 5 minutes so that key rotation via Secrets Manager + ECS
 * redeployment is picked up within 5 minutes even during blue-green overlap.
 * The HTTP Cache-Control: max-age=3600 governs downstream caching independently.
 */
let cachedJwks: { data: { keys: jose.JWK[] }; expiresAt: number } | null = null;
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function createJwksRoutes(config: JwksConfig): Hono {
  const app = new Hono();

  app.get('/.well-known/jwks.json', async (c) => {
    if (!config.isEs256) {
      return c.json({ keys: [] });
    }

    const now = Date.now();
    if (!cachedJwks || now >= cachedJwks.expiresAt) {
      const keys: jose.JWK[] = [];

      // Current key — always present when isEs256
      const publicKey = createPublicKey(createPrivateKey(config.jwtPrivateKey));
      const jwk = await jose.exportJWK(publicKey);
      keys.push({
        ...jwk,
        kid: 'dixie-es256-v1',
        use: 'sig',
        alg: 'ES256',
      });

      // Previous key — present during rotation grace period
      if (config.jwtPreviousKey) {
        const prevPublicKey = createPublicKey(createPrivateKey(config.jwtPreviousKey));
        const prevJwk = await jose.exportJWK(prevPublicKey);
        keys.push({
          ...prevJwk,
          kid: 'dixie-es256-v0',
          use: 'sig',
          alg: 'ES256',
        });
      }

      cachedJwks = {
        data: { keys },
        expiresAt: now + JWKS_CACHE_TTL_MS,
      };
    }

    c.header('Cache-Control', 'public, max-age=3600');
    return c.json(cachedJwks.data);
  });

  return app;
}

/** Reset cached JWKS — useful for testing */
export function resetJwksCache(): void {
  cachedJwks = null;
}
