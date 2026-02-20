import http from 'node:http';
import https from 'node:https';
import { randomBytes } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { TicketStore } from './services/ticket-store.js';

/**
 * Create a Node.js HTTP 'upgrade' event handler that validates WebSocket
 * tickets before proxying the connection to loa-finn.
 *
 * Flow:
 * 1. Client calls POST /api/ws/ticket (gets wst_... ticket)
 * 2. Client opens WebSocket to /ws/chat/:sessionId?ticket=wst_...
 * 3. This handler validates the ticket and proxies the raw upgrade to loa-finn
 *
 * The ticket is single-use — consumed on validation, never logged in full.
 */
export function createWsUpgradeHandler(
  ticketStore: TicketStore,
  finnWsUrl: string,
) {
  return (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    // Only handle /ws/ paths
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (!url.pathname.startsWith('/ws/')) {
      socket.destroy();
      return;
    }

    // Extract and validate ticket
    const ticket = url.searchParams.get('ticket');
    if (!ticket) {
      rejectUpgrade(socket, 'missing_ticket');
      return;
    }

    const wallet = ticketStore.consume(ticket);
    if (!wallet) {
      rejectUpgrade(socket, 'invalid_ticket');
      return;
    }

    // Build upstream URL: strip the ticket param
    const upstream = new URL(url.pathname, finnWsUrl);
    for (const [key, val] of url.searchParams) {
      if (key !== 'ticket') upstream.searchParams.set(key, val);
    }

    // Proxy the raw upgrade to loa-finn
    proxyUpgrade(req, socket, head, upstream, wallet);
  };
}

/** Reject a WebSocket upgrade with an HTTP 401 response. */
function rejectUpgrade(socket: Duplex, reason: string): void {
  const body = JSON.stringify({ error: reason });
  socket.write(
    `HTTP/1.1 401 Unauthorized\r\n` +
    `Content-Type: application/json\r\n` +
    `Content-Length: ${Buffer.byteLength(body)}\r\n` +
    `Connection: close\r\n` +
    `\r\n` +
    body,
  );
  socket.destroy();
}

/**
 * Proxy a WebSocket upgrade to the upstream loa-finn server.
 *
 * Forwards the original upgrade headers with the ticket replaced by wallet identity.
 * Uses raw HTTP upgrade so we don't need to understand WebSocket framing — just pipe.
 */
function proxyUpgrade(
  clientReq: IncomingMessage,
  clientSocket: Duplex,
  head: Buffer,
  upstream: URL,
  wallet: string,
): void {
  const isSecure = upstream.protocol === 'wss:';
  const port = upstream.port || (isSecure ? 443 : 80);
  const mod = isSecure ? https : http;

  // Forward essential WebSocket upgrade headers from the client
  const wsKey = (clientReq.headers['sec-websocket-key'] as string) || randomBytes(16).toString('base64');
  const wsVersion = clientReq.headers['sec-websocket-version'] || '13';
  const wsProtocol = clientReq.headers['sec-websocket-protocol'];

  const headers: Record<string, string> = {
    Connection: 'Upgrade',
    Upgrade: 'websocket',
    'Sec-WebSocket-Version': String(wsVersion),
    'Sec-WebSocket-Key': wsKey,
    'X-Wallet-Address': wallet,
  };
  if (wsProtocol) headers['Sec-WebSocket-Protocol'] = String(wsProtocol);

  const upstreamReq = mod.request({
    hostname: upstream.hostname,
    port: Number(port),
    path: upstream.pathname + upstream.search,
    method: 'GET',
    headers,
    // Explicit TLS certificate validation — defense against
    // NODE_TLS_REJECT_UNAUTHORIZED=0 leaking into production.
    ...(isSecure ? { rejectUnauthorized: true } : {}),
  });

  upstreamReq.on('upgrade', (_upRes: IncomingMessage, upSocket: Duplex, upHead: Buffer) => {
    // Forward the upstream's 101 Switching Protocols response verbatim.
    // The 'upgrade' event fires after Node.js consumes the response status line
    // and headers, so we reconstruct the 101 from _upRes.
    const headerLines: string[] = [];
    const rawHeaders = _upRes.rawHeaders;
    for (let i = 0; i < rawHeaders.length; i += 2) {
      headerLines.push(`${rawHeaders[i]}: ${rawHeaders[i + 1]}`);
    }

    clientSocket.write(
      `HTTP/1.1 101 Switching Protocols\r\n${headerLines.join('\r\n')}\r\n\r\n`,
    );

    // Forward any buffered data from both sides
    if (upHead.length > 0) clientSocket.write(upHead);
    if (head.length > 0) upSocket.write(head);

    // Bidirectional pipe — raw bytes, no WebSocket framing knowledge needed
    clientSocket.pipe(upSocket);
    upSocket.pipe(clientSocket);

    clientSocket.on('error', () => upSocket.destroy());
    upSocket.on('error', () => clientSocket.destroy());
    clientSocket.on('close', () => upSocket.destroy());
    upSocket.on('close', () => clientSocket.destroy());
  });

  upstreamReq.on('response', (res) => {
    // Upstream refused the upgrade — forward the error response
    const statusLine = `HTTP/1.1 ${res.statusCode} ${res.statusMessage}\r\n`;
    const headerLines: string[] = [];
    const rawHeaders = res.rawHeaders;
    for (let i = 0; i < rawHeaders.length; i += 2) {
      headerLines.push(`${rawHeaders[i]}: ${rawHeaders[i + 1]}`);
    }
    clientSocket.write(statusLine + headerLines.join('\r\n') + '\r\n\r\n');
    res.pipe(clientSocket);
    // Ensure the client socket is destroyed after the upstream response ends
    // to prevent lingering half-open connections on rejection.
    res.on('end', () => clientSocket.destroy());
    res.on('error', () => clientSocket.destroy());
  });

  upstreamReq.on('error', () => {
    rejectUpgrade(clientSocket, 'upstream_unavailable');
  });

  upstreamReq.end();
}
