/**
 * Dixie BFF Type Definitions
 *
 * DECISION: Hounfour Protocol Alignment (Sprint 13, S-1)
 * See: grimoires/loa/context/adr-hounfour-alignment.md
 *
 * Type Audit — Dixie types vs @0xhoneyjar/loa-hounfour protocol types:
 *
 * | Dixie Type        | Hounfour Equivalent           | Status                  |
 * |-------------------|-------------------------------|-------------------------|
 * | CircuitState      | CircuitState (core)           | Naming divergence¹      |
 * | ServiceHealth     | —                             | Dixie-specific (BFF)    |
 * | HealthResponse    | —                             | Dixie-specific (BFF)    |
 * | FinnHealthResponse| —                             | Dixie-specific (proxy)  |
 * | ErrorResponse     | —                             | Dixie-specific (BFF)    |
 * | AllowlistData     | AccessPolicy (core)           | Partial — see 13.3      |
 * | AuditEntry        | AuditTrailEntry (economy)     | Subset                  |
 * | OracleIdentity    | AgentIdentity (core)          | Subset                  |
 *
 * ¹ Dixie uses 'half-open' (kebab), Hounfour uses 'half_open' (snake).
 *   Both are valid circuit breaker naming. Dixie retains its own type
 *   because the BFF circuit breaker is an internal concern, not a
 *   cross-system protocol boundary. When Dixie reports health to
 *   Hounfour-consuming services, it should map to the protocol type.
 *
 * Types imported from Hounfour (protocol-aligned):
 * - AccessPolicy (used in allowlist architecture — Task 13.3)
 * - AgentIdentity (used in identity route response)
 * - CircuitState as HounfourCircuitState (for protocol mapping)
 */

// Aligned: loa-hounfour protocol types for cross-system contracts
export type {
  AccessPolicy,
  AgentIdentity,
  CircuitState as HounfourCircuitState,
} from '@0xhoneyjar/loa-hounfour';

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
      sources: number;
      stale_sources: number;
    };
  };
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
