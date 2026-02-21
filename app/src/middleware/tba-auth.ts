import { createMiddleware } from 'hono/factory';
import type { ProjectionCache } from '../services/projection-cache.js';
import type { TBAVerification } from '../types/agent-api.js';

/**
 * ERC-6551 Token-Bound Account (TBA) Authentication Middleware.
 *
 * 7-step verification flow per SDD §7.2:
 * 1. Extract TBA address from x-tba-address header
 * 2. Extract TBA signature from x-tba-signature header
 * 3. Check Redis cache for recent verification
 * 4. If not cached, verify signature against TBA contract via RPC
 * 5. Resolve parent NFT and owner wallet
 * 6. Cache verification result (5min TTL)
 * 7. Set agent identity headers for downstream handlers
 *
 * See: SDD §7.2, PRD FR-6
 */
export interface TBAAuthDeps {
  /** Optional Redis cache for TBA verifications (5min TTL) */
  cache: ProjectionCache<TBAVerification> | null;
  /** Verify TBA signature and resolve ownership — calls RPC or freeside */
  verifyTBA: (tbaAddress: string, signature: string, message: string) => Promise<TBAVerification | null>;
}

export function createTBAAuthMiddleware(deps: TBAAuthDeps) {
  const { cache, verifyTBA } = deps;

  return createMiddleware(async (c, next) => {
    // Step 1: Extract TBA address
    const tbaAddress = c.req.header('x-tba-address');
    if (!tbaAddress) {
      return c.json(
        { error: 'unauthorized', message: 'x-tba-address header required for agent API' },
        401,
      );
    }

    // Step 2: Extract signature
    const signature = c.req.header('x-tba-signature');
    if (!signature) {
      return c.json(
        { error: 'unauthorized', message: 'x-tba-signature header required for agent API' },
        401,
      );
    }

    // Construct the message that was signed (timestamp-based for replay protection)
    const timestamp = c.req.header('x-tba-timestamp');
    if (!timestamp) {
      return c.json(
        { error: 'unauthorized', message: 'x-tba-timestamp header required for agent API' },
        401,
      );
    }

    // Validate timestamp is within 5 minutes to prevent replay attacks
    const ts = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(ts) || Math.abs(now - ts) > 300) {
      return c.json(
        { error: 'unauthorized', message: 'TBA timestamp expired or invalid (max 5 minutes)' },
        401,
      );
    }

    const message = `dixie-agent-auth:${tbaAddress}:${timestamp}`;

    // Step 3: Check cache
    let verification: TBAVerification | null = null;
    if (cache) {
      try {
        verification = await cache.get(tbaAddress);
      } catch {
        // Cache miss or error — proceed to verification
      }
    }

    // Step 4 & 5: Verify signature and resolve ownership
    if (!verification) {
      try {
        verification = await verifyTBA(tbaAddress, signature, message);
      } catch {
        return c.json(
          { error: 'unauthorized', message: 'TBA verification failed' },
          401,
        );
      }

      if (!verification) {
        return c.json(
          { error: 'unauthorized', message: 'Invalid TBA signature' },
          401,
        );
      }

      // Step 6: Cache verification result
      if (cache) {
        try {
          await cache.set(tbaAddress, verification);
        } catch {
          // Cache write failure — non-blocking
        }
      }
    }

    // Step 7: Set agent identity headers for downstream handlers
    c.req.raw.headers.set('x-agent-tba', verification.tbaAddress);
    c.req.raw.headers.set('x-agent-nft-contract', verification.nftContract);
    c.req.raw.headers.set('x-agent-token-id', verification.tokenId);
    c.req.raw.headers.set('x-agent-owner', verification.ownerWallet);

    await next();
  });
}
