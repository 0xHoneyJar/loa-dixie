/**
 * Settlement client for x402 payment settlement via freeside.
 *
 * Implements quote → settle flow with circuit breaker and idempotency.
 * When x402 is disabled or facilitator unavailable, returns mock receipts.
 *
 * @since cycle-022 — Sprint 119, Task 3.4
 */

export interface QuoteRequest {
  model: string;
  estimatedTokens: number;
  walletAddress: string;
}

export interface QuoteResponse {
  quoteId: string;
  amountMicroUsd: number;
  expiresAt: string;
}

export interface SettlementRequest {
  quoteId: string;
  idempotencyKey: string;
  actualInputTokens: number;
  actualOutputTokens: number;
}

export interface SettlementReceipt {
  receiptId: string;
  transactionHash: string;
  amountMicroUsd: number;
  settledAt: string;
}

export interface SettlementClientConfig {
  facilitatorUrl: string | null;
  enabled: boolean;
}

export class SettlementClient {
  private failureCount = 0;
  private circuitOpen = false;
  private circuitResetAt = 0;
  private readonly maxFailures = 5;
  private readonly resetWindowMs = 30_000;

  constructor(private config: SettlementClientConfig) {}

  async quote(request: QuoteRequest): Promise<QuoteResponse> {
    if (!this.config.enabled || !this.config.facilitatorUrl) {
      return this.mockQuote(request);
    }

    if (this.isCircuitOpen()) {
      throw new Error('Settlement circuit breaker open');
    }

    try {
      const res = await fetch(`${this.config.facilitatorUrl}/api/settlement/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) throw new Error(`Quote failed: ${res.status}`);
      this.resetCircuit();
      return await res.json() as QuoteResponse;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  async settle(request: SettlementRequest): Promise<SettlementReceipt> {
    if (!this.config.enabled || !this.config.facilitatorUrl) {
      return this.mockSettle(request);
    }

    if (this.isCircuitOpen()) {
      throw new Error('Settlement circuit breaker open');
    }

    try {
      const res = await fetch(`${this.config.facilitatorUrl}/api/settlement/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) throw new Error(`Settlement failed: ${res.status}`);
      this.resetCircuit();
      return await res.json() as SettlementReceipt;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  private mockQuote(request: QuoteRequest): QuoteResponse {
    return {
      quoteId: `mock-quote-${Date.now()}`,
      amountMicroUsd: Math.ceil(request.estimatedTokens * 0.003 * 1000),
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    };
  }

  private mockSettle(request: SettlementRequest): SettlementReceipt {
    return {
      receiptId: `mock-rcpt-${Date.now()}`,
      transactionHash: `0xmock${request.idempotencyKey.slice(0, 8)}`,
      amountMicroUsd: 0,
      settledAt: new Date().toISOString(),
    };
  }

  private isCircuitOpen(): boolean {
    if (!this.circuitOpen) return false;
    if (Date.now() >= this.circuitResetAt) {
      this.circuitOpen = false;
      this.failureCount = 0;
      return false;
    }
    return true;
  }

  private recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.maxFailures) {
      this.circuitOpen = true;
      this.circuitResetAt = Date.now() + this.resetWindowMs;
    }
  }

  private resetCircuit(): void {
    this.failureCount = 0;
    this.circuitOpen = false;
  }
}
