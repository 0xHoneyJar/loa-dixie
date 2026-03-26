import { Hono } from 'hono';
import { z } from 'zod';
import { SiweMessage } from 'siwe';
import * as jose from 'jose';
import type { AllowlistStore } from '../middleware/allowlist.js';

export interface AuthConfig {
  jwtPrivateKey: string;
  jwtAlgorithm: 'ES256' | 'HS256';
  issuer: string;
  expiresIn: string;
  /** Key ID for ES256 JWKS rotation support */
  kid?: string;
}

// ARCH-002: Runtime body validation — TypeScript generics are erased at compile time.
// Zod schemas provide runtime guarantees that incoming JSON matches expected shapes.
const SiweRequestSchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
});

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
    const raw = await c.req.json().catch(() => null);
    const parsed = SiweRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        { error: 'invalid_request', message: parsed.error.issues[0]?.message ?? 'message and signature required' },
        400,
      );
    }
    const body = parsed.data;

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
      // Dual-algorithm verification: try ES256 first if configured, fallback to HS256
      let payload: jose.JWTPayload;
      if (config.jwtAlgorithm === 'ES256') {
        try {
          if (!_cachedSigningKey) {
            _cachedSigningKey = await jose.importPKCS8(config.jwtPrivateKey, 'ES256', { extractable: true }) as CryptoKey;
          }
          const publicKey = await jose.exportSPKI(_cachedSigningKey as unknown as Parameters<typeof jose.exportSPKI>[0]);
          const pubKey = await jose.importSPKI(publicKey, 'ES256');
          ({ payload } = await jose.jwtVerify(token, pubKey, {
            issuer: config.issuer,
            algorithms: ['ES256'],
          }));
        } catch {
          // Fallback to HS256 for in-flight tokens during transition
          const secret = new TextEncoder().encode(config.jwtPrivateKey);
          ({ payload } = await jose.jwtVerify(token, secret, {
            issuer: config.issuer,
            algorithms: ['HS256'],
          }));
        }
      } else {
        const secret = new TextEncoder().encode(config.jwtPrivateKey);
        ({ payload } = await jose.jwtVerify(token, secret, {
          issuer: config.issuer,
        }));
      }
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

/** Cached ES256 private key — avoids per-request PEM parsing */
let _cachedSigningKey: CryptoKey | null = null;

async function issueJwt(
  wallet: string,
  config: AuthConfig,
): Promise<string> {
  const builder = new jose.SignJWT({ role: 'team' })
    .setSubject(wallet)
    .setIssuer(config.issuer)
    .setAudience('dixie-bff')
    .setIssuedAt()
    .setExpirationTime(config.expiresIn);

  if (config.jwtAlgorithm === 'ES256') {
    if (!_cachedSigningKey) {
      _cachedSigningKey = await jose.importPKCS8(config.jwtPrivateKey, 'ES256', { extractable: true }) as CryptoKey;
    }
    const header: jose.JWTHeaderParameters = { alg: 'ES256' };
    if (config.kid) header.kid = config.kid;
    return builder.setProtectedHeader(header).sign(_cachedSigningKey);
  }

  // HS256 path
  const secret = new TextEncoder().encode(config.jwtPrivateKey);
  return builder.setProtectedHeader({ alg: 'HS256' }).sign(secret);
}

/** Reset cached signing key — for testing only */
export function _resetSigningKeyCache(): void {
  _cachedSigningKey = null;
}
