/**
 * Protocol Version Tests — Sprint 76 (cycle-007), Task S4-T6
 *
 * Tests middleware behavior, contract structure, and monotonic expansion.
 */
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import {
  DIXIE_PROTOCOL_VERSION,
  DIXIE_CONTRACT,
  protocolVersionMiddleware,
} from '../protocol-version.js';
import { verifyMonotonicExpansion } from '@0xhoneyjar/loa-hounfour/commons';

describe('DIXIE_PROTOCOL_VERSION', () => {
  it('is 8.2.0', () => {
    expect(DIXIE_PROTOCOL_VERSION).toBe('8.2.0');
  });
});

describe('DIXIE_CONTRACT', () => {
  it('has all 4 reputation states', () => {
    expect(DIXIE_CONTRACT.surfaces).toHaveProperty('cold');
    expect(DIXIE_CONTRACT.surfaces).toHaveProperty('warming');
    expect(DIXIE_CONTRACT.surfaces).toHaveProperty('established');
    expect(DIXIE_CONTRACT.surfaces).toHaveProperty('authoritative');
  });

  it('contract_version matches protocol version', () => {
    expect(DIXIE_CONTRACT.contract_version).toBe(DIXIE_PROTOCOL_VERSION);
  });

  it('has valid contract_id (UUID)', () => {
    expect(DIXIE_CONTRACT.contract_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('cold has restricted rate limit', () => {
    expect(DIXIE_CONTRACT.surfaces.cold.rate_limit_tier).toBe('restricted');
  });

  it('authoritative has unlimited rate limit', () => {
    expect(DIXIE_CONTRACT.surfaces.authoritative.rate_limit_tier).toBe('unlimited');
  });

  it('satisfies monotonic expansion', () => {
    const result = verifyMonotonicExpansion(DIXIE_CONTRACT);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('cold capabilities are a subset of authoritative capabilities', () => {
    const coldCaps = DIXIE_CONTRACT.surfaces.cold.capabilities;
    const authCaps = DIXIE_CONTRACT.surfaces.authoritative.capabilities;
    for (const cap of coldCaps) {
      expect(authCaps).toContain(cap);
    }
  });

  it('cold schemas are a subset of authoritative schemas', () => {
    const coldSchemas = DIXIE_CONTRACT.surfaces.cold.schemas;
    const authSchemas = DIXIE_CONTRACT.surfaces.authoritative.schemas;
    for (const schema of coldSchemas) {
      expect(authSchemas).toContain(schema);
    }
  });
});

describe('protocolVersionMiddleware', () => {
  it('sets X-Protocol-Version response header', async () => {
    const app = new Hono();
    app.use('*', protocolVersionMiddleware());
    app.get('/test', (c) => c.text('ok'));

    const res = await app.request('/test');
    expect(res.headers.get('X-Protocol-Version')).toBe('8.2.0');
    expect(await res.text()).toBe('ok');
  });

  it('works without client X-Protocol-Version header', async () => {
    const app = new Hono();
    app.use('*', protocolVersionMiddleware());
    app.get('/test', (c) => c.text('ok'));

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Protocol-Version')).toBe('8.2.0');
  });

  it('does not enforce surface boundaries (delegated to routing layer)', async () => {
    const app = new Hono();
    app.use('*', protocolVersionMiddleware());

    // Handler returns a rich response body — middleware should not filter it
    const richBody = {
      reputation: { state: 'authoritative', score: 1.0 },
      governance: { mutations: [{ id: '1' }] },
      schemas: ['AuditTrail', 'GovernedReputation'],
    };
    app.get('/test', (c) => c.json(richBody));

    const res = await app.request('/test');
    const body = await res.json();

    // Full response body passes through — middleware does not filter or restrict
    expect(body).toEqual(richBody);
    expect(body.governance).toBeDefined();
    expect(body.schemas).toContain('AuditTrail');
  });

  it('does not inspect or modify response body', async () => {
    const app = new Hono();
    app.use('*', protocolVersionMiddleware());

    const payload = 'arbitrary-binary-content-\x00\x01';
    app.get('/test', (c) => c.text(payload));

    const res = await app.request('/test');
    expect(await res.text()).toBe(payload);
  });

  it('only adds X-Protocol-Version header — no other response modifications', async () => {
    const app = new Hono();
    app.use('*', protocolVersionMiddleware());
    app.get('/test', (c) => {
      c.header('X-Custom', 'preserved');
      return c.text('ok');
    });

    const res = await app.request('/test');
    expect(res.headers.get('X-Protocol-Version')).toBe('8.2.0');
    expect(res.headers.get('X-Custom')).toBe('preserved');
  });
});
