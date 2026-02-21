import { describe, it, expect, vi } from 'vitest';
import { enrichStream, parseSSEEvent, serializeSSEEvent } from '../../src/services/stream-enricher.js';
import type { StreamEvent } from '../../src/types/stream-events.js';
import type { EnrichmentContext } from '../../src/services/stream-enricher.js';
import type { SignalEmitter } from '../../src/services/signal-emitter.js';
import type { InjectionContext } from '../../src/types/memory.js';

function mockSignalEmitter(publishFn?: (...args: unknown[]) => Promise<boolean>) {
  return {
    publish: publishFn ?? vi.fn().mockResolvedValue(true),
  } as unknown as SignalEmitter;
}

function baseContext(overrides?: Partial<EnrichmentContext>): EnrichmentContext {
  return {
    sessionId: 'sess-001',
    wallet: '0xabc',
    nftId: 'nft-123',
    model: 'claude-sonnet-4-6',
    pool: 'default',
    ...overrides,
  };
}

describe('enrichStream', () => {
  it('passes through Phase 1 events unchanged when no Phase 2 metadata', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Hello' },
      { type: 'done', messageId: 'msg-1' },
    ];

    const result = enrichStream(events, { sessionId: 'sess-001' }, null);

    // Should have: model_selection (before first chunk) + chunk + done
    // model not set → no model_selection injected
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: 'chunk', content: 'Hello' });
    expect(result[1]).toEqual({ type: 'done', messageId: 'msg-1' });
  });

  it('injects model_selection before first chunk when model is set', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Hi' },
      { type: 'done', messageId: 'msg-1' },
    ];

    const result = enrichStream(events, baseContext(), null);

    expect(result[0]).toEqual({
      type: 'model_selection',
      model: 'claude-sonnet-4-6',
      pool: 'default',
      reason: 'tier_assignment',
    });
    expect(result[1]).toEqual({ type: 'chunk', content: 'Hi' });
  });

  it('injects memory_inject before first chunk when memoryContext is set', () => {
    const memoryContext: InjectionContext = {
      recentTopics: new Set(['governance', 'bears']),
      tokenBudget: 512,
      systemPromptAddendum: 'You remember...',
    };

    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Hello' },
      { type: 'done', messageId: 'msg-1' },
    ];

    const result = enrichStream(
      events,
      baseContext({ memoryContext }),
      null,
    );

    const memoryInject = result.find((e) => e.type === 'memory_inject');
    expect(memoryInject).toBeDefined();
    expect(memoryInject).toMatchObject({
      type: 'memory_inject',
      context_tokens: 512,
      topics: expect.arrayContaining(['governance', 'bears']),
    });
  });

  it('injects personality before first chunk when beauvoirActive is set', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Greetings' },
      { type: 'done', messageId: 'msg-1' },
    ];

    const result = enrichStream(
      events,
      baseContext({ beauvoirActive: true, beauvoirTraits: ['curious', 'direct'] }),
      null,
    );

    const personality = result.find((e) => e.type === 'personality');
    expect(personality).toEqual({
      type: 'personality',
      beauvoir_active: true,
      traits: ['curious', 'direct'],
    });
  });

  it('only injects Phase 2 events before the first chunk, not subsequent chunks', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Hello' },
      { type: 'chunk', content: ' world' },
      { type: 'done', messageId: 'msg-1' },
    ];

    const result = enrichStream(events, baseContext(), null);

    // model_selection + first chunk + second chunk + done = 4
    expect(result).toHaveLength(4);
    expect(result[0].type).toBe('model_selection');
    expect(result[1].type).toBe('chunk');
    expect(result[2].type).toBe('chunk');
    expect(result[3].type).toBe('done');
  });

  it('injects economic metadata after done event when usage is available', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Answer' },
      { type: 'usage', prompt_tokens: 100, completion_tokens: 50 },
      { type: 'done', messageId: 'msg-1' },
    ];

    const result = enrichStream(events, baseContext(), null);

    const economic = result.find((e) => e.type === 'economic');
    expect(economic).toBeDefined();
    expect(economic).toMatchObject({
      type: 'economic',
      model: 'claude-sonnet-4-6',
      cost_micro_usd: expect.any(Number),
      tokens: {
        prompt: 100,
        completion: 50,
        memory_context: 0,
        knowledge: 0,
        total: 150,
      },
    });
  });

  it('computes correct cost for known model', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'x' },
      { type: 'usage', prompt_tokens: 1000, completion_tokens: 500 },
      { type: 'done', messageId: 'msg-1' },
    ];

    const result = enrichStream(events, baseContext(), null);
    const economic = result.find((e) => e.type === 'economic') as { cost_micro_usd: number } | undefined;

    // claude-sonnet-4-6: input 3000/1K + output 15000/1K
    // 1000 tokens input = 3000 micro-usd
    // 500 tokens output = ceil(500/1000 * 15000) = ceil(7500) = 7500
    // Total = 10500
    expect(economic?.cost_micro_usd).toBe(10500);
  });

  it('does not inject economic when no usage event', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'x' },
      { type: 'done', messageId: 'msg-1' },
    ];

    const result = enrichStream(events, baseContext(), null);
    expect(result.find((e) => e.type === 'economic')).toBeUndefined();
  });

  it('includes knowledge tokens in breakdown when knowledge event present', () => {
    const events: StreamEvent[] = [
      { type: 'knowledge', sources_used: ['kb1'], mode: 'full', tokens_used: 200 },
      { type: 'chunk', content: 'Answer' },
      { type: 'usage', prompt_tokens: 500, completion_tokens: 100 },
      { type: 'done', messageId: 'msg-1' },
    ];

    const result = enrichStream(events, baseContext(), null);
    const economic = result.find((e) => e.type === 'economic') as { tokens: { knowledge: number } } | undefined;
    expect(economic?.tokens.knowledge).toBe(200);
  });

  it('accumulates tool_call names in signal', () => {
    const publishFn = vi.fn().mockResolvedValue(true);
    const emitter = mockSignalEmitter(publishFn);

    const events: StreamEvent[] = [
      { type: 'tool_call', name: 'search', args: { q: 'test' }, callId: 'c1' },
      { type: 'tool_result', name: 'search', result: '...', callId: 'c1', durationMs: 100 },
      { type: 'tool_call', name: 'lookup', args: { id: '1' }, callId: 'c2' },
      { type: 'tool_result', name: 'lookup', result: '...', callId: 'c2', durationMs: 50 },
      { type: 'chunk', content: 'Here is the answer' },
      { type: 'usage', prompt_tokens: 200, completion_tokens: 100 },
      { type: 'done', messageId: 'msg-1' },
    ];

    enrichStream(events, baseContext(), emitter);

    expect(publishFn).toHaveBeenCalledOnce();
    const signal = publishFn.mock.calls[0][1] as { toolsUsed: string[] };
    expect(signal.toolsUsed).toEqual(['search', 'lookup']);
  });

  it('emits InteractionSignal to NATS after done+usage', () => {
    const publishFn = vi.fn().mockResolvedValue(true);
    const emitter = mockSignalEmitter(publishFn);

    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Hello' },
      { type: 'usage', prompt_tokens: 100, completion_tokens: 50 },
      { type: 'done', messageId: 'msg-1' },
    ];

    enrichStream(events, baseContext(), emitter);

    expect(publishFn).toHaveBeenCalledWith(
      'dixie.signal.interaction',
      expect.objectContaining({
        nftId: 'nft-123',
        wallet: '0xabc',
        sessionId: 'sess-001',
        messageId: 'msg-1',
        model: 'claude-sonnet-4-6',
        cost_micro_usd: expect.any(Number),
        timestamp: expect.any(String),
      }),
    );
  });

  it('does not emit signal when no signalEmitter', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'x' },
      { type: 'usage', prompt_tokens: 10, completion_tokens: 5 },
      { type: 'done', messageId: 'msg-1' },
    ];

    // Should not throw
    const result = enrichStream(events, baseContext(), null);
    expect(result.find((e) => e.type === 'economic')).toBeDefined();
  });

  it('does not emit signal when no usage event (no cost to report)', () => {
    const publishFn = vi.fn().mockResolvedValue(true);
    const emitter = mockSignalEmitter(publishFn);

    const events: StreamEvent[] = [
      { type: 'chunk', content: 'x' },
      { type: 'done', messageId: 'msg-1' },
    ];

    enrichStream(events, baseContext(), emitter);
    expect(publishFn).not.toHaveBeenCalled();
  });

  it('handles empty event array gracefully', () => {
    const result = enrichStream([], baseContext(), null);
    expect(result).toEqual([]);
  });

  it('handles error events without crashing', () => {
    const events: StreamEvent[] = [
      { type: 'error', code: 'upstream_error', message: 'Server error' },
    ];

    const result = enrichStream(events, baseContext(), null);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('error');
  });
});

describe('parseSSEEvent', () => {
  it('parses valid SSE data line', () => {
    const event = parseSSEEvent('data: {"type":"chunk","content":"Hello"}');
    expect(event).toEqual({ type: 'chunk', content: 'Hello' });
  });

  it('returns null for non-data lines', () => {
    expect(parseSSEEvent('')).toBeNull();
    expect(parseSSEEvent(': comment')).toBeNull();
    expect(parseSSEEvent('event: chunk')).toBeNull();
  });

  it('returns null for [DONE] sentinel', () => {
    expect(parseSSEEvent('data: [DONE]')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseSSEEvent('data: {invalid}')).toBeNull();
  });

  it('handles whitespace around JSON', () => {
    const event = parseSSEEvent('data:  {"type":"done","messageId":"m1"}  ');
    expect(event).toEqual({ type: 'done', messageId: 'm1' });
  });
});

describe('serializeSSEEvent', () => {
  it('serializes event to SSE format', () => {
    const result = serializeSSEEvent({ type: 'chunk', content: 'Hi' });
    expect(result).toBe('data: {"type":"chunk","content":"Hi"}\n\n');
  });

  it('produces valid SSE that parseSSEEvent can read', () => {
    const original: StreamEvent = { type: 'done', messageId: 'msg-1' };
    const serialized = serializeSSEEvent(original);
    const line = serialized.split('\n')[0];
    const parsed = parseSSEEvent(line);
    expect(parsed).toEqual(original);
  });
});
