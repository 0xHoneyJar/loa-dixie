// ADR-026D §3.c (i): same-estate writes serialize; inter-estate parallel.

import { describe, expect, it } from 'vitest';
import { createPerEstateMutex } from '../../../src/services/straylight-recall-intake/index.js';

describe('per-estate-mutex', () => {
  it('serializes same-estate work (observed strict ordering)', async () => {
    const mux = createPerEstateMutex();
    const order: string[] = [];
    const make = (label: string, ms: number) =>
      mux.withLock('estate-A', async () => {
        order.push(`${label}:start`);
        await new Promise((r) => setTimeout(r, ms));
        order.push(`${label}:end`);
        return label;
      });
    await Promise.all([make('A', 30), make('B', 20), make('C', 10)]);
    // Strict serialization invariant: each end must precede the next start.
    expect(order).toEqual(['A:start', 'A:end', 'B:start', 'B:end', 'C:start', 'C:end']);
  });

  it('runs different estates in parallel', async () => {
    const mux = createPerEstateMutex();
    const order: string[] = [];
    const ts = await Promise.all([
      mux.withLock('estate-A', async () => {
        order.push('A:start');
        await new Promise((r) => setTimeout(r, 30));
        order.push('A:end');
        return Date.now();
      }),
      mux.withLock('estate-B', async () => {
        order.push('B:start');
        await new Promise((r) => setTimeout(r, 30));
        order.push('B:end');
        return Date.now();
      }),
    ]);
    // Both started before either ended.
    expect(order.indexOf('A:start')).toBeLessThan(order.indexOf('B:end'));
    expect(order.indexOf('B:start')).toBeLessThan(order.indexOf('A:end'));
    expect(Math.abs(ts[0]! - ts[1]!)).toBeLessThan(60);
  });

  it('propagates rejections without poisoning the chain', async () => {
    const mux = createPerEstateMutex();
    await expect(
      mux.withLock('estate-A', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    // Next lock acquisition still resolves.
    const result = await mux.withLock('estate-A', async () => 'ok');
    expect(result).toBe('ok');
  });
});
