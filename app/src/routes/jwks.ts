import { Hono } from 'hono';
import { getJwks } from '../middleware/jwt.js';

/**
 * JWKS endpoint — serves the ES256 public key as a JWK Set (RFC 7517).
 *
 * Path: GET /api/auth/.well-known/jwks.json
 * Auth: None (public endpoint)
 * Cache: max-age=3600, public
 *
 * @since cycle-022 — Sprint 117, Task 1.5
 */
export function createJwksRoutes(): Hono {
  const app = new Hono();

  app.get('/.well-known/jwks.json', (c) => {
    const jwks = getJwks();
    c.header('Cache-Control', 'max-age=3600, public');
    return c.json(jwks);
  });

  return app;
}
