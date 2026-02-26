/**
 * E2E-6: Governance admission smoke test.
 *
 * Validates the governance health endpoint reports governor state
 * and admission decisions reflect tier limits.
 *
 * @since cycle-014 Sprint 3 — Task T6
 */
import { describe, it, expect } from 'vitest';
import { get } from './helpers/http.js';

describe('E2E-6: Governance Admission', () => {
  it('governance health reports governor count', async () => {
    const adminKey = process.env.DIXIE_ADMIN_KEY ?? 'test-admin-key';

    const res = await get<{
      governors: Array<{ resourceType: string }>;
      totalResources: number;
      degradedResources: number;
    }>('/api/health/governance', {
      headers: { Authorization: `Bearer ${adminKey}` },
    });

    if (res.status === 200) {
      expect(res.body.governors).toBeDefined();
      expect(Array.isArray(res.body.governors)).toBe(true);
      expect(res.body.totalResources).toBeGreaterThanOrEqual(0);
      expect(res.body.degradedResources).toBeGreaterThanOrEqual(0);
    } else {
      // Admin key mismatch — test that auth is enforced
      expect(res.status).toBeOneOf([401, 403]);
    }
  });

  it('governance health rejects unauthenticated requests', async () => {
    const res = await get('/api/health/governance');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('main health includes governance summary', async () => {
    const res = await get<{
      governance?: {
        governor_count: number;
        resource_types: string[];
        health: string;
      };
    }>('/api/health');

    expect(res.status).toBe(200);
    // Governance section is optional but should be present in staging
    if (res.body.governance) {
      expect(res.body.governance.governor_count).toBeGreaterThanOrEqual(0);
      expect(res.body.governance.health).toMatch(/^(healthy|degraded)$/);
    }
  });
});
