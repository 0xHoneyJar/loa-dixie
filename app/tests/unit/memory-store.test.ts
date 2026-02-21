import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryStore } from '../../src/services/memory-store.js';
import type { MemoryProjection, InjectionContext } from '../../src/types/memory.js';

function createMockFinnClient() {
  return {
    request: vi.fn(),
    getHealth: vi.fn(),
    circuit: 'closed' as const,
  } as any;
}

function createMockProjectionCache() {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    getOrFetch: vi.fn(async (key: string, fetcher: () => Promise<unknown>) => {
      const cached = store.get(key);
      if (cached) return cached;
      const result = await fetcher();
      store.set(key, result);
      return result;
    }),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    invalidate: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    invalidateAll: vi.fn().mockResolvedValue(0),
    _store: store,
  } as any;
}

const MOCK_PROJECTION: MemoryProjection = {
  nftId: 'nft-123',
  activeContext: {
    summary: 'Test summary',
    recentTopics: ['topic-1', 'topic-2'],
    unresolvedQuestions: ['question-1'],
    interactionCount: 5,
    lastInteraction: '2026-02-21T10:00:00Z',
  },
  conversationCount: 3,
  sealedConversationCount: 1,
  lastInteraction: '2026-02-21T10:00:00Z',
  accessPolicy: { type: 'none' } as any,
  personalityDrift: { formality: 0.2, technicality: 0.5, verbosity: -0.1, updatedAt: null },
  topicClusters: ['defi', 'governance'],
  updatedAt: '2026-02-21T10:00:00Z',
};

describe('services/memory-store', () => {
  let finnClient: ReturnType<typeof createMockFinnClient>;
  let projectionCache: ReturnType<typeof createMockProjectionCache>;
  let store: MemoryStore;

  beforeEach(() => {
    finnClient = createMockFinnClient();
    projectionCache = createMockProjectionCache();
    store = new MemoryStore(finnClient, projectionCache);
  });

  describe('appendEvent', () => {
    it('posts event to loa-finn and invalidates cache', async () => {
      const event = {
        nftId: 'nft-123',
        conversationId: 'conv-1',
        eventType: 'message' as const,
        payload: { content: 'hello' },
        actorWallet: '0xabc',
      };
      const mockResult = { id: 'evt-1', ...event, encryptionState: 'plaintext', createdAt: '2026-02-21T10:00:00Z' };
      finnClient.request.mockResolvedValue(mockResult);

      const result = await store.appendEvent('nft-123', event);

      expect(finnClient.request).toHaveBeenCalledWith('POST', '/api/memory/nft-123/events', { body: event });
      expect(projectionCache.invalidate).toHaveBeenCalledWith('nft-123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('getEvents', () => {
    it('fetches events with query params', async () => {
      finnClient.request.mockResolvedValue([]);

      await store.getEvents('nft-123', { conversationId: 'conv-1', limit: 10, order: 'desc' });

      expect(finnClient.request).toHaveBeenCalledWith(
        'GET',
        expect.stringContaining('/api/memory/nft-123/events?'),
      );
      const callPath = finnClient.request.mock.calls[0][1] as string;
      expect(callPath).toContain('conversationId=conv-1');
      expect(callPath).toContain('limit=10');
      expect(callPath).toContain('order=desc');
    });

    it('fetches events without query params', async () => {
      finnClient.request.mockResolvedValue([]);

      await store.getEvents('nft-123');

      expect(finnClient.request).toHaveBeenCalledWith('GET', '/api/memory/nft-123/events');
    });
  });

  describe('getProjection', () => {
    it('uses cache-aside when projection cache available', async () => {
      projectionCache.getOrFetch.mockResolvedValue(MOCK_PROJECTION);

      const result = await store.getProjection('nft-123');

      expect(projectionCache.getOrFetch).toHaveBeenCalledWith('nft-123', expect.any(Function));
      expect(result).toEqual(MOCK_PROJECTION);
    });

    it('falls back to empty projection when loa-finn unavailable', async () => {
      const storeNoCache = new MemoryStore(finnClient, null);
      finnClient.request.mockRejectedValue(new Error('connection refused'));

      const result = await storeNoCache.getProjection('nft-123');

      expect(result.nftId).toBe('nft-123');
      expect(result.activeContext.summary).toBe('');
      expect(result.conversationCount).toBe(0);
    });
  });

  describe('sealConversation', () => {
    it('posts seal request and invalidates cache', async () => {
      const mockResult = {
        sealed: true,
        conversationId: 'conv-1',
        eventId: 'evt-2',
      };
      finnClient.request.mockResolvedValue(mockResult);

      const policy = {
        encryption_scheme: 'aes-256-gcm',
        key_derivation: 'hkdf-sha256',
        access_policy: { type: 'read_only' },
      } as any;

      const result = await store.sealConversation('nft-123', 'conv-1', policy);

      expect(finnClient.request).toHaveBeenCalledWith('POST', '/api/memory/nft-123/seal', {
        body: { conversationId: 'conv-1', sealingPolicy: policy },
      });
      expect(projectionCache.invalidate).toHaveBeenCalledWith('nft-123');
      expect(result.sealed).toBe(true);
    });
  });

  describe('getConversationHistory', () => {
    it('fetches history with pagination', async () => {
      finnClient.request.mockResolvedValue([]);

      await store.getConversationHistory('nft-123', { limit: 10, includeSealed: true });

      const callPath = finnClient.request.mock.calls[0][1] as string;
      expect(callPath).toContain('limit=10');
      expect(callPath).toContain('includeSealed=true');
    });
  });

  describe('deleteConversation', () => {
    it('sends delete and invalidates cache', async () => {
      finnClient.request.mockResolvedValue(undefined);

      await store.deleteConversation('nft-123', 'conv-1');

      expect(finnClient.request).toHaveBeenCalledWith('DELETE', '/api/memory/nft-123/conv-1');
      expect(projectionCache.invalidate).toHaveBeenCalledWith('nft-123');
    });
  });

  describe('getInjectionContext', () => {
    it('constructs injection context from projection', async () => {
      projectionCache.getOrFetch.mockResolvedValue(MOCK_PROJECTION);

      const result: InjectionContext = await store.getInjectionContext('nft-123', '0xowner');

      expect(result.nftId).toBe('nft-123');
      expect(result.ownerWallet).toBe('0xowner');
      expect(result.memorySummary).toBe('Test summary');
      expect(result.recentTopics).toEqual(['topic-1', 'topic-2']);
      expect(result.unresolvedQuestions).toEqual(['question-1']);
      expect(result.tokenBudget).toBe(500);
    });
  });

  describe('invalidateProjection', () => {
    it('invalidates the cached projection', async () => {
      await store.invalidateProjection('nft-123');
      expect(projectionCache.invalidate).toHaveBeenCalledWith('nft-123');
    });

    it('does nothing when no cache available', async () => {
      const storeNoCache = new MemoryStore(finnClient, null);
      // Should not throw
      await storeNoCache.invalidateProjection('nft-123');
    });
  });
});
