import { Hono } from 'hono';
import { z } from 'zod';
import type { FinnClient } from '../proxy/finn-client.js';
import type { SignalEmitter } from '../services/signal-emitter.js';
import { isValidPathParam, getRequestContext } from '../validation.js';
import { handleRouteError } from '../utils/error-handler.js';

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

export interface ChatRouteDeps {
  /** NATS signal emitter for interaction signals (null when NATS not configured) */
  signalEmitter: SignalEmitter | null;
}

/**
 * Chat routes — proxies chat requests to loa-finn.
 *
 * Phase 2: After successful chat completion, emits an InteractionSignal
 * to NATS for compound learning pipeline (SDD §4.5).
 */
export function createChatRoutes(finnClient: FinnClient, deps?: ChatRouteDeps): Hono {
  const app = new Hono();

  /** POST / — Send a chat message */
  app.post('/', async (c): Promise<Response> => {
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

        // Phase 2: Emit interaction signal (fire-and-forget)
        emitChatSignal(deps?.signalEmitter ?? null, {
          wallet: wallet ?? '',
          sessionId: body.sessionId,
          messageId: result.messageId ?? requestId,
        });

        // Phase 2: Extended response headers (SDD §6.2)
        setPhase2Headers(c);

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

      // Phase 2: Emit interaction signal (fire-and-forget)
      emitChatSignal(deps?.signalEmitter ?? null, {
        wallet: wallet ?? '',
        sessionId: session.sessionId,
        messageId: requestId,
      });

      // Phase 2: Extended response headers (SDD §6.2)
      setPhase2Headers(c);

      return c.json({
        sessionId: session.sessionId,
        messageId: requestId,
      });
    } catch (err) {
      return handleRouteError(c, err, 'Failed to process chat request');
    }
  });

  return app;
}

/**
 * Set Phase 2 extended response headers (SDD §6.2).
 *
 * X-Model-Pool: model pool used (read from economic metadata middleware)
 * X-Memory-Tokens: tokens injected from soul memory context
 * X-Conviction-Tier: user's resolved conviction tier (placeholder until Sprint 5)
 */
function setPhase2Headers(c: { req: { header: (name: string) => string | undefined }; header: (name: string, value: string) => void }): void {
  const modelPool = c.req.header('x-model-pool');
  if (modelPool) c.header('X-Model-Pool', modelPool);

  const memoryTokens = c.req.header('x-memory-tokens');
  if (memoryTokens) c.header('X-Memory-Tokens', memoryTokens);

  // Conviction tier — resolved by conviction-tier middleware (position 13)
  const convictionTier = c.req.header('x-conviction-tier');
  if (convictionTier) c.header('X-Conviction-Tier', convictionTier);
}

/**
 * Emit a lightweight interaction signal to NATS after a chat POST.
 *
 * This is a session-level signal (not per-token). The full token-level
 * enrichment with economic metadata happens at the WebSocket stream layer
 * via the stream enricher (SDD §4.4).
 *
 * Fire-and-forget: never blocks the response.
 */
function emitChatSignal(
  signalEmitter: SignalEmitter | null,
  context: { wallet: string; sessionId: string; messageId: string },
): void {
  if (!signalEmitter) return;
  signalEmitter.publish('dixie.signal.interaction', {
    wallet: context.wallet,
    sessionId: context.sessionId,
    messageId: context.messageId,
    timestamp: new Date().toISOString(),
  }).catch((err) => {
    console.warn('[signal-loss]', { event: 'chat_interaction', error: String(err) });
  });
}
