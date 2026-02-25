/**
 * Autopoietic Loop Integration Tests — Sprint 73 (cycle-007), Task S1-T7
 *
 * End-to-end verification of the v8.2.0 autopoietic feedback loop:
 * model inference → emitModelPerformanceEvent() → processEvent() → blended score update
 *
 * Tests:
 * 1. E2E: inference → ModelPerformanceEvent → reputation update → score change
 * 2. QualityObservation schema validation (pass/fail cases)
 * 3. Unspecified TaskType routing integration
 * 4. 4-variant exhaustive event processing
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReputationService,
  InMemoryReputationStore,
  reconstructAggregateFromEvents,
} from '../reputation-service.js';
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';
import type { ReputationEvent, ModelPerformanceEvent, QualityObservation } from '../../types/reputation-evolution.js';
import {
  buildQualityObservation,
  buildDimensionBreakdown,
  computeQualityScore,
  emitModelPerformanceEvent,
  emitQualityEvent,
} from '../quality-feedback.js';
import { evaluateEconomicBoundaryForWallet } from '../conviction-boundary.js';
import { validatePayload } from '../conformance-suite.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAggregate(overrides: Partial<ReputationAggregate> = {}): ReputationAggregate {
  return {
    personality_id: 'test-agent-01',
    collection_id: 'collection-test',
    pool_id: 'pool-test',
    state: 'warming',
    personal_score: 0.7,
    collection_score: 0.5,
    blended_score: 0.6,
    sample_count: 10,
    pseudo_count: 10,
    contributor_count: 1,
    min_sample_count: 10,
    created_at: '2026-01-01T00:00:00Z',
    last_updated: '2026-02-25T00:00:00Z',
    transition_history: [],
    contract_version: '8.2.0',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Quality Observation (S1-T2)
// ---------------------------------------------------------------------------

describe('QualityObservation', () => {
  it('buildQualityObservation produces valid observation from severity distribution', () => {
    const observation = buildQualityObservation('bridge', { high: 2, low: 3 });

    expect(observation.score).toBeGreaterThan(0);
    expect(observation.score).toBeLessThan(1);
    expect(observation.dimensions).toBeDefined();
    expect(observation.dimensions!.high).toBeDefined();
    expect(observation.dimensions!.low).toBeDefined();
    expect(observation.evaluated_by).toBe('dixie-quality-feedback:bridge');
  });

  it('buildQualityObservation with zero findings produces score of 1.0', () => {
    const observation = buildQualityObservation('audit', {});

    expect(observation.score).toBe(1.0);
    expect(observation.evaluated_by).toBe('dixie-quality-feedback:audit');
  });

  it('buildQualityObservation includes latency when provided', () => {
    const observation = buildQualityObservation('flatline', { medium: 1 }, 1500);

    expect(observation.latency_ms).toBe(1500);
  });

  it('computeQualityScore preserves backward-compatible algorithm', () => {
    // Same algorithm as original: 1 / (1 + weighted_count)
    // blocker=1 → weight 1.0 → weighted_count = 1.0 → score = 0.5
    expect(computeQualityScore({ blocker: 1 })).toBeCloseTo(0.5, 5);

    // high=1 → weight 0.7 → score = 1/(1+0.7) ≈ 0.588
    expect(computeQualityScore({ high: 1 })).toBeCloseTo(1 / 1.7, 5);

    // Zero findings → score = 1.0
    expect(computeQualityScore({})).toBe(1.0);
  });

  it('buildDimensionBreakdown produces per-severity dimensions', () => {
    const dims = buildDimensionBreakdown({ high: 2, low: 5 });

    expect(dims.high).toBeCloseTo(1 / (1 + 2 * 0.7), 5);
    expect(dims.low).toBeCloseTo(1 / (1 + 5 * 0.15), 5);
  });

  it('QualityObservation conforms to hounfour schema', () => {
    const observation = buildQualityObservation('bridge', { high: 1, medium: 2 }, 800);
    const result = validatePayload('qualityObservation', observation);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('QualityObservation with invalid score fails schema validation', () => {
    const invalid = { score: 'not-a-number' };
    const result = validatePayload('qualityObservation', invalid);

    expect(result.valid).toBe(false);
  });

  it('QualityObservation minimal (score only) passes validation', () => {
    const result = validatePayload('qualityObservation', { score: 0.85 });

    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. ModelPerformanceEvent emission (S1-T3)
// ---------------------------------------------------------------------------

describe('ModelPerformanceEvent emission', () => {
  let service: ReputationService;
  let store: InMemoryReputationStore;

  beforeEach(() => {
    store = new InMemoryReputationStore();
    service = new ReputationService(store);
  });

  it('emitModelPerformanceEvent creates valid event in store', async () => {
    await store.put('nft-001', makeAggregate());

    await emitModelPerformanceEvent(
      {
        model_id: 'gpt-4o',
        provider: 'openai',
        pool_id: 'pool-primary',
        task_type: 'code_review',
        latency_ms: 1200,
        request_id: 'req-123',
        agent_id: 'agent-dixie-01',
        collection_id: 'collection-test',
      },
      'bridge',
      { high: 1, medium: 2 },
      'nft-001',
      service,
    );

    const events = await store.getEventHistory('nft-001');
    expect(events).toHaveLength(1);

    const event = events[0] as ModelPerformanceEvent;
    expect(event.type).toBe('model_performance');
    expect(event.model_id).toBe('gpt-4o');
    expect(event.provider).toBe('openai');
    expect(event.pool_id).toBe('pool-primary');
    expect(event.task_type).toBe('code_review');
    expect(event.quality_observation.score).toBeGreaterThan(0);
    expect(event.quality_observation.latency_ms).toBe(1200);
    expect(event.quality_observation.evaluated_by).toBe('dixie-quality-feedback:bridge');
    expect(event.request_context).toEqual({ request_id: 'req-123' });
    expect(event.event_id).toBeDefined();
    expect(event.agent_id).toBe('agent-dixie-01');
    expect(event.collection_id).toBe('collection-test');
  });

  it('emitModelPerformanceEvent schema validates against hounfour', async () => {
    await store.put('nft-002', makeAggregate());

    await emitModelPerformanceEvent(
      {
        model_id: 'claude-opus-4-20250514',
        provider: 'anthropic',
        pool_id: 'pool-premium',
        task_type: 'analysis',
        agent_id: 'agent-01',
        collection_id: 'col-01',
      },
      'audit',
      { low: 1 },
      'nft-002',
      service,
    );

    const events = await store.getEventHistory('nft-002');
    const result = validatePayload('modelPerformanceEvent', events[0]);
    expect(result.valid).toBe(true);
  });

  it('emitQualityEvent creates valid v8.2.0 flat quality_signal event', async () => {
    await store.put('nft-003', makeAggregate());

    await emitQualityEvent(
      'flatline',
      'nft-003',
      { high: 1 },
      { agent_id: 'agent-01', collection_id: 'col-01', task_type: 'code_review' },
      service,
    );

    const events = await store.getEventHistory('nft-003');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('quality_signal');

    const result = validatePayload('reputationEvent', events[0]);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. E2E Autopoietic Loop: processEvent (S1-T4)
// ---------------------------------------------------------------------------

describe('processEvent — 4-variant exhaustive handling', () => {
  let service: ReputationService;
  let store: InMemoryReputationStore;

  beforeEach(() => {
    store = new InMemoryReputationStore();
    service = new ReputationService(store);
  });

  it('model_performance event updates aggregate blended score', async () => {
    const initial = makeAggregate({ personal_score: 0.5, sample_count: 5 });
    await store.put('nft-loop', initial);

    const event: ReputationEvent = {
      type: 'model_performance',
      model_id: 'gpt-4o',
      provider: 'openai',
      pool_id: 'pool-primary',
      task_type: 'code_review',
      quality_observation: { score: 0.95 },
      event_id: crypto.randomUUID(),
      agent_id: 'agent-01',
      collection_id: 'col-01',
      timestamp: new Date().toISOString(),
    };

    await service.processEvent('nft-loop', event);

    const updated = await store.get('nft-loop');
    expect(updated).toBeDefined();
    expect(updated!.personal_score).toBe(0.95);
    expect(updated!.sample_count).toBe(6);
    expect(updated!.blended_score).not.toBe(initial.blended_score);
  });

  it('model_performance event creates task cohort when none exists', async () => {
    await store.put('nft-cohort', makeAggregate());

    const event: ReputationEvent = {
      type: 'model_performance',
      model_id: 'claude-opus-4-20250514',
      provider: 'anthropic',
      pool_id: 'pool-premium',
      task_type: 'analysis',
      quality_observation: { score: 0.88 },
      event_id: crypto.randomUUID(),
      agent_id: 'agent-01',
      collection_id: 'col-01',
      timestamp: new Date().toISOString(),
    };

    await service.processEvent('nft-cohort', event);

    const cohort = await store.getTaskCohort('nft-cohort', 'claude-opus-4-20250514', 'analysis');
    expect(cohort).toBeDefined();
    expect(cohort!.personal_score).toBe(0.88);
    expect(cohort!.sample_count).toBe(1);
  });

  it('quality_signal event updates personal score', async () => {
    await store.put('nft-qs', makeAggregate({ personal_score: 0.5 }));

    await service.processEvent('nft-qs', {
      type: 'quality_signal',
      score: 0.9,
      event_id: crypto.randomUUID(),
      agent_id: 'agent-01',
      collection_id: 'col-01',
      timestamp: new Date().toISOString(),
    });

    const updated = await store.get('nft-qs');
    expect(updated!.personal_score).toBe(0.9);
    expect(updated!.sample_count).toBe(11); // was 10, +1
  });

  it('task_completed event increments sample count on existing cohort', async () => {
    await store.put('nft-tc', makeAggregate());
    await store.putTaskCohort('nft-tc', {
      model_id: 'default',
      task_type: 'code_review',
      personal_score: 0.8,
      sample_count: 5,
      last_updated: '2026-02-25T00:00:00Z',
    });

    await service.processEvent('nft-tc', {
      type: 'task_completed',
      task_type: 'code_review',
      success: true,
      duration_ms: 3000,
      event_id: crypto.randomUUID(),
      agent_id: 'agent-01',
      collection_id: 'col-01',
      timestamp: new Date().toISOString(),
    });

    const cohort = await store.getTaskCohort('nft-tc', 'default', 'code_review');
    expect(cohort!.sample_count).toBe(6);
  });

  it('credential_update event is recorded in log without score change', async () => {
    await store.put('nft-cu', makeAggregate({ personal_score: 0.7 }));

    await service.processEvent('nft-cu', {
      type: 'credential_update',
      credential_id: 'cred-001',
      action: 'issued',
      event_id: crypto.randomUUID(),
      agent_id: 'agent-01',
      collection_id: 'col-01',
      timestamp: new Date().toISOString(),
    });

    // Score unchanged
    const updated = await store.get('nft-cu');
    expect(updated!.personal_score).toBe(0.7);

    // Event is in the log
    const events = await store.getEventHistory('nft-cu');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('credential_update');
  });

  it('E2E: full autopoietic loop — emit → process → score update', async () => {
    await store.put('nft-e2e', makeAggregate({ personal_score: 0.5, sample_count: 5 }));

    // Step 1: Emit ModelPerformanceEvent (as quality-feedback.ts would)
    await emitModelPerformanceEvent(
      {
        model_id: 'gpt-4o',
        provider: 'openai',
        pool_id: 'pool-primary',
        task_type: 'code_review',
        latency_ms: 1000,
        agent_id: 'agent-01',
        collection_id: 'col-01',
      },
      'bridge',
      { low: 2 }, // minor findings → high score
      'nft-e2e',
      service,
    );

    // Step 2: Retrieve the event and process it
    const events = await store.getEventHistory('nft-e2e');
    expect(events).toHaveLength(1);

    // Step 3: Process through processEvent (simulates what the service does)
    // Clear the event log first since processEvent also appends
    store.clear();
    await store.put('nft-e2e', makeAggregate({ personal_score: 0.5, sample_count: 5 }));
    await service.processEvent('nft-e2e', events[0]);

    // Step 4: Verify score updated
    const updated = await store.get('nft-e2e');
    expect(updated).toBeDefined();
    expect(updated!.sample_count).toBe(6);
    // Score should reflect the quality observation (low findings → high score)
    expect(updated!.personal_score).toBeGreaterThan(0.5);
  });
});

// ---------------------------------------------------------------------------
// 4. Unspecified TaskType routing (S1-T5)
// ---------------------------------------------------------------------------

describe('Unspecified TaskType routing', () => {
  it("'unspecified' TaskType routes to aggregate-only scoring", () => {
    const result = evaluateEconomicBoundaryForWallet(
      '0xtest',
      'builder',
      '100000',
      {
        reputationAggregate: makeAggregate({ personal_score: 0.8 }),
        taskType: 'unspecified',
      },
    );

    expect(result).toBeDefined();
    // Should pass — builder tier with good score
    expect(result.access_decision.granted).toBe(true);
  });

  it('undefined TaskType routes to aggregate-only scoring (backward compat)', () => {
    const result = evaluateEconomicBoundaryForWallet(
      '0xtest',
      'builder',
      '100000',
      {
        reputationAggregate: makeAggregate({ personal_score: 0.8 }),
        taskType: undefined,
      },
    );

    expect(result).toBeDefined();
    expect(result.access_decision.granted).toBe(true);
  });

  it("'unspecified' skips task cohort lookup even when cohorts exist", () => {
    const aggregate = {
      ...makeAggregate({ personal_score: 0.8 }),
      task_cohorts: [
        {
          model_id: 'gpt-4o',
          task_type: 'code_review',
          personal_score: 0.95,
          sample_count: 20,
          last_updated: '2026-02-25T00:00:00Z',
        },
      ],
    };

    const result = evaluateEconomicBoundaryForWallet(
      '0xtest',
      'builder',
      '100000',
      {
        reputationAggregate: aggregate,
        taskType: 'unspecified',
      },
    );

    expect(result).toBeDefined();
    expect(result.access_decision.granted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Event-sourced aggregate reconstruction (S1-T4)
// ---------------------------------------------------------------------------

describe('reconstructAggregateFromEvents', () => {
  it('reconstructs aggregate from model_performance events', () => {
    const events: ReputationEvent[] = [
      {
        type: 'model_performance',
        model_id: 'gpt-4o',
        provider: 'openai',
        pool_id: 'pool-primary',
        task_type: 'code_review',
        quality_observation: { score: 0.85 },
        event_id: '1',
        agent_id: 'agent-01',
        collection_id: 'col-01',
        timestamp: '2026-02-25T01:00:00Z',
      },
      {
        type: 'model_performance',
        model_id: 'gpt-4o',
        provider: 'openai',
        pool_id: 'pool-primary',
        task_type: 'code_review',
        quality_observation: { score: 0.90 },
        event_id: '2',
        agent_id: 'agent-01',
        collection_id: 'col-01',
        timestamp: '2026-02-25T02:00:00Z',
      },
    ];

    const aggregate = reconstructAggregateFromEvents(events);

    expect(aggregate.personal_score).toBe(0.90); // last event's score
    expect(aggregate.sample_count).toBe(2);
    expect(aggregate.state).toBe('warming');
    expect(aggregate.contract_version).toBe('8.2.0');
    expect(aggregate.task_cohorts).toHaveLength(1);
    expect(aggregate.task_cohorts![0].model_id).toBe('gpt-4o');
    expect(aggregate.task_cohorts![0].sample_count).toBe(2);
  });

  it('reconstructs empty aggregate from no events', () => {
    const aggregate = reconstructAggregateFromEvents([]);

    expect(aggregate.state).toBe('cold');
    expect(aggregate.personal_score).toBeNull();
    expect(aggregate.sample_count).toBe(0);
    expect(aggregate.task_cohorts).toHaveLength(0);
  });

  it('handles mixed event types in reconstruction', () => {
    const events: ReputationEvent[] = [
      {
        type: 'quality_signal',
        score: 0.8,
        event_id: '1',
        agent_id: 'a',
        collection_id: 'c',
        timestamp: '2026-02-25T01:00:00Z',
      },
      {
        type: 'task_completed',
        task_type: 'analysis',
        success: true,
        event_id: '2',
        agent_id: 'a',
        collection_id: 'c',
        timestamp: '2026-02-25T02:00:00Z',
      },
      {
        type: 'credential_update',
        credential_id: 'cred-1',
        action: 'issued',
        event_id: '3',
        agent_id: 'a',
        collection_id: 'c',
        timestamp: '2026-02-25T03:00:00Z',
      },
      {
        type: 'model_performance',
        model_id: 'gpt-4o',
        provider: 'openai',
        pool_id: 'pool',
        task_type: 'code_review',
        quality_observation: { score: 0.92 },
        event_id: '4',
        agent_id: 'a',
        collection_id: 'c',
        timestamp: '2026-02-25T04:00:00Z',
      },
    ];

    const aggregate = reconstructAggregateFromEvents(events);

    // quality_signal=1, task_completed=1, credential_update=0, model_performance=1 = 3 sample increments
    expect(aggregate.sample_count).toBe(3);
    expect(aggregate.personal_score).toBe(0.92); // last score-setting event
    expect(aggregate.task_cohorts).toHaveLength(1);
  });
});
