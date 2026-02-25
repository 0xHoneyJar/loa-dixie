/**
 * Conformance Suite Service — Sprint 4, Task 4.1
 *
 * Validates Dixie payloads against Hounfour v8.2.0 schemas. This service is
 * the Level 4+ gate: if all payloads pass, Dixie achieves protocol maturity.
 *
 * Methods:
 * - validatePayload(schemaName, payload) — validate any payload against a named schema
 * - runFullSuite() — validate all protocol-touching payloads
 *
 * See: grimoires/loa/context/adr-hounfour-alignment.md (Level 4+)
 * @since Sprint 4 — E2E Conformance & Level 4 Gate
 * @since cycle-005 — Sprint 61 (governance schema extension for v7.11.0)
 * @since cycle-007 — Sprint 73, Task S1-T6 (v8.2.0 schema extensions)
 */

import { validate, validators } from '@0xhoneyjar/loa-hounfour';
import { AccessPolicySchema, ConversationSealingPolicySchema } from '@0xhoneyjar/loa-hounfour/core';
import type { AccessPolicy, ConversationSealingPolicy } from '@0xhoneyjar/loa-hounfour/core';
import {
  TaskTypeSchema,
  TaskTypeCohortSchema,
  ReputationEventSchema,
  ScoringPathLogSchema,
  QualityObservationSchema,
  ModelPerformanceEventSchema,
} from '@0xhoneyjar/loa-hounfour/governance';

/**
 * Supported schema names for conformance validation.
 * Maps to hounfour validator keys.
 */
export type ConformanceSchemaName =
  | 'accessPolicy'
  | 'conversationSealingPolicy'
  | 'streamEvent'
  | 'billingEntry'
  | 'domainEvent'
  | 'agentDescriptor'
  | 'healthStatus'
  | 'taskType'
  | 'taskTypeCohort'
  | 'reputationEvent'
  | 'scoringPathLog'
  // v8.2.0 additions
  | 'qualityObservation'
  | 'modelPerformanceEvent';

/** Result of a single conformance check. */
export interface ConformanceResult {
  readonly schemaName: string;
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings?: string[];
}

/** Result of the full conformance suite. */
export interface ConformanceSuiteResult {
  readonly passed: boolean;
  readonly total: number;
  readonly passed_count: number;
  readonly failed_count: number;
  readonly results: ConformanceResult[];
  readonly timestamp: string;
}

/**
 * Governance schema map for direct TypeBox validation.
 * These schemas are imported from @0xhoneyjar/loa-hounfour/governance.
 */
const GOVERNANCE_SCHEMAS: Record<string, unknown> = {
  taskType: TaskTypeSchema,
  taskTypeCohort: TaskTypeCohortSchema,
  reputationEvent: ReputationEventSchema,
  scoringPathLog: ScoringPathLogSchema,
  // v8.2.0 additions
  qualityObservation: QualityObservationSchema,
  modelPerformanceEvent: ModelPerformanceEventSchema,
};

/**
 * Validate a single payload against a named hounfour schema.
 *
 * Uses the compiled TypeBox validators from hounfour for structural
 * validation, plus cross-field validators when available.
 */
export function validatePayload(
  schemaName: ConformanceSchemaName,
  payload: unknown,
): ConformanceResult {
  try {
    // For schemas with cross-field validators, use validate() with the schema
    if (schemaName === 'accessPolicy') {
      const result = validate(AccessPolicySchema, payload);
      return {
        schemaName,
        valid: result.valid,
        errors: result.valid ? [] : (result as { errors: string[] }).errors,
        warnings: result.warnings,
      };
    }

    if (schemaName === 'conversationSealingPolicy') {
      const result = validate(ConversationSealingPolicySchema, payload);
      return {
        schemaName,
        valid: result.valid,
        errors: result.valid ? [] : (result as { errors: string[] }).errors,
        warnings: result.warnings,
      };
    }

    // Governance schemas — use validate() with TypeBox schemas directly
    const govSchema = GOVERNANCE_SCHEMAS[schemaName];
    if (govSchema) {
      const result = validate(govSchema, payload);
      return {
        schemaName,
        valid: result.valid,
        errors: result.valid ? [] : (result as { errors: string[] }).errors,
        warnings: result.warnings,
      };
    }

    // For other schemas, use the pre-built validators
    const validatorFn = validators[schemaName];
    if (!validatorFn) {
      return {
        schemaName,
        valid: false,
        errors: [`Unknown schema: ${schemaName}`],
      };
    }

    const compiled = validatorFn();
    if (compiled.Check(payload)) {
      return { schemaName, valid: true, errors: [] };
    }

    const errors = [...compiled.Errors(payload)].map(
      (e) => `${e.path}: ${e.message}`,
    );
    return { schemaName, valid: false, errors };
  } catch (err) {
    return {
      schemaName,
      valid: false,
      errors: [`Validation error: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

/**
 * Sample payloads representing Dixie's protocol-touching data shapes.
 * These are canonical examples of what Dixie produces at runtime.
 */
function getSamplePayloads(): Array<{ schemaName: ConformanceSchemaName; payload: unknown; label: string }> {
  return [
    // AccessPolicy — role_based (Phase 1 default)
    {
      schemaName: 'accessPolicy',
      label: 'DEFAULT_ACCESS_POLICY (role_based)',
      payload: {
        type: 'role_based',
        roles: ['team'],
        audit_required: true,
        revocable: false,
      } satisfies AccessPolicy,
    },
    // AccessPolicy — time_limited (Phase 2 conviction tier)
    {
      schemaName: 'accessPolicy',
      label: 'time_limited AccessPolicy',
      payload: {
        type: 'time_limited',
        duration_hours: 720,
        audit_required: true,
        revocable: true,
      } satisfies AccessPolicy,
    },
    // AccessPolicy — none (denial)
    {
      schemaName: 'accessPolicy',
      label: 'none AccessPolicy',
      payload: {
        type: 'none',
        audit_required: false,
        revocable: false,
      } satisfies AccessPolicy,
    },
    // ConversationSealingPolicy — no encryption
    {
      schemaName: 'conversationSealingPolicy',
      label: 'ConversationSealingPolicy (no encryption)',
      payload: {
        encryption_scheme: 'none',
        key_derivation: 'none',
        access_audit: true,
      } satisfies ConversationSealingPolicy,
    },
    // ConversationSealingPolicy — with encryption and access policy
    {
      schemaName: 'conversationSealingPolicy',
      label: 'ConversationSealingPolicy (encrypted, role_based)',
      payload: {
        encryption_scheme: 'aes-256-gcm',
        key_derivation: 'hkdf-sha256',
        key_reference: 'vault://keys/conversation/1',
        access_audit: true,
        access_policy: {
          type: 'role_based',
          roles: ['owner'],
          audit_required: true,
          revocable: true,
        },
      } satisfies ConversationSealingPolicy,
    },

    // ─── Governance schemas (v7.11.0) ───────────────────────────────────

    // TaskType — protocol literal
    {
      schemaName: 'taskType',
      label: 'TaskType protocol literal (code_review)',
      payload: 'code_review',
    },
    // TaskType — community-defined (namespace:type pattern)
    {
      schemaName: 'taskType',
      label: 'TaskType community pattern (legal-guild:contract_review)',
      payload: 'legal-guild:contract_review',
    },
    // TaskTypeCohort — full cohort with confidence_threshold
    {
      schemaName: 'taskTypeCohort',
      label: 'TaskTypeCohort with confidence_threshold',
      payload: {
        model_id: 'gpt-4o',
        personal_score: 0.85,
        sample_count: 42,
        last_updated: '2026-02-24T10:00:00Z',
        task_type: 'code_review',
        confidence_threshold: 30,
      },
    },
    // ReputationEvent — quality_signal variant
    {
      schemaName: 'reputationEvent',
      label: 'ReputationEvent (quality_signal)',
      payload: {
        event_id: '550e8400-e29b-41d4-a716-446655440001',
        agent_id: 'agent-dixie-01',
        collection_id: 'collection-honeyjar',
        timestamp: '2026-02-24T10:00:00Z',
        type: 'quality_signal',
        score: 0.92,
        task_type: 'code_review',
      },
    },
    // ReputationEvent — task_completed variant
    {
      schemaName: 'reputationEvent',
      label: 'ReputationEvent (task_completed)',
      payload: {
        event_id: '550e8400-e29b-41d4-a716-446655440002',
        agent_id: 'agent-dixie-01',
        collection_id: 'collection-honeyjar',
        timestamp: '2026-02-24T10:05:00Z',
        type: 'task_completed',
        task_type: 'analysis',
        success: true,
        duration_ms: 4500,
      },
    },
    // ReputationEvent — credential_update variant
    {
      schemaName: 'reputationEvent',
      label: 'ReputationEvent (credential_update)',
      payload: {
        event_id: '550e8400-e29b-41d4-a716-446655440003',
        agent_id: 'agent-dixie-01',
        collection_id: 'collection-honeyjar',
        timestamp: '2026-02-24T10:10:00Z',
        type: 'credential_update',
        credential_id: '660e8400-e29b-41d4-a716-446655440004',
        action: 'issued',
      },
    },
    // ScoringPathLog — with hash chain fields (v7.11.0)
    {
      schemaName: 'scoringPathLog',
      label: 'ScoringPathLog with hash chain',
      payload: {
        path: 'task_cohort',
        model_id: 'gpt-4o',
        task_type: 'code_review',
        reason: 'Task-specific cohort found',
        scored_at: '2026-02-24T10:00:00Z',
        entry_hash: 'sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        previous_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    },
    // ScoringPathLog — without hash chain (backward compat)
    {
      schemaName: 'scoringPathLog',
      label: 'ScoringPathLog without hash chain (backward compat)',
      payload: {
        path: 'tier_default',
      },
    },

    // ─── v8.2.0 schema additions ─────────────────────────────────────

    // ReputationEvent — model_performance variant (4th variant, v8.2.0)
    {
      schemaName: 'reputationEvent',
      label: 'ReputationEvent (model_performance)',
      payload: {
        event_id: '550e8400-e29b-41d4-a716-446655440004',
        agent_id: 'agent-dixie-01',
        collection_id: 'collection-honeyjar',
        timestamp: '2026-02-25T08:00:00Z',
        type: 'model_performance',
        model_id: 'gpt-4o',
        provider: 'openai',
        pool_id: 'pool-primary',
        task_type: 'code_review',
        quality_observation: {
          score: 0.88,
          dimensions: { coherence: 0.92, accuracy: 0.85 },
          latency_ms: 1200,
          evaluated_by: 'dixie-quality-feedback:bridge',
        },
      },
    },
    // QualityObservation — standalone
    {
      schemaName: 'qualityObservation',
      label: 'QualityObservation (standalone)',
      payload: {
        score: 0.92,
        dimensions: { coherence: 0.95, accuracy: 0.88, relevance: 0.93 },
        latency_ms: 800,
        evaluated_by: 'dixie-quality-feedback:flatline',
      },
    },
    // QualityObservation — minimal (score only)
    {
      schemaName: 'qualityObservation',
      label: 'QualityObservation (minimal)',
      payload: {
        score: 0.75,
      },
    },
    // ModelPerformanceEvent — direct schema validation
    {
      schemaName: 'modelPerformanceEvent',
      label: 'ModelPerformanceEvent (full)',
      payload: {
        event_id: '550e8400-e29b-41d4-a716-446655440005',
        agent_id: 'agent-dixie-01',
        collection_id: 'collection-honeyjar',
        timestamp: '2026-02-25T08:05:00Z',
        type: 'model_performance',
        model_id: 'claude-opus-4-20250514',
        provider: 'anthropic',
        pool_id: 'pool-premium',
        task_type: 'analysis',
        quality_observation: {
          score: 0.95,
          dimensions: { depth: 0.97, clarity: 0.93 },
          latency_ms: 2400,
          evaluated_by: 'dixie-quality-feedback:audit',
        },
        request_context: {
          request_id: '550e8400-e29b-41d4-a716-446655440099',
        },
      },
    },
    // ReputationEvent — quality_signal with 'unspecified' TaskType (v8.2.0)
    {
      schemaName: 'reputationEvent',
      label: 'ReputationEvent (quality_signal with unspecified task_type)',
      payload: {
        event_id: '550e8400-e29b-41d4-a716-446655440006',
        agent_id: 'agent-dixie-01',
        collection_id: 'collection-honeyjar',
        timestamp: '2026-02-25T08:10:00Z',
        type: 'quality_signal',
        score: 0.80,
        task_type: 'unspecified',
      },
    },
  ];
}

/**
 * Run the full conformance suite against all sample payloads.
 *
 * Returns a ConformanceSuiteResult with per-check results and
 * an aggregate pass/fail. This IS the Level 4+ gate.
 */
export function runFullSuite(): ConformanceSuiteResult {
  const samples = getSamplePayloads();
  const results: ConformanceResult[] = [];

  for (const { schemaName, payload } of samples) {
    results.push(validatePayload(schemaName, payload));
  }

  const passed_count = results.filter((r) => r.valid).length;
  const failed_count = results.filter((r) => !r.valid).length;

  return {
    passed: failed_count === 0,
    total: results.length,
    passed_count,
    failed_count,
    results,
    timestamp: new Date().toISOString(),
  };
}
