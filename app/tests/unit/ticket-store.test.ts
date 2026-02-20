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
});
