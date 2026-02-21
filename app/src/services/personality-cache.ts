import type { FinnClient } from '../proxy/finn-client.js';
import type { ProjectionCache } from './projection-cache.js';

/**
 * BEAUVOIR personality display — fetched from loa-finn identity graph.
 * Per SDD §6.1.5, §8.2
 */
export interface PersonalityData {
  readonly nftId: string;
  readonly name: string;
  readonly traits: string[];
  readonly antiNarration: string[];
  readonly damp96Summary: Record<string, number>;
  readonly version: string;
  readonly lastEvolved: string;
}

/**
 * Personality evolution entry — personality change over time.
 */
export interface PersonalityEvolution {
  readonly version: string;
  readonly timestamp: string;
  readonly changes: string[];
  readonly trigger: 'interaction_pattern' | 'manual' | 'compound_learning';
}

/**
 * Personality cache service — fetches BEAUVOIR data from loa-finn identity graph
 * and caches in Redis with configurable TTL.
 *
 * Architecture: Personality data is relatively stable (changes happen through
 * compound learning, not per-request). A 30-minute TTL provides good cache hit
 * ratio while allowing evolution to propagate within reasonable time.
 *
 * See: SDD §4.2 (cache strategy), §8.2 (loa-finn identity graph)
 */
export class PersonalityCache {
  constructor(
    private readonly finnClient: FinnClient,
    private readonly cache: ProjectionCache<PersonalityData> | null,
  ) {}

  /**
   * Get personality for an nftId. Cache-aside pattern:
   * 1. Check Redis cache
   * 2. On miss: fetch from loa-finn, cache result
   * 3. On loa-finn failure: return null (graceful degradation)
   */
  async get(nftId: string): Promise<PersonalityData | null> {
    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get(nftId).catch(() => null);
      if (cached) return cached;
    }

    // Fetch from loa-finn identity graph
    try {
      const result = await this.finnClient.request<PersonalityData>(
        'GET',
        `/api/identity/${encodeURIComponent(nftId)}/beauvoir`,
      );

      // Cache the result
      if (this.cache) {
        await this.cache.set(nftId, result).catch(() => {});
      }

      return result;
    } catch {
      return null;
    }
  }

  /**
   * Get personality evolution history.
   * Not cached — called infrequently and should show latest state.
   */
  async getEvolution(nftId: string): Promise<PersonalityEvolution[]> {
    try {
      return await this.finnClient.request<PersonalityEvolution[]>(
        'GET',
        `/api/identity/${encodeURIComponent(nftId)}/evolution`,
      );
    } catch {
      return [];
    }
  }

  /**
   * Invalidate cached personality for an nftId.
   * Called when personality evolution events are detected.
   */
  async invalidate(nftId: string): Promise<void> {
    if (this.cache) {
      await this.cache.invalidate(nftId).catch(() => {});
    }
  }
}
