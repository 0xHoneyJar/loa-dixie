/**
 * Extended StreamEvent Protocol — Phase 2
 *
 * Defines the complete set of events flowing through the WebSocket stream.
 * Phase 1 events are preserved; Phase 2 adds 6 new event types for
 * tool visibility, economic metadata, personality, and memory context.
 *
 * Backward compatibility: Phase 1 clients that ignore unknown event types
 * continue to work unchanged (SDD §6.3).
 *
 * See: SDD §4.4, §6.3
 */

// Protocol stream types — Hounfour v7.9.2
// Dixie's BFF-specific stream events supplement these protocol types.
// See: SDD v3.0.0 §3.6
export type {
  StreamStartSchema as HfStreamStartSchema,
  StreamChunkSchema as HfStreamChunkSchema,
  StreamToolCallSchema as HfStreamToolCallSchema,
  StreamUsageSchema as HfStreamUsageSchema,
  StreamEndSchema as HfStreamEndSchema,
  StreamErrorSchema as HfStreamErrorSchema,
} from '@0xhoneyjar/loa-hounfour/core';

// ─── Source Selection ─────────────────────────────────────────

export interface SourceSelection {
  readonly name: string;
  readonly type: 'knowledge_base' | 'tool' | 'memory' | 'web';
  readonly relevance: number; // 0-1
  readonly tokensUsed?: number;
}

// ─── Phase 1 Events (preserved) ──────────────────────────────

export interface ChunkEvent {
  readonly type: 'chunk';
  readonly content: string;
}

export interface ToolCallEvent {
  readonly type: 'tool_call';
  readonly name: string;
  readonly args: Record<string, unknown>;
  readonly callId: string;
}

export interface ToolResultEvent {
  readonly type: 'tool_result';
  readonly name: string;
  readonly result: string;
  readonly callId: string;
  readonly durationMs: number;
}

export interface UsageEvent {
  readonly type: 'usage';
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
}

export interface KnowledgeEvent {
  readonly type: 'knowledge';
  readonly sources_used: string[];
  readonly mode: string;
  readonly tokens_used: number;
}

export interface DoneEvent {
  readonly type: 'done';
  readonly messageId: string;
}

export interface ErrorEvent {
  readonly type: 'error';
  readonly code: string;
  readonly message: string;
}

// ─── Phase 2 Events (new) ────────────────────────────────────

export interface ReasoningTraceEvent {
  readonly type: 'reasoning_trace';
  readonly step: number;
  readonly thought: string;
}

export interface SourceSelectionEvent {
  readonly type: 'source_selection';
  readonly sources: SourceSelection[];
  readonly classification: string[];
}

export interface ModelSelectionEvent {
  readonly type: 'model_selection';
  readonly model: string;
  readonly pool: string;
  readonly reason: string;
}

export interface EconomicEvent {
  readonly type: 'economic';
  readonly cost_micro_usd: number;
  readonly model: string;
  readonly tokens: TokenBreakdown;
  readonly incomplete?: boolean;
}

export interface PersonalityEvent {
  readonly type: 'personality';
  readonly beauvoir_active: boolean;
  readonly traits: string[];
}

export interface MemoryInjectEvent {
  readonly type: 'memory_inject';
  readonly context_tokens: number;
  readonly topics: string[];
}

// ─── Token Breakdown ─────────────────────────────────────────

export interface TokenBreakdown {
  readonly prompt: number;
  readonly completion: number;
  readonly memory_context: number;
  readonly knowledge: number;
  readonly total: number;
}

// ─── Union Type ──────────────────────────────────────────────

/** All possible stream events (Phase 1 + Phase 2) */
export type StreamEvent =
  // Phase 1
  | ChunkEvent
  | ToolCallEvent
  | ToolResultEvent
  | UsageEvent
  | KnowledgeEvent
  | DoneEvent
  | ErrorEvent
  // Phase 2
  | ReasoningTraceEvent
  | SourceSelectionEvent
  | ModelSelectionEvent
  | EconomicEvent
  | PersonalityEvent
  | MemoryInjectEvent;

/** Phase 2 event types only */
export type Phase2StreamEvent =
  | ReasoningTraceEvent
  | SourceSelectionEvent
  | ModelSelectionEvent
  | EconomicEvent
  | PersonalityEvent
  | MemoryInjectEvent;
