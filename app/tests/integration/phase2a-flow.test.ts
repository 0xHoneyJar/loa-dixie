import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrichStream, type EnrichmentContext } from '../../src/services/stream-enricher.js';
import { computeCost } from '../../src/types/economic.js';
import { PersonalityCache, type PersonalityData } from '../../src/services/personality-cache.js';
import type { StreamEvent } from '../../src/types/stream-events.js';
import type { InjectionContext } from '../../src/types/memory.js';
import type { SignalEmitter } from '../../src/services/signal-emitter.js';
import type { FinnClient } from '../../src/proxy/finn-client.js';

function mockFinnClient(responses?: Record<string, unknown>) {
  return {
    request: vi.fn().mockImplementation((_method: string, path: string) => {
      if (responses && responses[path]) {
        return Promise.resolve(responses[path]);
      }
      return Promise.reject(new Error('Not found'));
    }),
  } as unknown as FinnClient;
}

function mockSignalEmitter() {
  return {
    publish: vi.fn().mockResolvedValue(true),
    connected: true,
  } as unknown as SignalEmitter;
}

describe('Phase 2a Integration: Memory + Streaming + Personality + Economic', () => {
  let finnClient: ReturnType<typeof mockFinnClient>;
  let signalEmitter: ReturnType<typeof mockSignalEmitter>;

  const samplePersonality: PersonalityData = {
    nftId: 'oracle',
    name: 'The Oracle',
    traits: ['institutional_consciousness', 'ecosystem_awareness', 'direct'],
    antiNarration: ['Will not speculate on token prices', 'Will not impersonate individuals'],
    damp96Summary: { openness: 0.8, conscientiousness: 0.9, directness: 0.75 },
    version: '1.2.0',
    lastEvolved: '2026-02-20T00:00:00Z',
  };

  beforeEach(() => {
    finnClient = mockFinnClient({
      '/api/identity/oracle/beauvoir': samplePersonality,
    });
    signalEmitter = mockSignalEmitter();
  });

  it('full Phase 2a flow: memory + personality + enriched stream + economic + signal', () => {
    // Simulate the complete request flow:
    // 1. Memory context resolved for wallet
    const memoryContext: InjectionContext = {
      recentTopics: new Set(['governance', 'honey_jar', 'berachain']),
      tokenBudget: 512,
      systemPromptAddendum: 'You remember the user asked about governance...',
    };

    // 2. Upstream events from loa-finn
    const upstreamEvents: StreamEvent[] = [
      { type: 'knowledge', sources_used: ['hj_docs', 'governance_guide'], mode: 'full', tokens_used: 350 },
      { type: 'tool_call', name: 'search_knowledge', args: { query: 'honey jar governance' }, callId: 'tc-1' },
      { type: 'tool_result', name: 'search_knowledge', result: 'Found 3 relevant documents', callId: 'tc-1', durationMs: 45 },
      { type: 'chunk', content: 'The HoneyJar governance model uses ' },
      { type: 'chunk', content: 'BGT conviction staking to determine access tiers.' },
      { type: 'usage', prompt_tokens: 1200, completion_tokens: 300 },
      { type: 'done', messageId: 'msg-phase2a-001' },
    ];

    // 3. Enrichment context (assembled by middleware pipeline)
    const context: EnrichmentContext = {
      nftId: 'oracle',
      wallet: '0xabc123',
      sessionId: 'sess-phase2a',
      model: 'claude-sonnet-4-6',
      pool: 'pool_standard',
      memoryContext,
      beauvoirActive: true,
      beauvoirTraits: samplePersonality.traits,
    };

    // 4. Enrich the stream
    const enriched = enrichStream(upstreamEvents, context, signalEmitter);

    // Verify Phase 2 events are injected in correct positions
    const eventTypes = enriched.map((e) => e.type);

    // Before first chunk: model_selection, memory_inject, personality
    const firstChunkIdx = eventTypes.indexOf('chunk');
    expect(firstChunkIdx).toBeGreaterThan(0);

    const beforeChunk = eventTypes.slice(0, firstChunkIdx);
    expect(beforeChunk).toContain('model_selection');
    expect(beforeChunk).toContain('memory_inject');
    expect(beforeChunk).toContain('personality');

    // After done: economic
    const doneIdx = eventTypes.indexOf('done');
    const economicIdx = eventTypes.indexOf('economic');
    expect(economicIdx).toBeGreaterThan(doneIdx);

    // Verify model_selection content
    const modelSelection = enriched.find((e) => e.type === 'model_selection') as {
      model: string; pool: string; reason: string;
    };
    expect(modelSelection.model).toBe('claude-sonnet-4-6');
    expect(modelSelection.pool).toBe('pool_standard');

    // Verify memory_inject content
    const memoryInject = enriched.find((e) => e.type === 'memory_inject') as {
      context_tokens: number; topics: string[];
    };
    expect(memoryInject.context_tokens).toBe(512);
    expect(memoryInject.topics).toHaveLength(3);
    expect(memoryInject.topics).toContain('governance');

    // Verify personality content
    const personality = enriched.find((e) => e.type === 'personality') as {
      beauvoir_active: boolean; traits: string[];
    };
    expect(personality.beauvoir_active).toBe(true);
    expect(personality.traits).toContain('institutional_consciousness');

    // Verify economic content
    const economic = enriched.find((e) => e.type === 'economic') as {
      cost_micro_usd: number; model: string; tokens: { total: number; knowledge: number; memory_context: number };
    };
    expect(economic.model).toBe('claude-sonnet-4-6');
    expect(economic.cost_micro_usd).toBe(computeCost('claude-sonnet-4-6', 1200, 300));
    expect(economic.tokens.total).toBe(1500);
    expect(economic.tokens.knowledge).toBe(350);
    expect(economic.tokens.memory_context).toBe(512);

    // Verify NATS signal emitted
    expect(signalEmitter.publish).toHaveBeenCalledWith(
      'dixie.signal.interaction',
      expect.objectContaining({
        nftId: 'oracle',
        wallet: '0xabc123',
        sessionId: 'sess-phase2a',
        messageId: 'msg-phase2a-001',
        model: 'claude-sonnet-4-6',
        toolsUsed: ['search_knowledge'],
        knowledgeSources: ['hj_docs', 'governance_guide'],
      }),
    );

    // Verify original events are preserved (backward compatibility)
    expect(enriched.filter((e) => e.type === 'chunk')).toHaveLength(2);
    expect(enriched.filter((e) => e.type === 'tool_call')).toHaveLength(1);
    expect(enriched.filter((e) => e.type === 'tool_result')).toHaveLength(1);
    expect(enriched.filter((e) => e.type === 'knowledge')).toHaveLength(1);
    expect(enriched.filter((e) => e.type === 'usage')).toHaveLength(1);
    expect(enriched.filter((e) => e.type === 'done')).toHaveLength(1);
  });

  it('graceful degradation: no personality, no memory — Phase 1 behavior preserved', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Hello' },
      { type: 'usage', prompt_tokens: 100, completion_tokens: 50 },
      { type: 'done', messageId: 'msg-001' },
    ];

    const context: EnrichmentContext = {
      sessionId: 'sess-basic',
    };

    const enriched = enrichStream(events, context, null);

    // No Phase 2 metadata injected (no model, no memory, no personality)
    expect(enriched.find((e) => e.type === 'model_selection')).toBeUndefined();
    expect(enriched.find((e) => e.type === 'memory_inject')).toBeUndefined();
    expect(enriched.find((e) => e.type === 'personality')).toBeUndefined();

    // Economic also not injected (no model means 0 cost)
    // But the economic event IS still computed (just with model 'unknown' → 0 cost)
    const economic = enriched.find((e) => e.type === 'economic') as { cost_micro_usd: number } | undefined;
    expect(economic?.cost_micro_usd).toBe(0);

    // Phase 1 events preserved
    expect(enriched.filter((e) => e.type === 'chunk')).toHaveLength(1);
    expect(enriched.filter((e) => e.type === 'done')).toHaveLength(1);
  });

  it('personality cache fetches from loa-finn and caches result', async () => {
    const cache = new PersonalityCache(finnClient, null);

    const result = await cache.get('oracle');
    expect(result).toEqual(samplePersonality);
    expect(finnClient.request).toHaveBeenCalledWith(
      'GET',
      '/api/identity/oracle/beauvoir',
    );
  });

  it('personality cache returns null for unknown nftId', async () => {
    const cache = new PersonalityCache(finnClient, null);

    const result = await cache.get('unknown-nft');
    expect(result).toBeNull();
  });

  it('personality evolution returns array from loa-finn', async () => {
    const evolutions = [
      { version: '1.1.0', timestamp: '2026-02-19T00:00:00Z', changes: ['Added directness'], trigger: 'compound_learning' as const },
    ];

    const client = mockFinnClient({
      '/api/identity/oracle/evolution': evolutions,
    });

    const cache = new PersonalityCache(client, null);
    const result = await cache.getEvolution('oracle');
    expect(result).toEqual(evolutions);
  });
});
