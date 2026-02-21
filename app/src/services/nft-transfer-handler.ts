import type { MemoryStore, ConversationSummary } from './memory-store.js';
import type { SignalEmitter } from './signal-emitter.js';
import type { ConversationSealingPolicy, AccessPolicy } from '../types/memory.js';

/**
 * NFT Transfer Event Handler
 *
 * When an NFT changes ownership, the transfer handler orchestrates:
 * 1. Seal all active (unsealed) conversations with a default sealing policy
 * 2. Emit a policy_change event to update the access policy for the previous owner
 * 3. Emit a transfer event to record the ownership change in the memory log
 *
 * Per PRD FR-1 transfer behavior table:
 * - Previous owner's conversations are sealed with their chosen/default access policy
 * - New owner starts with a clean active context
 * - Event log is preserved (immutable) — new owner can see transfer happened
 *
 * See: SDD §4.2, §7.3, PRD FR-1
 */

export interface TransferResult {
  nftId: string;
  previousOwner: string;
  newOwner: string;
  conversationsSealed: number;
  transferEventId: string;
}

const DEFAULT_SEALING_POLICY: ConversationSealingPolicy = {
  encryption_scheme: 'aes-256-gcm',
  key_derivation: 'hkdf-sha256',
  access_audit: true,
  access_policy: { type: 'read_only' } as AccessPolicy,
} as ConversationSealingPolicy;

export async function handleNftTransfer(params: {
  nftId: string;
  previousOwner: string;
  newOwner: string;
  memoryStore: MemoryStore;
  signalEmitter: SignalEmitter | null;
  accessPolicy?: AccessPolicy;
}): Promise<TransferResult> {
  const {
    nftId,
    previousOwner,
    newOwner,
    memoryStore,
    signalEmitter,
    accessPolicy,
  } = params;

  // 1. Get all active (unsealed) conversations
  const conversations: ConversationSummary[] = await memoryStore.getConversationHistory(nftId, {
    includeSealed: false,
    limit: 1000,
  });

  const unsealedConversations = conversations.filter(c => !c.sealed);

  // 2. Seal each active conversation
  const sealingPolicy: ConversationSealingPolicy = accessPolicy
    ? { ...DEFAULT_SEALING_POLICY, access_policy: accessPolicy } as ConversationSealingPolicy
    : DEFAULT_SEALING_POLICY;

  for (const conv of unsealedConversations) {
    await memoryStore.sealConversation(nftId, conv.conversationId, sealingPolicy);
  }

  // 3. Record the transfer event in the memory log
  const transferEvent = await memoryStore.appendEvent(nftId, {
    nftId,
    conversationId: '__system__',
    eventType: 'transfer',
    payload: {
      previousOwner,
      newOwner,
      conversationsSealed: unsealedConversations.length,
      timestamp: new Date().toISOString(),
    },
    actorWallet: newOwner,
  });

  // 4. Emit policy_change event to revoke previous owner access
  await memoryStore.appendEvent(nftId, {
    nftId,
    conversationId: '__system__',
    eventType: 'policy_change',
    payload: {
      wallet: previousOwner,
      previousPolicy: { type: 'none' },
      newPolicy: accessPolicy ?? { type: 'read_only' },
      reason: 'nft_transfer',
    },
    actorWallet: newOwner,
  });

  // 5. Invalidate projection cache so new owner gets fresh state
  await memoryStore.invalidateProjection(nftId);

  // 6. Emit interaction signal for compound learning
  if (signalEmitter) {
    await signalEmitter.publish('dixie.signal.interaction', {
      type: 'nft_transfer',
      nftId,
      previousOwner,
      newOwner,
      conversationsSealed: unsealedConversations.length,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    nftId,
    previousOwner,
    newOwner,
    conversationsSealed: unsealedConversations.length,
    transferEventId: transferEvent.id,
  };
}
