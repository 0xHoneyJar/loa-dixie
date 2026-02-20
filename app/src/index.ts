import { serve } from '@hono/node-server';
import { createDixieApp } from './server.js';
import { loadConfig } from './config.js';
import { createWsUpgradeHandler } from './ws-upgrade.js';

const config = loadConfig();
const { app, ticketStore } = createDixieApp(config);

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
