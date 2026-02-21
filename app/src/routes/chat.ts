import { Hono } from 'hono';
import { z } from 'zod';
import type { FinnClient } from '../proxy/finn-client.js';
import { isValidPathParam, getRequestContext } from '../validation.js';

/**
 * ADR: Hono sub-app typing
 *
 * Route handlers read wallet and requestId from HTTP headers (x-wallet-address,
 * x-request-id) instead of Hono's typed context (c.get('wallet')).
 *
 * Reason: Hono's `app.route()` creates a sub-app boundary that resets typed
 * context. Variables set via `c.set()` in parent middleware are not type-safe
 * across this boundary. Using headers as the communication channel between
 * middleware and route handlers is explicit, testable, and framework-agnostic.
 *
 * If Hono adds typed context propagation across `app.route()` boundaries,
 * search for "ADR: Hono sub-app typing" to find all files that can be simplified.
 */

// ARCH-002: Runtime body validation — TypeScript generics are erased at compile time.
// Zod schemas provide runtime guarantees that incoming JSON matches expected shapes.
const ChatRequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
  sessionId: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(128).optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface ChatResponse {
  sessionId: string;
  messageId: string;
}

/**
 * Chat routes — proxies chat requests to loa-finn.
 */
export function createChatRoutes(finnClient: FinnClient): Hono {
  const app = new Hono();

  /** POST / — Send a chat message */
  app.post('/', async (c) => {
    const raw = await c.req.json().catch(() => null);
    const parsed = ChatRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        { error: 'invalid_request', message: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        400,
      );
    }
    const body = parsed.data;

    // ARCH-001: Consistent request context extraction via shared helper
    const { wallet, requestId } = getRequestContext(c);

    try {
      if (body.sessionId) {
        // SEC-002: Validate sessionId before URL interpolation to prevent path traversal
        if (!isValidPathParam(body.sessionId)) {
          return c.json(
            { error: 'invalid_request', message: 'Invalid session ID format' },
            400,
          );
        }
        // Send message to existing session
        const result = await finnClient.request<ChatResponse>(
          'POST',
          `/api/sessions/${body.sessionId}/message`,
          {
            body: { prompt: body.prompt },
            headers: {
              'X-Request-Id': requestId,
              ...(wallet ? { 'X-Wallet-Address': wallet } : {}),
            },
          },
        );
        return c.json(result);
      }

      // Create new session and send first message
      const session = await finnClient.request<{ sessionId: string }>(
        'POST',
        '/api/sessions',
        {
          body: {
            agentId: 'oracle',
            prompt: body.prompt,
          },
          headers: {
            'X-Request-Id': requestId,
            ...(wallet ? { 'X-Wallet-Address': wallet } : {}),
          },
        },
      );

      return c.json({
        sessionId: session.sessionId,
        messageId: requestId,
      });
    } catch (err) {
      if (err instanceof Object && 'status' in err && 'body' in err) {
        const bffErr = err as { status: number; body: unknown };
        return c.json(bffErr.body, bffErr.status as 400);
      }
      return c.json(
        { error: 'internal_error', message: 'Failed to process chat request' },
        500,
      );
    }
  });

  return app;
}
