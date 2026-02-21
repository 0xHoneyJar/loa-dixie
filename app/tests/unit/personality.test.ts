import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createPersonalityRoutes } from '../../src/routes/personality.js';
import type { PersonalityCache, PersonalityData, PersonalityEvolution } from '../../src/services/personality-cache.js';

function mockPersonalityCache(overrides?: Partial<PersonalityCache>) {
  return {
    get: vi.fn().mockResolvedValue(null),
    getEvolution: vi.fn().mockResolvedValue([]),
    invalidate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as PersonalityCache;
}

const samplePersonality: PersonalityData = {
  nftId: 'oracle',
  name: 'The Oracle',
  traits: ['institutional_consciousness', 'ecosystem_awareness'],
  antiNarration: ['Will not speculate on prices'],
  damp96Summary: { openness: 0.8, directness: 0.75 },
  version: '1.2.0',
  lastEvolved: '2026-02-20T00:00:00Z',
};

function createApp(cache: PersonalityCache) {
  const app = new Hono();
  app.route('/api/personality', createPersonalityRoutes({ personalityCache: cache }));
  return app;
}

describe('personality routes', () => {
  describe('GET /:nftId', () => {
    it('returns personality data for known nftId', async () => {
      const cache = mockPersonalityCache({
        get: vi.fn().mockResolvedValue(samplePersonality),
      });
      const app = createApp(cache);

      const res = await app.request('/api/personality/oracle');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual(samplePersonality);
    });

    it('returns 404 for unknown nftId', async () => {
      const cache = mockPersonalityCache();
      const app = createApp(cache);

      const res = await app.request('/api/personality/unknown-nft');
      expect(res.status).toBe(404);

      const body = await res.json() as { error: string };
      expect(body.error).toBe('not_found');
    });

    it('returns 400 for invalid nftId format', async () => {
      const cache = mockPersonalityCache();
      const app = createApp(cache);

      const res = await app.request('/api/personality/nft+bad+id');
      expect(res.status).toBe(400);

      const body = await res.json() as { error: string };
      expect(body.error).toBe('invalid_request');
    });
  });

  describe('GET /:nftId/evolution', () => {
    it('returns evolution history when wallet present', async () => {
      const evolutions: PersonalityEvolution[] = [
        { version: '1.1.0', timestamp: '2026-02-19T00:00:00Z', changes: ['Added directness'], trigger: 'compound_learning' },
      ];
      const cache = mockPersonalityCache({
        getEvolution: vi.fn().mockResolvedValue(evolutions),
      });
      const app = createApp(cache);

      const res = await app.request('/api/personality/oracle/evolution', {
        headers: { 'x-wallet-address': '0xabc123' },
      });
      expect(res.status).toBe(200);

      const body = await res.json() as { nftId: string; evolution: PersonalityEvolution[]; count: number };
      expect(body.nftId).toBe('oracle');
      expect(body.evolution).toEqual(evolutions);
      expect(body.count).toBe(1);
    });

    it('returns 401 when no wallet present', async () => {
      const cache = mockPersonalityCache();
      const app = createApp(cache);

      const res = await app.request('/api/personality/oracle/evolution');
      expect(res.status).toBe(401);
    });

    it('returns empty array for nftId with no evolution history', async () => {
      const cache = mockPersonalityCache();
      const app = createApp(cache);

      const res = await app.request('/api/personality/oracle/evolution', {
        headers: { 'x-wallet-address': '0xabc123' },
      });
      expect(res.status).toBe(200);

      const body = await res.json() as { count: number };
      expect(body.count).toBe(0);
    });

    it('returns 400 for invalid nftId format', async () => {
      const cache = mockPersonalityCache();
      const app = createApp(cache);

      const res = await app.request('/api/personality/bad+id/evolution', {
        headers: { 'x-wallet-address': '0xabc123' },
      });
      expect(res.status).toBe(400);
    });
  });
});
