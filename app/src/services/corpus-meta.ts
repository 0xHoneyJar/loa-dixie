import * as fs from 'node:fs';
import * as path from 'node:path';
import type { HealthResponse } from '../types.js';

/**
 * Corpus event — a single mutation in the knowledge corpus history.
 * See: knowledge/corpus-events.json
 */
export interface CorpusEvent {
  seq: number;
  type: string;
  timestamp: string;
  detail: string;
  author: string;
  files_affected: number;
  corpus_version_after: number;
}

/** Parsed corpus-events.json shape */
interface CorpusEventLog {
  events: CorpusEvent[];
}

/** Source entry in sources.json */
export interface SourceEntry {
  id: string;
  type: string;
  path: string;
  source_file: string;
  tags: string[];
  priority: number;
  maxTokens: number;
  max_age_days: number;
  last_updated: string;
  required?: boolean;
}

/** Per-source freshness weight (Task 19.1: Adaptive Retrieval) */
export interface SourceWeight {
  readonly sourceId: string;
  /** 1.0 (fresh) → 0.1 (very stale), linear degradation */
  readonly weight: number;
  /** days_elapsed / max_age_days — values >1.0 indicate staleness */
  readonly ageRatio: number;
  /** Days past max_age_days. 0 if fresh. */
  readonly staleDays: number;
  /** Source tags for domain identification */
  readonly tags: readonly string[];
}

/** Parsed sources.json shape */
interface SourcesConfig {
  version: number;
  corpus_version: number;
  default_budget_tokens: number;
  glossary_terms: Record<string, string[]>;
  sources: SourceEntry[];
}

/** Corpus metadata returned by getMeta() */
export type CorpusMetaResult = NonNullable<HealthResponse['services']['knowledge_corpus']>;

/** Oracle self-knowledge response shape */
export interface SelfKnowledgeResponse {
  corpus_version: number;
  last_mutation: {
    type: string;
    timestamp: string;
    detail: string;
  } | null;
  freshness: {
    healthy: number;
    stale: number;
    total: number;
    staleSources: string[];
  };
  coverage: {
    repos_with_code_reality: string[];
    repos_missing_code_reality: string[];
    total_sources: number;
    sources_by_tag: Record<string, number>;
  };
  token_utilization: {
    budget: number;
    estimated_actual: number;
    utilization_percent: number;
  };
  confidence: 'high' | 'medium' | 'low';
  /** Per-source freshness weights (Task 19.4: Adaptive Retrieval) */
  source_weights?: ReadonlyArray<{
    sourceId: string;
    weight: number;
    tags: readonly string[];
  }>;
}

export interface CorpusMetaOptions {
  cacheTtlMs?: number;
  sourcesPath?: string;
  eventsPath?: string;
  sourcesDir?: string;
  /** If false, skip warm-cache at construction (useful for testing). Default: true. */
  warmOnInit?: boolean;
}

/**
 * Token estimation ratio: characters per token.
 *
 * The 4:1 character-to-token ratio is the standard approximation used by
 * OpenAI's pricing estimator as a fallback. Characteristics:
 * - Over-counts for code blocks (tokens are often multi-character keywords)
 * - Under-counts for CJK content (characters encode as multiple tokens)
 * - Exact counting requires a tokenizer dependency (e.g., tiktoken)
 *
 * Exposed as a named constant for future calibration.
 */
const TOKEN_ESTIMATION_RATIO = 4;

/**
 * Corpus Metadata Service — single source of truth for knowledge corpus state.
 *
 * Extracted from health.ts (Task 16.1) to enable shared access from
 * health, agent, and self-knowledge endpoints without circular imports.
 *
 * See: SDD §4.2 (Knowledge Infrastructure), PRD FR-10 (Bridge Insights)
 */
export class CorpusMeta {
  private readonly cacheTtlMs: number;
  private readonly sourcesPath: string;
  private readonly eventsPath: string;
  private readonly sourcesDir: string;

  private cachedMeta: { data: CorpusMetaResult; expiresAt: number } | null = null;
  private cachedConfig: { data: SourcesConfig; expiresAt: number } | null = null;

  constructor(opts: CorpusMetaOptions = {}) {
    this.cacheTtlMs = opts.cacheTtlMs ?? 60_000;
    this.sourcesPath = opts.sourcesPath ?? path.resolve(
      import.meta.dirname ?? __dirname,
      '../../../knowledge/sources.json',
    );
    this.eventsPath = opts.eventsPath ?? path.resolve(
      import.meta.dirname ?? __dirname,
      '../../../knowledge/corpus-events.json',
    );
    this.sourcesDir = opts.sourcesDir ?? path.resolve(
      import.meta.dirname ?? __dirname,
      '../../../knowledge/sources',
    );

    // Pre-warm cache at construction to avoid blocking the event loop
    // on the first request (deeparch1-low-1). Skip in test scenarios.
    if (opts.warmOnInit !== false) {
      this.warmCache();
    }
  }

  /**
   * Pre-warm the config and meta caches so the first request is served
   * from cache. Eliminates thundering-herd risk when multiple requests
   * arrive before the cache is populated.
   *
   * Called automatically at construction (unless warmOnInit: false).
   * See: Netflix Archaius pre-warm pattern.
   */
  warmCache(): void {
    try {
      this.loadConfig();
      this.getMeta();
    } catch {
      // Warm-cache failure is non-fatal — next getMeta() will retry
    }
  }

  /**
   * Get corpus metadata — status, version, source counts, staleness.
   * Cached with configurable TTL.
   */
  getMeta(nowOverride?: Date): CorpusMetaResult | null {
    const now = Date.now();
    if (this.cachedMeta && now < this.cachedMeta.expiresAt) {
      return this.cachedMeta.data;
    }

    try {
      const config = this.loadConfig();
      const today = nowOverride ?? new Date();
      let staleCount = 0;

      for (const source of config.sources) {
        if (!source.last_updated) continue;
        const lastUpdated = new Date(source.last_updated);
        const ageDays = Math.floor(
          (today.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (ageDays > source.max_age_days) {
          staleCount++;
        }
      }

      const result: CorpusMetaResult = {
        status: staleCount > 0 ? 'degraded' : 'healthy',
        corpus_version: config.corpus_version ?? 0,
        sources: config.sources.length,
        stale_sources: staleCount,
      };

      this.cachedMeta = { data: result, expiresAt: now + this.cacheTtlMs };
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Get the full event log from corpus-events.json.
   */
  getEventLog(): CorpusEvent[] {
    try {
      const raw = fs.readFileSync(this.eventsPath, 'utf-8');
      const log = JSON.parse(raw) as CorpusEventLog;
      return log.events ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Get the most recent corpus event.
   */
  getLatestEvent(): CorpusEvent | null {
    const events = this.getEventLog();
    return events.length > 0 ? events[events.length - 1]! : null;
  }

  /**
   * Compute Oracle self-knowledge — metacognition about knowledge state.
   *
   * Enables the Oracle to answer: "How fresh is your knowledge?"
   * "When was your last update?" "What topics might be stale?"
   */
  getSelfKnowledge(nowOverride?: Date): SelfKnowledgeResponse | null {
    try {
      const config = this.loadConfig();
      const today = nowOverride ?? new Date();
      const latestEvent = this.getLatestEvent();

      // Freshness computation
      const staleSources: string[] = [];
      for (const source of config.sources) {
        if (!source.last_updated) continue;
        const lastUpdated = new Date(source.last_updated);
        const ageDays = Math.floor(
          (today.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (ageDays > source.max_age_days) {
          staleSources.push(source.id);
        }
      }

      // Coverage computation — which repos have code-reality files
      // Some repos use code-reality-{name}, dixie uses dixie-architecture
      const KNOWN_REPOS: Array<{ repo: string; sourceIds: string[] }> = [
        { repo: 'loa-finn', sourceIds: ['code-reality-finn'] },
        { repo: 'loa-freeside', sourceIds: ['code-reality-freeside'] },
        { repo: 'loa-hounfour', sourceIds: ['code-reality-hounfour'] },
        { repo: 'loa-dixie', sourceIds: ['dixie-architecture', 'code-reality-dixie'] },
      ];
      const reposWithCodeReality: string[] = [];
      const reposMissingCodeReality: string[] = [];

      for (const { repo, sourceIds } of KNOWN_REPOS) {
        const hasReality = config.sources.some((s) => sourceIds.includes(s.id));
        if (hasReality) {
          reposWithCodeReality.push(repo);
        } else {
          reposMissingCodeReality.push(repo);
        }
      }

      // Tag distribution
      const sourcesByTag: Record<string, number> = {};
      for (const source of config.sources) {
        for (const tag of source.tags) {
          sourcesByTag[tag] = (sourcesByTag[tag] ?? 0) + 1;
        }
      }

      // Token utilization — estimate actual tokens from file sizes.
      // Uses TOKEN_ESTIMATION_RATIO (chars/4) as the standard approximation.
      // See constant definition for accuracy characteristics.
      let estimatedActualTokens = 0;
      for (const source of config.sources) {
        try {
          const filename = path.basename(source.path);
          const filePath = path.join(this.sourcesDir, filename);
          const content = fs.readFileSync(filePath, 'utf-8');
          estimatedActualTokens += Math.ceil(content.length / TOKEN_ESTIMATION_RATIO);
        } catch {
          // File missing — skip
        }
      }

      // Confidence: high (0 stale), medium (1-2 stale), low (3+ stale)
      const confidence: 'high' | 'medium' | 'low' =
        staleSources.length === 0 ? 'high' :
        staleSources.length < 3 ? 'medium' :
        'low';

      // Per-source freshness weights (Task 19.4)
      const sourceWeightsMap = this.getSourceWeights(today);
      const sourceWeightsArray = [...sourceWeightsMap.values()].map((w) => ({
        sourceId: w.sourceId,
        weight: w.weight,
        tags: w.tags,
      }));

      return {
        corpus_version: config.corpus_version ?? 0,
        last_mutation: latestEvent
          ? {
              type: latestEvent.type,
              timestamp: latestEvent.timestamp,
              detail: latestEvent.detail,
            }
          : null,
        freshness: {
          healthy: config.sources.length - staleSources.length,
          stale: staleSources.length,
          total: config.sources.length,
          staleSources,
        },
        coverage: {
          repos_with_code_reality: reposWithCodeReality,
          repos_missing_code_reality: reposMissingCodeReality,
          total_sources: config.sources.length,
          sources_by_tag: sourcesByTag,
        },
        token_utilization: {
          budget: config.default_budget_tokens,
          estimated_actual: estimatedActualTokens,
          utilization_percent: config.default_budget_tokens > 0
            ? Math.round((estimatedActualTokens / config.default_budget_tokens) * 100)
            : 0,
        },
        confidence,
        source_weights: sourceWeightsArray,
      };
    } catch {
      return null;
    }
  }

  /**
   * Compute per-source freshness weights (Task 19.1: Adaptive Retrieval).
   *
   * Fresh sources get weight 1.0. Stale sources degrade linearly by
   * days-over-limit / max_age_days, floored at 0.1. This enables adaptive
   * retrieval — the Oracle can weight stale sources lower in ranking.
   *
   * Weight formula: max(0.1, 1.0 - staleDays / max_age_days)
   * See: Google Spanner TrueTime — confidence-proportional commitment.
   */
  getSourceWeights(nowOverride?: Date): Map<string, SourceWeight> {
    const weights = new Map<string, SourceWeight>();
    try {
      const config = this.loadConfig();
      const today = nowOverride ?? new Date();

      for (const source of config.sources) {
        if (!source.last_updated) {
          weights.set(source.id, {
            sourceId: source.id,
            weight: 0.5, // Unknown freshness — moderate weight
            ageRatio: 0,
            staleDays: 0,
            tags: source.tags,
          });
          continue;
        }

        const lastUpdated = new Date(source.last_updated);
        const ageDays = Math.floor(
          (today.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
        );
        const staleDays = Math.max(0, ageDays - source.max_age_days);
        const ageRatio = source.max_age_days > 0 ? ageDays / source.max_age_days : 0;
        const weight = staleDays === 0
          ? 1.0
          : Math.max(0.1, 1.0 - staleDays / source.max_age_days);

        weights.set(source.id, {
          sourceId: source.id,
          weight: Math.round(weight * 100) / 100, // Round to 2 decimals
          ageRatio: Math.round(ageRatio * 100) / 100,
          staleDays,
          tags: source.tags,
        });
      }
    } catch {
      // Config load failure — return empty map
    }
    return weights;
  }

  /**
   * Invalidate cached metadata. Call after corpus mutations.
   */
  invalidateCache(): void {
    this.cachedMeta = null;
    this.cachedConfig = null;
  }

  /**
   * Load and cache sources.json configuration.
   *
   * Uses synchronous fs.readFileSync intentionally — the file is <10KB JSON,
   * reads in <1ms. The caching layer (configurable TTL, default 60s) ensures
   * this only executes on cache miss. warmCache() at startup eliminates the
   * thundering-herd risk of concurrent first requests hitting an empty cache.
   */
  private loadConfig(): SourcesConfig {
    const now = Date.now();
    if (this.cachedConfig && now < this.cachedConfig.expiresAt) {
      return this.cachedConfig.data;
    }

    const raw = fs.readFileSync(this.sourcesPath, 'utf-8');
    const config = JSON.parse(raw) as SourcesConfig;
    this.cachedConfig = { data: config, expiresAt: now + this.cacheTtlMs };
    return config;
  }
}

/** Singleton instance for shared use across routes */
export const corpusMeta = new CorpusMeta();

/**
 * Convenience function — drop-in replacement for the old getCorpusMeta() in health.ts.
 * Delegates to the singleton.
 */
export function getCorpusMeta(nowOverride?: Date): CorpusMetaResult | null {
  return corpusMeta.getMeta(nowOverride);
}

/**
 * Reset corpus meta cache — testing utility.
 */
export function resetCorpusMetaCache(): void {
  corpusMeta.invalidateCache();
}
