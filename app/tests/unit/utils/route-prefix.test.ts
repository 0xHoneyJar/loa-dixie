/**
 * Route-prefix boundary matching tests (issues #206, #208).
 */
import { describe, it, expect } from 'vitest';
import { normalizeRoutePath, matchesRoutePrefix } from '../../../src/utils/route-prefix.js';

describe('normalizeRoutePath', () => {
  it('returns simple paths unchanged', () => {
    expect(normalizeRoutePath('/api/health')).toBe('/api/health');
    expect(normalizeRoutePath('/api/auth/siwe')).toBe('/api/auth/siwe');
  });

  it('strips trailing slashes', () => {
    expect(normalizeRoutePath('/api/health/')).toBe('/api/health');
    expect(normalizeRoutePath('/api/health///')).toBe('/api/health');
  });

  it('collapses duplicate slashes', () => {
    expect(normalizeRoutePath('//api//health')).toBe('/api/health');
  });

  it('drops . segments and rejects .. traversal (fail closed)', () => {
    expect(normalizeRoutePath('/api/./health')).toBe('/api/health');
    // Traversal is never a legitimate shape for a payment-free route; the
    // router does not resolve it, so resolving here could classify a
    // protected route as free.
    expect(normalizeRoutePath('/api/chat/../health')).toBeNull();
    expect(normalizeRoutePath('/../api/health')).toBeNull();
  });

  it('percent-decodes before classification', () => {
    expect(normalizeRoutePath('/api/%68ealth')).toBe('/api/health');
  });

  it('rejects encoded separators (fail closed)', () => {
    // The router keeps %2F inside ONE segment; decoding it here would let
    // /api/personality/..%2Fidentity%2Foracle classify as a free prefix
    // while dispatching to the protected /api/personality/:nftId route.
    expect(normalizeRoutePath('/api/health%2Fgovernance')).toBeNull();
    expect(normalizeRoutePath('/api/personality/%2e%2e%2Fidentity%2Foracle')).toBeNull();
    expect(normalizeRoutePath('/api/health%5Cgovernance')).toBeNull();
  });

  it('returns null for malformed encoding (fail closed)', () => {
    expect(normalizeRoutePath('/api/%zz')).toBeNull();
    expect(normalizeRoutePath('/api/%')).toBeNull();
  });

  it('returns null for NUL bytes (fail closed)', () => {
    expect(normalizeRoutePath('/api/health%00')).toBeNull();
  });

  it('normalizes the root path', () => {
    expect(normalizeRoutePath('/')).toBe('/');
    expect(normalizeRoutePath('')).toBe('/');
  });
});

describe('matchesRoutePrefix', () => {
  const prefixes = ['/api/health', '/api/auth/'];

  it('matches the exact prefix', () => {
    expect(matchesRoutePrefix('/api/health', prefixes)).toBe(true);
  });

  it('matches nested paths below the prefix', () => {
    expect(matchesRoutePrefix('/api/health/governance', prefixes)).toBe(true);
    expect(matchesRoutePrefix('/api/auth/siwe', prefixes)).toBe(true);
  });

  it('ignores a trailing slash on the configured prefix', () => {
    expect(matchesRoutePrefix('/api/auth', prefixes)).toBe(true);
  });

  it('rejects near-prefix paths that merely share a string prefix', () => {
    expect(matchesRoutePrefix('/api/healthzzz', prefixes)).toBe(false);
    expect(matchesRoutePrefix('/api/health-check', prefixes)).toBe(false);
    expect(matchesRoutePrefix('/api/autonomous', prefixes)).toBe(false);
    expect(matchesRoutePrefix('/api/authors', prefixes)).toBe(false);
  });

  it('matches trailing-slash and duplicate-slash variants', () => {
    expect(matchesRoutePrefix('/api/health/', prefixes)).toBe(true);
    expect(matchesRoutePrefix('//api//health', prefixes)).toBe(true);
  });

  it('treats traversal as unclassifiable (fail closed, never free)', () => {
    expect(matchesRoutePrefix('/api/chat/../health', prefixes)).toBe(false);
    expect(matchesRoutePrefix('/api/health/../chat', prefixes)).toBe(false);
    expect(matchesRoutePrefix('/api/personality/%2e%2e%2Fauth%2Fverify', prefixes)).toBe(false);
  });

  it('does not match unclassifiable paths (fail closed)', () => {
    expect(matchesRoutePrefix('/api/%zz', prefixes)).toBe(false);
    expect(matchesRoutePrefix('/api/health%00', prefixes)).toBe(false);
  });
});
