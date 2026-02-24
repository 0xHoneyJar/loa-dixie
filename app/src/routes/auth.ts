import { Hono } from 'hono';
import { z } from 'zod';
import { SiweMessage } from 'siwe';
import { createPrivateKey, createPublicKey, type KeyObject } from 'node:crypto';
import * as jose from 'jose';
import type { AllowlistStore } from '../middleware/allowlist.js';

export interface AuthConfig {
  jwtPrivateKey: string;
  issuer: string;
  expiresIn: string;
  isEs256?: boolean;
  /** HS256 secret for transition-period fallback when isEs256 is true. */
  hs256FallbackSecret?: string;
  /** Previous ES256 PEM key for key rotation fallback chain. */
  previousEs256Key?: string;
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
      let payload: jose.JWTPayload;
      if (config.isEs256) {
        // Three-step verification chain:
        // 1. Current ES256 key (primary)
        // 2. Previous ES256 key (rotation grace period)
        // 3. HS256 fallback (migration transition)
        // NOTE: Unlike jwt.ts middleware which always tries HS256 as final fallback,
        // /verify only tries HS256 when hs256FallbackSecret is explicitly set.
        // This is intentional — /verify is used by external verifiers (loa-finn)
        // who should migrate to ES256. The middleware is more lenient for UX.
        try {
          const publicKey = getEs256PublicKey(config.jwtPrivateKey);
          ({ payload } = await jose.jwtVerify(token, publicKey, {
            issuer: config.issuer,
          }));
          return c.json({ wallet: payload.sub, role: payload.role, exp: payload.exp });
        } catch {
          // Step 2: Try previous ES256 key if configured (rotation grace period)
          if (config.previousEs256Key) {
            try {
              const prevPublicKey = getEs256PreviousPublicKey(config.previousEs256Key);
              ({ payload } = await jose.jwtVerify(token, prevPublicKey, {
                issuer: config.issuer,
              }));
              return c.json({ wallet: payload.sub, role: payload.role, exp: payload.exp });
            } catch {
              // Fall through to HS256
            }
          }
          // Step 3: HS256 fallback
          if (config.hs256FallbackSecret) {
            const secret = new TextEncoder().encode(config.hs256FallbackSecret);
            ({ payload } = await jose.jwtVerify(token, secret, {
              issuer: config.issuer,
            }));
            return c.json({ wallet: payload.sub, role: payload.role, exp: payload.exp });
          }
          throw new Error('ES256 verification failed, no fallback configured');
        }
      }
      // HS256 primary
      const secret = new TextEncoder().encode(config.jwtPrivateKey);
      ({ payload } = await jose.jwtVerify(token, secret, {
        issuer: config.issuer,
      }));
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

// Lazy-cached ES256 key material — avoids PEM parsing on every request.
// Uses Node.js crypto KeyObject (always extractable) instead of Web Crypto CryptoKey.
// NOTE: Single-PEM assumption — cache ignores the `pem` parameter after first call.
// Call resetAuthKeyCache() between tests with different keys.
// In production, createDixieApp is called once, so this is safe.
//
// KEY ROTATION: During key rotation, the process is redeployed (ECS blue-green),
// so the cache is naturally invalidated. The new process starts with the new PEM
// and caches the new KeyObject on first request. No explicit cache-bust needed.
let cachedEs256PrivateKey: KeyObject | null = null;
let cachedEs256PublicKey: KeyObject | null = null;
let cachedEs256PreviousPublicKey: KeyObject | null = null;

function getEs256PrivateKey(pem: string): KeyObject {
  if (!cachedEs256PrivateKey) {
    cachedEs256PrivateKey = createPrivateKey(pem);
  }
  return cachedEs256PrivateKey;
}

function getEs256PublicKey(pem: string): KeyObject {
  if (!cachedEs256PublicKey) {
    cachedEs256PublicKey = createPublicKey(getEs256PrivateKey(pem));
  }
  return cachedEs256PublicKey;
}

/**
 * Lazy-cached previous ES256 public key — for key rotation fallback.
 * Same single-PEM assumption as the primary key cache.
 */
function getEs256PreviousPublicKey(pem: string): KeyObject {
  if (!cachedEs256PreviousPublicKey) {
    cachedEs256PreviousPublicKey = createPublicKey(createPrivateKey(pem));
  }
  return cachedEs256PreviousPublicKey;
}

/** Reset cached keys — useful for testing */
export function resetAuthKeyCache(): void {
  cachedEs256PrivateKey = null;
  cachedEs256PublicKey = null;
  cachedEs256PreviousPublicKey = null;
}

async function issueJwt(
  wallet: string,
  config: AuthConfig,
): Promise<string> {
  if (config.isEs256) {
    const privateKey = getEs256PrivateKey(config.jwtPrivateKey);
    return new jose.SignJWT({ role: 'team' })
      .setProtectedHeader({ alg: 'ES256', kid: 'dixie-es256-v1' })
      .setSubject(wallet)
      .setIssuer(config.issuer)
      .setIssuedAt()
      .setExpirationTime(config.expiresIn)
      .sign(privateKey);
  }
  const secret = new TextEncoder().encode(config.jwtPrivateKey);
  return new jose.SignJWT({ role: 'team' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(wallet)
    .setIssuer(config.issuer)
    .setIssuedAt()
    .setExpirationTime(config.expiresIn)
    .sign(secret);
}
