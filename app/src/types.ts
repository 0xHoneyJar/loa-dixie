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

/** Circuit breaker states */
export type CircuitState = 'closed' | 'open' | 'half-open';
