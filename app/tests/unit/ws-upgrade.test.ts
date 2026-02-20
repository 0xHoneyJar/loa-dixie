import { describe, it, expect, afterEach } from 'vitest';
import { createWsUpgradeHandler } from '../../src/ws-upgrade.js';
import { TicketStore } from '../../src/services/ticket-store.js';
import { Duplex, Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';

function mockSocket(): Duplex & { written: Buffer[] } {
  const written: Buffer[] = [];
  const socket = new Duplex({
    read() {},
    write(chunk, _encoding, callback) {
      written.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      callback();
    },
  });
  (socket as any).written = written;
  return socket as Duplex & { written: Buffer[] };
}

function mockRequest(url: string): IncomingMessage {
  const req = new Readable({ read() {} }) as IncomingMessage;
  req.url = url;
  req.headers = { host: 'localhost:3000' };
  req.method = 'GET';
  return req;
}

describe('WebSocket upgrade handler', () => {
  let store: TicketStore;

  afterEach(() => {
    store?.close();
  });

  it('rejects upgrade when ticket param is missing', () => {
    store = new TicketStore();
    const handler = createWsUpgradeHandler(store, 'ws://finn:3000');
    const socket = mockSocket();
    const req = mockRequest('/ws/chat/session1');
    const head = Buffer.alloc(0);

    handler(req, socket, head);

    const response = Buffer.concat(socket.written).toString();
    expect(response).toContain('401 Unauthorized');
    expect(response).toContain('missing_ticket');
  });

  it('rejects upgrade when ticket is invalid', () => {
    store = new TicketStore();
    const handler = createWsUpgradeHandler(store, 'ws://finn:3000');
    const socket = mockSocket();
    const req = mockRequest('/ws/chat/session1?ticket=wst_bogus');
    const head = Buffer.alloc(0);

    handler(req, socket, head);

    const response = Buffer.concat(socket.written).toString();
    expect(response).toContain('401 Unauthorized');
    expect(response).toContain('invalid_ticket');
  });

  it('rejects upgrade for expired ticket', () => {
    // 1ms TTL so the ticket expires immediately
    store = new TicketStore(1, 999_999);
    const result = store.issue('0xABC');
    // result could be null if per-wallet cap is hit, but it shouldn't be for 1st ticket
    expect(result).not.toBeNull();
    const { ticket } = result!;

    // Wait for expiry
    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }

    const handler = createWsUpgradeHandler(store, 'ws://finn:3000');
    const socket = mockSocket();
    const req = mockRequest(`/ws/chat/session1?ticket=${ticket}`);
    const head = Buffer.alloc(0);

    handler(req, socket, head);

    const response = Buffer.concat(socket.written).toString();
    expect(response).toContain('401 Unauthorized');
    expect(response).toContain('invalid_ticket');
  });

  it('destroys socket for non-/ws/ paths', () => {
    store = new TicketStore();
    const handler = createWsUpgradeHandler(store, 'ws://finn:3000');
    const socket = mockSocket();
    const req = mockRequest('/api/health');
    const head = Buffer.alloc(0);

    handler(req, socket, head);

    // Socket should be destroyed — no HTTP response written, just destroyed
    expect(socket.destroyed).toBe(true);
    expect(socket.written).toHaveLength(0);
  });
});
