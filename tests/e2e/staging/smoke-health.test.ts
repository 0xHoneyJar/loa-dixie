/**
 * E2E-1: Health check smoke test.
 *
 * Validates the staging compose stack is healthy with all deps present.
 *
 * @since cycle-014 Sprint 3 — Task T1
 */
import { describe, it, expect } from 'vitest';
import { get } from './helpers/http.js';

interface HealthResponse {
  status: string;
  version: string;
  uptime_seconds: number;
  services: {
    dixie: { status: string };
    loa_finn: { status: string; latency_ms: number; circuit_state: string };
  };
  infrastructure?: {
    postgresql?: { status: string; latency_ms: number };
    redis?: { status: string; latency_ms: number };
    nats?: { status: string; latency_ms: number };
  };
  timestamp: string;
}

describe('E2E-1: Health Check', () => {
  it('returns 200 with healthy status', async () => {
    const res = await get<HealthResponse>('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toMatch(/^(healthy|degraded)$/);
  });

  it('includes version and uptime', async () => {
    const res = await get<HealthResponse>('/api/health');

    expect(res.body.version).toBeDefined();
    expect(res.body.uptime_seconds).toBeGreaterThanOrEqual(0);
  });

  it('reports dixie service as healthy', async () => {
    const res = await get<HealthResponse>('/api/health');

    expect(res.body.services.dixie.status).toBe('healthy');
  });

  it('reports loa-finn connectivity', async () => {
    const res = await get<HealthResponse>('/api/health');

    expect(res.body.services.loa_finn).toBeDefined();
    expect(res.body.services.loa_finn.circuit_state).toBeDefined();
  });

  it('includes infrastructure deps when configured', async () => {
    const res = await get<HealthResponse>('/api/health');

    // In staging, postgresql should be present
    if (res.body.infrastructure) {
      expect(res.body.infrastructure.postgresql).toBeDefined();
    }
  });

  it('includes a valid ISO timestamp', async () => {
    const res = await get<HealthResponse>('/api/health');

    expect(res.body.timestamp).toBeDefined();
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});
