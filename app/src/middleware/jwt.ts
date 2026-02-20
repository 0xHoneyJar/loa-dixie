import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';

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
      } catch {
        // Invalid JWT — continue without setting wallet.
        // Allowlist middleware will handle 401/403.
      }
    }

    await next();
  });
}
