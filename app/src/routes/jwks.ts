/**
 * JWKS endpoint — serves the ES256 public key for external verifiers (e.g. loa-finn).
 *
 * Only active when isEs256 is true (PEM-encoded EC private key configured).
 * When HS256 is active, returns an empty key set.
 *
 * @since cycle-006 Sprint 2 — FR-2 ES256 JWT Migration
 */
import { Hono } from 'hono';
import { createPrivateKey, createPublicKey } from 'node:crypto';
import * as jose from 'jose';

export interface JwksConfig {
  jwtPrivateKey: string;
  isEs256: boolean;
}

// Lazy-cached JWKS response
let cachedJwks: { keys: jose.JWK[] } | null = null;

export function createJwksRoutes(config: JwksConfig): Hono {
  const app = new Hono();

  app.get('/.well-known/jwks.json', async (c) => {
    if (!config.isEs256) {
      return c.json({ keys: [] });
    }

    if (!cachedJwks) {
      const publicKey = createPublicKey(createPrivateKey(config.jwtPrivateKey));
      const jwk = await jose.exportJWK(publicKey);
      cachedJwks = {
        keys: [{
          ...jwk,
          kid: 'dixie-es256-v1',
          use: 'sig',
          alg: 'ES256',
        }],
      };
    }

    c.header('Cache-Control', 'public, max-age=3600');
    return c.json(cachedJwks);
  });

  return app;
}

/** Reset cached JWKS — useful for testing */
export function resetJwksCache(): void {
  cachedJwks = null;
}
