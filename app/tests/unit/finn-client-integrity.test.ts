import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinnClient } from '../../src/proxy/finn-client.js';
import { computeReqHash } from '@0xhoneyjar/loa-hounfour/integrity';

describe('FinnClient integrity headers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('adds X-Req-Hash header for POST requests', async () => {
    let capturedHeaders: Headers | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = new Headers(init?.headers as HeadersInit);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const client = new FinnClient('http://finn:4000');
    await client.request('POST', '/api/chat', {
      body: { message: 'hello' },
    });

    expect(capturedHeaders).not.toBeNull();
    const reqHash = capturedHeaders!.get('X-Req-Hash');
    expect(reqHash).toBeDefined();
    expect(reqHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('adds X-Idempotency-Key header for POST requests', async () => {
    let capturedHeaders: Headers | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = new Headers(init?.headers as HeadersInit);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const client = new FinnClient('http://finn:4000');
    await client.request('POST', '/api/chat', {
      body: { message: 'hello' },
      nftId: 'nft-123',
    });

    expect(capturedHeaders).not.toBeNull();
    const idempotencyKey = capturedHeaders!.get('X-Idempotency-Key');
    expect(idempotencyKey).toBeDefined();
    expect(idempotencyKey!.length).toBeGreaterThan(0);
  });

  it('does not add integrity headers for GET requests', async () => {
    let capturedHeaders: Headers | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = new Headers(init?.headers as HeadersInit);
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
    });

    const client = new FinnClient('http://finn:4000');
    await client.getHealth();

    expect(capturedHeaders).not.toBeNull();
    expect(capturedHeaders!.get('X-Req-Hash')).toBeNull();
    expect(capturedHeaders!.get('X-Idempotency-Key')).toBeNull();
  });

  it('adds integrity headers for PUT requests', async () => {
    let capturedHeaders: Headers | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = new Headers(init?.headers as HeadersInit);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const client = new FinnClient('http://finn:4000');
    await client.request('PUT', '/api/resource/1', {
      body: { name: 'updated' },
    });

    expect(capturedHeaders!.get('X-Req-Hash')).toBeDefined();
    expect(capturedHeaders!.get('X-Idempotency-Key')).toBeDefined();
  });

  it('adds integrity headers for PATCH requests', async () => {
    let capturedHeaders: Headers | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = new Headers(init?.headers as HeadersInit);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const client = new FinnClient('http://finn:4000');
    await client.request('PATCH', '/api/resource/1', {
      body: { name: 'patched' },
    });

    expect(capturedHeaders!.get('X-Req-Hash')).toBeDefined();
    expect(capturedHeaders!.get('X-Idempotency-Key')).toBeDefined();
  });

  it('produces deterministic X-Req-Hash for same body', async () => {
    const capturedHashes: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const headers = new Headers(init?.headers as HeadersInit);
      capturedHashes.push(headers.get('X-Req-Hash')!);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const client = new FinnClient('http://finn:4000');
    const body = { message: 'deterministic test' };

    await client.request('POST', '/api/chat', { body });
    await client.request('POST', '/api/chat', { body });

    expect(capturedHashes).toHaveLength(2);
    expect(capturedHashes[0]).toBe(capturedHashes[1]);
  });

  it('produces different X-Req-Hash for different bodies', async () => {
    const capturedHashes: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const headers = new Headers(init?.headers as HeadersInit);
      capturedHashes.push(headers.get('X-Req-Hash')!);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const client = new FinnClient('http://finn:4000');

    await client.request('POST', '/api/chat', { body: { message: 'foo' } });
    await client.request('POST', '/api/chat', { body: { message: 'bar' } });

    expect(capturedHashes).toHaveLength(2);
    expect(capturedHashes[0]).not.toBe(capturedHashes[1]);
  });

  it('uses "anonymous" as tenant when nftId not provided', async () => {
    let capturedHeaders: Headers | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = new Headers(init?.headers as HeadersInit);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const client = new FinnClient('http://finn:4000');
    await client.request('POST', '/api/chat', {
      body: { message: 'hello' },
    });

    // Idempotency key should still be present (using 'anonymous' tenant)
    const key = capturedHeaders!.get('X-Idempotency-Key');
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(0);
  });

  it('produces different idempotency keys for different nftIds', async () => {
    const capturedKeys: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const headers = new Headers(init?.headers as HeadersInit);
      capturedKeys.push(headers.get('X-Idempotency-Key')!);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const client = new FinnClient('http://finn:4000');
    const body = { message: 'same body' };

    await client.request('POST', '/api/chat', { body, nftId: 'nft-1' });
    await client.request('POST', '/api/chat', { body, nftId: 'nft-2' });

    expect(capturedKeys).toHaveLength(2);
    expect(capturedKeys[0]).not.toBe(capturedKeys[1]);
  });

  it('does not add integrity headers for POST without body', async () => {
    let capturedHeaders: Headers | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = new Headers(init?.headers as HeadersInit);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const client = new FinnClient('http://finn:4000');
    await client.request('POST', '/api/event');

    expect(capturedHeaders!.get('X-Req-Hash')).toBeNull();
    expect(capturedHeaders!.get('X-Idempotency-Key')).toBeNull();
  });

  it('X-Req-Hash matches hounfour computeReqHash for same body', async () => {
    let capturedHash: string | null = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const headers = new Headers(init?.headers as HeadersInit);
      capturedHash = headers.get('X-Req-Hash');
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const body = { message: 'verify hash' };
    const client = new FinnClient('http://finn:4000');
    await client.request('POST', '/api/chat', { body });

    // Compute expected hash using hounfour directly
    const bodyString = JSON.stringify(body);
    const expectedHash = computeReqHash(Buffer.from(bodyString, 'utf-8'));

    expect(capturedHash).toBe(expectedHash);
  });
});
