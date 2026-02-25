# Engineer Re-Review -- Sprint 6 (G-70): Cryptographic Operations Hardening

**Reviewer**: Claude Opus 4.6 (Senior Technical Lead)
**Date**: 2026-02-25
**Review Cycle**: 2 (re-review after finding remediation)
**Status**: APPROVED -- All good

---

## Re-Review Summary

This is the re-review following Cycle 1 which identified 3 findings (F1 MEDIUM, F2 LOW, F3 MEDIUM). All three findings have been properly addressed. The implementation is clean, test coverage is comprehensive, and 1,206 tests pass with zero regressions.

All 5 sprint tasks remain correctly implemented.

---

## Finding Remediation Verification

### F1 (MEDIUM): HS256 Fallback Asymmetry -- RESOLVED

**Previous issue**: jwt.ts always falls through to HS256 as final fallback, but auth.ts /verify only tries HS256 when `hs256FallbackSecret` is explicitly set.

**Fix applied**: Documentation comment added at `auth.ts:101-104`:
```typescript
// NOTE: Unlike jwt.ts middleware which always tries HS256 as final fallback,
// /verify only tries HS256 when hs256FallbackSecret is explicitly set.
// This is intentional -- /verify is used by external verifiers (loa-finn)
// who should migrate to ES256. The middleware is more lenient for UX.
```

**Verification**: The comment clearly explains the intentional design divergence. The reasoning is sound -- the middleware is a UX-facing component that should be lenient, while `/verify` is an API contract consumed by loa-finn which should enforce the stronger algorithm. This is not a bug; it is a deliberate policy difference that is now documented for future maintainers.

**Verdict**: PASS

### F2 (LOW): Previous Key Public Key Not Cached -- RESOLVED

**Previous issue**: In auth.ts `/verify`, the previous key's PEM was being parsed via `createPublicKey(createPrivateKey(...))` on every request during key rotation.

**Fix applied**: Three changes at `auth.ts`:
1. Module-level cache variable at line 167: `let cachedEs256PreviousPublicKey: KeyObject | null = null;`
2. Lazy-caching function at lines 187-192:
   ```typescript
   function getEs256PreviousPublicKey(pem: string): KeyObject {
     if (!cachedEs256PreviousPublicKey) {
       cachedEs256PreviousPublicKey = createPublicKey(createPrivateKey(pem));
     }
     return cachedEs256PreviousPublicKey;
   }
   ```
3. Cache clearing in `resetAuthKeyCache()` at line 198: `cachedEs256PreviousPublicKey = null;`

**Verification**: The implementation mirrors the existing `getEs256PublicKey()` pattern exactly. The `/verify` handler at line 115 now calls `getEs256PreviousPublicKey(config.previousEs256Key)` instead of inline PEM parsing. The single-PEM assumption documented at line 158 applies equally to this cache. The `resetAuthKeyCache()` function clears all three cached keys, preserving test isolation. The JSDoc at lines 183-186 documents the cache behavior.

**Verdict**: PASS

### F3 (MEDIUM): Missing Multi-Key and Previous Key Tests -- RESOLVED

**Previous issue**: No tests existed for multi-key JWKS, previous key JWT verification, or previous key /verify behavior.

**Fix applied**: Two test files created/extended.

**`app/tests/unit/jwks.test.ts`** -- 6 tests:
| Test | Lines | What it covers |
|------|-------|----------------|
| `returns empty key set when isEs256 is false` | 23-34 | HS256 mode returns empty keys array |
| `returns single key when isEs256 with no previous key` | 36-52 | Single-key JWKS: kid, alg, use, kty, crv |
| `returns two keys during rotation (current + previous)` | 54-77 | Dual-key JWKS: 2-element array, distinct kids (v1/v0), different public coords |
| `sets Cache-Control header for ES256 response` | 79-88 | HTTP caching unchanged |
| `does not set Cache-Control when HS256 (empty key set)` | 90-99 | No cache headers for empty response |
| `caches JWKS response across requests` | 101-116 | In-process cache serves identical coordinates |

**`app/tests/unit/auth.test.ts`** -- 4 new ES256 tests in "ES256 verify with key rotation" block (lines 118-221):
| Test | Lines | What it covers |
|------|-------|----------------|
| `verifies token signed with current ES256 key` | 140-156 | Step 1: primary key verification returns 200 + wallet |
| `verifies token signed with previous ES256 key (rotation grace)` | 158-173 | Step 2: previous key fallback returns 200 + wallet |
| `rejects token signed with unknown ES256 key` | 175-189 | Unknown key returns 401 |
| `falls back to HS256 when configured` | 191-220 | Step 3: HS256 fallback with separate app config returns 200 |

**Verification details**:
- The JWKS dual-key test (line 54) uses two distinct EC P-256 test fixtures (`TEST_KEY_CURRENT`, `TEST_KEY_PREVIOUS`) and asserts 2-element keys array, distinct kids, and different public coordinates -- covering the exact acceptance criteria from Task 6.2.
- The auth rotation test (line 158) signs a token with `ES256_KEY_PREVIOUS` and verifies it against an app configured with both current and previous keys -- this exercises the three-step verification chain in auth.ts `/verify`.
- The unknown key test (line 175) uses `jose.generateKeyPair('ES256')` to create a third key not known to the app, proving rejection of arbitrary ES256 tokens.
- The HS256 fallback test (line 191) creates a separate app instance with `hs256FallbackSecret` to verify the third step of the chain.
- `resetAuthKeyCache()` is called in `beforeEach` and `afterEach` for the ES256 test block, ensuring no key cache pollution between tests.

**Verdict**: PASS -- test coverage now matches the sprint plan acceptance criteria.

---

## Original Implementation Re-Verification

All 5 sprint tasks remain correctly implemented. Spot-checked against source:

| Task | File | Key Lines | Status |
|------|------|-----------|--------|
| 6.1 TTL cache | `jwks.ts` | 36-37 (TTL constant), 48 (expiry check) | PASS |
| 6.2 Multi-key JWKS | `jwks.ts` | 49-71 (key assembly), 62-71 (previous key) | PASS |
| 6.3 Runbook docs | `jwks.ts:7-14`, `auth.ts:156-164` | Documentation only | PASS |
| 6.4 Three-step chain | `jwt.ts:49-73`, `auth.ts:96-133` | ES256 -> prev ES256 -> HS256 | PASS |
| 6.5 Asymmetric cache | `health.ts:27-29` (cacheTtl), 173/181/201/209/229/237 | All probes | PASS |
| Wiring | `server.ts:283,338,343` | All three consumers wired | PASS |

---

## Test Results

- **76 test files**, **1,206 tests** passing
- Zero regressions
- 10 new tests covering all three finding remediations

---

## Decision

**APPROVED** -- All findings from Cycle 1 have been properly addressed. The fixes are clean, well-documented, and tested. No new issues found.

Status: APPROVED
