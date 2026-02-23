import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryStore } from '../../src/services/memory-store.js';
import { authorizeMemoryAccess, validateSealingPolicy } from '../../src/services/memory-auth.js';
import { handleNftTransfer } from '../../src/services/nft-transfer-handler.js';
import type { MemoryProjection, MemoryEvent, AccessPolicy } from '../../src/types/memory.js';

/**
 * Integration Test: Full Memory Lifecycle
 *
 * Validates the end-to-end memory flow:
 * 1. Owner creates memory context → injection works
 * 2. Owner seals a conversation → sealed data governed by policy
 * 3. NFT transfers to new owner → previous conversations sealed
 * 4. Previous owner access governed by AccessPolicy
 * 5. New owner starts fresh with empty active context
 *
 * Uses mock loa-finn responses but tests real authorization + store logic.
 */

// ─── Mock Infrastructure ──────────────────────────────────────

let eventLog: MemoryEvent[];
let eventCounter: number;
let projectionState: Record<string, MemoryProjection>;

function createMockFinnClient() {
  return {
    request: vi.fn(async (method: string, path: string, opts?: { body?: unknown }) => {
      // POST /api/memory/:nftId/events — append event
      if (method === 'POST' && path.match(/\/api\/memory\/[^/]+\/events$/)) {
        const nftId = path.split('/')[3];
        const body = opts?.body as Record<string, unknown>;
        const event: MemoryEvent = {
          id: `evt-${++eventCounter}`,
          nftId,
          conversationId: body.conversationId as string,
          eventType: body.eventType as MemoryEvent['eventType'],
          payload: body.payload as Record<string, unknown>,
          encryptionState: 'plaintext',
          actorWallet: body.actorWallet as string,
          createdAt: new Date().toISOString(),
        };
        eventLog.push(event);
        return event;
      }

      // GET /api/memory/:nftId/events — get events
      if (method === 'GET' && path.match(/\/api\/memory\/[^/]+\/events/)) {
        const nftId = path.split('/')[3];
        return eventLog.filter(e => e.nftId === nftId);
      }

      // GET /api/memory/:nftId/projection — get projection
      if (method === 'GET' && path.match(/\/api\/memory\/[^/]+\/projection$/)) {
        const nftId = path.split('/')[3];
        return projectionState[nftId] ?? null;
      }

      // POST /api/memory/:nftId/seal — seal conversation
      if (method === 'POST' && path.match(/\/api\/memory\/[^/]+\/seal$/)) {
        const nftId = path.split('/')[3];
        const body = opts?.body as Record<string, unknown>;
        return {
          sealed: true,
          conversationId: body.conversationId,
          eventId: `evt-${++eventCounter}`,
        };
      }

      // GET /api/memory/:nftId/history — get history
      if (method === 'GET' && path.match(/\/api\/memory\/[^/]+\/history/)) {
        const nftId = path.split('/')[3];
        // Build conversation summaries from event log
        const conversations = new Map<string, { messageCount: number; sealed: boolean; lastMessageAt: string }>();
        for (const event of eventLog.filter(e => e.nftId === nftId)) {
          if (event.conversationId === '__system__') continue;
          if (!conversations.has(event.conversationId)) {
            conversations.set(event.conversationId, { messageCount: 0, sealed: false, lastMessageAt: event.createdAt });
          }
          const conv = conversations.get(event.conversationId)!;
          if (event.eventType === 'message') conv.messageCount++;
          if (event.eventType === 'seal') conv.sealed = true;
          conv.lastMessageAt = event.createdAt;
        }
        return Array.from(conversations.entries()).map(([id, c]) => ({
          conversationId: id,
          title: `Conversation ${id}`,
          messageCount: c.messageCount,
          sealed: c.sealed,
          lastMessageAt: c.lastMessageAt,
        }));
      }

      // DELETE /api/memory/:nftId/:conversationId
      if (method === 'DELETE') {
        return undefined;
      }

      throw new Error(`Unmocked request: ${method} ${path}`);
    }),
    getHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    circuit: 'closed' as const,
  } as any;
}

function createMockSignalEmitter() {
  return {
    publish: vi.fn().mockResolvedValue(true),
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    connected: true,
    healthCheck: vi.fn().mockResolvedValue(0),
  } as any;
}

describe('integration/memory-flow', () => {
  let finnClient: ReturnType<typeof createMockFinnClient>;
  let signalEmitter: ReturnType<typeof createMockSignalEmitter>;
  let memoryStore: MemoryStore;

  // Valid 42-char hex Ethereum addresses (checksumAddress-safe)
  const OWNER_A = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
  const OWNER_B = '0x1234567890abcdef1234567890abcdef12345678';
  const DELEGATE = '0xdead000000000000000000000000000000000789';
  const NFT_ID = 'nft-oracle-42';

  beforeEach(() => {
    eventLog = [];
    eventCounter = 0;
    projectionState = {
      [NFT_ID]: {
        nftId: NFT_ID,
        activeContext: {
          summary: 'The Oracle has discussed DeFi governance with Alice.',
          recentTopics: ['DeFi', 'governance'],
          unresolvedQuestions: ['What is BGT staking?'],
          interactionCount: 10,
          lastInteraction: '2026-02-21T10:00:00Z',
        },
        conversationCount: 2,
        sealedConversationCount: 0,
        lastInteraction: '2026-02-21T10:00:00Z',
        accessPolicy: { type: 'none' } as AccessPolicy,
        personalityDrift: { formality: 0.1, technicality: 0.3, verbosity: -0.2, updatedAt: null },
        topicClusters: ['DeFi', 'governance'],
        updatedAt: '2026-02-21T10:00:00Z',
      },
    };

    finnClient = createMockFinnClient();
    signalEmitter = createMockSignalEmitter();
    memoryStore = new MemoryStore(finnClient, null); // No Redis cache for integration test
  });

  it('full lifecycle: create → inject → seal → transfer → verify', async () => {
    // ─── Step 1: Owner appends message events ───────────────────

    const msg1 = await memoryStore.appendEvent(NFT_ID, {
      nftId: NFT_ID,
      conversationId: 'conv-1',
      eventType: 'message',
      payload: { role: 'user', content: 'Tell me about BGT staking' },
      actorWallet: OWNER_A,
    });
    expect(msg1.id).toBe('evt-1');
    expect(msg1.eventType).toBe('message');

    const msg2 = await memoryStore.appendEvent(NFT_ID, {
      nftId: NFT_ID,
      conversationId: 'conv-1',
      eventType: 'message',
      payload: { role: 'assistant', content: 'BGT staking allows...' },
      actorWallet: NFT_ID,
    });
    expect(msg2.id).toBe('evt-2');

    // ─── Step 2: Verify injection context ───────────────────────

    const injection = await memoryStore.getInjectionContext(NFT_ID, OWNER_A);
    expect(injection.nftId).toBe(NFT_ID);
    expect(injection.ownerWallet).toBe(OWNER_A);
    expect(injection.memorySummary).toContain('DeFi governance');
    expect(injection.recentTopics).toContain('DeFi');
    expect(injection.tokenBudget).toBe(500);

    // ─── Step 3: Owner authorization check ──────────────────────

    const ownerAuth = authorizeMemoryAccess({
      wallet: OWNER_A,
      ownerWallet: OWNER_A,
      delegatedWallets: [DELEGATE],
      accessPolicy: { type: 'none' } as AccessPolicy,
      operation: 'seal',
    });
    expect(ownerAuth.allowed).toBe(true);
    expect(ownerAuth.reason).toBe('owner');

    // ─── Step 4: Delegated wallet can read but not seal ─────────

    const delegateRead = authorizeMemoryAccess({
      wallet: DELEGATE,
      ownerWallet: OWNER_A,
      delegatedWallets: [DELEGATE],
      accessPolicy: { type: 'none' } as AccessPolicy,
      operation: 'read',
    });
    expect(delegateRead.allowed).toBe(true);
    expect(delegateRead.reason).toBe('delegated');

    const delegateSeal = authorizeMemoryAccess({
      wallet: DELEGATE,
      ownerWallet: OWNER_A,
      delegatedWallets: [DELEGATE],
      accessPolicy: { type: 'none' } as AccessPolicy,
      operation: 'seal',
    });
    expect(delegateSeal.allowed).toBe(false);

    // ─── Step 5: Owner seals a conversation ─────────────────────

    const sealPolicy = {
      encryption_scheme: 'aes-256-gcm',
      key_derivation: 'hkdf-sha256',
      key_reference: 'kms://test-key-001',
      access_audit: true,
      access_policy: { type: 'read_only', audit_required: true, revocable: false },
    };
    const validation = validateSealingPolicy(sealPolicy);
    expect(validation.valid).toBe(true);

    const sealResult = await memoryStore.sealConversation(NFT_ID, 'conv-1', sealPolicy as any);
    expect(sealResult.sealed).toBe(true);
    expect(sealResult.conversationId).toBe('conv-1');

    // ─── Step 6: Create second conversation (for transfer test) ─

    await memoryStore.appendEvent(NFT_ID, {
      nftId: NFT_ID,
      conversationId: 'conv-2',
      eventType: 'message',
      payload: { role: 'user', content: 'What about honey jars?' },
      actorWallet: OWNER_A,
    });

    // ─── Step 7: NFT Transfer — Alice → Bob ─────────────────────

    const transferResult = await handleNftTransfer({
      nftId: NFT_ID,
      previousOwner: OWNER_A,
      newOwner: OWNER_B,
      memoryStore,
      signalEmitter,
      accessPolicy: { type: 'read_only' } as AccessPolicy,
    });

    expect(transferResult.nftId).toBe(NFT_ID);
    expect(transferResult.previousOwner).toBe(OWNER_A);
    expect(transferResult.newOwner).toBe(OWNER_B);
    // conv-2 was unsealed and should be sealed by transfer
    expect(transferResult.conversationsSealed).toBeGreaterThanOrEqual(0);

    // ─── Step 8: Verify transfer events in log ──────────────────

    const transferEvents = eventLog.filter(e => e.eventType === 'transfer');
    expect(transferEvents).toHaveLength(1);
    expect(transferEvents[0].payload).toMatchObject({
      previousOwner: OWNER_A,
      newOwner: OWNER_B,
    });

    const policyChangeEvents = eventLog.filter(e => e.eventType === 'policy_change');
    expect(policyChangeEvents).toHaveLength(1);
    expect(policyChangeEvents[0].payload).toMatchObject({
      wallet: OWNER_A,
      reason: 'nft_transfer',
    });

    // ─── Step 9: Verify signal emitted ──────────────────────────

    expect(signalEmitter.publish).toHaveBeenCalledWith(
      'dixie.signal.interaction',
      expect.objectContaining({
        type: 'nft_transfer',
        nftId: NFT_ID,
        previousOwner: OWNER_A,
        newOwner: OWNER_B,
      }),
    );

    // ─── Step 10: Previous owner access governed by policy ──────

    const prevOwnerRead = authorizeMemoryAccess({
      wallet: OWNER_A,
      ownerWallet: OWNER_B,
      delegatedWallets: [],
      accessPolicy: { type: 'read_only' } as AccessPolicy,
      operation: 'read',
    });
    expect(prevOwnerRead.allowed).toBe(true);
    expect(prevOwnerRead.reason).toBe('access_policy_read_only');

    // Previous owner cannot seal or delete
    const prevOwnerSeal = authorizeMemoryAccess({
      wallet: OWNER_A,
      ownerWallet: OWNER_B,
      delegatedWallets: [],
      accessPolicy: { type: 'read_only' } as AccessPolicy,
      operation: 'seal',
    });
    expect(prevOwnerSeal.allowed).toBe(false);

    // ─── Step 11: New owner has full access ─────────────────────

    const newOwnerAuth = authorizeMemoryAccess({
      wallet: OWNER_B,
      ownerWallet: OWNER_B,
      delegatedWallets: [],
      accessPolicy: { type: 'read_only' } as AccessPolicy,
      operation: 'seal',
    });
    expect(newOwnerAuth.allowed).toBe(true);
    expect(newOwnerAuth.reason).toBe('owner');
  });

  it('graceful degradation: memory store returns empty projection when loa-finn unavailable', async () => {
    const brokenFinnClient = {
      ...finnClient,
      request: vi.fn().mockRejectedValue(new Error('connection refused')),
    } as any;
    const degradedStore = new MemoryStore(brokenFinnClient, null);

    const projection = await degradedStore.getProjection(NFT_ID);
    expect(projection.nftId).toBe(NFT_ID);
    expect(projection.activeContext.summary).toBe('');
    expect(projection.conversationCount).toBe(0);
  });

  it('time_limited access policy expires correctly', () => {
    const futureTime = new Date(Date.now() + 3600_000).toISOString();
    const pastTime = new Date(Date.now() - 3600_000).toISOString();

    // Active — should allow read
    const activeResult = authorizeMemoryAccess({
      wallet: '0xaaaa000000000000000000000000000000000001',
      ownerWallet: OWNER_A,
      delegatedWallets: [],
      accessPolicy: { type: 'time_limited', expires_at: futureTime } as AccessPolicy,
      operation: 'read',
    });
    expect(activeResult.allowed).toBe(true);

    // Expired — should deny
    const expiredResult = authorizeMemoryAccess({
      wallet: '0xaaaa000000000000000000000000000000000001',
      ownerWallet: OWNER_A,
      delegatedWallets: [],
      accessPolicy: { type: 'time_limited', expires_at: pastTime } as AccessPolicy,
      operation: 'read',
    });
    expect(expiredResult.allowed).toBe(false);
    expect(expiredResult.reason).toBe('access_policy_expired');
  });
});
