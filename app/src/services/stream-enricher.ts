/**
 * Stream Enricher — Phase 2
 *
 * Intercepts loa-finn's streaming response and enriches it with Phase 2 metadata
 * before forwarding to the client. Makes the agent's reasoning process visible.
 *
 * Enrichment logic (per SDD §4.4):
 * 1. PASS THROUGH: chunk, tool_call, tool_result, usage, knowledge, error
 * 2. INJECT BEFORE first chunk: model_selection, memory_inject, personality
 * 3. INJECT AFTER 'done': economic (computed from usage + model pricing)
 * 4. EMIT to NATS: InteractionSignal with accumulated metadata
 *
 * See: SDD §4.4, §6.3
 */

import type {
  StreamEvent,
  UsageEvent,
  KnowledgeEvent,
  ToolCallEvent,
  ToolResultEvent,
  DoneEvent,
  TokenBreakdown,
} from '../types/stream-events.js';
import type { InteractionSignal } from '../types/economic.js';
import { computeCost } from '../types/economic.js';
import type { SignalEmitter } from './signal-emitter.js';
import type { InjectionContext } from '../types/memory.js';

export interface EnrichmentContext {
  readonly nftId?: string;
  readonly wallet?: string;
  readonly sessionId: string;
  readonly model?: string;
  readonly pool?: string;
  readonly memoryContext?: InjectionContext;
  readonly beauvoirActive?: boolean;
  readonly beauvoirTraits?: string[];
}

/**
 * Enrich a stream of events from loa-finn with Phase 2 metadata.
 *
 * Returns a new ReadableStream that:
 * - Passes through all Phase 1 events unchanged
 * - Injects Phase 2 metadata events at appropriate positions
 * - Computes economic metadata after stream completion
 * - Emits an InteractionSignal to NATS (async, non-blocking)
 */
export function enrichStream(
  upstreamEvents: StreamEvent[],
  context: EnrichmentContext,
  signalEmitter: SignalEmitter | null,
): StreamEvent[] {
  const enriched: StreamEvent[] = [];
  let firstChunkSeen = false;
  let usageData: UsageEvent | null = null;
  let knowledgeData: KnowledgeEvent | null = null;
  const toolsUsed: string[] = [];
  let doneEvent: DoneEvent | null = null;
  const startTime = Date.now();

  for (const event of upstreamEvents) {
    // Accumulate metadata from pass-through events
    if (event.type === 'usage') {
      usageData = event;
    }
    if (event.type === 'knowledge') {
      knowledgeData = event;
    }
    if (event.type === 'tool_call') {
      toolsUsed.push((event as ToolCallEvent).name);
    }

    // INJECT BEFORE first chunk: model_selection, memory_inject, personality
    if (event.type === 'chunk' && !firstChunkSeen) {
      firstChunkSeen = true;

      // Model selection (if known)
      if (context.model) {
        enriched.push({
          type: 'model_selection',
          model: context.model,
          pool: context.pool ?? 'default',
          reason: 'tier_assignment',
        });
      }

      // Memory injection info (if memory context available)
      if (context.memoryContext) {
        enriched.push({
          type: 'memory_inject',
          context_tokens: context.memoryContext.tokenBudget,
          topics: [...context.memoryContext.recentTopics],
        });
      }

      // Personality (if BEAUVOIR active)
      if (context.beauvoirActive !== undefined) {
        enriched.push({
          type: 'personality',
          beauvoir_active: context.beauvoirActive,
          traits: context.beauvoirTraits ?? [],
        });
      }
    }

    // Pass through the original event
    enriched.push(event);

    // Capture done event for post-stream processing
    if (event.type === 'done') {
      doneEvent = event;
    }
  }

  // INJECT AFTER 'done': economic metadata
  if (doneEvent && usageData) {
    const model = context.model ?? 'unknown';
    const promptTokens = usageData.prompt_tokens;
    const completionTokens = usageData.completion_tokens;
    const knowledgeTokens = knowledgeData?.tokens_used ?? 0;
    const memoryTokens = context.memoryContext?.tokenBudget ?? 0;

    const tokens: TokenBreakdown = {
      prompt: promptTokens,
      completion: completionTokens,
      memory_context: memoryTokens,
      knowledge: knowledgeTokens,
      total: promptTokens + completionTokens,
    };

    const costMicroUsd = computeCost(model, promptTokens, completionTokens);

    enriched.push({
      type: 'economic',
      cost_micro_usd: costMicroUsd,
      model,
      tokens,
    });

    // EMIT to NATS: InteractionSignal (async, non-blocking)
    if (signalEmitter) {
      const signal: InteractionSignal = {
        nftId: context.nftId ?? '',
        wallet: context.wallet ?? '',
        sessionId: context.sessionId,
        messageId: doneEvent.messageId,
        model,
        tokens,
        cost_micro_usd: costMicroUsd,
        topics: context.memoryContext?.recentTopics ? [...context.memoryContext.recentTopics] : [],
        knowledgeSources: knowledgeData?.sources_used ?? [],
        toolsUsed,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

      // Fire-and-forget — never blocks the response
      signalEmitter.publish('dixie.signal.interaction', signal as unknown as Record<string, unknown>).catch(() => {});
    }
  }

  return enriched;
}

/**
 * Parse a line of Server-Sent Events (SSE) data into a StreamEvent.
 * Returns null for non-data lines (comments, empty lines).
 */
export function parseSSEEvent(line: string): StreamEvent | null {
  if (!line.startsWith('data: ')) return null;
  const json = line.slice(6).trim();
  if (!json || json === '[DONE]') return null;
  try {
    return JSON.parse(json) as StreamEvent;
  } catch {
    return null;
  }
}

/**
 * Serialize a StreamEvent to SSE format.
 */
export function serializeSSEEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
