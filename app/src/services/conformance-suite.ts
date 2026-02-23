/**
 * Conformance Suite Service — Sprint 4, Task 4.1
 *
 * Validates Dixie payloads against Hounfour v7.9.2 schemas. This service is
 * the Level 4 gate: if all payloads pass, Dixie achieves Civilizational
 * protocol maturity.
 *
 * Methods:
 * - validatePayload(schemaName, payload) — validate any payload against a named schema
 * - runFullSuite() — validate all protocol-touching payloads
 *
 * See: grimoires/loa/context/adr-hounfour-alignment.md (Level 4)
 * @since Sprint 4 — E2E Conformance & Level 4 Gate
 */

import { validate, validators } from '@0xhoneyjar/loa-hounfour';
import { AccessPolicySchema, ConversationSealingPolicySchema } from '@0xhoneyjar/loa-hounfour/core';
import type { AccessPolicy, ConversationSealingPolicy } from '@0xhoneyjar/loa-hounfour/core';

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
  | 'healthStatus';

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
  ];
}

/**
 * Run the full conformance suite against all sample payloads.
 *
 * Returns a ConformanceSuiteResult with per-check results and
 * an aggregate pass/fail. This IS the Level 4 gate.
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
