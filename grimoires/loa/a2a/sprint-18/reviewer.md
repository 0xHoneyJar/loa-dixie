# Sprint 18: Security Hardening III (Bridge Iteration 1)

## Summary

Sprint 18 addresses HIGH and key MEDIUM findings from Bridgebuilder review (bridge-20260220-451207, iteration 1). All 5 tasks completed with 153 backend tests and 20 web tests passing.

## Source

Generated from bridge findings: `.run/bridge-reviews/bridge-20260220-451207-iter1-full.md`

## Tasks Completed

### Task 18.1: SEC-001 — Admin API Empty-Key Bypass (HIGH)

**Finding**: `safeEqual('', '')` returns `true` because `timingSafeEqual` on two zero-length buffers succeeds and `0 === 0`.

**Fix**:
- `app/src/config.ts:59-62`: Added production-time validation that throws if `DIXIE_ADMIN_KEY` is empty
- `app/src/routes/admin.ts`: Added defense-in-depth runtime guard — if `!adminKey`, returns 403 immediately
- `app/tests/unit/config.test.ts`: Added test for empty admin key in production

**Acceptance**: Config throws in production with empty key; admin routes return 403 if key is empty at runtime.

### Task 18.2: SEC-002 — Path Parameter Injection (HIGH)

**Finding**: `sessionId` interpolated into URL paths (`/api/sessions/${body.sessionId}/message`) without validation enables SSRF-adjacent path traversal.

**Fix**:
- `app/src/validation.ts` (NEW): Created `isValidPathParam()` with `/^[a-zA-Z0-9_-]+$/` regex, length bounds 1-128
- `app/src/routes/chat.ts:60-65`: Added validation before sessionId URL interpolation
- `app/src/routes/sessions.ts:54-60`: Added validation before id URL interpolation

**Acceptance**: Path params validated against strict alphanumeric pattern before any URL interpolation.

### Task 18.3: SEC-003 — Wallet Not Propagated from JWT to Routes (HIGH)

**Finding**: JWT middleware stores wallet via `c.set('wallet')`, but Hono sub-app boundaries reset typed context. Route handlers read `x-wallet-address` header, but nothing bridges the two.

**Fix**:
- `app/src/middleware/wallet-bridge.ts` (NEW): Middleware that reads wallet from Hono context and sets `x-wallet-address` request header
- `app/src/server.ts:99-102`: Registered after JWT middleware, before rate limiting

**Acceptance**: Wallet extracted by JWT middleware is available to all downstream route handlers via `x-wallet-address` header.

### Task 18.4: ARCH-002 — Runtime Body Validation with Zod (MEDIUM)

**Finding**: `c.req.json<T>()` uses TypeScript generics erased at compile time — no runtime validation of request bodies.

**Fix**:
- Installed `zod` as dependency
- `app/src/routes/chat.ts:23-28`: Added `ChatRequestSchema` with Zod, replaced manual body parsing with `safeParse()`
- `app/src/routes/auth.ts:17-20`: Added `SiweRequestSchema` with Zod, replaced generic `c.req.json<T>()` with `safeParse()`

**Acceptance**: All POST endpoints validate request bodies at runtime with Zod schemas.

### Task 18.5: Frontend Fixes (RES-002, CODE-004, CODE-003)

**RES-002 — WebSocket Reconnect Counter**:
- `web/src/lib/ws.ts:110`: Added `ws.onopen` handler to reset `reconnectAttempts` to 0 on successful connection

**CODE-004 — OracleIdentityCard Auth**:
- `web/src/components/OracleIdentityCard.tsx:33-38`: Added auth token to identity fetch via `getAuthToken()`

**CODE-003 — Message ID Collision**:
- `web/src/hooks/useChat.ts:43`: Changed `Date.now()` to `crypto.randomUUID()` for message IDs

**Acceptance**: WS reconnect counter resets properly; identity card authenticates; message IDs use UUIDs.

## Test Results

- Backend: 153 passed, 0 failed (23 test files)
- Web: 20 passed, 0 failed (4 test files)
- TypeScript: compiles clean (`npx tsc --noEmit`)

## Files Changed

| File | Change |
|------|--------|
| `app/src/config.ts` | Admin key validation in production |
| `app/src/routes/admin.ts` | Defense-in-depth empty-key guard |
| `app/src/validation.ts` | NEW — path parameter validation |
| `app/src/routes/chat.ts` | Zod validation + path param check |
| `app/src/routes/sessions.ts` | Path param validation |
| `app/src/routes/auth.ts` | Zod validation for SIWE body |
| `app/src/middleware/wallet-bridge.ts` | NEW — wallet context→header bridge |
| `app/src/server.ts` | Wallet bridge middleware registration |
| `web/src/lib/ws.ts` | Reconnect counter reset on open |
| `web/src/components/OracleIdentityCard.tsx` | Auth token for identity fetch |
| `web/src/hooks/useChat.ts` | UUID message IDs |
| `app/tests/unit/config.test.ts` | Admin key production validation test |
