/**
 * E2E test setup — boot staging compose and wait for health.
 *
 * Usage: Called by vitest globalSetup or manually before running smoke tests.
 */
import { execSync } from 'node:child_process';
import { waitForHealthy } from './helpers/wait.js';

const COMPOSE_FILE = 'deploy/docker-compose.staging.yml';

export async function setup(): Promise<void> {
  console.log('[e2e] Starting staging compose...');
  execSync(`docker compose -f ${COMPOSE_FILE} up -d`, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  console.log('[e2e] Waiting for health check...');
  await waitForHealthy({ timeoutMs: 60_000 });
  console.log('[e2e] Staging environment ready');
}

export async function teardown(): Promise<void> {
  console.log('[e2e] Stopping staging compose...');
  execSync(`docker compose -f ${COMPOSE_FILE} down -v`, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  console.log('[e2e] Staging environment stopped');
}
