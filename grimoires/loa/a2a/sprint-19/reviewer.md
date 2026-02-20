# Sprint 19: Final Convergence (Bridge Iteration 3)

## Summary

Sprint 19 addresses the 2 remaining MEDIUM findings from Bridgebuilder iteration 2. All tests passing, TypeScript compiles clean.

## Source

Generated from bridge findings: `.run/bridge-reviews/bridge-20260220-451207-iter2-full.md`

## Tasks Completed

### Task 19.1: SEC-007 — WebSocket Upgrade Session ID Validation (MEDIUM)

**Finding**: WebSocket upgrade handler passes raw URL pathname to loa-finn without validating the session ID segment. URL constructor normalizes path traversal (`../../admin` -> `/admin`).

**Fix**:
- `app/src/ws-upgrade.ts:44-54`: Extract session ID from path segments, validate with `isValidPathParam()` before upstream URL construction
- Rejects invalid session IDs with 400 `invalid_session_id` response

**Acceptance**: Path traversal via WebSocket upgrade URL is blocked by session ID validation.

### Task 19.2: ARCH-001 — Shared Request Context Helper

**Finding**: Route handlers duplicate wallet/requestId header extraction with slight inconsistencies (chat.ts read from response headers, others from request headers only).

**Fix**:
- `app/src/validation.ts:22-33`: Added `getRequestContext(c)` helper that consistently extracts `{ wallet, requestId }` from request headers
- `app/src/routes/chat.ts`: Replaced inline extraction with `getRequestContext(c)`
- `app/src/routes/sessions.ts`: Both handlers use `getRequestContext(c)`
- `app/src/routes/identity.ts`: Uses `getRequestContext(c)` for requestId
- `app/src/routes/ws-ticket.ts`: Uses `getRequestContext(c)` for wallet

**Acceptance**: All route handlers use consistent extraction via shared helper. No behavioral changes.

## Test Results

- Backend: 153 passed, 0 failed (23 test files)
- Web: 20 passed, 0 failed (4 test files)
- TypeScript: compiles clean

## Files Changed

| File | Change |
|------|--------|
| `app/src/ws-upgrade.ts` | Session ID validation before upstream URL construction |
| `app/src/validation.ts` | Added `getRequestContext()` helper |
| `app/src/routes/chat.ts` | Uses `getRequestContext()` |
| `app/src/routes/sessions.ts` | Uses `getRequestContext()` |
| `app/src/routes/identity.ts` | Uses `getRequestContext()` |
| `app/src/routes/ws-ticket.ts` | Uses `getRequestContext()` |
