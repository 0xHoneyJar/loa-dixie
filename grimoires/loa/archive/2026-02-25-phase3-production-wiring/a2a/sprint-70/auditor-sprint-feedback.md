# Auditor Security Review -- Sprint 6 (G-70): Cryptographic Operations Hardening

**Auditor**: Claude Opus 4.6 (Paranoid Cypherpunk Auditor)
**Date**: 2026-02-25
**Sprint**: sprint-6 (local) / G-70 (global)
**Branch**: `feature/dixie-phase3-prod-wiring`
**Cycle**: cycle-006 (Dixie Phase 3 -- Production Wiring & Live Integration)
**Status**: **APPROVED**

---

## Audit Scope

All 8 implementation and test files specified in the sprint plan were reviewed line-by-line:

| File | Lines | Category |
|------|-------|----------|
| `app/src/routes/jwks.ts` | 90 | JWKS endpoint, TTL cache, multi-key |
| `app/src/middleware/jwt.ts` | 101 | JWT middleware, 3-step verification chain |
| `app/src/routes/auth.ts` | 223 | Auth routes, /siwe, /verify, key caching |
| `app/src/routes/health.ts` | 259 | Health probes, asymmetric cache |
| `app/src/config.ts` | 193 | Configuration, env var loading |
| `app/src/server.ts` | 428 | Central wiring |
| `app/tests/unit/jwks.test.ts` | 117 | 6 JWKS tests |
| `app/tests/unit/auth.test.ts` | 222 | Auth tests + 4 ES256 rotation tests |

Also cross-referenced: `grimoires/loa/ledger.json` (sprint-6 = G-70 confirmed), `grimoires/loa/a2a/sprint-70/engineer-feedback.md` (APPROVED, all 3 findings resolved).

---

## Security Checklist Results

### 1. SECRETS -- No Hardcoded Keys

**Verdict**: PASS

- No PEM private keys in source code (`app/src/` directory). The only `-----BEGIN PRIVATE KEY-----` reference in `app/src/config.ts` is the PEM detection logic (`jwtPrivateKey.startsWith('-----BEGIN')`), not an actual key.
- Test fixtures in `jwks.test.ts` and `auth.test.ts` use clearly labeled test-only keys (`TEST_KEY_CURRENT`, `TEST_KEY_PREVIOUS`, `ES256_KEY_CURRENT`, `ES256_KEY_PREVIOUS`). This is standard and acceptable.
- All production secrets sourced from environment variables: `DIXIE_JWT_PRIVATE_KEY`, `DIXIE_JWT_PREVIOUS_KEY`, `DIXIE_HS256_FALLBACK_SECRET`.
- Validation enforced: HS256 keys require >= 32 characters (`config.ts:109`). ES256 keys self-validate via PEM prefix detection (`config.ts:102`). Empty keys blocked in non-test environments (`config.ts:107-113`).

### 2. AUTH/AUTHZ -- Key Rotation Chain Correctness

**Verdict**: PASS

Three-step verification chain implemented correctly in two locations:

**`jwt.ts` (middleware -- lines 49-75)**:
1. Try current ES256 public key -> return on success
2. Try previous ES256 public key (if configured) -> return on success
3. Fall through to HS256 (always, using `hs256FallbackSecret ?? jwtSecret`)

**`auth.ts /verify` (lines 96-133)**:
1. Try current ES256 public key -> return on success
2. Try previous ES256 public key (if configured) -> return on success
3. Try HS256 fallback **only if `hs256FallbackSecret` is explicitly set**

The asymmetry between these two is intentional and documented (F1 resolution at `auth.ts:101-104`). The middleware is UX-lenient (internal consumers); `/verify` is contract-strict (external consumers like loa-finn). This is a sound security posture: stricter verification for inter-service API contracts.

**No bypass paths identified**:
- Invalid tokens produce 401 in `/verify` and silent wallet-unset in middleware (allowlist gates the actual request).
- The `dxk_` prefix guard at `jwt.ts:46` correctly excludes API key tokens from JWT parsing.
- All `jwtVerify` calls include `{ issuer }` validation, preventing cross-service token reuse.

### 3. CRYPTO -- Algorithm Usage

**Verdict**: PASS with one INFORMATIONAL note

- ES256 (ECDSA P-256): Used for all new JWT signing (`auth.ts:207-213`). Correct curve (P-256) verified by test fixture assertions (`jwks.test.ts:51` -- `crv: 'P-256'`).
- HS256 (HMAC-SHA256): Legacy fallback only. Key derivation via `new TextEncoder().encode()` -- correct for jose library.
- `jose.jwtVerify()` is called with a `KeyObject` (asymmetric) or `Uint8Array` (symmetric). The jose library v5+ enforces algorithm matching intrinsically: a `KeyObject` of type `ec` will reject HS256 tokens, and a `Uint8Array` symmetric key will reject ES256 tokens. There is no explicit `algorithms` parameter, but **this is not a vulnerability** because jose's key-type enforcement prevents algorithm confusion attacks (CVE-2015-2951 class).
- JWT protected headers correctly set: `alg: 'ES256', kid: 'dixie-es256-v1'` for new tokens.

**INFORMATIONAL (I-1)**: While jose's key-type enforcement prevents algorithm confusion, explicitly passing `{ algorithms: ['ES256'] }` to `jwtVerify` when using ES256 keys would provide defense-in-depth. This is a hardening opportunity, not a vulnerability. The current code is safe.

### 4. CACHE SAFETY -- TTL and Invalidation

**Verdict**: PASS

**JWKS cache** (`jwks.ts:36-37`):
- 5-minute TTL (`JWKS_CACHE_TTL_MS = 5 * 60 * 1000`).
- Regeneration on expiry picks up new key material from config.
- HTTP `Cache-Control: public, max-age=3600` governs downstream caching independently.
- The 5-minute process cache vs 1-hour HTTP cache means: during key rotation, the JWKS endpoint regenerates within 5 minutes even if downstream caches hold stale data for up to 1 hour. The key rotation runbook (step 5) correctly prescribes waiting for max JWT TTL (1 hour), which covers both cache layers.

**Auth key cache** (`auth.ts:165-198`):
- Three lazy-cached KeyObjects: current private, current public, previous public.
- Single-PEM assumption documented. In production, `createDixieApp` is called once per process, so the cache is safe. During key rotation, ECS blue-green deployment starts a new process with new PEM, naturally invalidating the cache.
- `resetAuthKeyCache()` clears all three caches for test isolation.
- `resetJwksCache()` clears the JWKS cache for test isolation.

**Health probe caches** (`health.ts:18-35`):
- Asymmetric TTLs: 30s healthy, 5s unhealthy (Netflix Eureka pattern).
- Applied to all three probes: Finn, DB, Redis.
- NATS health is synchronous (checks `emitter.connected` flag) -- no cache needed.
- No stale data risk: `cacheTtl()` function computes TTL based on probe result status.

### 5. ERROR HANDLING -- No Information Disclosure

**Verdict**: PASS

- `jwt.ts:79-95`: JWT errors categorized into 4 types (`expired`, `invalid_claims`, `invalid_signature`, `malformed`) -- logged to stderr as structured JSON. No token content, no key material, no stack traces exposed.
- `auth.ts:145-149`: Generic `{ error: 'invalid_token', message: 'Token verification failed' }` -- no specifics about which step in the chain failed or why. This is correct: do not reveal verification chain internals to clients.
- `auth.ts:54-58`: SIWE failure returns `'SIWE verification failed'` -- no underlying error details.
- `health.ts:179,207,235`: Unhealthy probe errors include error messages (`err.message`) but these are only exposed on the health endpoint, which is typically internal-only.

### 6. INPUT VALIDATION -- Token and PEM Handling

**Verdict**: PASS

- Token extraction: `authHeader.slice(7)` after `authHeader?.startsWith('Bearer ')` check -- correct.
- API key exclusion: `!authHeader.startsWith('Bearer dxk_')` -- prevents API keys from entering JWT parsing path.
- SIWE body validation: Zod schema with `z.string().min(1)` for both message and signature.
- PEM handling: `createPrivateKey()` from Node.js crypto will throw on malformed PEM. The JWKS endpoint wraps this in the cache regeneration path, and the auth routes wrap it in lazy-cache functions. No uncaught exception risk -- these are called with environment-sourced config values, not user input.

### 7. TEST COVERAGE -- Critical Paths

**Verdict**: PASS

**JWKS tests** (6 tests):
- HS256 mode -> empty keys (negative case)
- Single-key ES256 -> correct JWK fields (kid, alg, use, kty, crv)
- Dual-key rotation -> 2 keys, distinct kids (v1/v0), different coordinates
- Cache-Control header presence/absence
- In-process cache consistency

**Auth tests** (4 new ES256 rotation tests + existing):
- Current ES256 key verification -> 200
- Previous ES256 key verification (rotation grace) -> 200
- Unknown ES256 key rejection -> 401
- HS256 fallback (separate app config) -> 200
- Cache reset in beforeEach/afterEach prevents pollution

**Coverage gaps**: None identified for the sprint scope. All 3 steps of the verification chain are individually tested.

---

## Wiring Verification

The `server.ts` central wiring correctly passes the `jwtPreviousKey` to all three consumers:

| Consumer | Line | Parameter |
|----------|------|-----------|
| `createJwtMiddleware` | 283 | `config.jwtPreviousKey ?? undefined` |
| `createAuthRoutes` | 338 | `previousEs256Key: config.jwtPreviousKey ?? undefined` |
| `createJwksRoutes` | 343 | `jwtPreviousKey: config.jwtPreviousKey` |

The `?? undefined` coercion (null -> undefined) is correct for optional parameters.

---

## JWKS Private Key Leak Check

**Verdict**: PASS -- No private key material can reach the JWKS response.

The chain is:
1. `createPrivateKey(config.jwtPrivateKey)` -- parses PEM into private KeyObject
2. `createPublicKey(...)` -- extracts public KeyObject (discards private material)
3. `jose.exportJWK(publicKey)` -- exports only public fields (kty, crv, x, y)

The `exportJWK` call receives a **public** KeyObject. There is no `d` (private exponent) field in the output. The spread operator `{ ...jwk, kid, use, alg }` only adds metadata fields.

---

## Findings Summary

| ID | Severity | Description | Action |
|----|----------|-------------|--------|
| I-1 | INFORMATIONAL | `jwtVerify` calls do not pass explicit `algorithms` parameter | No action required -- jose key-type enforcement prevents confusion attacks. Consider adding for defense-in-depth in a future hardening sprint. |

**No CRITICAL, HIGH, or MEDIUM findings.**

---

## Decision

**APPROVED**

The implementation is cryptographically sound, properly layered, and well-tested. Key rotation is handled with a correct multi-key grace period. Caches use appropriate TTLs with documented invalidation strategies. No secrets leak, no error messages disclose internals, no bypass paths exist. The single informational note (I-1) is a defense-in-depth opportunity, not a vulnerability.

The engineer review (Cycle 2) correctly identified and verified resolution of all 3 findings from Cycle 1. Test coverage at 1,206 tests with zero regressions confirms no collateral damage.

Sprint 6 (G-70) is cleared for merge.
