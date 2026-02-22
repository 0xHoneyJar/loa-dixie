import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * Both inputs are padded to equal length before comparison so that the
 * length check itself does not leak timing information about the key.
 *
 * Task 23.1 (Sprint 23, Global 42): Extracted from admin.ts and health.ts
 * to eliminate security-critical code duplication.
 *
 * See: Bridgebuilder meditation iter 2, info-1
 */
export function safeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(maxLen);
  const bufB = Buffer.alloc(maxLen);
  Buffer.from(a).copy(bufA);
  Buffer.from(b).copy(bufB);
  return timingSafeEqual(bufA, bufB) && a.length === b.length;
}
