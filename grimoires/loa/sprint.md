# Bridge Fix Sprint: Iteration 1 Findings

**Bridge**: bridge-20260225-phase3
**Iteration**: 1
**Convergence Score**: 37 (target: < 2 for flatline)
**Date**: 2026-02-25

---

## Tasks

### Task B1.1: Add LIMIT to getEventHistory query (HIGH-1)
**File**: `app/src/db/pg-reputation-store.ts`
**Fix**: Add `LIMIT 1000` default to prevent unbounded event scans.
**AC**: Query has LIMIT clause; test verifies bounded behavior.

### Task B1.2: Add countByState() to avoid full-table listAll() scan (HIGH-2)
**File**: `app/src/db/pg-reputation-store.ts`, `app/src/services/reputation-service.ts`
**Fix**: Add `countByState()` method returning `Map<string, number>` via `GROUP BY state` query.
**AC**: New method exists and is tested. Note: ReputationStore interface change must be backward-compatible with InMemoryReputationStore.

### Task B1.3: Wire hs256FallbackSecret through server.ts (MEDIUM-3)
**File**: `app/src/server.ts`, `app/src/config.ts`
**Fix**: Add `DIXIE_HS256_FALLBACK_SECRET` env var, pass to createJwtMiddleware and createAuthRoutes.
**AC**: Fallback secret is wired; transition period documented.

### Task B1.4: Add try-catch to health endpoint reputation count (MEDIUM-4)
**File**: `app/src/routes/health.ts`
**Fix**: Wrap `store.count()` in try-catch, return `aggregate_count: -1` on failure.
**AC**: Health endpoint doesn't throw when store is unreachable.

### Task B1.5: Remove deprecated docker-compose version key (LOW-1)
**File**: `deploy/docker-compose.integration.yml`
**Fix**: Remove `version: "3.9"` line.
**AC**: File validates without deprecation warning.

### Task B1.6: Document key caching limitation in auth.ts (MEDIUM-2)
**File**: `app/src/routes/auth.ts`
**Fix**: Add JSDoc noting single-PEM assumption on cached key functions.
**AC**: Documentation added inline.

### Task B1.7: Add retention strategy comment to migration (MEDIUM-5)
**File**: `app/src/db/migrations/005_reputation.sql`
**Fix**: Add comment documenting expected retention strategy for reputation_events.
**AC**: Comment present in migration file.
