/**
 * Integration tests: WebSocket bidirectional proxy pipe — Sprint 15, Task 15.3
 *
 * Tests the raw networking code in ws-upgrade.ts that handles bidirectional
 * WebSocket proxying. Part IV of the Bridgebuilder review identified this as
 * the residual risk: the pipe logic (frame forwarding, cleanup on close)
 * remained the least-tested code path.
 *
 * These tests create an in-process upstream WebSocket server and validate
 * the full proxy path: client → dixie ws-upgrade → upstream → back.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { createDixieApp } from '../../src/server.js';
import { createWsUpgradeHandler } from '../../src/ws-upgrade.js';
import type { DixieConfig } from '../../src/config.js';

// Dynamic ports to avoid conflicts
const UPSTREAM_WS_PORT = 15100 + Math.floor(Math.random() * 800);
const DIXIE_PORT = 15900 + Math.floor(Math.random() * 100);

let upstreamWss: WebSocketServer;
let upstreamServer: http.Server;
let dixieServer: http.Server;
let dixieApp: ReturnType<typeof createDixieApp>;

const JWT_SECRET = 'integration-test-jwt-secret-32chars!';
const ADMIN_KEY = 'ws-pipe-test-admin-key';
const TEST_API_KEY = 'dxk_ws_pipe_test_key_001';

beforeAll(async () => {
  // --- Upstream WebSocket server (simulates loa-finn's WS endpoint) ---
  upstreamServer = http.createServer();
  upstreamWss = new WebSocketServer({ server: upstreamServer });

  upstreamWss.on('connection', (ws) => {
    // Echo server: send back whatever the client sends
    ws.on('message', (data) => {
      ws.send(data);
    });
  });

  await new Promise<void>((resolve) => {
    upstreamServer.listen(UPSTREAM_WS_PORT, resolve);
  });

  // --- Dixie BFF with WebSocket upgrade handler ---
  const config: DixieConfig = {
    port: DIXIE_PORT,
    finnUrl: `http://localhost:${UPSTREAM_WS_PORT}`,
    finnWsUrl: `ws://localhost:${UPSTREAM_WS_PORT}`,
    corsOrigins: ['*'],
    allowlistPath: '',
    adminKey: ADMIN_KEY,
    jwtPrivateKey: JWT_SECRET,
    nodeEnv: 'test',
    logLevel: 'error',
    rateLimitRpm: 1000,
    otelEndpoint: '',
  };
  dixieApp = createDixieApp(config);
  dixieApp.allowlistStore.addEntry('apiKey', TEST_API_KEY);

  // Create HTTP server using getRequestListener for Hono compatibility
  const { getRequestListener } = await import('@hono/node-server');
  dixieServer = http.createServer(getRequestListener(dixieApp.app.fetch));

  // Attach WebSocket upgrade handler
  const wsHandler = createWsUpgradeHandler(
    dixieApp.ticketStore,
    config.finnWsUrl,
  );
  dixieServer.on('upgrade', wsHandler);

  await new Promise<void>((resolve) => {
    dixieServer.listen(DIXIE_PORT, resolve);
  });
});

afterAll(async () => {
  // Close upstream
  for (const client of upstreamWss.clients) {
    client.close();
  }
  upstreamWss.close();
  await new Promise<void>((resolve) => upstreamServer.close(() => resolve()));

  // Close dixie
  dixieApp?.allowlistStore.close();
  dixieApp?.ticketStore.close();
  await new Promise<void>((resolve) => dixieServer.close(() => resolve()));
});

/** Helper: issue a ticket and connect WebSocket */
async function connectViaTicket(sessionId = 'test-session'): Promise<WebSocket> {
  // Issue ticket — returns { ticket, expiresIn } | null
  const result = dixieApp.ticketStore.issue('0xTestWallet');
  if (!result) throw new Error('Failed to issue ticket (wallet cap reached)');

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `ws://localhost:${DIXIE_PORT}/ws/chat/${sessionId}?ticket=${result.ticket}`,
    );
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

// --- Tests ---

describe('ws-proxy-pipe: bidirectional forwarding', () => {
  it('message sent from client arrives at upstream (forward direction)', async () => {
    const ws = await connectViaTicket();

    const received = await new Promise<string>((resolve) => {
      ws.on('message', (data) => resolve(data.toString()));
      ws.send('hello from client');
    });

    expect(received).toBe('hello from client');
    ws.close();
  });

  it('message sent from upstream arrives at client (reverse direction)', async () => {
    // The echo server sends back what it receives, proving both directions work
    const ws = await connectViaTicket();

    const received = await new Promise<string>((resolve) => {
      ws.on('message', (data) => resolve(data.toString()));
      ws.send('round trip test');
    });

    expect(received).toBe('round trip test');
    ws.close();
  });

  it('upstream close triggers client close (cleanup cascade)', async () => {
    const ws = await connectViaTicket();

    // Wait for connection to be established
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Close from upstream side
    for (const client of upstreamWss.clients) {
      client.close(1000, 'test close');
    }

    const closeCode = await new Promise<number>((resolve) => {
      ws.on('close', (code) => resolve(code));
      // Timeout safety
      setTimeout(() => resolve(-1), 3000);
    });

    // The client should receive a close event
    expect(closeCode).not.toBe(-1);
  });

  it('client close triggers upstream cleanup', async () => {
    const ws = await connectViaTicket('cleanup-session');

    // Wait for pipe to establish
    await new Promise((resolve) => setTimeout(resolve, 100));

    const upstreamClosed = new Promise<boolean>((resolve) => {
      for (const client of upstreamWss.clients) {
        client.on('close', () => resolve(true));
      }
      setTimeout(() => resolve(false), 3000);
    });

    ws.close(1000, 'client initiated close');

    const didClose = await upstreamClosed;
    expect(didClose).toBe(true);
  });

  it('large message (>64KB) passes through without corruption', async () => {
    const ws = await connectViaTicket('large-msg-session');

    // Create a 100KB message
    const largePayload = 'A'.repeat(100 * 1024);

    const received = await new Promise<string>((resolve) => {
      ws.on('message', (data) => resolve(data.toString()));
      ws.send(largePayload);
    });

    expect(received.length).toBe(largePayload.length);
    expect(received).toBe(largePayload);
    ws.close();
  });
});

describe('ws-proxy-pipe: ticket validation', () => {
  it('rejects connection with missing ticket', async () => {
    const ws = new WebSocket(
      `ws://localhost:${DIXIE_PORT}/ws/chat/test-session`,
    );

    const error = await new Promise<boolean>((resolve) => {
      ws.on('error', () => resolve(true));
      ws.on('close', () => resolve(true));
      setTimeout(() => resolve(false), 3000);
    });

    expect(error).toBe(true);
  });

  it('rejects connection with invalid ticket', async () => {
    const ws = new WebSocket(
      `ws://localhost:${DIXIE_PORT}/ws/chat/test-session?ticket=wst_invalid_ticket`,
    );

    const error = await new Promise<boolean>((resolve) => {
      ws.on('error', () => resolve(true));
      ws.on('close', () => resolve(true));
      setTimeout(() => resolve(false), 3000);
    });

    expect(error).toBe(true);
  });
});
