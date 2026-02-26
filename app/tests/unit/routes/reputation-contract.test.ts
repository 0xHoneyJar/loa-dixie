/**
 * Consumer-driven contract tests (cycle-011, Sprint 84, T3.6).
 *
 * Defines the shared contract for FR-6 response shape:
 *   GET /api/reputation/query → { score: number | null }
 *
 * This schema is the agreement between dixie (provider) and finn (consumer).
 * If finn needs to import a TypeBox schema from hounfour, it should match
 * the shape validated here.
 *
 * @since cycle-011 — Sprint 84, Task T3.6
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createReputationRoutes } from '../../../src/routes/reputation.js';
import {
  ReputationService,
  InMemoryReputationStore,
  CollectionScoreAggregator,
} from '../../../src/services/reputation-service.js';
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';

// ---------------------------------------------------------------------------
// Contract schema definition — shared with finn
// ---------------------------------------------------------------------------

/**
 * FR-6 query response contract: { score: number | null }
 *
 * Rules:
 * - Response MUST be a JSON object
 * - Response MUST have exactly one key: "score"
 * - score MUST be either a finite number or null
 * - No additional properties allowed in the response
 */
function validateQueryContract(body: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    errors.push('Response must be a JSON object');
    return { valid: false, errors };
  }

  const obj = body as Record<string, unknown>;
  const keys = Object.keys(obj);

  if (!keys.includes('score')) {
    errors.push('Response must have "score" property');
  }

  if (keys.length !== 1) {
    errors.push(`Response must have exactly 1 key, got ${keys.length}: [${keys.join(', ')}]`);
  }

  if (keys.includes('score')) {
    const score = obj.score;
    if (score !== null && (typeof score !== 'number' || !Number.isFinite(score))) {
      errors.push(`score must be a finite number or null, got ${typeof score}: ${String(score)}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function makeAggregate(overrides: Partial<ReputationAggregate> = {}): ReputationAggregate {
  return {
    personality_id: 'test-agent',
    collection_id: 'collection-1',
    pool_id: 'pool-1',
    state: 'warming',
    personal_score: 0.75,
    collection_score: 0.5,
    blended_score: 0.65,
    sample_count: 15,
    pseudo_count: 10,
    contributor_count: 1,
    min_sample_count: 10,
    created_at: '2026-01-01T00:00:00Z',
    last_updated: '2026-02-26T00:00:00Z',
    transition_history: [],
    contract_version: '8.2.0',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Contract tests
// ---------------------------------------------------------------------------

describe('FR-6 query response contract', () => {
  let store: InMemoryReputationStore;
  let app: Hono;

  beforeEach(async () => {
    store = new InMemoryReputationStore();
    await store.put('nft-warm', makeAggregate({ blended_score: 0.75 }));
    await store.put('nft-cold', makeAggregate({ blended_score: null as unknown as number, state: 'cold' }));

    const aggregator = new CollectionScoreAggregator();
    const service = new ReputationService(store, aggregator);
    app = new Hono();
    app.route('/api/reputation', createReputationRoutes({ reputationService: service }));
  });

  it('warm agent response validates against contract', async () => {
    const res = await app.request('/api/reputation/query?routingKey=nft:nft-warm');
    const body = await res.json();
    const result = validateQueryContract(body);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(typeof body.score).toBe('number');
  });

  it('cold agent response validates against contract', async () => {
    const res = await app.request('/api/reputation/query?routingKey=nft:nft-cold');
    const body = await res.json();
    const result = validateQueryContract(body);
    expect(result.valid).toBe(true);
    expect(body.score).toBeNull();
  });

  it('unknown agent response validates against contract', async () => {
    const res = await app.request('/api/reputation/query?routingKey=nft:nft-missing');
    const body = await res.json();
    const result = validateQueryContract(body);
    expect(result.valid).toBe(true);
    expect(body.score).toBeNull();
  });

  it('missing routingKey response validates against contract', async () => {
    const res = await app.request('/api/reputation/query');
    const body = await res.json();
    const result = validateQueryContract(body);
    expect(result.valid).toBe(true);
    expect(body.score).toBeNull();
  });

  it('malformed routingKey response validates against contract', async () => {
    const res = await app.request('/api/reputation/query?routingKey=no-prefix');
    const body = await res.json();
    const result = validateQueryContract(body);
    expect(result.valid).toBe(true);
    expect(body.score).toBeNull();
  });

  it('contract validator rejects invalid shapes', () => {
    expect(validateQueryContract('not-an-object').valid).toBe(false);
    expect(validateQueryContract({ score: 'string' }).valid).toBe(false);
    expect(validateQueryContract({ score: Infinity }).valid).toBe(false);
    expect(validateQueryContract({ score: NaN }).valid).toBe(false);
    expect(validateQueryContract({ score: 0.5, extra: true }).valid).toBe(false);
    expect(validateQueryContract({}).valid).toBe(false);
  });
});
