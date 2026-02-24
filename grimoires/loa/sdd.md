# SDD: Dixie Phase 3 — Production Wiring & Live Integration

**Version**: 6.0.0
**Date**: 2026-02-25
**Author**: Merlin (Product), Claude (Architecture)
**Cycle**: cycle-006
**Status**: Draft
**PRD Reference**: `grimoires/loa/prd.md` v6.0.0
**Predecessor**: SDD v5.0.0 (cycle-005, Hounfour v7.11.0 Adoption)

## 1. System Overview

Dixie Phase 3 wires the existing Phase 2 architecture to production infrastructure.
The key principle is **zero behavioral change for existing consumers** — all modifications
are additive (new store implementation, algorithm detection, config fields) with automatic
fallback to current behavior when new configuration is absent.

### Scope Boundary

| In Scope | Out of Scope |
|----------|-------------|
| PostgresReputationStore implementation | Full x402 payment processing |
| ES256 JWT migration with JWKS | Multi-NFT resolution |
| Payment scaffold (config-gated) | NATS event streaming activation |
| NFT resolver extraction | Database migration tooling |
| Terraform env vars | Monitoring dashboard creation |
| E2E test infrastructure | Load testing |

## 2. New File Specifications

### 2.1 `app/src/db/pg-reputation-store.ts` — PostgresReputationStore

**Implements**: `ReputationStore` interface (8 methods)
**Dependencies**: `pg.Pool` (injected via constructor)

```typescript
import type { Pool } from 'pg';
import type { ReputationStore } from '../services/reputation-service.js';
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';
import type { TaskTypeCohort, ReputationEvent } from '../types/reputation-evolution.js';

export class PostgresReputationStore implements ReputationStore {
  constructor(private readonly pool: Pool) {}

  async get(nftId: string): Promise<ReputationAggregate | undefined> { ... }
  async put(nftId: string, aggregate: ReputationAggregate): Promise<void> { ... }
  async listCold(): Promise<Array<{ nftId: string; aggregate: ReputationAggregate }>> { ... }
  async count(): Promise<number> { ... }
  async listAll(): Promise<Array<{ nftId: string; aggregate: ReputationAggregate }>> { ... }
  async getTaskCohort(nftId: string, model: string, taskType: string): Promise<TaskTypeCohort | undefined> { ... }
  async putTaskCohort(nftId: string, cohort: TaskTypeCohort): Promise<void> { ... }
  async appendEvent(nftId: string, event: ReputationEvent): Promise<void> { ... }
  async getEventHistory(nftId: string): Promise<ReputationEvent[]> { ... }
}
```

**SQL patterns**:
- `get`: `SELECT aggregate FROM reputation_aggregates WHERE nft_id = $1`
- `put`: `INSERT INTO reputation_aggregates (nft_id, state, aggregate) VALUES ($1, $2, $3) ON CONFLICT (nft_id) DO UPDATE SET state = $2, aggregate = $3, updated_at = now()`
- `listCold`: `SELECT nft_id, aggregate FROM reputation_aggregates WHERE state = 'cold'`
- `count`: `SELECT COUNT(*) FROM reputation_aggregates`
- `listAll`: `SELECT nft_id, aggregate FROM reputation_aggregates`
- `getTaskCohort`: `SELECT cohort FROM reputation_task_cohorts WHERE nft_id = $1 AND model_id = $2 AND task_type = $3`
- `putTaskCohort`: `INSERT INTO reputation_task_cohorts (nft_id, model_id, task_type, cohort) VALUES ($1, $2, $3, $4) ON CONFLICT (nft_id, model_id, task_type) DO UPDATE SET cohort = $4, updated_at = now()`
- `appendEvent`: `INSERT INTO reputation_events (nft_id, event_type, event) VALUES ($1, $2, $3)`
- `getEventHistory`: `SELECT event FROM reputation_events WHERE nft_id = $1 ORDER BY created_at ASC`

**JSONB serialization**: The full `ReputationAggregate` and `TaskTypeCohort` objects are
stored as JSONB. The `state` field is extracted to a dedicated column for indexing.
The `event_type` is extracted from the discriminated union's `type` field.

### 2.2 `app/src/db/migrations/005_reputation.sql`

Three tables + indexes. See PRD FR-7 for schema.

Additional indexes beyond FR-7:
```sql
CREATE INDEX IF NOT EXISTS idx_reputation_aggregates_state
  ON reputation_aggregates(state);
CREATE INDEX IF NOT EXISTS idx_reputation_events_nft_date
  ON reputation_events(nft_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reputation_task_cohorts_nft
  ON reputation_task_cohorts(nft_id);
```

### 2.3 `app/src/services/nft-ownership-resolver.ts` — NftOwnershipResolver

**Dependencies**: `FinnClient` (injected via constructor)

```typescript
import type { FinnClient } from '../proxy/finn-client.js';

export interface OwnershipResult {
  nftId: string;
  ownerWallet: string;
  delegatedWallets: string[];
}

export class NftOwnershipResolver {
  constructor(private readonly finnClient: FinnClient) {}

  /** Resolve wallet → nftId (simple lookup, returns null if no dNFT) */
  async resolveNftId(wallet: string): Promise<string | null> {
    try {
      const result = await this.finnClient.request<{ nftId: string }>(
        'GET',
        `/api/identity/wallet/${encodeURIComponent(wallet)}/nft`,
      );
      return result.nftId;
    } catch {
      return null;
    }
  }

  /** Resolve wallet → full ownership (nftId + owner + delegated wallets) */
  async resolveOwnership(wallet: string): Promise<OwnershipResult | null> {
    try {
      return await this.finnClient.request<OwnershipResult>(
        'GET',
        `/api/identity/wallet/${encodeURIComponent(wallet)}/ownership`,
      );
    } catch {
      return null;
    }
  }
}
```

### 2.4 `app/src/routes/jwks.ts` — JWKS Endpoint

```typescript
import { Hono } from 'hono';
import * as jose from 'jose';

export function createJwksRoutes(publicKey: jose.KeyLike | null): Hono {
  const app = new Hono();

  // GET /.well-known/jwks.json
  app.get('/.well-known/jwks.json', async (c) => {
    if (!publicKey) {
      // HS256 mode — no public key to expose
      return c.json({ keys: [] });
    }
    const jwk = await jose.exportJWK(publicKey);
    jwk.alg = 'ES256';
    jwk.use = 'sig';
    jwk.kid = 'dixie-es256-v1';
    return c.json({ keys: [jwk] });
  });

  return app;
}
```

### 2.5 `app/tests/e2e/live-integration.test.ts`

E2E smoke tests designed to run against `docker-compose.integration.yml`.
Skipped when `INTEGRATION_TEST_URL` env var is not set.

```typescript
import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.INTEGRATION_TEST_URL;

describe.skipIf(!BASE_URL)('E2E: Live Integration', () => {
  it('health endpoint reports PostgreSQL', async () => { ... });
  it('auth flow issues valid JWT', async () => { ... });
  it('chat proxy round-trip', async () => { ... });
  it('reputation persists across requests', async () => { ... });
});
```

## 3. File Modification Specifications

### 3.1 `app/src/server.ts` — Wiring Changes

**Line 192**: Replace InMemoryReputationStore with conditional PostgresReputationStore:

```typescript
// Before:
const reputationService = new ReputationService(new InMemoryReputationStore());

// After:
import { PostgresReputationStore } from './db/pg-reputation-store.js';

const reputationStore = dbPool
  ? new PostgresReputationStore(dbPool)
  : new InMemoryReputationStore();
const reputationService = new ReputationService(reputationStore);
```

**Lines 302-427**: Replace 4 NFT lambdas with NftOwnershipResolver:

```typescript
import { NftOwnershipResolver } from './services/nft-ownership-resolver.js';

const nftResolver = new NftOwnershipResolver(finnClient);

// createMemoryContext (was lines 302-315):
app.use('/api/*', createMemoryContext({
  memoryStore,
  resolveNftId: (wallet) => nftResolver.resolveNftId(wallet),
}));

// createScheduleRoutes (was lines 350-361):
app.route('/api/schedule', createScheduleRoutes({
  ...
  resolveNftOwnership: (wallet) => nftResolver.resolveNftId(wallet).then(nftId => nftId ? { nftId } : null),
}));

// createLearningRoutes (was lines 397-408):
app.route('/api/learning', createLearningRoutes({
  ...
  resolveNftOwnership: (wallet) => nftResolver.resolveNftId(wallet).then(nftId => nftId ? { nftId } : null),
}));

// createMemoryRoutes (was lines 414-427):
app.route('/api/memory', createMemoryRoutes({
  ...
  resolveNftOwnership: (wallet) => nftResolver.resolveOwnership(wallet),
}));
```

**New route**: Wire JWKS endpoint:

```typescript
import { createJwksRoutes } from './routes/jwks.js';

app.route('/api/auth', createJwksRoutes(publicKey));
```

### 3.2 `app/src/middleware/jwt.ts` — ES256 Verification

```typescript
// Dual-algorithm verification:
// 1. If ES256 key available: try ES256 first
// 2. Fallback to HS256 (backward compatibility)

export function createJwtMiddleware(
  jwtKey: string,
  issuer: string,
  es256PublicKey?: jose.KeyLike,
) {
  const hs256Secret = new TextEncoder().encode(jwtKey);

  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header('authorization');
    if (authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer dxk_')) {
      const token = authHeader.slice(7);
      try {
        // Try ES256 first if public key available
        if (es256PublicKey) {
          try {
            const { payload } = await jose.jwtVerify(token, es256PublicKey, { issuer });
            if (payload.sub) c.set('wallet', payload.sub);
            return await next();
          } catch {
            // Fall through to HS256
          }
        }
        // HS256 fallback
        const { payload } = await jose.jwtVerify(token, hs256Secret, { issuer });
        if (payload.sub) c.set('wallet', payload.sub);
      } catch (err) {
        // existing error logging...
      }
    }
    await next();
  });
}
```

### 3.3 `app/src/routes/auth.ts` — ES256 Token Issuance

```typescript
// issueJwt updated for dual-algorithm:
async function issueJwt(
  wallet: string,
  config: AuthConfig,
): Promise<string> {
  if (config.es256PrivateKey) {
    // ES256 issuance
    return new jose.SignJWT({ role: 'team' })
      .setProtectedHeader({ alg: 'ES256', kid: 'dixie-es256-v1' })
      .setSubject(wallet)
      .setIssuer(config.issuer)
      .setIssuedAt()
      .setExpirationTime(config.expiresIn)
      .sign(config.es256PrivateKey);
  }
  // HS256 fallback
  const secret = new TextEncoder().encode(config.jwtPrivateKey);
  return new jose.SignJWT({ role: 'team' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(wallet)
    .setIssuer(config.issuer)
    .setIssuedAt()
    .setExpirationTime(config.expiresIn)
    .sign(secret);
}
```

`AuthConfig` extended:
```typescript
export interface AuthConfig {
  jwtPrivateKey: string;
  issuer: string;
  expiresIn: string;
  es256PrivateKey?: jose.KeyLike;  // Parsed PEM key (if ES256 mode)
}
```

### 3.4 `app/src/middleware/payment.ts` — Config-Gated Scaffold

```typescript
export interface PaymentGateOptions {
  enabled: boolean;
}

export function createPaymentGate(options?: PaymentGateOptions) {
  const enabled = options?.enabled ?? false;

  return createMiddleware(async (c, next) => {
    if (enabled) {
      // Scaffold: set payment context headers for future x402 integration
      const wallet = c.get('wallet') as string | undefined;
      c.header('X-Payment-Status', 'scaffold');
      if (wallet) {
        c.header('X-Payment-Wallet', wallet);
      }
    }
    await next();
  });
}
```

### 3.5 `app/src/config.ts` — New Config Fields

Add to `DixieConfig` interface:
```typescript
/** x402 payment gate enabled (default: false). When true, payment scaffold is active. */
x402Enabled: boolean;
/** Parsed ES256 private key (null when using HS256). Derived from jwtPrivateKey PEM format. */
es256PrivateKey: jose.KeyLike | null;
/** Parsed ES256 public key for verification (null when using HS256). */
es256PublicKey: jose.KeyLike | null;
```

Update `loadConfig()`:
```typescript
// ES256 auto-detection: PEM prefix indicates asymmetric key
let es256PrivateKey: jose.KeyLike | null = null;
let es256PublicKey: jose.KeyLike | null = null;
if (jwtPrivateKey.startsWith('-----BEGIN')) {
  es256PrivateKey = await jose.importPKCS8(jwtPrivateKey, 'ES256');
  // Derive public key from private for JWKS and verification
  const jwk = await jose.exportJWK(es256PrivateKey);
  es256PublicKey = await jose.importJWK({ ...jwk, d: undefined }, 'ES256');
} else if (nodeEnv !== 'test' && jwtPrivateKey.length < 32) {
  throw new Error(...); // existing validation
}
```

Add environment variable:
```typescript
x402Enabled: process.env.DIXIE_X402_ENABLED === 'true',
```

Note: `loadConfig()` becomes `async` to support `jose.importPKCS8`.

### 3.6 `app/src/routes/health.ts` — Store Type Reporting

Extend the reputation status object:
```typescript
const reputationStatus = deps.reputationService ? {
  initialized: true,
  aggregate_count: await deps.reputationService.store.count(),
  store_type: deps.reputationService.store instanceof PostgresReputationStore
    ? 'postgres' : 'memory',
  ...(deps.reputationService.store instanceof PostgresReputationStore && deps.dbPool ? {
    pool_total: deps.dbPool.totalCount,
    pool_idle: deps.dbPool.idleCount,
    pool_waiting: deps.dbPool.waitingCount,
  } : {}),
} : undefined;
```

### 3.7 `deploy/terraform/dixie.tf` — Environment Variables

Add to `environment` array (line 284):
```hcl
{ name = "REDIS_URL", value = "redis://redis.freeside.local:6379" },
{ name = "NATS_URL", value = "nats://nats.freeside.local:4222" },
```

Add to `secrets` array:
```hcl
{
  name      = "DATABASE_URL"
  valueFrom = data.aws_secretsmanager_secret.dixie_database_url.arn
}
```

Add Secrets Manager reference:
```hcl
data "aws_secretsmanager_secret" "dixie_database_url" {
  name = "dixie/database-url"
}
```

Update IAM policy to include the new secret ARN.

Add security group egress rules:
```hcl
egress {
  from_port   = 5432
  to_port     = 5432
  protocol    = "tcp"
  description = "PostgreSQL"
  cidr_blocks = ["10.0.0.0/8"]
}

egress {
  from_port   = 4222
  to_port     = 4222
  protocol    = "tcp"
  description = "NATS"
  cidr_blocks = ["10.0.0.0/8"]
}
```

### 3.8 `deploy/docker-compose.integration.yml` — PostgreSQL Service

Add PostgreSQL service:
```yaml
postgres:
  image: postgres:16-alpine
  ports:
    - "5632:5432"
  environment:
    POSTGRES_DB: dixie_test
    POSTGRES_USER: dixie
    POSTGRES_PASSWORD: dixie_test_pass
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U dixie -d dixie_test"]
    interval: 5s
    timeout: 3s
    retries: 5
```

Add to dixie-bff service environment:
```yaml
DATABASE_URL: "postgresql://dixie:dixie_test_pass@postgres:5432/dixie_test"
```

Add dependency:
```yaml
depends_on:
  postgres:
    condition: service_healthy
```

## 4. Data Flow Diagrams

### 4.1 Reputation Persistence Flow

```
PUT /api/chat → chat route → reputationService.store.put()
                                    │
                    ┌────────────────┼────────────────┐
                    │ DATABASE_URL?  │                 │
                    ▼ yes            ▼ no              │
          PostgresReputationStore  InMemoryReputationStore
          INSERT ... ON CONFLICT   Map.set()
          reputation_aggregates
```

### 4.2 JWT Authentication Flow (ES256)

```
Client                     Dixie                    Finn
  │                          │                       │
  ├─ POST /api/auth/siwe ──→│                       │
  │                          ├── verify SIWE sig     │
  │                          ├── detect key format   │
  │                          │   PEM? → ES256 sign   │
  │                          │   raw? → HS256 sign   │
  │←── { token, wallet } ───┤                       │
  │                          │                       │
  ├─ GET /api/chat ──────────┤                       │
  │  Authorization: Bearer   ├── try ES256 verify    │
  │                          ├── fallback HS256      │
  │                          ├── c.set('wallet')     │
  │                          ├── proxy to finn ──────→│
  │←── chat response ────────┤←── response ──────────┤
  │                          │                       │
  │                    GET /api/auth/.well-known/jwks.json
  │                          │←──────────────────────┤
  │                          ├── return ES256 JWK    │
```

## 5. Test Strategy

### 5.1 Unit Tests (No External Dependencies)

| Test File | FR | Coverage |
|-----------|------|---------|
| `pg-reputation-store.test.ts` | FR-1 | All 8 methods with mock pg.Pool |
| `nft-ownership-resolver.test.ts` | FR-4 | resolveNftId, resolveOwnership with mock FinnClient |
| `jwt-es256.test.ts` | FR-2 | ES256 sign/verify round-trip, HS256 fallback, dual-algo |
| `jwks.test.ts` | FR-2 | JWKS endpoint returns valid JWK, empty when HS256 |
| `payment-scaffold.test.ts` | FR-3 | Enabled/disabled config gating, header behavior |
| `health-enhanced.test.ts` | FR-8 | Store type reporting, pool metrics |
| `config-es256.test.ts` | FR-2 | PEM detection, async loadConfig |

### 5.2 Integration Tests (Docker-based)

| Test | FRs | Requires |
|------|-----|----------|
| Reputation round-trip via PostgreSQL | FR-1, FR-7 | postgres container |
| SIWE → ES256 JWT → protected endpoint | FR-2 | dixie-bff + loa-finn containers |
| Health reports postgres store type | FR-8 | postgres container |

### 5.3 Backward Compatibility

All 1,146 existing tests run against InMemoryReputationStore (no DATABASE_URL in test env).
HS256 JWT secrets remain valid. Payment middleware defaults to noop.

## 6. Migration Plan

### 6.1 Database Migration

```bash
# Run against target database:
psql -f app/src/db/migrations/005_reputation.sql $DATABASE_URL
```

Migration is idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).

### 6.2 ES256 Key Generation

```bash
# Generate EC P-256 keypair:
openssl ecparam -genkey -name prime256v1 -noout -out private.pem
openssl ec -in private.pem -pubout -out public.pem

# Store in Secrets Manager:
aws secretsmanager update-secret --secret-id dixie/jwt-private-key \
  --secret-string "$(cat private.pem)"
```

### 6.3 Deployment Sequence

1. Run 005_reputation.sql migration
2. Store ES256 private key in Secrets Manager
3. Deploy with new Terraform (adds env vars + secrets)
4. Verify health endpoint shows `store_type: "postgres"`
5. Verify JWKS endpoint returns ES256 key
6. Optional: Enable x402 scaffold (`DIXIE_X402_ENABLED=true`)

## 7. Security Considerations

- DATABASE_URL contains credentials — must be in Secrets Manager (never plaintext Terraform)
- ES256 private key in Secrets Manager — public key exposed only via JWKS
- `kid` header enables future key rotation without service disruption
- x402 scaffold sets informational headers only — no payment processing without `@x402/hono`
- New security group rules follow principle of least privilege (specific ports, VPC CIDR only)
