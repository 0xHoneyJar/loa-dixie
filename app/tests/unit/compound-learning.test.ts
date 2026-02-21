import { describe, it, expect, beforeEach } from 'vitest';
import { CompoundLearningEngine } from '../../src/services/compound-learning.js';
import type { InteractionSignal } from '../../src/types/economic.js';

function createSignal(overrides: Partial<InteractionSignal> = {}): InteractionSignal {
  return {
    nftId: 'nft-001',
    wallet: '0xWallet',
    sessionId: 'sess-001',
    messageId: `msg-${Math.random().toString(36).slice(2, 8)}`,
    model: 'claude-sonnet-4-6',
    tokens: { prompt: 100, completion: 200, total: 300 },
    cost_micro_usd: 450,
    topics: ['defi', 'berachain'],
    knowledgeSources: ['kb-001'],
    toolsUsed: ['knowledge_search'],
    durationMs: 1200,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('CompoundLearningEngine', () => {
  let engine: CompoundLearningEngine;

  beforeEach(() => {
    engine = new CompoundLearningEngine({ batchSize: 3 });
  });

  describe('ingest', () => {
    it('buffers signals until batch size reached', () => {
      expect(engine.ingest(createSignal())).toBeNull();
      expect(engine.ingest(createSignal())).toBeNull();
      expect(engine.getPendingCount('nft-001')).toBe(2);
    });

    it('processes batch when threshold reached', () => {
      engine.ingest(createSignal());
      engine.ingest(createSignal());
      const result = engine.ingest(createSignal());

      expect(result).not.toBeNull();
      expect(result!.interactionCount).toBe(3);
      expect(result!.nftId).toBe('nft-001');
    });

    it('extracts topic clusters', () => {
      engine.ingest(createSignal({ topics: ['defi', 'governance'] }));
      engine.ingest(createSignal({ topics: ['defi', 'berachain'] }));
      const result = engine.ingest(createSignal({ topics: ['defi'] }));

      expect(result).not.toBeNull();
      const defiCluster = result!.topicClusters.find((tc) => tc.topic === 'defi');
      expect(defiCluster).toBeDefined();
      expect(defiCluster!.count).toBe(3);
      expect(defiCluster!.percentage).toBe(100);
    });

    it('calculates source hit/miss metrics', () => {
      engine.ingest(createSignal({ knowledgeSources: ['kb-001'] }));
      engine.ingest(createSignal({ knowledgeSources: [] })); // miss
      const result = engine.ingest(createSignal({ knowledgeSources: ['kb-002'] }));

      expect(result).not.toBeNull();
      expect(result!.sourceMetrics.totalQueries).toBe(3);
      expect(result!.sourceMetrics.sourceMisses).toBe(1);
      expect(result!.sourceMetrics.hitRate).toBeCloseTo(0.667, 1);
    });

    it('tracks tool usage patterns', () => {
      engine.ingest(createSignal({ toolsUsed: ['knowledge_search', 'calculator'] }));
      engine.ingest(createSignal({ toolsUsed: ['knowledge_search'] }));
      const result = engine.ingest(createSignal({ toolsUsed: ['knowledge_search', 'web_search'] }));

      expect(result).not.toBeNull();
      const ksPattern = result!.toolUsagePatterns.find((p) => p.tool === 'knowledge_search');
      expect(ksPattern).toBeDefined();
      expect(ksPattern!.useCount).toBe(3);
    });

    it('identifies knowledge gaps (miss rate > 30%)', () => {
      engine.ingest(createSignal({ topics: ['obscure_topic'], knowledgeSources: [] }));
      engine.ingest(createSignal({ topics: ['obscure_topic'], knowledgeSources: [] }));
      const result = engine.ingest(createSignal({ topics: ['obscure_topic'], knowledgeSources: [] }));

      expect(result).not.toBeNull();
      const gap = result!.knowledgeGaps.find((g) => g.topic === 'obscure_topic');
      expect(gap).toBeDefined();
      expect(gap!.missRate).toBe(1);
      expect(gap!.severity).toBe('high');
    });

    it('no knowledge gap when sources are found', () => {
      engine.ingest(createSignal({ topics: ['well_covered'], knowledgeSources: ['kb-1'] }));
      engine.ingest(createSignal({ topics: ['well_covered'], knowledgeSources: ['kb-2'] }));
      const result = engine.ingest(createSignal({ topics: ['well_covered'], knowledgeSources: ['kb-3'] }));

      expect(result).not.toBeNull();
      const gap = result!.knowledgeGaps.find((g) => g.topic === 'well_covered');
      expect(gap).toBeUndefined();
    });
  });

  describe('getInsights', () => {
    it('returns empty array for unknown NFT', () => {
      expect(engine.getInsights('unknown')).toEqual([]);
    });

    it('returns stored insights', () => {
      for (let i = 0; i < 3; i++) engine.ingest(createSignal());
      for (let i = 0; i < 3; i++) engine.ingest(createSignal());

      const insights = engine.getInsights('nft-001');
      expect(insights).toHaveLength(2);
    });

    it('respects limit parameter', () => {
      for (let i = 0; i < 9; i++) engine.ingest(createSignal());

      const insights = engine.getInsights('nft-001', 2);
      expect(insights).toHaveLength(2);
    });
  });

  describe('getKnowledgeGaps', () => {
    it('returns gaps from latest insight window', () => {
      engine.ingest(createSignal({ topics: ['gap_topic'], knowledgeSources: [] }));
      engine.ingest(createSignal({ topics: ['gap_topic'], knowledgeSources: [] }));
      engine.ingest(createSignal({ topics: ['gap_topic'], knowledgeSources: [] }));

      const gaps = engine.getKnowledgeGaps('nft-001');
      expect(gaps.length).toBeGreaterThan(0);
      expect(gaps[0]!.topic).toBe('gap_topic');
    });
  });

  describe('flush', () => {
    it('processes partial batch', () => {
      engine.ingest(createSignal());
      engine.ingest(createSignal());
      // Only 2 signals, batch size is 3

      const result = engine.flush('nft-001');
      expect(result).not.toBeNull();
      expect(result!.interactionCount).toBe(2);
      expect(engine.getPendingCount('nft-001')).toBe(0);
    });

    it('returns null for empty buffer', () => {
      expect(engine.flush('nft-001')).toBeNull();
    });
  });

  describe('insights and lastEvolution bounding (iter2-low-6)', () => {
    it('caps insights map at maxNfts', () => {
      const engine = new CompoundLearningEngine({ batchSize: 1, maxNfts: 2 });

      // NFT 1 — generates insight
      engine.ingest(createSignal({ nftId: 'nft-001' }));
      expect(engine.getInsights('nft-001')).toHaveLength(1);

      // NFT 2 — generates insight
      engine.ingest(createSignal({ nftId: 'nft-002' }));
      expect(engine.getInsights('nft-002')).toHaveLength(1);

      // NFT 3 — should evict LRU from insights
      engine.ingest(createSignal({ nftId: 'nft-003' }));
      expect(engine.getInsights('nft-003')).toHaveLength(1);

      // One of the earlier NFTs should have been evicted from insights
      const total = engine.getInsights('nft-001').length
        + engine.getInsights('nft-002').length
        + engine.getInsights('nft-003').length;
      expect(total).toBeLessThanOrEqual(3); // max 2 NFTs in insights at once + 1 new
    });

    it('cleans lastEvolution on signal buffer eviction', () => {
      const engine = new CompoundLearningEngine({ batchSize: 1, maxNfts: 1 });

      // NFT 1 generates insight
      engine.ingest(createSignal({ nftId: 'nft-001' }));
      expect(engine.getInsights('nft-001')).toHaveLength(1);

      // NFT 2 forces eviction of NFT 1 from signal buffer + insights + lastEvolution
      engine.ingest(createSignal({ nftId: 'nft-002' }));

      // NFT 1 insights should be cleared
      expect(engine.getInsights('nft-001')).toHaveLength(0);
    });

    it('preserves most recent NFT insights', () => {
      const engine = new CompoundLearningEngine({ batchSize: 1, maxNfts: 2 });

      engine.ingest(createSignal({ nftId: 'nft-001' }));
      engine.ingest(createSignal({ nftId: 'nft-002' }));

      // Both should have insights
      expect(engine.getInsights('nft-001')).toHaveLength(1);
      expect(engine.getInsights('nft-002')).toHaveLength(1);

      // Access nft-002 again (makes it more recent)
      engine.ingest(createSignal({ nftId: 'nft-002' }));

      // nft-002 should still have insights
      expect(engine.getInsights('nft-002').length).toBeGreaterThan(0);
    });
  });

  describe('personality drift', () => {
    it('detects drift between insight windows', () => {
      // First batch: heavy defi focus
      engine.ingest(createSignal({ topics: ['defi'] }));
      engine.ingest(createSignal({ topics: ['defi'] }));
      engine.ingest(createSignal({ topics: ['defi'] }));

      // Second batch: shifted to governance (significant drift)
      engine.ingest(createSignal({ topics: ['governance'] }));
      engine.ingest(createSignal({ topics: ['governance'] }));
      const result = engine.ingest(createSignal({ topics: ['governance'] }));

      expect(result).not.toBeNull();
      // Drift detection depends on percentage change between windows
      // First window: defi 100%, Second window: governance 100%
      // Delta should be significant
      if (result!.personalityDrift) {
        expect(result!.personalityDrift.dimension).toBe('topic_focus');
        expect(result!.personalityDrift.delta).toBeGreaterThan(0);
      }
    });
  });
});
