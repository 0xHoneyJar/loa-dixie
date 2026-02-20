# Sprint 15 Implementation Report: Hermetic Integration Testing

## Sprint Overview

| Field | Value |
|-------|-------|
| Sprint ID | sprint-15 (global) |
| Label | Hermetic Integration Testing |
| Tasks | 4 |
| Status | COMPLETED |
| Tests Before | 135 |
| Tests After | 152 (+17) |

## Tasks Completed

### Task 15.1: Docker Compose Integration Environment
**File**: `deploy/docker-compose.integration.yml`

Created hermetic integration environment with:
- **Redis**: Session storage for loa-finn (port 6479)
- **loa-finn**: Real instance from `ghcr.io/0xhoneyjar/loa-finn:latest` (port 4200)
- **knowledge-init**: Alpine init container that seeds Oracle knowledge corpus
- **dixie-bff**: Build from local Dockerfile (port 3201)

Key design decisions:
- All state is ephemeral (no persistent volumes beyond the compose session)
- JWT secret shared between dixie and finn (`integration-test-jwt-secret-32chars!`)
- Health checks with start_period to handle cold-start latency
- Shared `knowledge-shared` volume between init container and loa-finn

### Task 15.2: Full Proxy Flow Integration Tests
**File**: `app/tests/integration/proxy-flow.test.ts` (6 tests)

Tests the complete request path through the BFF:
- **Health endpoint**: Validates dixie returns composite health with finn status
- **Auth gates**: 401 for unauthenticated, 403 for non-allowlisted API keys
- **Chat through BFF**: Allowlisted API key creates session via POST /api/chat
- **Session metadata**: Response includes sessionId and messageId
- **Circuit breaker**: Returns degraded health when finn is unreachable

Dual-mode architecture:
- Default: In-process mock finn (hermetic, no Docker needed)
- Docker: Set `INTEGRATION_URL=http://localhost:3201` for real finn testing

Notable fix: Module-level health cache in `routes/health.ts` is shared across app instances. Used `resetHealthCache()` export to ensure isolated app gets fresh results.

### Task 15.3: WebSocket Bidirectional Proxy Pipe Tests
**File**: `app/tests/integration/ws-proxy-pipe.test.ts` (7 tests)

Tests the raw WebSocket proxy code in `ws-upgrade.ts`:
- **Forward direction**: Client message arrives at upstream echo server
- **Reverse direction**: Echo response arrives back at client
- **Upstream close cascade**: Upstream close triggers client close event
- **Client close cascade**: Client close triggers upstream cleanup
- **Large message**: 100KB payload passes through without corruption
- **Missing ticket**: Connection rejected without ticket
- **Invalid ticket**: Connection rejected with bad ticket

Implementation uses `getRequestListener` from `@hono/node-server` to create proper HTTP server with Hono request handling + WebSocket upgrade handler attached.

### Task 15.4: JWT Exchange Integration Tests
**File**: `app/tests/integration/jwt-exchange.test.ts` (4 tests)

Validates the full JWT lifecycle:
- **Valid JWT flow**: JWT issued with HS256 → wallet extracted → allowlist check → finn session created
- **Expired JWT**: Rejected at dixie's JWT middleware layer (401)
- **Wrong issuer**: Rejected at dixie's JWT middleware layer (401)
- **Ticket flow e2e**: Issue returns `{ticket, expiresIn}`, consume returns wallet, second consume returns null

Key design insight: Dixie validates JWTs and forwards wallet via `X-Wallet-Address` header to finn. The mock finn validates the forwarded wallet header arrives (not JWT re-validation). This matches the real architecture where dixie is the JWT authority.

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `ws` | devDependency | WebSocket client for integration tests |
| `@types/ws` | devDependency | TypeScript types for ws |

## Findings and Fixes During Implementation

1. **TicketStore.issue() return type**: Returns `{ticket: string, expiresIn: number} | null`, not a plain string. Tests updated to destructure correctly.

2. **Valid Ethereum addresses required**: `viem.getAddress()` validates addresses. Test wallet `0xTestWallet123` is invalid. Fixed with proper hex address `0x1234567890123456789012345678901234567890`.

3. **Health cache module singleton**: `cachedFinnHealth` in `routes/health.ts` is module-level, shared across all app instances in the same process. Tests that create isolated apps must call `resetHealthCache()`.

4. **@hono/node-server serve() auto-binds**: `serve()` creates AND listens on port 3000 by default. For custom HTTP servers needing upgrade handlers, use `getRequestListener()` instead.

5. **JWT forwarding architecture**: Dixie validates JWTs → extracts wallet → forwards via header. Mock finn should validate wallet header presence, not re-validate JWT.
