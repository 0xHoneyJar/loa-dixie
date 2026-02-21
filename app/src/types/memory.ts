/**
 * Soul Memory Type Definitions — Sprint 17
 *
 * Type-only module defining the data model for soul memory.
 * No runtime code — these types prepare the codebase for
 * soul memory implementation in the next development cycle.
 *
 * Governance layer: @0xhoneyjar/loa-hounfour provides
 * AccessPolicy and ConversationSealingPolicy as the
 * protocol-level governance primitives. These types
 * compose them into Dixie's memory domain model.
 *
 * Architecture: Event-Sourced Memory with append-only log.
 * See: grimoires/loa/context/adr-soul-memory-architecture.md
 * API: grimoires/loa/context/adr-soul-memory-api.md
 * Governance: grimoires/loa/context/adr-soul-memory-governance.md
 */

import type {
  AccessPolicy,
  ConversationSealingPolicy,
} from '@0xhoneyjar/loa-hounfour';

// Re-export governance types for memory consumers
export type { AccessPolicy, ConversationSealingPolicy };

/**
 * Soul memory — the complete memory state for a dNFT agent.
 *
 * Represents the projection (materialized view) of the event log,
 * optimized for fast context injection into LLM prompts.
 * NFT-scoped: one SoulMemory per dNFT, owned by current holder.
 */
export interface SoulMemory {
  /** dNFT identifier */
  readonly nftId: string;
  /** Current owner wallet address (EIP-55 checksummed) */
  readonly owner: string;
  /** Active memory context for LLM prompt injection */
  readonly activeContext: ConversationContext;
  /** Number of active (unsealed) conversations */
  readonly conversationCount: number;
  /** Number of sealed conversations from previous owners */
  readonly sealedConversationCount: number;
  /** Current access policy governing previous-owner visibility */
  readonly accessPolicy: AccessPolicy;
  /** Timestamp of last interaction */
  readonly lastInteraction: string;
}

/**
 * Conversation context — the compressed memory representation
 * injected into the LLM system prompt.
 *
 * Generated from the event log projection, not stored verbatim.
 * Token-bounded to prevent context window bloat (default ~500 tokens).
 */
export interface ConversationContext {
  /** Natural language summary of accumulated knowledge about the user */
  readonly summary: string;
  /** Key topics the user has discussed (extracted from event patterns) */
  readonly keyTopics: readonly string[];
  /** Total number of user interactions across all conversations */
  readonly interactionCount: number;
  /** Timestamp of the most recent interaction */
  readonly lastInteraction: string;
}

/**
 * Memory entry — a single event in the append-only memory log.
 *
 * Events are immutable once written. The event log IS the audit trail.
 * Governance actions (seal, transfer, policy_change) are first-class events.
 */
export interface MemoryEntry {
  /** Unique event identifier */
  readonly id: string;
  /** dNFT this event belongs to */
  readonly nftId: string;
  /** Conversation this event is part of */
  readonly conversationId: string;
  /** Event type — governs how the event is processed by the projection layer */
  readonly eventType: MemoryEventType;
  /** Event payload — shape depends on eventType */
  readonly payload: Record<string, unknown>;
  /** Whether this event's payload is encrypted */
  readonly encryptionState: 'plaintext' | 'sealed';
  /**
   * Snapshot of the ConversationSealingPolicy at seal time.
   * Present only when encryptionState is 'sealed'.
   * Captures the exact policy that governed the sealing operation.
   */
  readonly sealingPolicy?: ConversationSealingPolicy;
  /** Wallet address of the actor who created this event */
  readonly actorWallet: string;
  /** Immutable creation timestamp (ISO 8601) */
  readonly createdAt: string;
}

/**
 * Event types in the memory log.
 *
 * Core events:
 * - message: User or agent message in a conversation
 * - tool_use: Agent used a tool (search, execute, etc.)
 * - context_inject: Memory context was injected into LLM prompt
 *
 * Governance events:
 * - seal: Conversation encrypted per ConversationSealingPolicy
 * - unseal: Conversation decrypted (requires sealing key)
 * - transfer: NFT ownership changed
 * - policy_change: AccessPolicy updated for a wallet
 * - delete: Conversation removed from projection (event preserved in log)
 */
export type MemoryEventType =
  | 'message'
  | 'tool_use'
  | 'context_inject'
  | 'seal'
  | 'unseal'
  | 'transfer'
  | 'policy_change'
  | 'delete';

/**
 * Sealed conversation — a conversation whose content has been
 * encrypted per ConversationSealingPolicy.
 *
 * Created during NFT transfer or manual owner request.
 * The sealing policy snapshot records the exact governance rules
 * that applied at seal time, ensuring policy changes don't
 * retroactively affect already-sealed data.
 */
export interface SealedConversation {
  /** Conversation identifier */
  readonly conversationId: string;
  /** dNFT this conversation belonged to */
  readonly nftId: string;
  /** Display title (visible even when sealed) */
  readonly title: string;
  /** The sealing policy applied at seal time */
  readonly sealingPolicy: ConversationSealingPolicy;
  /** Wallet that was the owner when sealing occurred */
  readonly sealedByWallet: string;
  /** Timestamp when the conversation was sealed */
  readonly sealedAt: string;
  /**
   * Access policy for the previous owner.
   * Determines whether and how the previous owner can access
   * the sealed conversation content.
   */
  readonly accessPolicy: AccessPolicy;
  /** Number of messages in the sealed conversation (metadata only) */
  readonly messageCount: number;
}
