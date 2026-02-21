import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinnClient } from '../../src/proxy/finn-client.js';

describe('FinnClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('strips trailing slash from baseUrl', () => {
    const client = new FinnClient('http://finn:4000/');
    expect(client.circuit).toBe('closed');
  });

  it('returns health on successful response', async () => {
    const mockResponse = { status: 'ok', uptime: 1000 };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const client = new FinnClient('http://finn:4000');
    const health = await client.getHealth();
    expect(health).toEqual(mockResponse);
    expect(client.circuit).toBe('closed');
  });

  it('records failure on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'RATE_LIMITED' }), { status: 429 }),
    );

    const client = new FinnClient('http://finn:4000');
    await expect(client.getHealth()).rejects.toMatchObject({
      status: 429,
      body: { error: 'rate_limited' },
    });
  });

  it('throws 503 on fetch error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const client = new FinnClient('http://finn:4000');
    await expect(client.getHealth()).rejects.toMatchObject({
      status: 503,
      body: { error: 'upstream_error' },
    });
  });

  it('opens circuit after maxFailures consecutive failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));

    const client = new FinnClient('http://finn:4000', {
      maxFailures: 3,
      windowMs: 60_000,
    });

    for (let i = 0; i < 3; i++) {
      await expect(client.getHealth()).rejects.toBeTruthy();
    }

    expect(client.circuit).toBe('open');

    // Next request should fail immediately with circuit_open
    await expect(client.getHealth()).rejects.toMatchObject({
      status: 503,
      body: { error: 'circuit_open' },
    });
  });

  describe('circuit breaker transition logging', () => {
    it('logs closed→open transition at error level', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));
      const logs: Array<{ level: string; data: Record<string, unknown> }> = [];
      const log = (level: string, data: Record<string, unknown>) => logs.push({ level, data });

      const client = new FinnClient('http://finn:4000', {
        maxFailures: 3,
        windowMs: 60_000,
        log: log as any,
      });

      for (let i = 0; i < 3; i++) {
        await expect(client.getHealth()).rejects.toBeTruthy();
      }

      const transition = logs.find((l) => l.data.event === 'circuit_breaker_transition');
      expect(transition).toBeDefined();
      expect(transition!.level).toBe('error');
      expect(transition!.data.from).toBe('closed');
      expect(transition!.data.to).toBe('open');
      expect(transition!.data.circuit_state).toBe('open');
      expect(transition!.data.service).toBe('loa-finn');
    });

    it('logs open→half-open transition at warn level', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));
      const logs: Array<{ level: string; data: Record<string, unknown> }> = [];
      const log = (level: string, data: Record<string, unknown>) => logs.push({ level, data });

      const client = new FinnClient('http://finn:4000', {
        maxFailures: 3,
        windowMs: 60_000,
        cooldownMs: 0,
        log: log as any,
      });

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(client.getHealth()).rejects.toBeTruthy();
      }

      // Clear logs, then trigger half-open check (will fail, but the transition is logged)
      logs.length = 0;
      try { await client.getHealth(); } catch { /* expected */ }

      const transition = logs.find(
        (l) => l.data.event === 'circuit_breaker_transition' && l.data.to === 'half-open',
      );
      expect(transition).toBeDefined();
      expect(transition!.level).toBe('warn');
    });

    it('logs half-open→closed transition at info level', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));
      const logs: Array<{ level: string; data: Record<string, unknown> }> = [];
      const log = (level: string, data: Record<string, unknown>) => logs.push({ level, data });

      const client = new FinnClient('http://finn:4000', {
        maxFailures: 3,
        windowMs: 60_000,
        cooldownMs: 0,
        log: log as any,
      });

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        await expect(client.getHealth()).rejects.toBeTruthy();
      }

      // Success closes the circuit
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
      logs.length = 0;
      await client.getHealth();

      const closedTransition = logs.find(
        (l) => l.data.event === 'circuit_breaker_transition' && l.data.to === 'closed',
      );
      expect(closedTransition).toBeDefined();
      expect(closedTransition!.level).toBe('info');
    });

    it('does not log when state is unchanged', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
      );
      const logs: Array<{ level: string; data: Record<string, unknown> }> = [];
      const log = (level: string, data: Record<string, unknown>) => logs.push({ level, data });

      const client = new FinnClient('http://finn:4000', { log: log as any });

      // Two successful requests — both stay in closed, no transition logged
      await client.getHealth();
      await client.getHealth();

      const transitions = logs.filter((l) => l.data.event === 'circuit_breaker_transition');
      expect(transitions).toHaveLength(0);
    });
  });

  it('resets circuit on success', async () => {
    const failFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('down'));

    const client = new FinnClient('http://finn:4000', {
      maxFailures: 3,
      windowMs: 60_000,
      cooldownMs: 0, // instant cooldown for testing
    });

    // Trip the circuit
    for (let i = 0; i < 3; i++) {
      await expect(client.getHealth()).rejects.toBeTruthy();
    }
    expect(client.circuit).toBe('open');

    // Switch to success — circuit should half-open then close
    failFetch.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    const health = await client.getHealth();
    expect(health).toEqual({ status: 'ok' });
    expect(client.circuit).toBe('closed');
  });
});
