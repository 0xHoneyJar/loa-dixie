import { Hono } from 'hono';
import { timingSafeEqual } from 'node:crypto';
import { getAddress } from 'viem';
import type { AllowlistStore } from '../middleware/allowlist.js';

/**
 * Constant-time string comparison to prevent timing attacks on admin key.
 * Both inputs are padded to equal length before comparison so that the
 * length check itself does not leak timing information about the key.
 */
function safeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(maxLen);
  const bufB = Buffer.alloc(maxLen);
  Buffer.from(a).copy(bufA);
  Buffer.from(b).copy(bufB);
  return timingSafeEqual(bufA, bufB) && a.length === b.length;
}

/**
 * Admin routes for allowlist management. Gated by admin API key.
 */
export function createAdminRoutes(
  allowlistStore: AllowlistStore,
  adminKey: string,
): Hono {
  const app = new Hono();

  // Admin auth middleware
  app.use('*', async (c, next) => {
    // SEC-001: Defense-in-depth — reject all requests when admin key is unconfigured.
    // Prevents safeEqual('', '') === true from granting access.
    if (!adminKey) {
      return c.json(
        { error: 'forbidden', message: 'Admin API not configured' },
        403,
      );
    }
    const authHeader = c.req.header('authorization');
    if (!authHeader) {
      return c.json(
        { error: 'unauthorized', message: 'Admin key required' },
        401,
      );
    }
    const key = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;
    if (!safeEqual(key, adminKey)) {
      return c.json(
        { error: 'forbidden', message: 'Invalid admin key' },
        403,
      );
    }
    await next();
  });

  /** GET /allowlist — List current allowlist */
  app.get('/allowlist', (c) => {
    return c.json(allowlistStore.getData());
  });

  /** POST /allowlist — Add entry */
  app.post('/allowlist', async (c) => {
    const body = await c.req.json<{ type: 'wallet' | 'apiKey'; value: string }>();

    if (!body.type || !body.value) {
      return c.json(
        { error: 'invalid_request', message: 'type and value required' },
        400,
      );
    }

    if (body.type !== 'wallet' && body.type !== 'apiKey') {
      return c.json(
        { error: 'invalid_request', message: 'type must be wallet or apiKey' },
        400,
      );
    }

    if (body.type === 'wallet') {
      try {
        getAddress(body.value); // validate EIP-55
      } catch {
        return c.json(
          {
            error: 'invalid_address',
            message: 'Invalid Ethereum address',
          },
          400,
        );
      }
    }

    allowlistStore.addEntry(body.type, body.value);
    return c.json({ ok: true, data: allowlistStore.getData() }, 201);
  });

  /** DELETE /allowlist/:entry — Remove entry */
  app.delete('/allowlist/:entry', (c) => {
    const entry = c.req.param('entry');
    const removed = allowlistStore.removeEntry(entry);

    if (!removed) {
      return c.json(
        { error: 'not_found', message: 'Entry not found in allowlist' },
        404,
      );
    }

    return c.json({ ok: true, data: allowlistStore.getData() });
  });

  return app;
}
