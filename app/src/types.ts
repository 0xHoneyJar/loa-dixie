/**
 * Dixie BFF Type Definitions
 *
 * DECISION: Hounfour Protocol Alignment (v7.9.2, Level 4 — Civilizational)
 * See: grimoires/loa/context/adr-hounfour-alignment.md
 *
 * Type Audit — Dixie types vs @0xhoneyjar/loa-hounfour v7.9.2 protocol types:
 *
 * | Dixie Type           | Hounfour Equivalent              | Status                    |
 * |----------------------|----------------------------------|---------------------------|
 * | CircuitState         | CircuitState (core)              | Naming divergence¹        |
 * | ServiceHealth        | —                                | Dixie-specific (BFF)      |
 * | HealthResponse       | —                                | Dixie-specific (BFF)      |
 * | FinnHealthResponse   | —                                | Dixie-specific (proxy)    |
 * | ErrorResponse        | —                                | Dixie-specific (BFF)      |
 * | AllowlistData        | AccessPolicy (core)              | Replaced — Sprint 1       |
 * | AuditEntry           | AuditTrailEntry (economy)        | Subset                    |
 * | OracleIdentity       | AgentIdentity (core)             | Subset                    |
 * | —                    | AgentDescriptor (core)           | Imported — Sprint 1       |
 *
 * Hounfour imports across the codebase (v7.9.2):
 *
 * | File                            | Import                                    | Barrel   |
 * |---------------------------------|-------------------------------------------|----------|
 * | types.ts                        | AccessPolicy, AgentIdentity,              | core     |
 * |                                 | AgentDescriptor, CircuitState             |          |
 * | services/access-policy-validator | validators, validateAccessPolicy          | root     |
 * | services/state-machine          | CircuitState, isValidTransition           | core     |
 * | services/conviction-boundary    | evaluateEconomicBoundary                  | root     |
 * |                                 | TrustLayerSnapshot, CapitalLayerSnapshot, | economy  |
 * |                                 | QualificationCriteria, EBEResult          |          |
 * | services/reputation-service     | isReliableReputation,                     | govern.  |
 * |                                 | computeBlendedScore, etc.                 |          |
 * | services/conformance-suite      | validate, validators                      | root     |
 * |                                 | AccessPolicySchema,                       | core     |
 * |                                 | ConversationSealingPolicySchema           |          |
 * | types/economic                  | computeCostMicro,                         | economy  |
 * |                                 | verifyPricingConservation, PricingInput   |          |
 * | types/stream-events             | StreamStartSchema, StreamChunkSchema,     | core     |
 * |                                 | etc. (type re-exports)                    |          |
 * | proxy/finn-client               | computeReqHash, deriveIdempotencyKey      | integr.  |
 *
 * ¹ Dixie uses 'half-open' (kebab), Hounfour uses 'half_open' (snake).
 *   Both are valid circuit breaker naming. Dixie retains its own type
 *   because the BFF circuit breaker is an internal concern, not a
 *   cross-system protocol boundary. When Dixie reports health to
 *   Hounfour-consuming services, it should map to the protocol type.
 *
 * Types imported from Hounfour v7.9.2 (protocol-aligned):
 * - AccessPolicy (used in allowlist architecture, validated via hounfour validators)
 * - AgentIdentity (used in identity route response)
 * - AgentDescriptor (agent metadata for protocol-level agent descriptions)
 * - CircuitState as HounfourCircuitState (for protocol mapping)
 */

// DECISION: Hounfour protocol adoption — Level 4 (Civilizational) ACHIEVED.
// Level 1 (Interface): Types imported — Sprint 13
// Level 2 (Structural): Validators + state machines aligned — Sprint 1
// Level 3 (Behavioral): Runtime invariants, BigInt economics, integrity — Sprints 2-3
// Level 4 (Civilizational): E2E conformance suite passes all schemas — Sprint 4
// See: grimoires/loa/context/adr-hounfour-alignment.md

// Core protocol types — Hounfour v7.9.2 Level 2+
export type {
  AccessPolicy,
  AgentIdentity,
  AgentDescriptor,
  CircuitState as HounfourCircuitState,
} from '@0xhoneyjar/loa-hounfour/core';

/** Health status for an individual service */
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unreachable';
  latency_ms?: number;
  error?: string;
}

/** Aggregated health response */
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime_seconds: number;
  services: {
    dixie: ServiceHealth;
    loa_finn: ServiceHealth;
    knowledge_corpus?: {
      status: 'healthy' | 'degraded';
      corpus_version: number;
      sources: number;
      stale_sources: number;
    };
  };
  /** Phase 2: Infrastructure service health (PostgreSQL, Redis, NATS) */
  infrastructure?: Record<string, ServiceHealth>;
  timestamp: string;
}

/** loa-finn health response shape */
export interface FinnHealthResponse {
  status: string;
  uptime?: number;
  version?: string;
}

/** Error response shape */
export interface ErrorResponse {
  error: string;
  message: string;
  request_id?: string;
  retry_after?: number;
}

/**
 * Circuit breaker states (Dixie-internal).
 *
 * Note: Hounfour uses 'half_open' (snake_case), Dixie uses 'half-open' (kebab).
 * This is an internal BFF concern — when reporting to protocol-level consumers,
 * map via: dixieState === 'half-open' ? 'half_open' : dixieState
 */
export type CircuitState = 'closed' | 'open' | 'half-open';
