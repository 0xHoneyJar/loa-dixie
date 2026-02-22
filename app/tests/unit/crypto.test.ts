import { describe, it, expect } from 'vitest';
import { safeEqual } from '../../src/utils/crypto.js';

describe('safeEqual (Task 23.1)', () => {
  it('returns true for equal strings', () => {
    expect(safeEqual('test-key-123', 'test-key-123')).toBe(true);
  });

  it('returns false for unequal strings of same length', () => {
    expect(safeEqual('test-key-123', 'test-key-456')).toBe(false);
  });

  it('returns false for strings of different lengths', () => {
    expect(safeEqual('short', 'a-much-longer-string')).toBe(false);
    expect(safeEqual('a-much-longer-string', 'short')).toBe(false);
  });

  it('handles empty strings', () => {
    expect(safeEqual('', '')).toBe(true);
    expect(safeEqual('', 'notempty')).toBe(false);
  });
});
