import { randomBytes } from 'node:crypto';

export interface Ticket {
  wallet: string;
  createdAt: number;
}

/**
 * In-memory store for short-lived WebSocket authentication tickets.
 *
 * Tickets are single-use, prefixed with `wst_` for log/scanner identification,
 * and expire after a configurable TTL (default 30s). A periodic sweep cleans
 * expired tickets to prevent memory leaks under load.
 *
 * Pattern: Discord gateway authentication — JWT stays in HTTP headers,
 * WebSocket URL receives only a disposable ticket.
 */
export class TicketStore {
  private readonly tickets = new Map<string, Ticket>();
  private readonly ttlMs: number;
  private readonly sweepInterval: ReturnType<typeof setInterval> | null;
  private readonly maxTicketsPerWallet: number;
  private readonly walletTicketCount = new Map<string, number>();

  constructor(ttlMs = 30_000, sweepIntervalMs = 60_000, maxTicketsPerWallet = 5) {
    this.ttlMs = ttlMs;
    this.maxTicketsPerWallet = maxTicketsPerWallet;

    // Periodic sweep of expired tickets — unref so it doesn't prevent process exit
    this.sweepInterval = setInterval(() => this.sweep(), sweepIntervalMs);
    this.sweepInterval.unref();
  }

  /** Issue a new single-use ticket for the given wallet.
   *  Returns null if the wallet has reached the per-wallet ticket cap. */
  issue(wallet: string): { ticket: string; expiresIn: number } | null {
    const currentCount = this.walletTicketCount.get(wallet) ?? 0;
    if (currentCount >= this.maxTicketsPerWallet) {
      return null;
    }

    const ticket = `wst_${randomBytes(24).toString('hex')}`;
    this.tickets.set(ticket, { wallet, createdAt: Date.now() });
    this.walletTicketCount.set(wallet, currentCount + 1);
    return { ticket, expiresIn: Math.round(this.ttlMs / 1000) };
  }

  /**
   * Consume a ticket — returns the wallet if valid, null otherwise.
   * Tickets are single-use: consumed (deleted) on first successful validation.
   */
  consume(ticket: string): string | null {
    const entry = this.tickets.get(ticket);
    if (!entry) return null;

    // Always delete — consumed or expired, it's gone
    this.tickets.delete(ticket);
    this.decrementWalletCount(entry.wallet);

    if (Date.now() - entry.createdAt > this.ttlMs) {
      return null; // expired
    }

    return entry.wallet;
  }

  /** Remove all expired tickets. */
  sweep(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.tickets) {
      if (now - entry.createdAt > this.ttlMs) {
        this.tickets.delete(key);
        this.decrementWalletCount(entry.wallet);
        removed++;
      }
    }
    return removed;
  }

  /** Current number of pending tickets. */
  get size(): number {
    return this.tickets.size;
  }

  /** Clean up the sweep interval. */
  close(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
    }
    this.tickets.clear();
    this.walletTicketCount.clear();
  }

  /** Decrement the per-wallet ticket count, removing the entry at zero. */
  private decrementWalletCount(wallet: string): void {
    const count = this.walletTicketCount.get(wallet) ?? 0;
    if (count <= 1) {
      this.walletTicketCount.delete(wallet);
    } else {
      this.walletTicketCount.set(wallet, count - 1);
    }
  }
}
