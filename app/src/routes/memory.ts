import { Hono } from 'hono';
import { z } from 'zod';
import type { MemoryStore } from '../services/memory-store.js';
import type { MemoryProjection } from '../types/memory.js';
import {
  authorizeMemoryAccess,
  validateSealingPolicy,
  type MemoryOperation,
} from '../services/memory-auth.js';
import { isValidPathParam, getRequestContext } from '../validation.js';

/**
 * ADR: Hono sub-app typing
 *
 * Route handlers read wallet and requestId from HTTP headers (x-wallet-address,
 * x-request-id) instead of Hono's typed context (c.get('wallet')).
 *
 * See: chat.ts for full ADR explanation.
 */

// ─── Request Schemas ──────────────────────────────────────────

const SealRequestSchema = z.object({
  conversationId: z.string().min(1).max(128),
  sealingPolicy: z.object({
    encryption_scheme: z.literal('aes-256-gcm'),
    key_derivation: z.literal('hkdf-sha256'),
    key_reference: z.string().min(1).optional(),
    access_audit: z.boolean().optional().default(true),
    access_policy: z.object({
      type: z.enum(['none', 'read_only', 'time_limited', 'role_based']),
      duration_hours: z.number().positive().optional(),
      roles: z.array(z.string().min(1)).optional(),
      audit_required: z.boolean(),
      revocable: z.boolean(),
    }),
  }),
});

const HistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().max(256).optional(),
  includeSealed: z.coerce.boolean().optional().default(false),
});

// ─── Dependencies ─────────────────────────────────────────────

export interface MemoryRouteDeps {
  memoryStore: MemoryStore;
  /** Resolve nftId + owner/delegated wallets from a wallet address */
  resolveNftOwnership: (wallet: string) => Promise<NftOwnershipInfo | null>;
}

export interface NftOwnershipInfo {
  nftId: string;
  ownerWallet: string;
  delegatedWallets: string[];
}

/**
 * Memory routes — Soul Memory CRUD per SDD §6.1.1.
 *
 * Endpoints:
 * - GET  /:nftId          — Current memory projection
 * - POST /:nftId/seal     — Seal conversation (owner-only)
 * - GET  /:nftId/history  — Paginated conversation history
 * - DELETE /:nftId/:conversationId — Delete conversation (owner-only)
 */
export function createMemoryRoutes(deps: MemoryRouteDeps): Hono {
  const { memoryStore, resolveNftOwnership } = deps;
  const app = new Hono();

  /**
   * Shared authorization helper.
   * Resolves wallet → nftId ownership and checks AccessPolicy.
   */
  async function authorize(
    wallet: string | undefined,
    nftId: string,
    operation: MemoryOperation,
  ): Promise<
    | { ok: true; nftId: string; ownerWallet: string }
    | { ok: false; status: number; error: string; message: string }
  > {
    if (!wallet) {
      return { ok: false, status: 401, error: 'unauthorized', message: 'Wallet required' };
    }

    if (!isValidPathParam(nftId)) {
      return { ok: false, status: 400, error: 'invalid_request', message: 'Invalid nftId format' };
    }

    // Resolve NFT ownership from wallet/nftId
    const ownership = await resolveNftOwnership(wallet);
    if (!ownership || ownership.nftId !== nftId) {
      // Wallet doesn't own this nftId — check if they have access via delegation/policy
      const projection = await memoryStore.getProjection(nftId);
      if (!projection || !projection.nftId) {
        return { ok: false, status: 404, error: 'not_found', message: 'Memory not found for this nftId' };
      }

      // Try to find the actual owner info for this nftId
      // The projection has the accessPolicy we need
      const result = authorizeMemoryAccess({
        wallet,
        ownerWallet: '', // We don't know the owner — deny by default
        delegatedWallets: [],
        accessPolicy: projection.accessPolicy,
        operation,
      });

      if (!result.allowed) {
        return { ok: false, status: 403, error: 'forbidden', message: `Access denied: ${result.reason}` };
      }

      return { ok: true, nftId, ownerWallet: '' };
    }

    // We have ownership info — run full authorization
    const projection = await memoryStore.getProjection(nftId);
    const result = authorizeMemoryAccess({
      wallet,
      ownerWallet: ownership.ownerWallet,
      delegatedWallets: ownership.delegatedWallets,
      accessPolicy: projection.accessPolicy,
      operation,
    });

    if (!result.allowed) {
      return { ok: false, status: 403, error: 'forbidden', message: `Access denied: ${result.reason}` };
    }

    return { ok: true, nftId, ownerWallet: ownership.ownerWallet };
  }

  // ─── GET /:nftId — Memory projection ─────────────────────────

  app.get('/:nftId', async (c) => {
    const { wallet, requestId } = getRequestContext(c);
    const nftId = c.req.param('nftId');

    const auth = await authorize(wallet, nftId, 'read');
    if (!auth.ok) {
      return c.json({ error: auth.error, message: auth.message }, auth.status as 400);
    }

    try {
      const projection: MemoryProjection = await memoryStore.getProjection(auth.nftId);

      return c.json({
        nftId: projection.nftId,
        activeContext: {
          summary: projection.activeContext.summary,
          recentTopics: projection.activeContext.recentTopics,
          unresolvedQuestions: projection.activeContext.unresolvedQuestions,
        },
        conversationCount: projection.conversationCount,
        sealedConversationCount: projection.sealedConversationCount,
        accessPolicy: projection.accessPolicy,
        lastInteraction: projection.lastInteraction,
        personalityDrift: projection.personalityDrift,
      });
    } catch (err) {
      if (err instanceof Object && 'status' in err && 'body' in err) {
        const bffErr = err as { status: number; body: unknown };
        return c.json(bffErr.body, bffErr.status as 400);
      }
      return c.json({ error: 'internal_error', message: 'Failed to fetch memory projection' }, 500);
    }
  });

  // ─── POST /:nftId/seal — Seal conversation (owner-only) ──────

  app.post('/:nftId/seal', async (c) => {
    const { wallet, requestId } = getRequestContext(c);
    const nftId = c.req.param('nftId');

    const auth = await authorize(wallet, nftId, 'seal');
    if (!auth.ok) {
      return c.json({ error: auth.error, message: auth.message }, auth.status as 400);
    }

    const raw = await c.req.json().catch(() => null);
    const parsed = SealRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        { error: 'invalid_request', message: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        400,
      );
    }

    // Cross-field validation per ADR-soul-memory-api
    const policyValidation = validateSealingPolicy(parsed.data.sealingPolicy as Record<string, unknown>);
    if (!policyValidation.valid) {
      return c.json(
        { error: 'invalid_sealing_policy', message: policyValidation.errors.join('; ') },
        400,
      );
    }

    try {
      const result = await memoryStore.sealConversation(
        auth.nftId,
        parsed.data.conversationId,
        parsed.data.sealingPolicy as unknown as import('../types/memory.js').ConversationSealingPolicy,
      );

      return c.json(result, 201);
    } catch (err) {
      if (err instanceof Object && 'status' in err && 'body' in err) {
        const bffErr = err as { status: number; body: unknown };
        return c.json(bffErr.body, bffErr.status as 400);
      }
      return c.json({ error: 'internal_error', message: 'Failed to seal conversation' }, 500);
    }
  });

  // ─── GET /:nftId/history — Conversation history ───────────────

  app.get('/:nftId/history', async (c) => {
    const { wallet, requestId } = getRequestContext(c);
    const nftId = c.req.param('nftId');

    const auth = await authorize(wallet, nftId, 'history');
    if (!auth.ok) {
      return c.json({ error: auth.error, message: auth.message }, auth.status as 400);
    }

    const queryParsed = HistoryQuerySchema.safeParse({
      limit: c.req.query('limit'),
      cursor: c.req.query('cursor'),
      includeSealed: c.req.query('includeSealed'),
    });

    if (!queryParsed.success) {
      return c.json(
        { error: 'invalid_request', message: queryParsed.error.issues[0]?.message ?? 'Invalid query parameters' },
        400,
      );
    }

    try {
      const history = await memoryStore.getConversationHistory(auth.nftId, queryParsed.data);
      return c.json({ conversations: history });
    } catch (err) {
      if (err instanceof Object && 'status' in err && 'body' in err) {
        const bffErr = err as { status: number; body: unknown };
        return c.json(bffErr.body, bffErr.status as 400);
      }
      return c.json({ error: 'internal_error', message: 'Failed to fetch conversation history' }, 500);
    }
  });

  // ─── DELETE /:nftId/:conversationId — Delete conversation (owner-only) ──

  app.delete('/:nftId/:conversationId', async (c) => {
    const { wallet, requestId } = getRequestContext(c);
    const nftId = c.req.param('nftId');
    const conversationId = c.req.param('conversationId');

    if (!isValidPathParam(conversationId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid conversationId format' }, 400);
    }

    const auth = await authorize(wallet, nftId, 'delete');
    if (!auth.ok) {
      return c.json({ error: auth.error, message: auth.message }, auth.status as 400);
    }

    try {
      await memoryStore.deleteConversation(auth.nftId, conversationId);
      return c.json({ deleted: true, conversationId });
    } catch (err) {
      if (err instanceof Object && 'status' in err && 'body' in err) {
        const bffErr = err as { status: number; body: unknown };
        return c.json(bffErr.body, bffErr.status as 400);
      }
      return c.json({ error: 'internal_error', message: 'Failed to delete conversation' }, 500);
    }
  });

  return app;
}
