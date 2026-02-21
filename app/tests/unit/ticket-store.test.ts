import { describe, it, expect, afterEach } from 'vitest';
import { TicketStore } from '../../src/services/ticket-store.js';

describe('TicketStore', () => {
  let store: TicketStore;

  afterEach(() => {
    store?.close();
  });

  it('issues a ticket with wst_ prefix', () => {
    store = new TicketStore();
    const { ticket, expiresIn } = store.issue('0xABC');
    expect(ticket).toMatch(/^wst_[a-f0-9]{48}$/);
    expect(expiresIn).toBe(30);
  });

  it('consumes a valid ticket and returns wallet', () => {
    store = new TicketStore();
    const { ticket } = store.issue('0xDEF');
    const wallet = store.consume(ticket);
    expect(wallet).toBe('0xDEF');
  });

  it('rejects reuse of a consumed ticket', () => {
    store = new TicketStore();
    const { ticket } = store.issue('0xABC');
    store.consume(ticket); // first use
    const wallet = store.consume(ticket); // second use
    expect(wallet).toBeNull();
  });

  it('rejects an expired ticket', () => {
    // 1ms TTL — ticket expires immediately
    store = new TicketStore(1, 999_999);
    const { ticket } = store.issue('0xABC');

    // Wait for expiry
    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }

    const wallet = store.consume(ticket);
    expect(wallet).toBeNull();
  });

  it('rejects an unknown ticket', () => {
    store = new TicketStore();
    const wallet = store.consume('wst_doesnotexist');
    expect(wallet).toBeNull();
  });

  it('sweep removes expired tickets', () => {
    store = new TicketStore(1, 999_999); // 1ms TTL, no auto sweep
    store.issue('0xA');
    store.issue('0xB');
    store.issue('0xC');

    // Wait for all to expire
    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }

    const removed = store.sweep();
    expect(removed).toBe(3);
    expect(store.size).toBe(0);
  });

  it('sweep preserves unexpired tickets', () => {
    store = new TicketStore(60_000, 999_999); // 60s TTL
    store.issue('0xA');
    store.issue('0xB');

    const removed = store.sweep();
    expect(removed).toBe(0);
    expect(store.size).toBe(2);
  });

  it('close clears all tickets and interval', () => {
    store = new TicketStore();
    store.issue('0xA');
    store.close();
    expect(store.size).toBe(0);
  });

  it('rejects the 6th ticket for the same wallet when cap is 5', () => {
    store = new TicketStore(30_000, 999_999, 5);
    for (let i = 0; i < 5; i++) {
      const result = store.issue('0xCAP');
      expect(result).not.toBeNull();
    }
    const sixth = store.issue('0xCAP');
    expect(sixth).toBeNull();
    expect(store.size).toBe(5);
  });

  it('allows tickets for different wallets independently', () => {
    store = new TicketStore(30_000, 999_999, 2);
    expect(store.issue('0xA')).not.toBeNull();
    expect(store.issue('0xA')).not.toBeNull();
    expect(store.issue('0xA')).toBeNull(); // 3rd for 0xA — rejected
    expect(store.issue('0xB')).not.toBeNull(); // different wallet — allowed
  });

  it('consuming a ticket frees a slot for that wallet', () => {
    store = new TicketStore(30_000, 999_999, 2);
    const t1 = store.issue('0xFREE');
    const t2 = store.issue('0xFREE');
    expect(t1).not.toBeNull();
    expect(t2).not.toBeNull();
    expect(store.issue('0xFREE')).toBeNull(); // at cap

    // Consume one ticket — should free a slot
    store.consume(t1!.ticket);
    const t3 = store.issue('0xFREE');
    expect(t3).not.toBeNull();
  });

  it('sweep frees per-wallet slots for expired tickets', () => {
    store = new TicketStore(1, 999_999, 2); // 1ms TTL
    store.issue('0xSWEEP');
    store.issue('0xSWEEP');
    expect(store.issue('0xSWEEP')).toBeNull(); // at cap

    // Wait for expiry
    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }

    store.sweep();
    // After sweep, slots should be freed
    const result = store.issue('0xSWEEP');
    expect(result).not.toBeNull();
  });
});
