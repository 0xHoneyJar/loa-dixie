import type { CircuitState, FinnHealthResponse, ErrorResponse } from '../types.js';

/** Mapped BFF error from a loa-finn upstream error */
export interface BffError {
  status: number;
  body: ErrorResponse;
}

/**
 * Typed HTTP client for loa-finn.
 * Includes a circuit breaker: opens after `maxFailures` consecutive
 * failures within `windowMs`, half-opens after `cooldownMs`.
 */
export class FinnClient {
  private readonly baseUrl: string;
  private circuitState: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private lastFailureAt = 0;
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private readonly cooldownMs: number;
  private readonly timeoutMs: number;

  constructor(
    baseUrl: string,
    opts?: {
      maxFailures?: number;
      windowMs?: number;
      cooldownMs?: number;
      timeoutMs?: number;
    },
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.maxFailures = opts?.maxFailures ?? 5;
    this.windowMs = opts?.windowMs ?? 30_000;
    this.cooldownMs = opts?.cooldownMs ?? 10_000;
    this.timeoutMs = opts?.timeoutMs ?? 5_000;
  }

  /** Current circuit breaker state */
  get circuit(): CircuitState {
    return this.circuitState;
  }

  /** Check loa-finn health */
  async getHealth(): Promise<FinnHealthResponse> {
    const res = await this.request<FinnHealthResponse>('GET', '/health');
    return res;
  }

  /** Generic request with circuit breaker logic */
  async request<T>(
    method: string,
    path: string,
    opts?: {
      body?: unknown;
      headers?: Record<string, string>;
      timeoutMs?: number;
    },
  ): Promise<T> {
    this.checkCircuit();

    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      opts?.timeoutMs ?? this.timeoutMs,
    );

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...opts?.headers,
        },
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        this.recordFailure();
        const mapped = mapFinnError(res.status, errorBody);
        throw mapped;
      }

      this.recordSuccess();
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Object && 'status' in err) {
        throw err; // Already a BffError
      }
      this.recordFailure();
      throw {
        status: 503,
        body: {
          error: 'upstream_error',
          message: 'Backend service unavailable',
        },
      } satisfies BffError;
    }
  }

  private checkCircuit(): void {
    if (this.circuitState === 'open') {
      const elapsed = Date.now() - this.lastFailureAt;
      if (elapsed >= this.cooldownMs) {
        this.circuitState = 'half-open';
      } else {
        throw {
          status: 503,
          body: {
            error: 'circuit_open',
            message: 'Service temporarily unavailable (circuit breaker open)',
          },
        } satisfies BffError;
      }
    }
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.circuitState = 'closed';
  }

  private recordFailure(): void {
    const now = Date.now();
    if (now - this.lastFailureAt > this.windowMs) {
      this.consecutiveFailures = 0;
    }
    this.consecutiveFailures++;
    this.lastFailureAt = now;

    if (this.consecutiveFailures >= this.maxFailures) {
      this.circuitState = 'open';
    }
  }
}

/** Map loa-finn HTTP errors to BFF-friendly responses */
function mapFinnError(
  status: number,
  body: Record<string, unknown>,
): BffError {
  const code = (body.code as string) ?? '';
  switch (code) {
    case 'BUDGET_EXCEEDED':
      return {
        status: 402,
        body: { error: 'usage_limit', message: 'Usage limit reached' },
      };
    case 'RATE_LIMITED':
      return {
        status: 429,
        body: {
          error: 'rate_limited',
          message: 'Too many requests',
          retry_after: 60,
        },
      };
    case 'ORACLE_MODEL_UNAVAILABLE':
      return {
        status: 503,
        body: {
          error: 'service_unavailable',
          message: 'Oracle temporarily unavailable',
        },
      };
    case 'PROVIDER_UNAVAILABLE':
      return {
        status: 502,
        body: {
          error: 'service_unavailable',
          message: 'Service temporarily unavailable',
        },
      };
    default:
      return {
        status,
        body: {
          error: 'upstream_error',
          message:
            (body.message as string) ?? `Upstream error (HTTP ${status})`,
        },
      };
  }
}
