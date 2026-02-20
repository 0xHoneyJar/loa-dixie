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
