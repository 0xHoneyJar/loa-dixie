import { describe, it, expect } from 'vitest';
import { generateDisclaimer } from '../../src/services/freshness-disclaimer.js';
import type { SelfKnowledgeResponse } from '../../src/services/corpus-meta.js';

function makeSelfKnowledge(overrides: Partial<SelfKnowledgeResponse> = {}): SelfKnowledgeResponse {
  return {
    corpus_version: 3,
    last_mutation: { type: 'update', timestamp: '2026-02-22T00:00:00Z', detail: 'test' },
    freshness: { healthy: 20, stale: 0, total: 20, staleSources: [] },
    coverage: {
      repos_with_code_reality: ['loa-finn'],
      repos_missing_code_reality: [],
      total_sources: 20,
      sources_by_tag: {},
    },
    token_utilization: { budget: 50000, estimated_actual: 25000, utilization_percent: 50 },
    confidence: 'high',
    ...overrides,
  };
}

describe('FreshnessDisclaimer (Task 19.2)', () => {
  it('high confidence produces no disclaimer', () => {
    const sk = makeSelfKnowledge({ confidence: 'high' });
    const result = generateDisclaimer(sk);

    expect(result.shouldDisclaim).toBe(false);
    expect(result.confidence).toBe('high');
    expect(result.message).toBeNull();
    expect(result.staleDomains).toEqual([]);
  });

  it('medium confidence produces warning with stale sources', () => {
    const sk = makeSelfKnowledge({
      confidence: 'medium',
      freshness: { healthy: 18, stale: 2, total: 20, staleSources: ['code-reality-finn', 'glossary'] },
    });
    const result = generateDisclaimer(sk);

    expect(result.shouldDisclaim).toBe(true);
    expect(result.confidence).toBe('medium');
    expect(result.message).toContain('code-reality-finn');
    expect(result.message).toContain('glossary');
    expect(result.message).toContain('may be outdated');
    expect(result.staleDomains).toEqual(['code-reality-finn', 'glossary']);
  });

  it('low confidence produces strong disclaimer with stale domains', () => {
    const sk = makeSelfKnowledge({
      confidence: 'low',
      freshness: {
        healthy: 15, stale: 5, total: 20,
        staleSources: ['code-reality-finn', 'glossary', 'ecosystem', 'development-history', 'hounfour'],
      },
    });
    const result = generateDisclaimer(sk);

    expect(result.shouldDisclaim).toBe(true);
    expect(result.confidence).toBe('low');
    expect(result.message).toContain('degraded');
    expect(result.message).toContain('code-reality-finn');
    expect(result.staleDomains).toHaveLength(5);
  });
});
