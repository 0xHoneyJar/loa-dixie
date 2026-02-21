import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createMemoryRoutes, type NftOwnershipInfo } from '../../src/routes/memory.js';
import type { MemoryProjection } from '../../src/types/memory.js';

function createMockMemoryStore() {
  return {
    appendEvent: vi.fn(),
    getEvents: vi.fn(),
    getProjection: vi.fn(),
    invalidateProjection: vi.fn(),
    sealConversation: vi.fn(),
    getConversationHistory: vi.fn(),
    deleteConversation: vi.fn(),
    getInjectionContext: vi.fn(),
  } as any;
}

const MOCK_PROJECTION: MemoryProjection = {
  nftId: 'nft-123',
  activeContext: {
    summary: 'Test summary',
    recentTopics: ['topic-1'],
    unresolvedQuestions: ['q-1'],
    interactionCount: 5,
    lastInteraction: '2026-02-21T10:00:00Z',
  },
  conversationCount: 3,
  sealedConversationCount: 1,
  lastInteraction: '2026-02-21T10:00:00Z',
  accessPolicy: { type: 'none' } as any,
  personalityDrift: { formality: 0, technicality: 0, verbosity: 0, updatedAt: null },
  topicClusters: [],
  updatedAt: '2026-02-21T10:00:00Z',
};

const OWNER_WALLET = '0xowner123';
const DELEGATE_WALLET = '0xdelegate456';
const OTHER_WALLET = '0xother789';

function createApp(memoryStore: any) {
  const resolveNftOwnership = vi.fn<(wallet: string) => Promise<NftOwnershipInfo | null>>();
  resolveNftOwnership.mockImplementation(async (wallet: string) => {
    if (wallet.toLowerCase() === OWNER_WALLET.toLowerCase()) {
      return {
        nftId: 'nft-123',
        ownerWallet: OWNER_WALLET,
        delegatedWallets: [DELEGATE_WALLET],
      };
    }
    return null;
  });

  const memoryRoutes = createMemoryRoutes({ memoryStore, resolveNftOwnership });
  const app = new Hono();
  app.route('/api/memory', memoryRoutes);
  return { app, resolveNftOwnership };
}

function makeRequest(app: Hono, method: string, path: string, opts?: { wallet?: string; body?: unknown }) {
  const headers: Record<string, string> = {
    'x-request-id': 'test-req-1',
  };
  if (opts?.wallet) {
    headers['x-wallet-address'] = opts.wallet;
  }
  if (opts?.body) {
    headers['content-type'] = 'application/json';
  }

  return app.request(path, {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
}

describe('routes/memory', () => {
  let memoryStore: ReturnType<typeof createMockMemoryStore>;
  let app: Hono;

  beforeEach(() => {
    memoryStore = createMockMemoryStore();
    memoryStore.getProjection.mockResolvedValue(MOCK_PROJECTION);
    const created = createApp(memoryStore);
    app = created.app;
  });

  // ─── GET /:nftId ─────────────────────────────────────────────

  describe('GET /api/memory/:nftId', () => {
    it('returns projection for owner', async () => {
      const res = await makeRequest(app, 'GET', '/api/memory/nft-123', { wallet: OWNER_WALLET });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.nftId).toBe('nft-123');
      expect(body.activeContext.summary).toBe('Test summary');
      expect(body.activeContext.recentTopics).toEqual(['topic-1']);
      expect(body.conversationCount).toBe(3);
    });

    it('rejects unauthenticated requests', async () => {
      const res = await makeRequest(app, 'GET', '/api/memory/nft-123');
      expect(res.status).toBe(401);
    });

    it('rejects non-owner wallets with policy none', async () => {
      const res = await makeRequest(app, 'GET', '/api/memory/nft-123', { wallet: OTHER_WALLET });
      expect(res.status).toBe(403);
    });

    it('rejects invalid nftId format', async () => {
      // nftId with spaces is invalid per isValidPathParam regex
      const res = await makeRequest(app, 'GET', '/api/memory/nft+bad+id', { wallet: OWNER_WALLET });
      expect(res.status).toBe(400);
    });
  });

  // ─── POST /:nftId/seal ──────────────────────────────────────

  describe('POST /api/memory/:nftId/seal', () => {
    const validSealBody = {
      conversationId: 'conv-1',
      sealingPolicy: {
        encryption_scheme: 'aes-256-gcm',
        key_derivation: 'hkdf-sha256',
        access_audit: true,
        access_policy: { type: 'read_only' },
      },
    };

    it('seals conversation for owner', async () => {
      memoryStore.sealConversation.mockResolvedValue({
        sealed: true,
        conversationId: 'conv-1',
        eventId: 'evt-1',
      });

      const res = await makeRequest(app, 'POST', '/api/memory/nft-123/seal', {
        wallet: OWNER_WALLET,
        body: validSealBody,
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.sealed).toBe(true);
      expect(body.conversationId).toBe('conv-1');
    });

    it('rejects non-owner seal attempts', async () => {
      const res = await makeRequest(app, 'POST', '/api/memory/nft-123/seal', {
        wallet: OTHER_WALLET,
        body: validSealBody,
      });
      expect(res.status).toBe(403);
    });

    it('rejects invalid sealing policy', async () => {
      const res = await makeRequest(app, 'POST', '/api/memory/nft-123/seal', {
        wallet: OWNER_WALLET,
        body: {
          conversationId: 'conv-1',
          sealingPolicy: {
            encryption_scheme: 'aes-128-gcm', // invalid
            key_derivation: 'hkdf-sha256',
            access_policy: { type: 'none' },
          },
        },
      });
      expect(res.status).toBe(400);
    });

    it('validates time_limited policy requires duration_hours', async () => {
      const res = await makeRequest(app, 'POST', '/api/memory/nft-123/seal', {
        wallet: OWNER_WALLET,
        body: {
          conversationId: 'conv-1',
          sealingPolicy: {
            encryption_scheme: 'aes-256-gcm',
            key_derivation: 'hkdf-sha256',
            access_policy: { type: 'time_limited' },
          },
        },
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_sealing_policy');
    });

    it('rejects missing request body', async () => {
      const res = await makeRequest(app, 'POST', '/api/memory/nft-123/seal', {
        wallet: OWNER_WALLET,
      });
      expect(res.status).toBe(400);
    });
  });

  // ─── GET /:nftId/history ─────────────────────────────────────

  describe('GET /api/memory/:nftId/history', () => {
    it('returns conversation history for owner', async () => {
      memoryStore.getConversationHistory.mockResolvedValue([
        { conversationId: 'conv-1', title: 'Test', messageCount: 5, sealed: false, lastMessageAt: '2026-02-21T10:00:00Z' },
      ]);

      const res = await makeRequest(app, 'GET', '/api/memory/nft-123/history', { wallet: OWNER_WALLET });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.conversations).toHaveLength(1);
      expect(body.conversations[0].conversationId).toBe('conv-1');
    });

    it('rejects unauthenticated requests', async () => {
      const res = await makeRequest(app, 'GET', '/api/memory/nft-123/history');
      expect(res.status).toBe(401);
    });
  });

  // ─── DELETE /:nftId/:conversationId ──────────────────────────

  describe('DELETE /api/memory/:nftId/:conversationId', () => {
    it('deletes conversation for owner', async () => {
      memoryStore.deleteConversation.mockResolvedValue(undefined);

      const res = await makeRequest(app, 'DELETE', '/api/memory/nft-123/conv-1', { wallet: OWNER_WALLET });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.deleted).toBe(true);
    });

    it('rejects non-owner delete attempts', async () => {
      const res = await makeRequest(app, 'DELETE', '/api/memory/nft-123/conv-1', { wallet: OTHER_WALLET });
      expect(res.status).toBe(403);
    });

    it('rejects invalid conversationId format', async () => {
      // conversationId with + is invalid per isValidPathParam regex
      const res = await makeRequest(app, 'DELETE', '/api/memory/nft-123/conv+bad+id', { wallet: OWNER_WALLET });
      expect(res.status).toBe(400);
    });
  });
});
