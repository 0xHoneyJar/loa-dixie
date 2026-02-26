/**
 * E2E-5: Reputation persistence smoke test.
 *
 * Validates reputation data persists in PostgreSQL and survives
 * a dixie-bff restart (SM-3: reputation survives restart).
 *
 * @since cycle-014 Sprint 3 — Task T5
 */
import { describe, it, expect } from 'vitest';
import { get } from './helpers/http.js';
import { execSync } from 'node:child_process';
import { waitForHealthy } from './helpers/wait.js';

const TEST_NFT_ID = 'e2e-test-nft-001';
// Resolve compose file relative to project root (test may run from app/ or project root)
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPOSE_FILE = resolve(__dirname, '../../../deploy/docker-compose.staging.yml');

describe('E2E-5: Reputation Persistence', () => {
  it('returns null score for unknown agent', async () => {
    const res = await get<{ score: number | null }>(
      `/api/reputation/query?routingKey=nft:unknown-agent-999`,
    );

    expect(res.status).toBe(200);
    expect(res.body.score).toBeNull();
  });

  it('reputation query endpoint is accessible', async () => {
    const res = await get<{ score: number | null }>(
      `/api/reputation/query?routingKey=nft:${TEST_NFT_ID}`,
    );

    expect(res.status).toBe(200);
    // Score is null for cold agents, number for warm/hot
    expect(res.body).toHaveProperty('score');
  });

  it('population endpoint requires admin auth', async () => {
    const res = await get('/api/reputation/population');

    // Should require admin key
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('reputation survives dixie-bff restart (SM-3)', async () => {
    // Step 1: Query initial state
    const beforeRes = await get<{ score: number | null }>(
      `/api/reputation/query?routingKey=nft:${TEST_NFT_ID}`,
    );
    expect(beforeRes.status).toBe(200);
    const scoreBefore = beforeRes.body.score;

    // Step 2: Restart dixie-bff container
    execSync(`docker compose -f "${COMPOSE_FILE}" restart dixie-bff`, {
      stdio: 'pipe',
      timeout: 30_000,
    });

    // Step 3: Wait for health to come back
    await waitForHealthy({ timeoutMs: 30_000 });

    // Step 4: Query again — score should be the same
    const afterRes = await get<{ score: number | null }>(
      `/api/reputation/query?routingKey=nft:${TEST_NFT_ID}`,
    );
    expect(afterRes.status).toBe(200);
    expect(afterRes.body.score).toBe(scoreBefore);
  }, 60_000); // 60s timeout for restart test
});
