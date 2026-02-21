import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgePriorityStore } from '../../src/services/knowledge-priority-store.js';
import type { PriorityVote } from '../../src/services/knowledge-priority-store.js';

describe('KnowledgePriorityStore (Task 21.1)', () => {
  let store: KnowledgePriorityStore;

  beforeEach(() => {
    store = new KnowledgePriorityStore();
  });

  it('records a single vote and retrieves it', () => {
    const vote: PriorityVote = {
      wallet: '0xAlice',
      sourceId: 'code-reality-finn',
      priority: 5,
      tier: 'architect',
      timestamp: new Date().toISOString(),
    };
    store.vote(vote);

    const votes = store.getVotes('code-reality-finn');
    expect(votes).toHaveLength(1);
    expect(votes[0]!.priority).toBe(5);
    expect(votes[0]!.wallet).toBe('0xAlice');
  });

  it('tier weighting: sovereign vote counts 25x participant', () => {
    store.vote({
      wallet: '0xParticipant',
      sourceId: 'glossary',
      priority: 5,
      tier: 'participant',
      timestamp: new Date().toISOString(),
    });
    store.vote({
      wallet: '0xSovereign',
      sourceId: 'glossary',
      priority: 5,
      tier: 'sovereign',
      timestamp: new Date().toISOString(),
    });

    const priorities = store.getAggregatedPriorities();
    const glossary = priorities.find((p) => p.sourceId === 'glossary');
    expect(glossary).toBeDefined();
    // participant: 5 * 1 = 5, sovereign: 5 * 25 = 125, total = 130
    expect(glossary!.score).toBe(130);
    expect(glossary!.voteCount).toBe(2);
  });

  it('duplicate vote from same wallet+source overwrites (latest wins)', () => {
    store.vote({
      wallet: '0xAlice',
      sourceId: 'glossary',
      priority: 2,
      tier: 'builder',
      timestamp: '2026-02-22T10:00:00Z',
    });
    store.vote({
      wallet: '0xAlice',
      sourceId: 'glossary',
      priority: 5,
      tier: 'builder',
      timestamp: '2026-02-22T11:00:00Z',
    });

    const votes = store.getVotes('glossary');
    expect(votes).toHaveLength(1);
    expect(votes[0]!.priority).toBe(5);

    const priorities = store.getAggregatedPriorities();
    const glossary = priorities.find((p) => p.sourceId === 'glossary');
    // builder: 5 * 3 = 15
    expect(glossary!.score).toBe(15);
    expect(glossary!.voteCount).toBe(1);
  });

  it('observer votes are excluded from aggregation (Ostrom Principle 3)', () => {
    store.vote({
      wallet: '0xObserver',
      sourceId: 'glossary',
      priority: 5,
      tier: 'observer',
      timestamp: new Date().toISOString(),
    });

    const priorities = store.getAggregatedPriorities();
    expect(priorities).toHaveLength(0);
    expect(store.getVoterCount()).toBe(0);
  });

  it('aggregation sorts by score descending', () => {
    store.vote({
      wallet: '0xAlice',
      sourceId: 'low-priority',
      priority: 1,
      tier: 'participant',
      timestamp: new Date().toISOString(),
    });
    store.vote({
      wallet: '0xAlice',
      sourceId: 'high-priority',
      priority: 5,
      tier: 'participant',
      timestamp: new Date().toISOString(),
    });

    const priorities = store.getAggregatedPriorities();
    expect(priorities[0]!.sourceId).toBe('high-priority');
    expect(priorities[1]!.sourceId).toBe('low-priority');
  });

  it('getVoterCount counts unique wallets', () => {
    store.vote({
      wallet: '0xAlice',
      sourceId: 'glossary',
      priority: 3,
      tier: 'participant',
      timestamp: new Date().toISOString(),
    });
    store.vote({
      wallet: '0xAlice',
      sourceId: 'code-reality-finn',
      priority: 4,
      tier: 'participant',
      timestamp: new Date().toISOString(),
    });
    store.vote({
      wallet: '0xBob',
      sourceId: 'glossary',
      priority: 5,
      tier: 'builder',
      timestamp: new Date().toISOString(),
    });

    // 2 unique wallets: Alice and Bob
    expect(store.getVoterCount()).toBe(2);
  });
});
