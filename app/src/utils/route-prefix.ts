/**
 * Route-prefix boundary matching shared by governance middleware.
 *
 * Raw `path.startsWith(prefix)` classification has two failure modes:
 *
 * 1. Near-prefix collisions — `/api/auth` accidentally matches
 *    `/api/autonomous`, `/api/health` matches `/api/healthzzz`.
 * 2. Path-shape evasion — duplicate slashes, `.`/`..` segments, trailing
 *    slashes, or percent-encoding can change how a classifier sees a path
 *    without changing which handler ultimately serves it.
 *
 * `matchesRoutePrefix` normalizes the path first, then requires an exact
 * match or a `/`-boundary match. Unclassifiable paths (malformed encoding,
 * NUL bytes) are reported as NOT matching, so default-deny callers treat
 * them as protected (fail closed).
 *
 * See: docs/audit-lanes/2026-06-27-route-payment-enforcement (issues #206, #208).
 */

/**
 * Normalize a request path for classification.
 *
 * - Rejects percent-encoded separators `%2F`/`%5C` (→ null): the router
 *   keeps an encoded slash inside ONE path segment, so decoding it here
 *   would let a protected dynamic route (e.g. `/api/personality/:nftId`
 *   with `nftId = "..%2Fidentity%2Foracle"`) classify as a payment-free
 *   prefix the router never dispatches to
 * - Rejects `..` traversal segments (→ null) instead of resolving them —
 *   no payment-free route legitimately needs traversal
 * - Percent-decodes (malformed encoding → null)
 * - Rejects NUL bytes (→ null)
 * - Collapses duplicate slashes, drops `.` segments
 * - Strips trailing slashes
 *
 * Returns `null` when the path cannot be safely classified; callers must
 * treat `null` as "no match" so default-deny logic fails closed.
 */
export function normalizeRoutePath(rawPath: string): string | null {
  // Encoded separators mean different things to the router (part of one
  // segment) and to this classifier (a boundary after decoding). Fail closed.
  if (/%2f|%5c/i.test(rawPath)) {
    return null;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) {
    return null;
  }
  const segments: string[] = [];
  for (const segment of decoded.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      return null;
    }
    segments.push(segment);
  }
  return '/' + segments.join('/');
}

/**
 * True when the normalized path equals a prefix or sits below it at a `/`
 * route boundary. A trailing `/` on a configured prefix is ignored:
 * `/api/auth/` matches `/api/auth` and `/api/auth/siwe`, but never
 * `/api/autonomous`.
 */
export function matchesRoutePrefix(rawPath: string, prefixes: readonly string[]): boolean {
  const normalized = normalizeRoutePath(rawPath);
  if (normalized === null) {
    return false;
  }
  return prefixes.some((prefix) => {
    const base = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
    return normalized === base || normalized.startsWith(base + '/');
  });
}
