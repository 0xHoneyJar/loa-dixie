import { serve } from '@hono/node-server';
import { createDixieApp } from './server.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const { app } = createDixieApp(config);

serve(
  { fetch: app.fetch, port: config.port },
  (info) => {
    console.log(`dixie-bff listening on http://localhost:${info.port}`);
  },
);
