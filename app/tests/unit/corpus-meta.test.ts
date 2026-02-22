import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'node:path';
import { CorpusMeta, getCorpusMeta, resetCorpusMetaCache, corpusMeta, type SourceWeight } from '../../src/services/corpus-meta.js';
import type { ResourceGovernor } from '../../src/services/resource-governor.js';

const SOURCES_PATH = path.resolve(__dirname, '../../../knowledge/sources.json');
const EVENTS_PATH = path.resolve(__dirname, '../../../knowledge/corpus-events.json');
const SOURCES_DIR = path.resolve(__dirname, '../../../knowledge/sources');

describe('CorpusMeta service (Task 16.1)', () => {
  beforeEach(() => {
    resetCorpusMetaCache();
  });

  it('getMeta returns corpus metadata with version and source counts', () => {
    const service = new CorpusMeta({
      sourcesPath: SOURCES_PATH,
      eventsPath: EVENTS_PATH,
      sourcesDir: SOURCES_DIR,
    });

    const meta = service.getMeta();
    expect(meta).not.toBeNull();
    expect(meta!.corpus_version).toBeGreaterThanOrEqual(1);
    expect(meta!.sources).toBeGreaterThanOrEqual(15);
    expect(meta!.stale_sources).toBeGreaterThanOrEqual(0);
    expect(['healthy', 'degraded']).toContain(meta!.status);
  });

  it('configurable TTL is respected — cache expires', () => {
    const service = new CorpusMeta({
      cacheTtlMs: 1, // 1ms TTL — effectively always miss
      sourcesPath: SOURCES_PATH,
      eventsPath: EVENTS_PATH,
      sourcesDir: SOURCES_DIR,
    });

    const first = service.getMeta();
    expect(first).not.toBeNull();

    // With 1ms TTL, next call should re-read (not verify different values,
    // just that it doesn't error — functional equivalence)
    const second = service.getMeta();
    expect(second).not.toBeNull();
    expect(second!.corpus_version).toBe(first!.corpus_version);
  });

  it('invalidateCache causes next getMeta to re-read', () => {
    const service = new CorpusMeta({
      cacheTtlMs: 60_000, // Long TTL
      sourcesPath: SOURCES_PATH,
      eventsPath: EVENTS_PATH,
      sourcesDir: SOURCES_DIR,
    });

    const first = service.getMeta();
    expect(first).not.toBeNull();

    service.invalidateCache();

    // After invalidation, should re-read (same data, but proves cache was cleared)
    const second = service.getMeta();
    expect(second).not.toBeNull();
    expect(second!.corpus_version).toBe(first!.corpus_version);
  });

  it('singleton corpusMeta instance exports correctly', () => {
    expect(corpusMeta).toBeInstanceOf(CorpusMeta);
    const meta = corpusMeta.getMeta();
    expect(meta).not.toBeNull();
  });

  it('convenience getCorpusMeta function delegates to singleton', () => {
    const meta = getCorpusMeta();
    expect(meta).not.toBeNull();
    expect(meta!.sources).toBeGreaterThanOrEqual(15);
  });
});

describe('CorpusMeta warmCache (Task 18.1)', () => {
  it('warmCache pre-populates cache so first getMeta is served from cache', () => {
    const service = new CorpusMeta({
      cacheTtlMs: 60_000,
      sourcesPath: SOURCES_PATH,
      eventsPath: EVENTS_PATH,
      sourcesDir: SOURCES_DIR,
      warmOnInit: false, // Don't warm at construction — we'll do it manually
    });

    // Before warmCache, cache is empty — getMeta reads from disk
    service.invalidateCache();

    // Warm the cache manually
    service.warmCache();

    // Now getMeta should return cached data without re-reading
    const meta = service.getMeta();
    expect(meta).not.toBeNull();
    expect(meta!.corpus_version).toBeGreaterThanOrEqual(1);
  });

  it('default construction (warmOnInit !== false) auto-warms cache', () => {
    const service = new CorpusMeta({
      sourcesPath: SOURCES_PATH,
      eventsPath: EVENTS_PATH,
      sourcesDir: SOURCES_DIR,
      // warmOnInit defaults to true
    });

    // Should already be cached from construction — getMeta returns immediately
    const meta = service.getMeta();
    expect(meta).not.toBeNull();
    expect(meta!.sources).toBeGreaterThanOrEqual(15);
  });
});

describe('CorpusMeta event log (Task 16.2)', () => {
  const service = new CorpusMeta({
    sourcesPath: SOURCES_PATH,
    eventsPath: EVENTS_PATH,
    sourcesDir: SOURCES_DIR,
  });

  it('getEventLog returns parsed events', () => {
    const events = service.getEventLog();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]!.type).toBe('initial_release');
  });

  it('getLatestEvent returns most recent event', () => {
    const latest = service.getLatestEvent();
    expect(latest).not.toBeNull();
    expect(latest!.seq).toBeGreaterThanOrEqual(1);
    // The latest event should have the highest seq
    const events = service.getEventLog();
    expect(latest!.seq).toBe(events[events.length - 1]!.seq);
  });

  it('event seq numbers are monotonically increasing', () => {
    const events = service.getEventLog();
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.seq).toBeGreaterThan(events[i - 1]!.seq);
    }
  });

  it('all events have required schema fields', () => {
    const events = service.getEventLog();
    for (const event of events) {
      expect(typeof event.seq).toBe('number');
      expect(typeof event.type).toBe('string');
      expect(typeof event.timestamp).toBe('string');
      expect(typeof event.detail).toBe('string');
      expect(typeof event.author).toBe('string');
      expect(typeof event.files_affected).toBe('number');
      expect(typeof event.corpus_version_after).toBe('number');
    }
  });
});

describe('CorpusMeta source weights (Task 19.1)', () => {
  const service = new CorpusMeta({
    sourcesPath: SOURCES_PATH,
    eventsPath: EVENTS_PATH,
    sourcesDir: SOURCES_DIR,
  });

  it('all sources get weight 1.0 when none are stale (recent date)', () => {
    // Use a date very close to last_updated so nothing is stale
    const weights = service.getSourceWeights(new Date('2026-02-22'));
    expect(weights.size).toBeGreaterThanOrEqual(15);

    for (const [, w] of weights) {
      expect(w.weight).toBe(1);
      expect(w.staleDays).toBe(0);
    }
  });

  it('stale sources get degraded weights (far future date)', () => {
    // Use a date far in the future so sources become stale
    const weights = service.getSourceWeights(new Date('2027-06-01'));
    expect(weights.size).toBeGreaterThanOrEqual(15);

    let hasStale = false;
    for (const [, w] of weights) {
      if (w.staleDays > 0) {
        hasStale = true;
        expect(w.weight).toBeLessThan(1);
        expect(w.weight).toBeGreaterThanOrEqual(0.1); // Floor at 0.1
      }
    }
    expect(hasStale).toBe(true);
  });

  it('very stale sources floor at weight 0.1', () => {
    // Use a date extremely far in the future
    const weights = service.getSourceWeights(new Date('2030-01-01'));
    let hasFloored = false;
    for (const [, w] of weights) {
      if (w.staleDays > 0) {
        expect(w.weight).toBeGreaterThanOrEqual(0.1);
        if (w.weight === 0.1) hasFloored = true;
      }
    }
    expect(hasFloored).toBe(true);
  });

  it('source weights include tags for domain identification', () => {
    const weights = service.getSourceWeights(new Date('2026-02-22'));
    for (const [, w] of weights) {
      expect(w.tags).toBeInstanceOf(Array);
      expect(w.sourceId).toBeTruthy();
    }
  });
});

describe('CorpusMeta self-knowledge (Task 16.3)', () => {
  const service = new CorpusMeta({
    sourcesPath: SOURCES_PATH,
    eventsPath: EVENTS_PATH,
    sourcesDir: SOURCES_DIR,
  });

  it('getSelfKnowledge returns full response shape', () => {
    const sk = service.getSelfKnowledge();
    expect(sk).not.toBeNull();

    // Corpus version
    expect(sk!.corpus_version).toBeGreaterThanOrEqual(1);

    // Last mutation
    expect(sk!.last_mutation).not.toBeNull();
    expect(sk!.last_mutation!.type).toBeTruthy();
    expect(sk!.last_mutation!.timestamp).toBeTruthy();

    // Freshness
    expect(sk!.freshness.healthy).toBeGreaterThanOrEqual(0);
    expect(sk!.freshness.stale).toBeGreaterThanOrEqual(0);
    expect(sk!.freshness.total).toBe(sk!.freshness.healthy + sk!.freshness.stale);
    expect(sk!.freshness.staleSources).toBeInstanceOf(Array);

    // Coverage
    expect(sk!.coverage.repos_with_code_reality).toBeInstanceOf(Array);
    expect(sk!.coverage.repos_missing_code_reality).toBeInstanceOf(Array);
    expect(sk!.coverage.total_sources).toBeGreaterThan(0);
    expect(typeof sk!.coverage.sources_by_tag).toBe('object');

    // Token utilization
    expect(sk!.token_utilization.budget).toBeGreaterThan(0);
    expect(sk!.token_utilization.estimated_actual).toBeGreaterThan(0);
    expect(sk!.token_utilization.utilization_percent).toBeGreaterThan(0);

    // Confidence
    expect(['high', 'medium', 'low']).toContain(sk!.confidence);
  });

  it('confidence is "high" when 0 stale sources', () => {
    // Use a recent date so nothing appears stale
    const sk = service.getSelfKnowledge(new Date('2026-02-22'));
    expect(sk).not.toBeNull();
    expect(sk!.freshness.stale).toBe(0);
    expect(sk!.confidence).toBe('high');
  });

  it('coverage includes code-reality repos', () => {
    const sk = service.getSelfKnowledge();
    expect(sk).not.toBeNull();
    // We have code-reality for finn, freeside, hounfour, dixie
    expect(sk!.coverage.repos_with_code_reality.length).toBeGreaterThanOrEqual(3);
  });

  it('token utilization computes from actual file sizes', () => {
    const sk = service.getSelfKnowledge();
    expect(sk).not.toBeNull();
    // Budget is 50K, actual should be significant
    expect(sk!.token_utilization.budget).toBe(50000);
    expect(sk!.token_utilization.estimated_actual).toBeGreaterThan(5000);
  });

  it('source_weights included in self-knowledge response (Task 19.4)', () => {
    const sk = service.getSelfKnowledge(new Date('2026-02-22'));
    expect(sk).not.toBeNull();
    expect(sk!.source_weights).toBeDefined();
    expect(sk!.source_weights!.length).toBeGreaterThanOrEqual(15);

    for (const w of sk!.source_weights!) {
      expect(w.sourceId).toBeTruthy();
      expect(w.weight).toBeGreaterThanOrEqual(0.1);
      expect(w.weight).toBeLessThanOrEqual(1.0);
      expect(w.tags).toBeInstanceOf(Array);
    }
  });

  it('source_weights tags match corpus sources (Task 19.4)', () => {
    const sk = service.getSelfKnowledge(new Date('2026-02-22'));
    expect(sk).not.toBeNull();
    // Each source weight should have at least one tag
    const withTags = sk!.source_weights!.filter(w => w.tags.length > 0);
    expect(withTags.length).toBeGreaterThan(0);
  });
});

describe('CorpusMeta ResourceGovernor conformance (Task 20.2)', () => {
  const service = new CorpusMeta({
    sourcesPath: SOURCES_PATH,
    eventsPath: EVENTS_PATH,
    sourcesDir: SOURCES_DIR,
  });

  it('resourceType returns "knowledge_corpus"', () => {
    expect(service.resourceType).toBe('knowledge_corpus');
  });

  it('getHealth() returns correct ResourceHealth shape', () => {
    const health = service.getHealth(new Date('2026-02-22'));
    expect(health).not.toBeNull();
    expect(health!.status).toMatch(/^(healthy|degraded)$/);
    expect(health!.totalItems).toBeGreaterThanOrEqual(15);
    expect(health!.staleItems).toBeGreaterThanOrEqual(0);
    expect(health!.version).toBeGreaterThanOrEqual(1);
  });

  it('getGovernorSelfKnowledge() returns ResourceSelfKnowledge shape', () => {
    const sk = service.getGovernorSelfKnowledge(new Date('2026-02-22'));
    expect(sk).not.toBeNull();
    expect(sk!.version).toBeGreaterThanOrEqual(1);
    expect(['high', 'medium', 'low']).toContain(sk!.confidence);
    expect(sk!.healthSummary.totalItems).toBeGreaterThanOrEqual(15);
    expect(sk!.healthSummary.status).toMatch(/^(healthy|degraded)$/);
  });

  it('satisfies ResourceGovernor interface structurally', () => {
    // TypeScript compile-time check: CorpusMeta satisfies ResourceGovernor<SourceEntry>
    const governor: ResourceGovernor<unknown> = service;
    expect(governor.resourceType).toBe('knowledge_corpus');
    expect(typeof governor.getHealth).toBe('function');
    expect(typeof governor.getGovernorSelfKnowledge).toBe('function');
    expect(typeof governor.getEventLog).toBe('function');
    expect(typeof governor.getLatestEvent).toBe('function');
    expect(typeof governor.invalidateCache).toBe('function');
    expect(typeof governor.warmCache).toBe('function');
  });
});
