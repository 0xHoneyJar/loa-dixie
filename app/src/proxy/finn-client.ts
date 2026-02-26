import type { CircuitState, FinnHealthResponse } from '../types.js';
import { computeReqHash, deriveIdempotencyKey } from '@0xhoneyjar/loa-hounfour/integrity';
import { BffError } from '../errors.js';
import { startSanitizedSpan } from '../utils/span-sanitizer.js';

// Re-export BffError for consumers that imported it from finn-client
export { BffError } from '../errors.js';

/** Log callback for circuit breaker observability (dependency injection). */
export type LogCallback = (level: 'error' | 'warn' | 'info', data: Record<string, unknown>) => void;

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
  private readonly log: LogCallback | null;

  /**
   * Circuit breaker thresholds (defaults):
   * - maxFailures: 5 — matches Netflix Hystrix default; 3 is too sensitive for startup transients
   * - windowMs: 30s — failure window resets counter; prevents stale failures from tripping circuit
   * - cooldownMs: 10s — time in open state before half-open probe; fast enough for rolling deploys
   * - timeoutMs: 5s — per-request timeout; loa-finn's P99 is ~2s, 5s gives 2.5x headroom
   */
  constructor(
    baseUrl: string,
    opts?: {
      maxFailures?: number;
      windowMs?: number;
      cooldownMs?: number;
      timeoutMs?: number;
      log?: LogCallback;
    },
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.maxFailures = opts?.maxFailures ?? 5;
    this.windowMs = opts?.windowMs ?? 30_000;
    this.cooldownMs = opts?.cooldownMs ?? 10_000;
    this.timeoutMs = opts?.timeoutMs ?? 5_000;
    this.log = opts?.log ?? null;
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
      /** Tenant identifier for idempotency key derivation (e.g. nftId) */
      nftId?: string;
    },
  ): Promise<T> {
    return startSanitizedSpan(
      'dixie.finn.inference',
      { model: path, latency_ms: 0 },
      async (span) => {
        this.checkCircuit();

        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          opts?.timeoutMs ?? this.timeoutMs,
        );

        const start = Date.now();

        // Compute integrity headers for mutation methods (POST/PUT/PATCH)
        // Serialize body once and reuse for both hash and fetch (Bridge iter2-medium-3)
        const isMutation = ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase());
        const integrityHeaders: Record<string, string> = {};
        const serializedBody = opts?.body ? JSON.stringify(opts.body) : undefined;

        if (isMutation && serializedBody) {
          const bodyBuffer = Buffer.from(serializedBody, 'utf-8');
          const reqHash = computeReqHash(bodyBuffer);
          integrityHeaders['X-Req-Hash'] = reqHash;

          const tenant = opts?.nftId ?? 'anonymous';
          const idempotencyKey = deriveIdempotencyKey(tenant, reqHash, 'loa-finn', path);
          integrityHeaders['X-Idempotency-Key'] = idempotencyKey;
        }

        try {
          const res = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...integrityHeaders,
              ...opts?.headers,
            },
            body: serializedBody,
            signal: controller.signal,
          });

          clearTimeout(timeout);
          span.setAttribute('latency_ms', Date.now() - start);

          if (!res.ok) {
            const errorBody = await res.json().catch(() => ({}));
            this.recordFailure();
            throw mapFinnError(res.status, errorBody);
          }

          this.recordSuccess();
          return (await res.json()) as T;
        } catch (err) {
          clearTimeout(timeout);
          span.setAttribute('latency_ms', Date.now() - start);
          if (BffError.isBffError(err)) {
            throw err;
          }
          this.recordFailure();
          throw new BffError(503, {
            error: 'upstream_error',
            message: 'Backend service unavailable',
          });
        }
      },
    );
  }

  /**
   * Transition the circuit breaker to a new state with structured logging.
   *
   * For Future Agents: The `circuit_breaker_transition` event name is the stable contract.
   * CloudWatch alarms, dashboards, and alerting rules match on this string.
   * Do not rename without updating the Terraform metric filter in deploy/terraform/dixie.tf.
   */
  private transitionTo(newState: CircuitState): void {
    const from = this.circuitState;
    if (from === newState) return; // no transition, no log

    this.circuitState = newState;

    if (this.log) {
      const level = newState === 'open' ? 'error' : newState === 'half-open' ? 'warn' : 'info';
      this.log(level, {
        event: 'circuit_breaker_transition',
        from,
        to: newState,
        circuit_state: newState,
        consecutive_failures: this.consecutiveFailures,
        service: 'loa-finn',
      });
    }
  }

  private checkCircuit(): void {
    if (this.circuitState === 'open') {
      const elapsed = Date.now() - this.lastFailureAt;
      if (elapsed >= this.cooldownMs) {
        this.transitionTo('half-open');
      } else {
        throw new BffError(503, {
          error: 'circuit_open',
          message: 'Service temporarily unavailable (circuit breaker open)',
        });
      }
    }
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.transitionTo('closed');
  }

  private recordFailure(): void {
    const now = Date.now();
    if (now - this.lastFailureAt > this.windowMs) {
      this.consecutiveFailures = 0;
    }
    this.consecutiveFailures++;
    this.lastFailureAt = now;

    if (this.consecutiveFailures >= this.maxFailures) {
      this.transitionTo('open');
    }
  }
}

/** Map loa-finn HTTP errors to BFF-friendly BffError instances */
function mapFinnError(
  status: number,
  body: Record<string, unknown>,
): BffError {
  const code = (body.code as string) ?? '';
  switch (code) {
    case 'BUDGET_EXCEEDED':
      return new BffError(402, { error: 'usage_limit', message: 'Usage limit reached' });
    case 'RATE_LIMITED':
      return new BffError(429, {
        error: 'rate_limited',
        message: 'Too many requests',
        retry_after: 60,
      });
    case 'ORACLE_MODEL_UNAVAILABLE':
      return new BffError(503, {
        error: 'service_unavailable',
        message: 'Oracle temporarily unavailable',
      });
    case 'PROVIDER_UNAVAILABLE':
      return new BffError(502, {
        error: 'service_unavailable',
        message: 'Service temporarily unavailable',
      });
    default:
      return new BffError(status, {
        error: 'upstream_error',
        message: (body.message as string) ?? `Upstream error (HTTP ${status})`,
      });
  }
}
