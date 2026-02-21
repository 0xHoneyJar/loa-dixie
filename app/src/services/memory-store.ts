import type { FinnClient } from '../proxy/finn-client.js';
import type { ProjectionCache } from './projection-cache.js';
import type {
  MemoryEvent,
  MemoryEventInput,
  MemoryProjection,
  EventQueryOpts,
  InjectionContext,
  SealedConversation,
  ActiveContext,
  PersonalityDrift,
} from '../types/memory.js';
import type { AccessPolicy, ConversationSealingPolicy } from '@0xhoneyjar/loa-hounfour';

export interface SealResult {
  sealed: true;
  conversationId: string;
  expiresAt?: string;
  eventId: string;
}

export interface ConversationSummary {
  conversationId: string;
  title: string;
  messageCount: number;
  sealed: boolean;
  lastMessageAt: string;
}

export interface HistoryOpts {
  limit?: number;
  cursor?: string;
  includeSealed?: boolean;
}

const DEFAULT_INJECTION_TOKEN_BUDGET = 500;

const EMPTY_PROJECTION: MemoryProjection = {
  nftId: '',
  activeContext: {
    summary: '',
    recentTopics: [],
    unresolvedQuestions: [],
    interactionCount: 0,
    lastInteraction: null,
  },
  conversationCount: 0,
  sealedConversationCount: 0,
  lastInteraction: null,
  accessPolicy: { type: 'none' } as AccessPolicy,
  personalityDrift: { formality: 0, technicality: 0, verbosity: 0, updatedAt: null },
  topicClusters: [],
  updatedAt: new Date().toISOString(),
};

/**
 * Soul Memory Store — event-sourced memory with projection caching.
 *
 * Architecture: Dixie BFF owns routing + auth + projection caching.
 * loa-finn owns the PostgreSQL persistence layer.
 * All event writes go through loa-finn's API.
 *
 * See: SDD §4.2, ADR-soul-memory-architecture.md (Option B)
 */
export class MemoryStore {
  private readonly finnClient: FinnClient;
  private readonly projectionCache: ProjectionCache<MemoryProjection> | null;

  constructor(finnClient: FinnClient, projectionCache: ProjectionCache<MemoryProjection> | null) {
    this.finnClient = finnClient;
    this.projectionCache = projectionCache;
  }

  /**
   * Append an event to the memory log via loa-finn.
   * Invalidates the projection cache on success.
   */
  async appendEvent(nftId: string, event: MemoryEventInput): Promise<MemoryEvent> {
    const result = await this.finnClient.request<MemoryEvent>('POST', `/api/memory/${nftId}/events`, {
      body: event,
    });
    await this.projectionCache?.invalidate(nftId);
    return result;
  }

  /**
   * Get events from the memory log via loa-finn.
   */
  async getEvents(nftId: string, opts: EventQueryOpts = {}): Promise<MemoryEvent[]> {
    const params = new URLSearchParams();
    if (opts.conversationId) params.set('conversationId', opts.conversationId);
    if (opts.eventTypes?.length) params.set('eventTypes', opts.eventTypes.join(','));
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.cursor) params.set('cursor', opts.cursor);
    if (opts.order) params.set('order', opts.order);

    const query = params.toString();
    const path = `/api/memory/${nftId}/events${query ? `?${query}` : ''}`;
    return this.finnClient.request<MemoryEvent[]>('GET', path);
  }

  /**
   * Get the materialized projection for an nftId.
   * Uses Redis cache-aside: cache hit < 1ms, miss fetches from loa-finn.
   */
  async getProjection(nftId: string): Promise<MemoryProjection> {
    if (this.projectionCache) {
      return this.projectionCache.getOrFetch(nftId, () => this.fetchProjection(nftId));
    }
    return this.fetchProjection(nftId);
  }

  /**
   * Invalidate the cached projection for an nftId.
   */
  async invalidateProjection(nftId: string): Promise<void> {
    await this.projectionCache?.invalidate(nftId);
  }

  /**
   * Seal a conversation — encrypts content per ConversationSealingPolicy.
   * Owner-only operation. Invalidates projection.
   */
  async sealConversation(
    nftId: string,
    conversationId: string,
    policy: ConversationSealingPolicy,
  ): Promise<SealResult> {
    const result = await this.finnClient.request<SealResult>('POST', `/api/memory/${nftId}/seal`, {
      body: { conversationId, sealingPolicy: policy },
    });
    await this.projectionCache?.invalidate(nftId);
    return result;
  }

  /**
   * Get conversation history (paginated summaries).
   */
  async getConversationHistory(nftId: string, opts: HistoryOpts = {}): Promise<ConversationSummary[]> {
    const params = new URLSearchParams();
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.cursor) params.set('cursor', opts.cursor);
    if (opts.includeSealed !== undefined) params.set('includeSealed', String(opts.includeSealed));

    const query = params.toString();
    const path = `/api/memory/${nftId}/history${query ? `?${query}` : ''}`;
    return this.finnClient.request<ConversationSummary[]>('GET', path);
  }

  /**
   * Delete a conversation (soft delete via event log).
   * Owner-only operation. Invalidates projection.
   */
  async deleteConversation(nftId: string, conversationId: string): Promise<void> {
    await this.finnClient.request<void>('DELETE', `/api/memory/${nftId}/${conversationId}`);
    await this.projectionCache?.invalidate(nftId);
  }

  /**
   * Construct the injection context for LLM prompt enrichment.
   * This is the token-bounded payload that the memory-context middleware
   * attaches to the request before proxying to loa-finn.
   */
  async getInjectionContext(nftId: string, ownerWallet: string): Promise<InjectionContext> {
    const projection = await this.getProjection(nftId);

    return {
      nftId,
      ownerWallet,
      memorySummary: projection.activeContext.summary,
      recentTopics: projection.activeContext.recentTopics,
      unresolvedQuestions: projection.activeContext.unresolvedQuestions,
      personalityHints: projection.personalityDrift,
      tokenBudget: DEFAULT_INJECTION_TOKEN_BUDGET,
    };
  }

  private async fetchProjection(nftId: string): Promise<MemoryProjection> {
    try {
      return await this.finnClient.request<MemoryProjection>('GET', `/api/memory/${nftId}/projection`);
    } catch {
      // If loa-finn memory API is unavailable, return empty projection
      // This matches SDD §14.1: loa-finn Memory API down → chat works without memory context
      return { ...EMPTY_PROJECTION, nftId };
    }
  }
}
