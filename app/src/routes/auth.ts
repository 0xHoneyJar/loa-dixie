import { Hono } from 'hono';
import { SiweMessage } from 'siwe';
import * as jose from 'jose';
import type { AllowlistStore } from '../middleware/allowlist.js';

export interface AuthConfig {
  jwtPrivateKey: string;
  issuer: string;
  expiresIn: string;
}

/**
 * Auth routes for SIWE-based wallet authentication.
 */
export function createAuthRoutes(
  allowlistStore: AllowlistStore,
  config: AuthConfig,
): Hono {
  const app = new Hono();

  /**
   * POST /siwe — Verify SIWE signature and issue JWT
   */
  app.post('/siwe', async (c) => {
    const body = await c.req.json<{ message: string; signature: string }>();

    if (!body.message || !body.signature) {
      return c.json(
        { error: 'invalid_request', message: 'message and signature required' },
        400,
      );
    }

    // Verify SIWE signature
    let siweMessage: SiweMessage;
    try {
      siweMessage = new SiweMessage(body.message);
      await siweMessage.verify({ signature: body.signature as `0x${string}` });
    } catch {
      return c.json(
        { error: 'invalid_signature', message: 'SIWE verification failed' },
        401,
      );
    }

    const wallet = siweMessage.address;

    // Check allowlist
    if (!allowlistStore.hasWallet(wallet)) {
      return c.json(
        { error: 'forbidden', message: 'Wallet not authorized' },
        403,
      );
    }

    // Issue JWT
    const token = await issueJwt(wallet, config);

    return c.json({
      token,
      wallet,
      expiresIn: config.expiresIn,
    });
  });

  /**
   * GET /verify — Validate JWT and return wallet address
   */
  app.get('/verify', async (c) => {
    const authHeader = c.req.header('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(
        { error: 'unauthorized', message: 'Bearer token required' },
        401,
      );
    }

    const token = authHeader.slice(7);
    try {
      const secret = new TextEncoder().encode(config.jwtPrivateKey);
      const { payload } = await jose.jwtVerify(token, secret, {
        issuer: config.issuer,
      });
      return c.json({
        wallet: payload.sub,
        role: payload.role,
        exp: payload.exp,
      });
    } catch {
      return c.json(
        { error: 'invalid_token', message: 'Token verification failed' },
        401,
      );
    }
  });

  return app;
}

async function issueJwt(
  wallet: string,
  config: AuthConfig,
): Promise<string> {
  const secret = new TextEncoder().encode(config.jwtPrivateKey);
  return new jose.SignJWT({ role: 'team' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(wallet)
    .setIssuer(config.issuer)
    .setIssuedAt()
    .setExpirationTime(config.expiresIn)
    .sign(secret);
}
