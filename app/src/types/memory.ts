/**
 * Soul Memory Type Definitions — Phase 2
 *
 * Extended from Sprint 17 (cycle-001) type stubs to full event-sourced types.
 * These types define the complete data model for soul memory:
 * - MemoryEvent: append-only event log entries
 * - MemoryProjection: materialized view for fast context injection
 * - InjectionContext: token-bounded prompt injection payload
 * - Governance types: sealing, transfer, policy changes
 *
 * Architecture: Event-Sourced Memory with append-only log.
 * See: SDD §4.2, §5.2.3, ADR-soul-memory-architecture.md (Option B)
 */

import type {
  AccessPolicy,
  ConversationSealingPolicy,
} from '@0xhoneyjar/loa-hounfour';

// Re-export governance types for memory consumers
export type { AccessPolicy, ConversationSealingPolicy };

// ─── Event Types ───────────────────────────────────────────────

/**
 * All possible event types in the memory log.
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
 *
 * Extended events (Phase 2):
 * - schedule_create: NL schedule registered
 * - schedule_fire: Scheduled action executed
 * - personality_evolution: BEAUVOIR personality drift detected
 */
export type MemoryEventType =
  | 'message'
  | 'tool_use'
  | 'context_inject'
  | 'seal'
  | 'unseal'
  | 'transfer'
  | 'policy_change'
  | 'delete'
  | 'schedule_create'
  | 'schedule_fire'
  | 'personality_evolution';

/**
 * MemoryEvent — a single event in the append-only memory log.
 *
 * Events are immutable once written. The event log IS the audit trail.
 * Governance actions (seal, transfer, policy_change) are first-class events.
 *
 * Replaces the Sprint 17 MemoryEntry type with full SDD §5.2.3 alignment.
 */
export interface MemoryEvent {
  readonly id: string;
  readonly nftId: string;
  readonly conversationId: string;
  readonly eventType: MemoryEventType;
  readonly payload: Record<string, unknown>;
  readonly encryptionState: 'plaintext' | 'sealed';
  readonly sealingPolicy?: ConversationSealingPolicy;
  readonly actorWallet: string;
  readonly createdAt: string;
}

/**
 * Input for creating a new memory event (before server assigns id + createdAt).
 */
export interface MemoryEventInput {
  readonly nftId: string;
  readonly conversationId: string;
  readonly eventType: MemoryEventType;
  readonly payload: Record<string, unknown>;
  readonly actorWallet: string;
}

/**
 * Query options for fetching memory events.
 */
export interface EventQueryOpts {
  readonly conversationId?: string;
  readonly eventTypes?: MemoryEventType[];
  readonly limit?: number;
  readonly cursor?: string;
  readonly order?: 'asc' | 'desc';
}

// ─── Projection Types ──────────────────────────────────────────

/**
 * MemoryProjection — materialized view of the event log.
 *
 * Optimized for fast context injection into LLM prompts.
 * Cached in Redis (memory:projection:{nftId}, TTL 5min).
 * Invalidated on new events or governance changes.
 *
 * See: SDD §5.2.3, §5.3 Redis Schema
 */
export interface MemoryProjection {
  readonly nftId: string;
  readonly activeContext: ActiveContext;
  readonly conversationCount: number;
  readonly sealedConversationCount: number;
  readonly lastInteraction: string | null;
  readonly accessPolicy: AccessPolicy;
  readonly personalityDrift: PersonalityDrift;
  readonly topicClusters: readonly string[];
  readonly updatedAt: string;
}

/**
 * ActiveContext — the compressed memory representation
 * injected into the LLM system prompt.
 *
 * Generated from the event log projection, not stored verbatim.
 * Token-bounded to prevent context window bloat (default ~500 tokens).
 */
export interface ActiveContext {
  readonly summary: string;
  readonly recentTopics: readonly string[];
  readonly unresolvedQuestions: readonly string[];
  readonly interactionCount: number;
  readonly lastInteraction: string | null;
}

/**
 * PersonalityDrift — tracks how BEAUVOIR personality evolves
 * based on interaction patterns.
 */
export interface PersonalityDrift {
  readonly formality: number;       // -1 (casual) to +1 (formal)
  readonly technicality: number;    // -1 (simple) to +1 (technical)
  readonly verbosity: number;       // -1 (terse) to +1 (verbose)
  readonly updatedAt: string | null;
}

// ─── Injection Context ─────────────────────────────────────────

/**
 * InjectionContext — the payload injected into the LLM prompt
 * by the memory-context middleware.
 *
 * Composed from the projection + current session state.
 * The middleware attaches this to the request context before proxying to loa-finn.
 *
 * See: SDD §4.2, middleware position 13
 */
export interface InjectionContext {
  readonly nftId: string;
  readonly ownerWallet: string;
  readonly memorySummary: string;
  readonly recentTopics: readonly string[];
  readonly unresolvedQuestions: readonly string[];
  readonly personalityHints: PersonalityDrift;
  readonly convictionTier?: string;
  readonly tokenBudget: number;
}

// ─── Sealed Conversation ───────────────────────────────────────

/**
 * SealedConversation — a conversation whose content has been
 * encrypted per ConversationSealingPolicy.
 *
 * Created during NFT transfer or manual owner request.
 */
export interface SealedConversation {
  readonly conversationId: string;
  readonly nftId: string;
  readonly title: string;
  readonly sealingPolicy: ConversationSealingPolicy;
  readonly sealedByWallet: string;
  readonly sealedAt: string;
  readonly accessPolicy: AccessPolicy;
  readonly messageCount: number;
}

// ─── Soul Memory (Aggregate Root) ──────────────────────────────

/**
 * SoulMemory — the complete memory state for a dNFT agent.
 *
 * Represents the projection (materialized view) of the event log,
 * optimized for fast context injection into LLM prompts.
 * NFT-scoped: one SoulMemory per dNFT, owned by current holder.
 */
export interface SoulMemory {
  readonly nftId: string;
  readonly owner: string;
  readonly activeContext: ActiveContext;
  readonly conversationCount: number;
  readonly sealedConversationCount: number;
  readonly accessPolicy: AccessPolicy;
  readonly lastInteraction: string;
}

// ─── Legacy Compatibility ──────────────────────────────────────

/**
 * ConversationContext — preserved for backward compatibility.
 * New code should use ActiveContext instead.
 */
export interface ConversationContext {
  readonly summary: string;
  readonly keyTopics: readonly string[];
  readonly interactionCount: number;
  readonly lastInteraction: string;
}

/**
 * MemoryEntry — Sprint 17 alias. Use MemoryEvent for new code.
 */
export type MemoryEntry = MemoryEvent;
