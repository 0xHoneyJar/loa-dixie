import { serve } from '@hono/node-server';
import { createDixieApp } from './server.js';
import { loadConfig } from './config.js';
import { createWsUpgradeHandler } from './ws-upgrade.js';
import { initTelemetry, shutdownTelemetry } from './telemetry.js';

const config = loadConfig();

// Initialize OTEL SDK before app creation (must be first for auto-instrumentation)
const telemetrySdk = initTelemetry(config.otelEndpoint);

const { app, ticketStore, dbPool, redisClient, signalEmitter } = createDixieApp(config);

const server = serve(
  { fetch: app.fetch, port: config.port },
  (info) => {
    console.log(`dixie-bff listening on http://localhost:${info.port}`);
  },
);

// WebSocket upgrade handler — validates tickets and proxies to loa-finn.
// This runs outside Hono's middleware stack because WebSocket upgrades
// are HTTP-level events, not standard request/response cycles.
server.on('upgrade', createWsUpgradeHandler(ticketStore, config.finnWsUrl));

// Graceful shutdown — flush spans, drain connections, close pools (Flatline SKP-002)
let shuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received — shutting down gracefully`);

  // 1. Stop accepting new connections
  server.close();

  // 2. Flush pending OTEL spans
  await shutdownTelemetry(telemetrySdk);

  // 3. Close infrastructure connections
  if (signalEmitter) {
    try { await signalEmitter.close(); } catch { /* best-effort */ }
  }
  if (redisClient) {
    try { redisClient.disconnect(); } catch { /* best-effort */ }
  }
  if (dbPool) {
    try { await dbPool.end(); } catch { /* best-effort */ }
  }

  console.log('Shutdown complete');

  // Safety net: force exit if event loop doesn't drain within 10s
  // (e.g., leaked timers, open sockets). Unref'd so it doesn't keep the process alive.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
