---
generated_date: "2026-02-16"
source_repo: 0xHoneyJar/loa-finn
provenance: cycle-025-sprint-61-task-2.4
tags: ["technical"]
---

# Code Reality: loa-finn

Technical knowledge source documenting the loa-finn codebase as implemented.
All citations use `repo/path#Symbol` format. Type signatures are taken directly
from source.

---

## 1. Gateway Layer

**Path**: `src/gateway/`

The HTTP gateway is built on [Hono](https://hono.dev/) and exposes the
following endpoints.

### 1.1 Route Registration

`loa-finn/src/gateway/server.ts#createApp` is the factory function:

```typescript
function createApp(config: FinnConfig, options: AppOptions):
  { app: Hono; router: SessionRouter }
```

`AppOptions` controls which optional subsystems are wired:

```typescript
interface AppOptions {
  healthAggregator?: HealthAggregator
  activityFeed?: ActivityFeed
  executor?: SandboxExecutor
  pool?: WorkerPool
  hounfour?: HounfourRouter
  s2sSigner?: S2SJwtSigner
  billingFinalizeClient?: BillingFinalizeClient
  ledgerPath?: string
}
```

Middleware ordering on `/api/v1/*`:

1. `x-internal-reservation-id` header stripping (zero-trust defense-in-depth)
2. `rateLimitMiddleware(config)` -- sliding window rate limit
3. `hounfourAuth(config)` -- JWT validation + pool enforcement

### 1.2 Endpoints

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| `GET` | `/health` | None | Inline; returns uptime, model, billing DLQ metrics |
| `GET` | `/.well-known/jwks.json` | None | S2S public key for JWKS discovery |
| `POST` | `/api/v1/invoke` | JWT (hounfourAuth) | `createInvokeHandler(router)` |
| `GET` | `/api/v1/usage` | JWT (hounfourAuth) | `createUsageHandler(ledgerPath)` |
| `POST` | `/api/sessions` | Bearer token | Session create |
| `POST` | `/api/sessions/:id/message` | Bearer token | Non-streaming prompt |
| `GET` | `/api/sessions` | Bearer token | List sessions |
| `GET` | `/api/sessions/:id` | Bearer token | Session info |
| `GET` | `/api/dashboard/activity` | Bearer token | Bridgebuilder activity feed |

### 1.3 Invoke Handler

`loa-finn/src/gateway/routes/invoke.ts#createInvokeHandler`

Request body: `{ agent: string, prompt: string }`

Calls `router.invokeForTenant(agent, prompt, tenant, "invoke")` where
`tenant` is `TenantContext` set by `hounfourAuth` middleware.

Response shape:

```json
{
  "response": "...",
  "model": "gpt-4o",
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 },
  "cost_micro": "1500",
  "trace_id": "uuid",
  "knowledge": { ... }
}
```

Error code mapping (`loa-finn/src/gateway/routes/invoke.ts#mapErrorToStatus`):

| HounfourError Code | HTTP Status |
|-------------------|-------------|
| `BUDGET_EXCEEDED` | 402 |
| `BINDING_INVALID` | 400 |
| `BUDGET_CIRCUIT_OPEN` | 503 |
| `PROVIDER_UNAVAILABLE` | 502 |
| `RATE_LIMITED` | 429 |
| `ORACLE_MODEL_UNAVAILABLE` | 422 |
| `ORACLE_KNOWLEDGE_UNAVAILABLE` | 503 |
| `KNOWLEDGE_INJECTION` | 403 |
| `CONTEXT_OVERFLOW` | 413 |

### 1.4 Usage Handler

`loa-finn/src/gateway/routes/usage.ts#createUsageHandler`

Query params: `?days=7` (default 7, max 90).
Stream-parses JSONL ledger line-by-line, filters by `tenant_id` from JWT.
Supports both V1 (float USD) and V2 (string micro-USD) ledger entries.
Returns aggregated cost per provider:model with BigInt-safe string serialization.

---

## 2. Hounfour Router

**Path**: `loa-finn/src/hounfour/router.ts`

Central model routing engine. Resolves agent bindings to provider/model pairs,
applies budget enforcement, routing chains, and knowledge enrichment.

### 2.1 Class Signature

```typescript
class HounfourRouter {
  constructor(options: HounfourRouterOptions)
  invoke(agent: string, prompt: string, options?: InvokeOptions): Promise<CompletionResult>
  invokeForTenant(agent: string, prompt: string, tenantContext: TenantContext,
    taskType: string, options?: InvokeOptions): Promise<CompletionResult>
  invokeWithTools(agent: string, prompt: string, tools: ToolDefinition[],
    executor: ToolExecutor, options?: InvokeOptions): Promise<CompletionResult>
  validateBindings(): void
  healthSnapshot(): ProviderHealthSnapshot
  budgetSnapshot(): BudgetSnapshot
  setBillingFinalize(client: BillingFinalizeClient): void
}
```

### 2.2 HounfourRouterOptions

```typescript
interface HounfourRouterOptions {
  registry: ProviderRegistry
  budget: BudgetEnforcer
  health: HealthProber
  cheval: ChevalInvoker
  scopeMeta: ScopeMeta
  rateLimiter?: ProviderRateLimiter
  poolRegistry?: PoolRegistry
  byokProxy?: BYOKProxyClient
  billingFinalize?: BillingFinalizeClient
  knowledgeRegistry?: KnowledgeRegistry
  projectRoot?: string
  routingConfig?: Partial<RoutingConfig>
  toolCallConfig?: Partial<ToolCallLoopConfig>
}
```

### 2.3 invoke()

Local (non-tenant) dispatch. Resolution order:

1. Resolve agent binding from registry
2. Resolve execution (alias resolution, capability check, downgrade/fallback)
3. Budget circuit breaker check (5-minute failure window)
4. Budget warning/exceeded check
5. Load persona
6. Apply knowledge enrichment (if registry + binding.knowledge.enabled)
7. Build messages (system prompt + user prompt)
8. Rate limit acquisition
9. Create model adapter and invoke via cheval
10. Record cost to ledger

### 2.4 invokeForTenant()

Tenant-aware dispatch for arrakis-originated requests:

1. Resolve agent binding
2. Pool selection via `selectAuthorizedPool(tenantContext, taskType)`
3. Health-aware pool fallback via `poolRegistry.resolveWithFallback()`
4. Budget circuit breaker + budget exceeded checks
5. Persona load + knowledge enrichment
6. Build messages with reservation_id from JWT claims
7. Execution path: BYOK proxy vs direct provider adapter
8. Rate limit enforcement
9. Cost recording with pool and tenant attribution
10. Billing finalize (S2S call to arrakis, DLQ fallback on failure)

### 2.5 invokeWithTools()

Multi-turn tool execution loop with safety bounds:

```typescript
interface ToolCallLoopConfig {
  maxIterations: number             // Default: 20
  abortOnConsecutiveFailures: number // Default: 3
  maxWallTimeMs: number             // Default: 120000 (2 min)
  maxTotalToolCalls: number         // Default: 50
  budgetCheckPerIteration: boolean  // Default: true
}
```

Per-iteration checks: budget circuit breaker, budget exceeded, wall time,
context utilization (warn at 80%, error at 90%), rate limit.
Tool call idempotency via `traceId:toolCallId` cache.

### 2.6 applyKnowledgeEnrichment() (Private Helper)

Shared across all three invoke paths. Called after persona load, before
message construction.

```typescript
private applyKnowledgeEnrichment(
  persona: string | null,
  prompt: string,
  binding: AgentBinding,
  contextWindow: number,
): { systemPrompt: string | null; knowledgeMeta?: EnrichmentMetadata }
```

Delegates to `enrichSystemPrompt()` from the knowledge-enricher module.
Catches non-fatal enrichment errors and falls back to persona-only.
Propagates `ORACLE_MODEL_UNAVAILABLE` (hard floor violation) as-is.

### 2.7 Cost Arithmetic

`loa-finn/src/hounfour/router.ts#usdToMicroBigInt` and `computeCostMicro`
use the Stripe "integer cents" pattern -- convert USD to micro-USD BigInt
at the boundary, never use float multiplication on money.

```typescript
function usdToMicroBigInt(usd: number): bigint
function computeCostMicro(
  promptTokens: number, completionTokens: number,
  inputPricePerMillion: number, outputPricePerMillion: number,
): bigint
```

---

## 3. Provider Registry

**Path**: `loa-finn/src/hounfour/registry.ts`

Immutable registry built once from YAML config at startup.

### 3.1 Factory

```typescript
class ProviderRegistry {
  static fromConfig(raw: RawProviderConfig): ProviderRegistry
  resolveAlias(aliasOrCanonical: string): ResolvedModel
  getProvider(name: string): ProviderEntry | undefined
  getModel(provider: string, modelId: string): ModelEntry | undefined
  getAgentBinding(agentName: string): AgentBinding | undefined
  getPricing(provider: string, modelId: string): PricingEntry | undefined
  listProviders(): ProviderEntry[]
  validateBindings(): ValidationResult[]
}
```

### 3.2 Alias Resolution

Aliases map short names to canonical `provider:model` strings.
`resolveAlias()` splits on `:` and returns `{ provider, modelId }`.

### 3.3 Env Var Interpolation

API keys support `{env:VAR_NAME}` syntax. Allowlist enforced:
- Pattern `*_API_KEY`
- Pattern `CHEVAL_*`

Non-matching vars are rejected with a warning and resolve to empty string.

### 3.4 Cycle Detection

DFS-based cycle detection runs on all fallback/downgrade chains at
construction time. Aliases are resolved before traversal.

---

## 4. Budget Enforcement

**Path**: `loa-finn/src/hounfour/budget.ts`

### 4.1 BudgetEnforcer Class

```typescript
class BudgetEnforcer {
  constructor(config: BudgetConfig)
  initFromCheckpoint(): Promise<void>
  recordCost(scopeMeta: ScopeMeta, usage: UsageInfo, pricing: PricingEntry,
    extraFields: { trace_id, agent, provider, model, tenant_id, nft_id?,
      pool_id?, latency_ms }): Promise<void>
  isExceeded(scopeMeta: ScopeMeta): boolean
  isWarning(scopeMeta: ScopeMeta): boolean
  getBudgetSnapshot(scopeMeta: ScopeMeta): BudgetSnapshot
  isStateUnknown(): boolean
  isBudgetCircuitOpen(maxUnknownMs: number): boolean
  rotateLedgerIfNeeded(): Promise<string | undefined>
  listAllLedgerFiles(): Promise<string[]>
}
```

### 4.2 BigInt Cost Computation

`loa-finn/src/hounfour/budget.ts` contains the pure-BigInt cost module:

```typescript
function computeCostMicro(tokens: bigint, priceMicroPerMillion: bigint):
  { cost_micro: bigint; remainder_micro: bigint }
function computeTotalCostMicro(usage: BigIntUsage, pricing: BigIntPricing):
  BigIntCostBreakdown
function validateRequestCost(costMicro: bigint): void  // max $1000/request
```

Wire serialization: `microToString(bigint) -> string`, `stringToMicro(string) -> bigint`.

### 4.3 Scope Key Derivation

Three-level budget hierarchy:

```
project:{project_id}
project:{project_id}:phase:{phase_id}
project:{project_id}:phase:{phase_id}:sprint:{sprint_id}
```

### 4.4 Write-Ahead Commit

Cost recording follows write-ahead order:
1. Append JSONL ledger line
2. Write checkpoint file atomically (temp + rename)
3. Update in-memory counters

The `commitMutex` serializes concurrent writes via promise chaining.

### 4.5 Circuit Breaker

If ledger writes fail for longer than `maxUnknownMs` (default: 5 minutes),
`isBudgetCircuitOpen()` returns `true`, and the router rejects all requests
with `BUDGET_CIRCUIT_OPEN`.

### 4.6 Ledger Rotation

Automatic rotation when size exceeds `maxSizeMb` (default 50) or age
exceeds `maxAgeDays` (default 30). Archives to date-sequenced JSONL files.

---

## 5. Key Types

**Path**: `loa-finn/src/hounfour/types.ts`

### 5.1 AgentBinding

```typescript
interface AgentBinding {
  agent: string
  model: string                    // Alias or "provider:model"
  temperature?: number
  persona?: string                 // Path to persona.md
  requires: AgentRequirements
  knowledge?: KnowledgeConfig      // Oracle enrichment config
}
```

### 5.2 CompletionRequest / CompletionResult

```typescript
interface CompletionRequest {
  messages: CanonicalMessage[]
  tools?: ToolDefinition[]
  options: CompletionOptions
  metadata: RequestMetadata        // agent, tenant_id, nft_id, trace_id, reservation_id?
}

interface CompletionResult {
  content: string
  thinking: string | null
  tool_calls: ToolCall[] | null
  usage: UsageInfo                 // prompt_tokens, completion_tokens, reasoning_tokens
  metadata: ResultMetadata         // model, latency_ms, trace_id, cost_micro?,
                                   // billing_finalize_status?, knowledge?
}
```

### 5.3 ExecutionContext

Runtime-validated before any budget or health operation:

```typescript
interface ExecutionContext {
  resolved: ResolvedModel          // { provider, modelId }
  scopeMeta: ScopeMeta             // { project_id, phase_id, sprint_id }
  binding: AgentBinding
  pricing: PricingEntry
}
```

### 5.4 LedgerEntryV2

Integer micro-USD with CRC32 corruption detection:

```typescript
interface LedgerEntryV2 {
  schema_version: 2
  timestamp: string
  trace_id: string
  agent: string; provider: string; model: string
  project_id: string; phase_id: string; sprint_id: string
  tenant_id: string; nft_id?: string; pool_id?: string
  prompt_tokens: number; completion_tokens: number; reasoning_tokens: number
  input_cost_micro: string; output_cost_micro: string
  reasoning_cost_micro: string; total_cost_micro: string
  price_table_version: number
  billing_method: "provider_reported" | "byte_estimated" |
    "observed_chunks_overcount" | "prompt_only" | "reconciled"
  crc32?: string
  latency_ms: number
}
```

### 5.5 ModelPortBase

Provider adapter contract:

```typescript
interface ModelPortBase {
  complete(request: CompletionRequest): Promise<CompletionResult>
  capabilities(): ModelCapabilities
  healthCheck(): Promise<HealthStatus>
}
```

### 5.6 Streaming Types

```typescript
interface ModelPortStreaming extends ModelPortBase {
  stream(request: CompletionRequest, options?: { signal?: AbortSignal }):
    AsyncGenerator<StreamChunk>
}
```

StreamChunk is a discriminated union with events: `chunk`, `tool_call`,
`usage`, `done`, `error`.

### 5.7 Error Codes

`loa-finn/src/hounfour/errors.ts#HounfourErrorCode` -- 19 error codes
covering provider, budget, tool-call, streaming, pool, and knowledge
subsystems.

---

## 6. Knowledge Subsystem (Oracle)

**Path**: `src/hounfour/knowledge-*.ts`

### 6.1 KnowledgeRegistry

`loa-finn/src/hounfour/knowledge-registry.ts#KnowledgeRegistry`

```typescript
class KnowledgeRegistry {
  static fromConfig(configPath: string, projectRoot: string): Promise<KnowledgeRegistry>
  getSource(id: string): LoadedKnowledgeSource | undefined
  getSourcesByTags(tags: string[]): LoadedKnowledgeSource[]
  getAllSources(): LoadedKnowledgeSource[]
  getDefaultBudget(): number       // from sources.json default_budget_tokens
  getGlossaryTerms(): Record<string, string[]>
  isHealthy(): RegistryHealth      // { healthy, missing, totalTokens }
}
```

Health check: at least 3 required sources loaded and total tokens >= 5000.

Registration gate (`shouldRegisterOracle`): only registers if config
`oracle.enabled` is true AND registry health check passes.

### 6.2 KnowledgeLoader

`loa-finn/src/hounfour/knowledge-loader.ts#loadKnowledgeSource`

Five security gates in order:

1. **Absolute path rejection** -- paths must be relative
2. **Path escape detection** -- `../` traversal blocked
3. **Symlink rejection on file** -- `lstat()` check
4. **Symlink rejection on parent** -- `realpath()` escape check
5. **Injection detection** -- curated sources (`grimoires/oracle/` prefix)
   get advisory mode (WARN + load); non-curated sources throw
   `KNOWLEDGE_INJECTION`

Token estimation: `Math.ceil(content.length / 4)`.
Freshness: extracts `generated_date` from YAML frontmatter; stale if older
than `max_age_days`. Missing date = fail-open (not stale).

### 6.3 KnowledgeEnricher

`loa-finn/src/hounfour/knowledge-enricher.ts#enrichSystemPrompt`

```typescript
function enrichSystemPrompt(
  persona: string | null,
  prompt: string,
  knowledgeConfig: KnowledgeConfig,
  registry: KnowledgeRegistry,
  contextWindow: number,
  forceReducedMode?: boolean,
): EnrichmentResult
```

Constants:
- Hard floor: 30,000 tokens (throws `ORACLE_MODEL_UNAVAILABLE` below this)
- Full mode threshold: 100,000 tokens
- Default budget ratio: 0.15 (15% of context window)
- Minimum truncated tokens: 500

Budget formula: `min(configCap, floor(contextWindow * bindingRatio))`

Mode selection:
- `full`: context >= 100K, all tag-matched sources
- `reduced`: context < 100K, core-only sources
- `none`: no sources selected

Prompt classification: keyword-based matching against three categories
(technical, architectural, philosophical) plus glossary-driven expansion.

Source ranking: tag match count DESC, priority ASC, ID alphabetical.

Trust boundary: selected sources wrapped in `<reference_material>` tags
with instructions marking them as DATA, not instructions.

### 6.4 Knowledge Types

`loa-finn/src/hounfour/knowledge-types.ts`

```typescript
interface KnowledgeSource {
  id: string; type: "local"; path: string; format: "markdown"
  tags: string[]; priority: number; maxTokens: number
  required: boolean; max_age_days?: number
}

interface LoadedKnowledgeSource {
  source: KnowledgeSource; content: string; tokenCount: number
  loadedAt: Date; stale: boolean
}

interface KnowledgeSourcesConfig {
  version: number                      // Must be 1
  default_budget_tokens: number
  sources: KnowledgeSource[]
  glossary_terms?: Record<string, string[]>
}

interface EnrichmentResult {
  enrichedPrompt: string
  metadata: EnrichmentMetadata
}

interface EnrichmentMetadata {
  sources_used: string[]; tokens_used: number; budget: number
  mode: "full" | "reduced" | "none"
  tags_matched: string[]; classification: string[]
}
```

---

## 7. Configuration

**Path**: `loa-finn/src/config.ts`

### 7.1 FinnConfig Interface

`loadConfig()` reads from environment variables with sensible defaults.

| Section | Key Fields | Env Vars |
|---------|-----------|----------|
| Agent | `model`, `thinkingLevel`, `beauvoirPath` | `MODEL`, `THINKING_LEVEL`, `BEAUVOIR_PATH` |
| Gateway | `port`, `host` | `PORT`, `HOST` |
| Persistence | `dataDir`, `sessionDir`, `r2.*`, `git.*` | `DATA_DIR`, `R2_*`, `GIT_*` |
| Auth | `auth.bearerToken`, `auth.corsOrigins`, `auth.rateLimiting` | `FINN_AUTH_TOKEN`, `FINN_CORS_ORIGINS`, `FINN_RATE_LIMIT_*` |
| Sandbox | `sandbox.*`, `sandboxMode`, `sandboxSyncFallback` | `SANDBOX_MODE`, `FINN_SANDBOX_*` |
| Worker Pool | `workerPool.interactiveWorkers` | `FINN_WORKER_POOL_SIZE` |
| Cheval | `chevalMode` | `CHEVAL_MODE` |
| Redis | `redis.url`, `redis.enabled` | `REDIS_URL`, `REDIS_*_TIMEOUT_MS` |
| Pools | `pools.configPath` | `FINN_POOLS_CONFIG` |
| S2S | `s2s.privateKeyPem`, `s2s.kid`, `s2s.issuer`, `s2s.audience` | `FINN_S2S_PRIVATE_KEY`, `FINN_S2S_KID`, `FINN_S2S_ISSUER`, `FINN_S2S_AUDIENCE` |
| Oracle | `oracle.enabled`, `oracle.sourcesConfigPath`, `oracle.minContextWindow` | `FINN_ORACLE_ENABLED`, `FINN_ORACLE_SOURCES_CONFIG`, `FINN_ORACLE_MIN_CONTEXT` |
| JWT | `jwt.enabled`, `jwt.issuer`, `jwt.audience`, `jwt.jwksUrl`, etc. | `FINN_JWT_ENABLED`, `FINN_JWT_ISSUER`, `FINN_JWKS_URL`, etc. |

---

## 8. Auth and Pool Enforcement

### 8.1 JWT Authentication

`loa-finn/src/hounfour/jwt-auth.ts`

ES256 JWT validation with JWKS state machine (HEALTHY / STALE / DEGRADED).
Validation order: structural pre-check, kid validation, issuer allowlist,
signature + standard claims, custom claims, JTI requirement, JTI replay check.

Key types:
```typescript
interface JWTClaims {
  iss: string; aud: string; sub: string; tenant_id: string
  tier: Tier; nft_id?: string; model_preferences?: Record<string, string>
  byok?: boolean; req_hash: string; iat: number; exp: number
  jti?: string; scope?: string; pool_id?: string
  allowed_pools?: string[]; reservation_id?: string
}

interface TenantContext {
  claims: JWTClaims
  resolvedPools: readonly PoolId[]
  requestedPool?: PoolId | null
  isNFTRouted: boolean
  isBYOK: boolean
}
```

### 8.2 Pool Enforcement

`loa-finn/src/hounfour/pool-enforcement.ts#hounfourAuth`

Composed middleware: JWT validation + pool claims enforcement.
Pure function `enforcePoolClaims()` derives `resolvedPools` from
`claims.tier` via `TIER_POOL_ACCESS`. Detects mismatch types
(subset, superset, invalid_entry) between JWT `allowed_pools` and
tier-derived pools.

`selectAuthorizedPool()` is the single choke point for pool selection:
resolve from tier + task type + preferences, then validate against
resolvedPools membership.

### 8.3 S2S JWT Signing

`loa-finn/src/hounfour/s2s-jwt.ts#S2SJwtSigner`

Supports ES256 (asymmetric) and HS256 (symmetric). Used for:
- Signing JWTs for billing finalize calls to arrakis
- Signing JWS payloads for usage reports
- Serving JWKS at `/.well-known/jwks.json`

---

## 9. Billing Finalize

**Path**: `loa-finn/src/hounfour/billing-finalize-client.ts`

### 9.1 BillingFinalizeClient

```typescript
class BillingFinalizeClient {
  constructor(config: BillingFinalizeConfig)
  finalize(req: FinalizeRequest): Promise<FinalizeResult>  // NEVER throws
  startReplayTimer(intervalMs?: number): void
  stopReplayTimer(): void
  replayDeadLetters(): Promise<{ replayed, succeeded, failed, terminal }>
  getDLQSize(): Promise<number>
  getDLQOldestAgeMs(): Promise<number | null>
  isDurable(): boolean
  isAofVerified(): boolean
}
```

Wire call: `POST {billingUrl}/api/internal/finalize` with S2S JWT bearer.
Body mapping: `tenant_id` to `accountId`, `reservation_id` to `reservationId`.

HTTP 200 = finalized, 409 = idempotent (already finalized), all others = DLQ.
Terminal statuses (401, 404, 422) go straight to DLQ without retry.

### 9.2 DLQ Store

`loa-finn/src/hounfour/dlq-store.ts#DLQStore` -- port interface with two
adapters: `InMemoryDLQStore` (fallback, non-durable) and `RedisDLQStore`
(durable, with SETNX-based claim locking and Lua atomic upsert).

Backoff schedule: 1m, 2m, 4m, 8m, 10m. Max retries: 5.

---

## 10. Deployment Topology

**Path**: `deploy/`

- **Dockerfile**: Multi-stage Node 22 build, non-root `finn` user, port 3000
- **Terraform** (`deploy/terraform/finn.tf`): ECS Fargate task, single-task
  (desired_count=1 due to local JSONL ledger), EFS-backed `/data` volume,
  ALB listener rule on `finn.arrakis.community`, Cloud Map service discovery
  as `finn.arrakis.local`
- **Security groups**: ALB ingress on 3000, HTTPS egress (provider APIs),
  Redis egress (6379), EFS egress (2049), Tempo OTLP egress (4317)
- **Secrets**: Anthropic API key, S2S private key, auth token, Redis URL
  via AWS Secrets Manager
