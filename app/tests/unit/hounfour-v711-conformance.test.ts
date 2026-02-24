/**
 * Hounfour v7.11.0 Governance Conformance Tests
 * @since cycle-005 — Sprint 61 (Task 2.3)
 */
import { describe, it, expect } from 'vitest';
import { validatePayload, runFullSuite } from '../../src/services/conformance-suite.js';

describe('Hounfour v7.11.0 Governance Conformance', () => {
  describe('TaskType schema', () => {
    it('validates protocol literal (code_review)', () => {
      const result = validatePayload('taskType', 'code_review');
      expect(result.valid).toBe(true);
    });

    it('validates community pattern (namespace:type)', () => {
      const result = validatePayload('taskType', 'legal-guild:contract_review');
      expect(result.valid).toBe(true);
    });

    it('rejects invalid format (no namespace separator)', () => {
      const result = validatePayload('taskType', 'invalid_task_without_namespace');
      expect(result.valid).toBe(false);
    });

    it('rejects empty string', () => {
      const result = validatePayload('taskType', '');
      expect(result.valid).toBe(false);
    });
  });

  describe('TaskTypeCohort schema', () => {
    it('validates full cohort with confidence_threshold', () => {
      const result = validatePayload('taskTypeCohort', {
        model_id: 'gpt-4o',
        personal_score: 0.85,
        sample_count: 42,
        last_updated: '2026-02-24T10:00:00Z',
        task_type: 'code_review',
        confidence_threshold: 30,
      });
      expect(result.valid).toBe(true);
    });

    it('validates cohort without confidence_threshold (optional)', () => {
      const result = validatePayload('taskTypeCohort', {
        model_id: 'native',
        personal_score: null,
        sample_count: 0,
        last_updated: '2026-02-24T10:00:00Z',
        task_type: 'general',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects cohort with missing model_id', () => {
      const result = validatePayload('taskTypeCohort', {
        personal_score: 0.5,
        sample_count: 10,
        last_updated: '2026-02-24T10:00:00Z',
        task_type: 'analysis',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('ReputationEvent schema', () => {
    it('validates quality_signal event', () => {
      const result = validatePayload('reputationEvent', {
        event_id: '550e8400-e29b-41d4-a716-446655440001',
        agent_id: 'agent-dixie-01',
        collection_id: 'collection-honeyjar',
        timestamp: '2026-02-24T10:00:00Z',
        type: 'quality_signal',
        score: 0.92,
        task_type: 'code_review',
      });
      expect(result.valid).toBe(true);
    });

    it('validates task_completed event', () => {
      const result = validatePayload('reputationEvent', {
        event_id: '550e8400-e29b-41d4-a716-446655440002',
        agent_id: 'agent-dixie-01',
        collection_id: 'collection-honeyjar',
        timestamp: '2026-02-24T10:05:00Z',
        type: 'task_completed',
        task_type: 'analysis',
        success: true,
      });
      expect(result.valid).toBe(true);
    });

    it('validates credential_update event', () => {
      const result = validatePayload('reputationEvent', {
        event_id: '550e8400-e29b-41d4-a716-446655440003',
        agent_id: 'agent-dixie-01',
        collection_id: 'collection-honeyjar',
        timestamp: '2026-02-24T10:10:00Z',
        type: 'credential_update',
        credential_id: '660e8400-e29b-41d4-a716-446655440004',
        action: 'issued',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects event with missing required fields', () => {
      const result = validatePayload('reputationEvent', {
        type: 'quality_signal',
        score: 0.5,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('ScoringPathLog schema', () => {
    it('validates entry with hash chain fields', () => {
      const result = validatePayload('scoringPathLog', {
        path: 'task_cohort',
        model_id: 'gpt-4o',
        task_type: 'code_review',
        reason: 'Task-specific cohort found',
        scored_at: '2026-02-24T10:00:00Z',
        entry_hash: 'sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        previous_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      });
      expect(result.valid).toBe(true);
    });

    it('validates minimal entry without hash chain (backward compat)', () => {
      const result = validatePayload('scoringPathLog', {
        path: 'tier_default',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects entry with invalid hash format', () => {
      const result = validatePayload('scoringPathLog', {
        path: 'aggregate',
        entry_hash: 'not-a-valid-hash',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('Full suite', () => {
    it('passes with all governance schemas included', () => {
      const suite = runFullSuite();
      expect(suite.passed).toBe(true);
      expect(suite.failed_count).toBe(0);
      // Original 5 + 8 governance samples = 13 total
      expect(suite.total).toBeGreaterThanOrEqual(13);
    });
  });
});
