import { Hono } from 'hono';
import type { FinnClient } from '../proxy/finn-client.js';

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

export interface ChatRequest {
  prompt: string;
  sessionId?: string;
}

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
    const body = await c.req.json<ChatRequest>();

    if (!body.prompt?.trim()) {
      return c.json(
        { error: 'invalid_request', message: 'prompt is required' },
        400,
      );
    }

    // Read from response headers set by middleware (typed context doesn't span Hono instances)
    const wallet = c.req.header('x-wallet-address');
    const requestId = c.res.headers.get('X-Request-Id') ?? c.req.header('x-request-id') ?? '';

    try {
      if (body.sessionId) {
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
