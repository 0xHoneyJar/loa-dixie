# Sprint Plan: Dixie MVP — Oracle Orchestration Layer

**Version**: 2.0.0
**Date**: 2026-02-20
**Cycle**: cycle-001
**PRD Reference**: `grimoires/loa/prd.md` v1.0.0
**SDD Reference**: `grimoires/loa/sdd.md` v1.0.0

---

## Overview

| Attribute | Value |
|-----------|-------|
| Total Sprints | 17 |
| Sprint Duration | ~1 session each (focused, scoped) |
| Team | Single agent (Claude) + human review |
| MVP Target | Allowlisted team members can chat with the Oracle via web UI |
| Hardening Target | All 21 bridge findings addressed, flatline achieved |
| Excellence Target | All 5 strategic recommendations from Bridgebuilder Persona Review |

## Sprint Sequence

```
Phase 1: MVP Foundation (Sprints 1-6)
Sprint 1: Project Scaffold + BFF Skeleton                     ✅ COMPLETED
Sprint 2: Allowlist Gate + Auth Flow                          ✅ COMPLETED
Sprint 3: Knowledge Corpus Update + Deployment Config         ✅ COMPLETED
Sprint 4: Web Chat UI (Streaming + Markdown + Citations)      ✅ COMPLETED
Sprint 5: Oracle dNFT Identity + Integration Testing          ✅ COMPLETED
Sprint 6: E2E Validation + Polish + Monitoring                ✅ COMPLETED

Phase 2: Compassionate Excellence — First Bridgebuilder (Sprints 7-9)
Sprint 7: Security & Auth Excellence (Bridgebuilder F1,F4,F7) ✅ COMPLETED
Sprint 8: Operational Resilience & Observability (F2,F3,F5)   ✅ COMPLETED
Sprint 9: Architectural Documentation & Future-Proofing (F6,F8) ✅ COMPLETED

Phase 3: Bridge Convergence (Sprints 10-12) — Run Bridge Iterations
Sprint 10: Security Hardening II (Bridge Iter 1: F-1 through F-7)  ✅ COMPLETED
Sprint 11: Quality & Resilience (Bridge Iter 1: F-8 through F-10)  ✅ COMPLETED
Sprint 12: Final Convergence (Bridge Iter 2: all 3 remaining)      ✅ COMPLETED

Phase 4: Strategic Excellence — Bridgebuilder Persona Review (Sprints 13-17)
Sprint 13: Hounfour Protocol Alignment (S-1 — HIGH)
Sprint 14: Communitarian Architecture & Decision Trail (S-2 — MEDIUM)
Sprint 15: Hermetic Integration Testing (S-3 — MEDIUM)
Sprint 16: Tool Use Visualization & Experience Layer (S-4 — LOW)
Sprint 17: Soul Memory Architecture Preparation (S-5 — LOW)
```

## Dependencies

```
Sprint 1 ──→ Sprint 2 ──→ Sprint 3 ──→ Sprint 4 ──→ Sprint 5 ──→ Sprint 6
   │              │             │             │
   │              │             └── Sprint 4 needs corpus sources for testing
   │              └── Sprint 3 needs allowlist middleware for config
   └── All sprints depend on Sprint 1 scaffold
```

---

## Sprint 1: Project Scaffold + BFF Skeleton

**Goal**: Hono BFF serving health endpoint, Docker Compose with loa-finn + Redis, project structure established.

**Success Criteria**: `docker compose up` starts dixie + loa-finn + Redis. `GET /api/health` returns aggregated health from both services.

### Tasks

#### 1.1 Initialize app/ package and TypeScript config
**Description**: Create `app/` directory with `package.json` (pnpm), `tsconfig.json` (strict mode), and Hono + Node.js dependencies. Add Vitest for testing.
**Acceptance Criteria**:
- `app/package.json` exists with hono, @hono/node-server, vitest as dependencies
- `app/tsconfig.json` uses strict mode, ESM modules, NodeNext resolution
- `pnpm install` succeeds cleanly
- `pnpm build` produces JavaScript output in `app/dist/`

#### 1.2 Create BFF server factory
**Description**: Implement `app/src/server.ts` with Hono app factory per SDD §4.2. Wire request-id middleware (UUID v4 generation), CORS middleware (configurable origins), and static file serving. Mount health route.
**Acceptance Criteria**:
- `createDixieApp(config)` returns a configured Hono app
- All responses include `X-Request-Id` header
- CORS headers set for configured origins
- Server starts on configurable port (default 3001)
- At least 3 unit tests for middleware

#### 1.3 Create configuration module
**Description**: Implement `app/src/config.ts` per SDD §9.4. Load all configuration from environment variables with sensible defaults for local development.
**Acceptance Criteria**:
- `loadConfig()` reads DIXIE_PORT, FINN_URL, FINN_WS_URL, DIXIE_CORS_ORIGINS, DIXIE_ALLOWLIST_PATH, NODE_ENV
- Missing required vars throw descriptive errors at startup
- Default values work for docker-compose local dev
- At least 3 unit tests

#### 1.4 Implement health endpoint with loa-finn aggregation
**Description**: Create `app/src/routes/health.ts` per SDD §6.1 health section. Returns aggregated status from dixie + loa-finn. loa-finn health fetched via HTTP with 5-second timeout and 10-second cache.
**Acceptance Criteria**:
- `GET /api/health` returns JSON with `status`, `version`, `uptime_seconds`, `services` object
- `services.dixie` always present
- `services.loa_finn` shows `status` and `latency_ms` (or `unreachable` on timeout)
- Health check cached for 10 seconds (no upstream call on every request)
- At least 3 unit tests (healthy, finn-down, cache behavior)

#### 1.5 Create FinnClient HTTP proxy
**Description**: Implement `app/src/proxy/finn-client.ts` per SDD §4.4.1. Typed HTTP client wrapping `fetch` for loa-finn. Include circuit breaker (open after 5 failures in 30s, half-open after 10s cooldown).
**Acceptance Criteria**:
- `FinnClient` class with `getHealth()` method
- Circuit breaker transitions: closed → open → half-open → closed
- Error mapping per SDD §4.4.1 table
- All requests include `X-Request-Id` propagation
- At least 5 unit tests (happy path, timeout, circuit breaker states)

#### 1.6 Create Docker Compose for local development
**Description**: Create `deploy/docker-compose.yml` per SDD §9.1 and `deploy/Dockerfile` per SDD §9.2. Multi-stage build: BFF build → production runtime. Docker Compose: dixie + loa-finn + Redis with shared knowledge volume.
**Acceptance Criteria**:
- `docker compose up` starts 3 containers (dixie, finn, redis)
- dixie health check returns healthy status
- finn accessible from dixie via service name
- Shared knowledge volume mounted
- `docker compose down` cleans up

#### 1.7 Add .gitignore entries for app artifacts
**Description**: Update `.gitignore` to exclude `app/node_modules/`, `app/dist/`, `web/node_modules/`, `web/dist/`, and other build artifacts.
**Acceptance Criteria**:
- Build artifacts excluded from git
- No accidentally committed `node_modules/`

---

## Sprint 2: Allowlist Gate + Auth Flow

**Goal**: Allowlist middleware blocks unauthorized requests. SIWE-based wallet authentication flow working. Admin API for managing allowlist.

**Success Criteria**: Only allowlisted wallet addresses or API keys can access `/api/*` endpoints. Unauthorized requests get 403.

### Tasks

#### 2.1 Implement allowlist middleware
**Description**: Create `app/src/middleware/allowlist.ts` per SDD §4.3. Load allowlist from JSON file at startup. Check `Authorization: Bearer` header (API key) or JWT wallet claim against allowlist. Return 403 for denied requests. Audit log all access attempts.
**Acceptance Criteria**:
- Allowlist loaded from `DIXIE_ALLOWLIST_PATH` JSON file on startup
- API key auth: `Authorization: Bearer dxk_live_...` checked against `apiKeys` array
- Wallet auth: JWT `sub` claim checked against `wallets` array (EIP-55 normalized)
- 403 response with `{ error: "forbidden", message: "Not authorized" }`
- 401 for missing credentials
- Audit log JSON entries for every attempt (allowed and denied)
- At least 5 unit tests (API key allowed, denied, wallet allowed, denied, missing auth)

#### 2.2 Implement allowlist persistence
**Description**: Create allowlist JSON file management. Load on startup, write on mutation. File format per SDD §4.3 (`version`, `wallets`, `apiKeys`, `updated_at`).
**Acceptance Criteria**:
- Allowlist file created if missing (empty lists)
- Mutations atomically write (temp file + rename)
- File format matches SDD §4.3 schema
- At least 3 unit tests

#### 2.3 Implement admin API for allowlist management
**Description**: Create admin routes per SDD §6.1 admin section. Gated by `DIXIE_ADMIN_KEY`. Support GET (list), POST (add), DELETE (remove) for both wallet addresses and API keys.
**Acceptance Criteria**:
- `GET /api/admin/allowlist` returns current allowlist (admin key required)
- `POST /api/admin/allowlist { type: "wallet", value: "0x..." }` adds entry
- `DELETE /api/admin/allowlist/:entry` removes entry
- EIP-55 checksum normalization on wallet addresses
- 401 for missing admin key, 403 for invalid admin key
- At least 5 unit tests

#### 2.4 Implement SIWE authentication flow
**Description**: Create `app/src/routes/auth.ts`. Accept SIWE message + signature, verify signature, extract wallet address, check allowlist, issue short-lived JWT (1 hour). Use ES256 signing.
**Acceptance Criteria**:
- `POST /api/auth/siwe { message, signature }` verifies SIWE and returns JWT
- JWT contains `sub` (wallet), `iss` (dixie-bff), `exp` (1 hour), `role` (team)
- `GET /api/auth/verify` validates JWT and returns wallet address
- Invalid signature returns 401
- Valid signature but non-allowlisted wallet returns 403
- At least 5 unit tests

#### 2.5 Implement rate limiting middleware
**Description**: Create `app/src/middleware/rate-limit.ts` per SDD §4.2. Sliding window rate limiter: 100 requests per minute per IP/wallet. In-memory store for Phase 1.
**Acceptance Criteria**:
- Rate limit per IP address (unauthenticated) or wallet (authenticated)
- 429 response with `Retry-After` header when exceeded
- Configurable via environment variable `DIXIE_RATE_LIMIT_RPM` (default 100)
- At least 3 unit tests

---

## Sprint 3: Knowledge Corpus Update + Deployment Config

**Goal**: Knowledge corpus expanded to 20+ sources covering PR #82 and freeside#76. Deployment configuration ready (Terraform + knowledge sync).

**Success Criteria**: `sources.json` registry has 20+ sources. All sources parse cleanly and pass health check. Docker image builds with corpus baked in.

### Tasks

#### 3.1 Create new knowledge sources for PR #82 capabilities
**Description**: Author new markdown knowledge source files for the major capabilities delivered in loa-finn PR #82: dAMP-96 personality system, x402 payment flow, identity graph, and governance model. Each file follows the existing source format with YAML frontmatter (generated_date, source_repo, provenance, version, tags, max_age_days).
**Acceptance Criteria**:
- `knowledge/sources/damp-96-personality.md` — dAMP-96 derivation, 96 dials, personality versioning
- `knowledge/sources/x402-payment-flow.md` — x402 micropayment protocol, credit system, FIFO lots
- `knowledge/sources/identity-graph.md` — Identity graph API, signals, ownership verification
- `knowledge/sources/governance-model.md` — SIWE auth, transfer listener, conviction scoring
- Each file has valid YAML frontmatter with tags, priority, max_age_days
- Content is factual, grounded in PR #82 implementation details

#### 3.2 Create new knowledge sources for freeside#76
**Description**: Author knowledge source files for the 5 new documentation artifacts from loa-freeside PR #76: API reference, economics formalization, event protocol, infrastructure topology, and freeside glossary.
**Acceptance Criteria**:
- `knowledge/sources/freeside-api-reference.md` — freeside API endpoints, auth, billing finalization
- `knowledge/sources/freeside-economics.md` — 14 LTL conservation properties, pricing model
- `knowledge/sources/freeside-event-protocol.md` — NATS stability tiers, event schemas
- `knowledge/sources/freeside-infrastructure.md` — 20 Terraform modules, ECS topology
- `knowledge/sources/freeside-glossary.md` — 14 glossary entries from freeside#76
- Each file has valid YAML frontmatter

#### 3.3 Update existing knowledge sources
**Description**: Update existing sources that reference "arrakis" to use "freeside". Update `code-reality-finn.md` to reflect PR #82's new modules. Update `glossary.md` with new terms (dAMP, BEAUVOIR, x402, etc.). Update `ecosystem-architecture.md` for new services.
**Acceptance Criteria**:
- `code-reality-arrakis.md` renamed to `code-reality-freeside.md`, content updated
- `glossary.md` updated with ≥ 10 new terms from PR #82 and freeside#76
- `ecosystem-architecture.md` updated with PR #82 services and freeside rename
- `rfcs.md` updated with #66 and #82 context
- No references to "arrakis" remain (except in historical context notes)

#### 3.4 Create sources.json registry
**Description**: Create `knowledge/sources/sources.json` per SDD §4.5.2. Register all sources (existing + new) with tags, priorities, maxTokens, and glossary_terms. Ensure at least 20 sources total.
**Acceptance Criteria**:
- `sources.json` follows loa-finn KnowledgeSourcesConfig schema (version: 1)
- ≥ 20 sources registered
- All sources have valid `tags`, `priority`, `maxTokens`, `max_age_days`
- `glossary_terms` section expanded with new terms
- Required sources: glossary, ecosystem-architecture, ≥1 code-reality
- `default_budget_tokens` set to 30000

#### 3.5 Create knowledge health validation test
**Description**: Write a Vitest test that validates every source in `sources.json` can be loaded, parsed, and passes the health check (frontmatter valid, tokens within budget, file exists).
**Acceptance Criteria**:
- Test loads `sources.json` and validates schema
- Test checks every source file exists and is readable
- Test validates YAML frontmatter in every source
- Test estimates tokens and verifies within `maxTokens` limit
- Test verifies ≥ 3 required sources present and total tokens ≥ 5000
- All tests pass

#### 3.6 Create knowledge sync script and init container
**Description**: Create `deploy/scripts/sync-knowledge.sh` per SDD §4.5.4. Script copies knowledge sources from Docker image to shared EFS volume. Create Dockerfile target for init container.
**Acceptance Criteria**:
- `deploy/scripts/sync-knowledge.sh` copies sources + sources.json to target directory
- Script is idempotent (safe to run multiple times)
- Script logs number of synced sources
- Dockerfile `knowledge-sync` target builds and runs correctly
- Docker Compose knowledge-sync service runs before loa-finn starts

#### 3.7 Create ECS Terraform configuration
**Description**: Create `deploy/terraform/dixie.tf` per SDD §9.3. Defines ECS task definition, service, ALB listener rule, security group, EFS access point, CloudWatch log group, and Secrets Manager entries.
**Acceptance Criteria**:
- ECS task definition: CPU 256, Memory 512, port 3001
- ALB listener rule for host `dixie.thj.dev` or path `/dixie/*`
- Security group: ALB ingress 3001, egress to finn:3000, HTTPS 443, Tempo 4317
- EFS access point for `/dixie-data`
- CloudWatch log group `/ecs/dixie`
- Secrets Manager references for JWT key, admin key, finn S2S key
- Init container for knowledge sync
- Auto-scaling: CPU 70%, min 1, max 3
- Terraform validates (`terraform validate` passes)

---

## Sprint 4: Web Chat UI (Streaming + Markdown + Citations)

**Goal**: React SPA with wallet connection, real-time streaming chat, markdown rendering, and source citations.

**Success Criteria**: User can connect wallet, start a conversation, see streaming responses with markdown formatting and expandable source citations.

### Tasks

#### 4.1 Initialize web/ package and Vite config
**Description**: Create `web/` directory with React + Vite + TypeScript + Tailwind CSS. Configure Vite dev server proxy to BFF for API calls.
**Acceptance Criteria**:
- `web/package.json` with react, vite, tailwindcss, wagmi, viem dependencies
- `web/vite.config.ts` with proxy to `http://localhost:3001` for `/api` and `/ws` paths
- `web/tailwind.config.ts` configured
- `pnpm dev` starts Vite dev server with HMR
- `pnpm build` produces optimized static build in `web/dist/`

#### 4.2 Implement wallet connection component
**Description**: Create `web/src/components/WalletConnect.tsx` and `web/src/hooks/useAuth.ts`. WalletConnect button using wagmi. On connect, trigger SIWE sign + verify flow. Store JWT in memory (not localStorage for security).
**Acceptance Criteria**:
- WalletConnect component renders connect button when disconnected
- On connect: generates SIWE message, requests wallet signature
- Sends SIWE to `POST /api/auth/siwe`, receives JWT
- JWT stored in React state (memory only)
- Disconnect clears JWT and wallet state
- Shows wallet address (truncated) when connected
- At least 3 component tests

#### 4.3 Implement chat container and message list
**Description**: Create `web/src/components/Chat.tsx`, `web/src/components/MessageBubble.tsx`, and `web/src/hooks/useChat.ts`. Chat hook manages message array, handles sending via POST and receiving via WebSocket.
**Acceptance Criteria**:
- Chat component renders message list with user/assistant bubbles
- `useChat` hook: `sendMessage(text)` → POST /api/chat → open WS → accumulate chunks
- Optimistic user message display (appears immediately)
- Auto-scroll to bottom on new messages
- Loading state while waiting for first chunk
- Error state if request fails
- At least 3 unit tests for useChat hook

#### 4.4 Implement WebSocket streaming
**Description**: Create `web/src/lib/ws.ts` WebSocket connection manager. Handles connect, reconnect on disconnect, parse streaming events (chunk, tool_call, usage, knowledge, done, error).
**Acceptance Criteria**:
- Opens WebSocket to `/ws/chat/:sessionId` with JWT in protocol header
- Parses stream events per SDD §6.1 WebSocket events
- Accumulates `chunk` events into assistant message content
- Emits `done` event with final message and metadata
- Auto-reconnect on unexpected close (max 3 attempts, exponential backoff)
- At least 3 unit tests

#### 4.5 Implement markdown rendering with code highlighting
**Description**: Create `web/src/lib/markdown.ts` and integrate into `MessageBubble`. Use react-markdown with rehype-highlight for syntax highlighting. Support tables, code blocks, inline code, and lists.
**Acceptance Criteria**:
- Assistant messages render markdown (headings, bold, italic, links, lists)
- Code blocks with syntax highlighting (JavaScript, TypeScript, Python, YAML, JSON)
- Tables render as styled HTML tables
- Inline code renders with distinct styling
- No XSS vulnerabilities (react-markdown sanitizes by default)
- At least 3 component tests

#### 4.6 Implement citation panel
**Description**: Create `web/src/components/CitationPanel.tsx` per SDD §4.6.4. Renders knowledge metadata from stream events. Expandable panel showing sources used, tokens consumed, and enrichment mode.
**Acceptance Criteria**:
- Compact citation line below assistant messages: "Sources: source1, source2"
- Click to expand: shows each source with ID and tags
- Shows enrichment mode (full/reduced) and token usage
- Collapses on second click
- At least 2 component tests

#### 4.7 Implement BFF chat and WebSocket proxy routes
**Description**: Create `app/src/routes/chat.ts` and `app/src/proxy/ws-proxy.ts` per SDD §4.4. Chat route creates session on first message, proxies subsequent messages. WS proxy handles upgrade and bidirectional piping.
**Acceptance Criteria**:
- `POST /api/chat { prompt }` creates loa-finn session on first call, returns `sessionId`
- `POST /api/chat { prompt, sessionId }` sends message to existing session
- `WS /ws/chat/:sessionId` proxies to loa-finn `WS /ws/:sessionId`
- WebSocket proxy pipes frames bidirectionally
- Heartbeat ping every 30 seconds, close on pong timeout
- At least 5 unit tests (chat flow, WS upgrade, error cases)

#### 4.8 Implement session list and history
**Description**: Create `web/src/components/SessionList.tsx` and `web/src/hooks/useSessions.ts`. Sidebar showing conversation history. Click to resume a session.
**Acceptance Criteria**:
- Sidebar renders list of previous sessions (fetched from `GET /api/sessions`)
- Each session shows truncated first message and timestamp
- Click on session loads messages and reconnects WebSocket
- "New Chat" button starts fresh session
- BFF route `GET /api/sessions` proxies to loa-finn

#### 4.9 Implement responsive layout
**Description**: Create the overall page layout with sidebar (session list) and main content area (chat). Responsive: sidebar collapses to hamburger menu on mobile.
**Acceptance Criteria**:
- Desktop: sidebar (280px) + main content
- Mobile: sidebar collapsed, hamburger menu toggle
- Dark/light mode via Tailwind `dark:` classes (system preference)
- Loading skeleton for initial page load

---

## Sprint 5: Oracle dNFT Identity + Integration Testing

**Goal**: Oracle registered as first dNFT in loa-finn's identity graph. Full integration test suite validates end-to-end flow.

**Success Criteria**: Oracle identity is queryable. Integration tests pass with Docker Compose (dixie + loa-finn + Redis).

### Tasks

#### 5.1 Create Oracle agent binding configuration
**Description**: Create the Oracle agent configuration per SDD §4.7.1. YAML config for loa-finn's provider registry: model selection, persona path, knowledge config, temperature.
**Acceptance Criteria**:
- Oracle binding YAML specifies model, persona path, knowledge config
- Temperature set to 0.3 (consistent, factual responses)
- Knowledge enrichment enabled with sources config path
- Persona loaded from `/knowledge/oracle/persona/oracle.md`
- Config validates against loa-finn's agent binding schema

#### 5.2 Implement Oracle identity endpoint
**Description**: Create `app/src/routes/identity.ts`. `GET /api/identity/oracle` returns Oracle's identity information from loa-finn's identity graph API.
**Acceptance Criteria**:
- `GET /api/identity/oracle` returns `{ nftId, name, damp96_summary, beauvoir_hash }`
- Proxies to loa-finn identity graph API
- Graceful degradation if identity graph not yet populated
- Response cached for 5 minutes (identity data is stable)
- At least 3 unit tests

#### 5.3 Create integration test suite
**Description**: Create `app/tests/integration/` test suite that runs against Docker Compose. Tests the full flow: allowlist check → chat → streaming response → citations.
**Acceptance Criteria**:
- Docker Compose test environment (`deploy/docker-compose.test.yml`)
- Test: health endpoint returns healthy with loa-finn connected
- Test: unauthenticated request returns 401
- Test: non-allowlisted wallet returns 403
- Test: allowlisted API key can chat and receive streaming response
- Test: response includes knowledge metadata (sources_used, mode)
- All tests pass in CI-compatible Docker environment

#### 5.4 Create Playwright E2E test suite
**Description**: Create `web/tests/e2e/` Playwright test suite. Tests the frontend flow: page load → wallet connect (mocked) → chat → streaming → citations.
**Acceptance Criteria**:
- Playwright config with chromium browser
- Test: page loads, wallet connect button visible
- Test: mock wallet connect → SIWE flow → authenticated state
- Test: send message → see streaming response → see citations
- Test: session list shows previous conversation
- Tests run headless in CI

#### 5.5 Add tool use visualization to frontend
**Description**: Create `web/src/components/ToolUseDisplay.tsx` per SDD §4.6.5. When streaming includes `tool_call` events, render them inline in the message. Shows tool name, arguments, and status.
**Acceptance Criteria**:
- Tool call events render as collapsible inline blocks
- Shows tool name, arguments (truncated), and completion status
- Spinner while tool is executing, checkmark when done
- Tool results shown if available
- At least 2 component tests

---

## Sprint 6: E2E Validation + Polish + Monitoring

**Goal**: Production-ready deployment. Monitoring dashboards, security hardening, gold-set evaluation, documentation.

**Success Criteria**: `terraform apply` deploys to staging. Gold-set evaluation passes at 90%+. All CloudWatch alarms configured.

### Tasks

#### 6.1 Implement OTel tracing integration
**Description**: Create `app/src/middleware/tracing.ts` per SDD §10.3. OTel SDK setup with spans for each request. Trace context propagation to loa-finn via `traceparent` header.
**Acceptance Criteria**:
- OTel SDK initialized with service name `dixie-bff`
- Parent span created for each request
- Child spans for: allowlist check, finn proxy, response enrichment
- `traceparent` header propagated to loa-finn
- Configurable exporter endpoint (`OTEL_EXPORTER_OTLP_ENDPOINT`)
- Traces visible in Grafana Tempo when running with Docker Compose + Tempo

#### 6.2 Implement structured logging
**Description**: Replace console.log with structured JSON logging per SDD §10.1. Include request_id, wallet, session_id, latency in all log entries.
**Acceptance Criteria**:
- All logs in JSON format to stdout
- Every log includes: `level`, `timestamp`, `request_id`, `service`
- API logs include: `wallet`, `endpoint`, `status`, `latency_ms`
- No PII logged (wallet addresses are public, so OK)
- Log levels: error, warn, info, debug (configurable via `LOG_LEVEL`)

#### 6.3 Add security headers middleware
**Description**: Add security headers per SDD §7.2: Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
**Acceptance Criteria**:
- CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss:`
- HSTS: `max-age=31536000; includeSubDomains`
- X-Frame-Options: `DENY`
- X-Content-Type-Options: `nosniff`
- Referrer-Policy: `strict-origin-when-cross-origin`
- Body size limit: 100KB for API routes

#### 6.4 Create gold-set evaluation queries
**Description**: Create a curated set of 20+ evaluation queries spanning all 7 abstraction levels (Code, Architecture, Product, Process, Cultural, Economic, Educational). Each query has an expected source selection and answer quality rubric.
**Acceptance Criteria**:
- ≥ 20 evaluation queries in `tests/gold-set/queries.json`
- Queries span all 7 abstraction levels
- Each query specifies: question, expected_sources (≥1), expected_level, rubric
- At least 5 queries that span multiple repos (cross-cutting)
- Evaluation script that runs queries and reports pass rate

#### 6.5 Create CloudWatch alarms
**Description**: Define CloudWatch alarms per SDD §10.4 in Terraform: BFF health, finn latency, circuit breaker, allowlist denied spike.
**Acceptance Criteria**:
- Alarm: DixieBFFUnhealthy (3 consecutive health check failures)
- Alarm: DixieFinnLatencyHigh (p95 > 5s for 5 minutes)
- Alarm: DixieFinnCircuitOpen (circuit open > 1 minute)
- Alarm: DixieAllowlistDeniedSpike (> 50 denied in 5 minutes)
- All alarms configured in `deploy/terraform/dixie.tf`
- SNS topic for notifications

#### 6.6 Staging deployment and smoke test
**Description**: Deploy dixie to staging ECS via Terraform. Run integration smoke tests against staging environment. Verify health, auth flow, chat, and streaming.
**Acceptance Criteria**:
- `terraform plan` shows expected resources
- `terraform apply` succeeds on staging
- Health endpoint returns healthy
- Allowlist gate blocks unauthorized requests
- Allowlisted user can chat and receive streaming response
- CloudWatch logs visible
- OTel traces visible in Grafana Tempo

#### 6.7 Update README and docs
**Description**: Update `README.md` with current status, setup instructions, and architecture diagram. Add local development quickstart.
**Acceptance Criteria**:
- README reflects Phase 1 status (allowlisted team access)
- Local development instructions: `docker compose up` + seed allowlist
- Architecture diagram matches SDD
- Cross-references updated (freeside, not arrakis)

---

---

## Bridgebuilder Review — Compassionate Excellence Sprints

> *"We aim for compassionate excellence — for the people, the agents, and the protocols. Every finding addressed not just to fix, but to teach."*
>
> Source: Bridgebuilder Review, PR #2 (https://github.com/0xHoneyJar/loa-dixie/pull/2)

These sprints address all 8 findings from the Bridgebuilder review regardless of severity level. Each fix includes tests, documentation (for human developers and AI agents), and comments explaining *why* — not just *what*.

### Findings Addressed

| # | Severity | Finding | Sprint |
|---|----------|---------|--------|
| 1 | High | WebSocket token in URL query string | Sprint 7 |
| 2 | High | AllowlistStore split-brain singleton | Sprint 8 |
| 3 | Medium | Circuit breaker silent state transitions | Sprint 8 |
| 4 | Medium | JWT HS256→ES256 migration undocumented | Sprint 7 |
| 5 | Medium | Audit log unbounded growth | Sprint 8 |
| 6 | Medium | No x402 payment surface hook point | Sprint 9 |
| 7 | Low | Config doesn't validate JWT key | Sprint 7 |
| 8 | Low | Missing ADR for Hono sub-app typing workaround | Sprint 9 |

### Sprint Sequence (Bridgebuilder Response)

```
Sprint 7: Security & Auth Excellence (Findings 1, 4, 7)
Sprint 8: Operational Resilience & Observability (Findings 2, 3, 5)
Sprint 9: Architectural Documentation & Future-Proofing (Findings 6, 8)
```

### Dependencies

```
Sprint 7 ──→ Sprint 8 ──→ Sprint 9
   │              │             │
   │              │             └── Sprint 9 needs bounded audit from Sprint 8
   │              └── Sprint 8 needs validated config from Sprint 7
   └── Sprint 7 is self-contained (auth changes only)
```

---

## Sprint 7: Security & Auth Excellence

**Goal**: Eliminate the WebSocket token-in-URL vulnerability, validate secrets at startup, and document the JWT algorithm migration path. Every auth-related concern from the review resolved with production-grade patterns.

**Success Criteria**: WebSocket uses short-lived tickets (not JWT in URL). Config rejects empty/short JWT keys. HS256→ES256 migration path documented in code for future agents. All existing tests pass + new tests for ticket flow.

**Philosophy**: Security isn't just about preventing attacks — it's about building systems that are *obviously correct* to anyone reading the code, whether that reader is a human developer, an AI agent, or a security auditor.

### Tasks

#### 7.1 Implement WebSocket ticket endpoint

**Description**: Create `POST /api/ws/ticket` endpoint that issues a short-lived, single-use ticket for WebSocket authentication. The ticket replaces passing the JWT directly in the WebSocket URL query string, eliminating the risk of token leakage via server logs, browser history, and referrer headers.

**Pattern**: Discord's gateway authentication model — the sensitive credential (JWT) stays in HTTP headers, while the WebSocket URL receives only a disposable ticket.

**Acceptance Criteria**:
- `POST /api/ws/ticket` (authenticated) returns `{ ticket: "wst_<random>", expires_in: 30 }`
- Ticket is cryptographically random (≥32 chars), prefixed with `wst_` for identification in logs
- Ticket stored in server-side Map with 30-second TTL and associated wallet address
- Ticket consumed (deleted) on first WebSocket connection attempt
- Expired tickets cleaned up by 60-second interval sweep (prevents memory leak under load)
- Cleanup interval uses `.unref()` to not prevent process exit
- Returns 401 if caller not authenticated
- At least 5 unit tests: issue ticket, consume ticket, reject expired, reject reuse, cleanup sweep

**For Future Agents**: The `wst_` prefix follows the same convention as `dxk_` for API keys — self-identifying credentials that secret scanners and log filters can match by prefix pattern.

#### 7.2 Update WebSocket client to use ticket pattern

**Description**: Modify `web/src/lib/ws.ts` to request a ticket via HTTP before opening the WebSocket connection. The `connectChatStream` function signature changes to accept a `getTicket` callback instead of a raw token, making the pattern composable with any auth mechanism.

**Acceptance Criteria**:
- `connectChatStream` signature: `(sessionId, getTicket: () => Promise<string>, onEvent, onClose?)`
- Before each WebSocket connection (including reconnects), calls `getTicket()` to obtain fresh ticket
- WebSocket URL uses `?ticket=wst_...` instead of `?token=<jwt>`
- Reconnection obtains a new ticket each time (tickets are single-use)
- Update `useChat.ts` hook to provide `getTicket` callback via the auth context
- At least 3 unit tests: connect with ticket, reconnect with fresh ticket, handle ticket failure

#### 7.3 Implement WebSocket ticket validation in BFF

**Description**: Add ticket validation to the existing WebSocket upgrade handler in `app/src/server.ts` (or `app/src/routes/chat.ts` WebSocket path). When a WebSocket connection arrives with `?ticket=`, validate against the in-memory ticket store, extract the associated wallet, and proceed. Reject invalid/expired/reused tickets.

**Note**: This validation lives in the existing WebSocket upgrade code path — no new `ws-proxy.ts` file needed. The ticket store created in 7.1 is imported and used directly.

**Acceptance Criteria**:
- WebSocket upgrade checks `ticket` query parameter
- Valid ticket: extract wallet, delete ticket from store, proceed with connection
- Invalid/missing ticket: close WebSocket with 4001 code and "invalid_ticket" reason
- Expired ticket: close with 4001 and "ticket_expired" reason
- Integration test: full flow from ticket issuance → WS connect → streaming
- At least 3 unit tests

#### 7.4 Add JWT private key validation in config

**Description**: Validate `DIXIE_JWT_PRIVATE_KEY` at startup. An empty or too-short key means the auth system silently accepts a zero-length HMAC secret, allowing trivial token forgery. Fail fast with a clear error.

**Acceptance Criteria**:
- `loadConfig()` throws if `DIXIE_JWT_PRIVATE_KEY` is empty or less than 32 characters
- Error message: `"DIXIE_JWT_PRIVATE_KEY must be at least 32 characters (got N)"`
- In test/development mode (`NODE_ENV=test`), allow empty key for test convenience (with warning to stderr)
- Update existing tests that use empty JWT key to either set NODE_ENV=test or provide a valid key
- At least 3 unit tests: valid key, empty key throws, short key throws

#### 7.5 Document HS256→ES256 JWT migration path

**Description**: Add architectural decision documentation directly in the source code for the JWT algorithm migration from HS256 (current Phase 1) to ES256 (Phase 2 target). This serves both human developers and AI agents who will implement the migration.

**Acceptance Criteria**:
- Comment block in `app/src/middleware/jwt.ts` explaining:
  - Why HS256 is used now (single-service, simpler key management)
  - Why ES256 is needed for Phase 2 (loa-finn needs to verify without forging)
  - Step-by-step migration plan: generate EC P-256 keypair, deploy public key to loa-finn, update signing algorithm, add JWKS endpoint
  - Reference to SDD §7.1
- Comment block in `app/src/routes/auth.ts` at `issueJwt` function
- Comment block in `app/src/config.ts` at `jwtPrivateKey` explaining key format changes for ES256 (PEM-encoded EC key vs raw string)
- All comments use `// ADR:` prefix for searchability
- No functional code changes (documentation only)

---

## Sprint 8: Operational Resilience & Observability

**Goal**: Make the system observable, bounded, and consistent across instances. Circuit breaker state transitions become visible events. Audit logs don't grow unboundedly. AllowlistStore stays consistent when auto-scaling adds instances.

**Success Criteria**: Circuit breaker transitions emit structured log events that match CloudWatch metric filter patterns. Audit log capped at configurable max entries with overflow emitted to structured logs. AllowlistStore reloads on EFS file changes. All existing tests pass + new tests.

**Philosophy**: An operational system that can't be observed is a system that can't be trusted. Every state change should be an event. Every growing data structure should have a bound. Every multi-instance deployment should behave identically regardless of which instance serves the request.

### Tasks

#### 8.1 Add circuit breaker state transition logging

**Description**: The circuit breaker changes state (closed→open, open→half-open, half-open→closed) but emits no observable signal. The CloudWatch alarm for `$.circuit_state = "open"` will never fire because no log matches that pattern. Add structured log emission on every state transition.

**Pattern**: Netflix's Hystrix — state machine is silent internally but loud externally. Every transition is an event.

**Acceptance Criteria**:
- New private method `transitionTo(newState)` that logs transition and updates state
- Log entry includes: `event: "circuit_breaker_transition"`, `from`, `to`, `circuit_state`, `consecutive_failures`, `service: "loa-finn"`
- Level: `error` when transitioning to `open`, `warn` for `half-open`, `info` for `closed`
- All state changes in `recordSuccess`, `recordFailure`, `checkCircuit` use `transitionTo`
- CloudWatch metric filter `$.circuit_state = "open"` now has matching log entries
- FinnClient accepts optional `log` callback (dependency injection for testability)
- At least 4 unit tests: closed→open logs, open→half-open logs, half-open→closed logs, no log when state unchanged

**For Future Agents**: The `circuit_breaker_transition` event name is the stable contract. CloudWatch alarms, dashboards, and alerting rules match on this string. Do not rename without updating the Terraform metric filter in `deploy/terraform/dixie.tf`.

#### 8.2 Implement bounded audit log with structured log emission

**Description**: The AllowlistStore audit log grows unboundedly in memory (~144K entries/day at 100 RPM). Implement a ring buffer with configurable maximum size. Overflow entries are emitted as structured logs to stdout before being evicted.

**Pattern**: Write-ahead to logs. Memory is a cache; logs are the durable record.

**Acceptance Criteria**:
- `AllowlistStore` constructor accepts optional `maxAuditEntries` (default 10,000)
- When audit log exceeds max, oldest entries emitted to stdout as structured JSON before eviction
- Emitted entries include `event: "audit_overflow"` for searchability in CloudWatch
- `getAuditLog()` returns current in-memory entries (for tests and admin API)
- Memory usage bounded: never exceeds `maxAuditEntries` entries at steady state
- At least 4 unit tests: normal append, overflow triggers emission, buffer stays bounded, custom max

**For Future Agents**: When moving to Phase 2 (external storage), replace the ring buffer with direct structured log emission only. The `event: "audit_overflow"` and `auth_type`/`action` fields are the stable contract for downstream consumers.

#### 8.3 Add AllowlistStore file-watcher for multi-instance consistency

**Description**: When auto-scaling adds instances (1→3 per Terraform config), AllowlistStore diverges: instance A's admin API writes to EFS, but instance B's in-memory state is stale. Add `fs.watch` on the allowlist file that reloads from disk when the file changes.

**Pattern**: File as message bus. EFS provides consistency; `fs.watch` provides notification. Interim solution for ≤3 instances.

**Acceptance Criteria**:
- When `filePath` is provided, `AllowlistStore` sets up `fs.watch` on the file
- On file change event, reloads from disk and replaces in-memory `data`
- Self-write detection: track `lastWriteTimestamp` in `save()`, skip reload if file change occurs within 100ms of own write (prevents reload loops)
- Polling fallback: if `fs.watch` fails or `DIXIE_ALLOWLIST_POLL=1` is set, fall back to 30-second stat-based polling (EFS/NFS compatibility)
- Debounced: ignore rapid successive events within 500ms (EFS can trigger multiple events)
- File-watcher doesn't prevent process exit (`.unref()` the watcher)
- Graceful handling: if file temporarily missing during write (temp+rename), don't crash
- `close()` method to clean up the watcher (for tests)
- At least 6 unit tests: detects external write, debounces rapid changes, handles missing file, cleanup, self-write skipped, polling fallback activates

**For Future Agents**: This is explicitly a Phase 1 solution for ≤3 instances. Phase 2 should externalize allowlist state to Redis or loa-finn's persistence layer. If you see intermittent empty-allowlist errors in production, investigate the temp+rename race condition window first. The polling fallback (`DIXIE_ALLOWLIST_POLL=1`) exists for EFS environments where `fs.watch` is unreliable — set this in the ECS task definition if you observe stale allowlists.

#### 8.4 Update integration tests for operational changes

**Description**: Update the integration test suite to validate the new operational behaviors.

**Acceptance Criteria**:
- Integration test: circuit breaker transition to `open` produces structured log entry
- Integration test: audit log respects max entries bound
- Integration test: file change triggers allowlist reload
- All existing 115+ tests still pass
- No flaky tests (debounce timing tests use deterministic control)

---

## Sprint 9: Architectural Documentation & Future-Proofing

**Goal**: Prepare the architecture for Phase 2 adoption. Document decisions for future agents and developers. Add the x402 payment middleware hook point. Every architectural choice is explained in context.

**Success Criteria**: x402 hook point exists in the middleware pipeline with documentation. All Hono typing workarounds documented with ADR comments. Cross-cutting documentation pass ensures future agents can understand every non-obvious pattern.

**Philosophy**: Code is written once but read hundreds of times — by humans, by AI agents, by security auditors, by new team members. Every non-obvious decision deserves an explanation that tells the reader *why*, not just *what*. This is compassionate engineering: we build for the people who come after us.

### Tasks

#### 9.1 Add x402 payment middleware hook point

**Description**: The Billing RFC (loa-freeside #62) identifies x402 micropayments as a high-potential revenue path. The BFF is the natural location for the `@x402/hono` middleware. Add a documented, commented hook point in the middleware pipeline at the correct position.

**Pattern**: Stripe's insight — payments as middleware, not routes. The hook point costs nothing today and saves a rewrite tomorrow.

**Acceptance Criteria**:
- Commented middleware slot in `server.ts` between rate limiting and route handlers
- Comment includes: why this position, what goes here (`@x402/hono`), reference to loa-freeside #62
- Comment uses `// HOOK:` prefix for searchability
- Type stub `app/src/middleware/payment.ts` with exported `createPaymentGate` returning pass-through middleware
- The noop middleware is wired in but does nothing — ready to be replaced
- At least 1 unit test: payment gate passes through without blocking
- Documentation: comment in `payment.ts` explaining the x402 flow

**For Future Agents**: The payment middleware MUST be after JWT extraction (needs wallet for billing) and after allowlist (don't bill denied requests). Pipeline slot: `... → rateLimit → allowlist → **payment** → routes`. Do not reorder.

#### 9.2 Add ADR comments for Hono sub-app typing workaround

**Description**: Route handlers read wallet and requestId from HTTP headers instead of Hono's typed context. This is correct but non-obvious. Add ADR comments explaining the decision.

**Acceptance Criteria**:
- ADR comment block at top of `app/src/routes/chat.ts` explaining the Hono `app.route()` boundary
- Same ADR comment at top of `app/src/routes/sessions.ts`
- Same ADR comment at top of `app/src/routes/identity.ts`
- Comments use `// ADR: Hono sub-app typing` prefix for searchability
- No functional code changes

**For Future Agents**: If Hono adds typed context propagation across `app.route()` boundaries, search for `// ADR: Hono sub-app typing` to find all files that can be simplified.

#### 9.3 Cross-cutting documentation pass

**Description**: Documentation pass across all source files ensuring every non-obvious pattern is explained.

**Acceptance Criteria**:
- `app/src/server.ts`: Comment explaining middleware ordering rationale
- `app/src/proxy/finn-client.ts`: Comment explaining threshold choices and operational implications
- `app/src/middleware/allowlist.ts`: Comment explaining EIP-55 normalization choice
- `app/src/config.ts`: Comment explaining each environment variable and its production default
- `app/src/middleware/rate-limit.ts`: Comment explaining sliding window choice and cleanup strategy
- `app/src/middleware/body-limit.ts`: Comment explaining Content-Length check (no streaming body consumption)
- All comments accessible to both human developers and AI agents
- No functional code changes

#### 9.4 Final integration validation

**Description**: Run the full test suite to confirm all changes across Sprints 7-9 work together.

**Acceptance Criteria**:
- All unit tests pass (115+ existing + new from Sprints 7-9)
- All integration tests pass
- WebSocket ticket flow works end-to-end
- Circuit breaker transition logs appear in test output
- Audit log stays bounded
- AllowlistStore reloads on file change
- No TypeScript compilation errors
- No lint warnings introduced

---

---

---

## Phase 3: Bridge Convergence (Sprints 10-12)

> *Bridge iterations 1-3 executed via `/run-bridge`. Score trajectory: 23 → 4 → 0 (flatline). All 21 findings addressed across 3 iterations.*

### Sprints 10-12: Summary (Completed via Run Bridge)

These sprints were generated and executed autonomously by the bridge loop, addressing all findings from Bridgebuilder code review iterations.

| Sprint | Findings Addressed | Files Changed | Tests Added |
|--------|-------------------|---------------|-------------|
| 10 | F-1 (TLS validation), F-2 (ticket caps), F-5 (socket cleanup), F-6 (ws-upgrade tests), F-7 (constant-time admin key) | 6 | 8 |
| 11 | F-3 (write-nonce), F-4 (batch eviction), F-8 (explicit scheme), F-9 (JWT error logging), F-10 (tracing type assertions) | 4 | 0 |
| 12 | F-1-iter2 (admin key length timing), F-3-iter2 (dead parentSpanId), F-4-iter2 (route-level 429 test) | 3 | 1 |

**Final state**: 125 tests, TypeScript clean, flatline achieved (0 new findings).

---

---

## Phase 4: Strategic Excellence — Bridgebuilder Persona Review

> *"The bridge that carries millions of people every day doesn't get noticed. It gets trusted. That's what you've built. Now build what gets noticed."*
>
> Source: Bridgebuilder Persona Review, PR #2 — Part VI: Closing Reflections

These sprints address ALL 5 strategic recommendations from the Bridgebuilder Persona Review (Parts I-VI), plus the 4 undocumented decision trail gaps identified in Part V, the residual risks from Part IV, and the soul gap analysis from Part III. Every finding at every level — HIGH, MEDIUM, LOW, and the philosophical/architectural insights woven through the 6-part review.

### Strategic Findings Addressed

| # | Severity | Category | Finding | Sprint |
|---|----------|----------|---------|--------|
| S-1 | HIGH | Architecture | Adopt Hounfour protocol types | Sprint 13 |
| S-2 | MEDIUM | Documentation | Document communitarian architecture decision | Sprint 14 |
| S-3 | MEDIUM | Testing | Integration test against real loa-finn | Sprint 15 |
| S-4 | LOW | Experience | Surface tool use in web UI | Sprint 16 |
| S-5 | LOW | Architecture | Prepare soul memory architecture | Sprint 17 |

### Decision Trail Gaps (Part V)

| Gap | Sprint |
|-----|--------|
| Communitarian vs. autonomous agent philosophy | Sprint 14 (14.1) |
| Hounfour protocol alignment strategy | Sprint 13 (13.1) |
| Soul memory architecture options | Sprint 17 (17.1) |
| Conway competitive positioning | Sprint 14 (14.2) |

### Residual Risks (Part IV)

| Risk | Sprint |
|------|--------|
| WebSocket bidirectional pipe proxy untested | Sprint 15 (15.3) |
| BEAUVOIR personality not surfaced in UX | Sprint 16 (16.4) |

### Sprint Sequence (Phase 4)

```
Sprint 13: Hounfour Protocol Alignment ──→ Sprint 14: Decision Trail
   │                                            │
   └── Sprint 15: Hermetic Integration ─────────┘
                     │
                     └── Sprint 16: Tool Use Visualization
                                    │
                                    └── Sprint 17: Soul Memory Prep
```

### Dependencies

```
Sprint 13 ──→ Sprint 14 ──→ Sprint 15
                  │              │
                  │              └── Sprint 16 ──→ Sprint 17
                  │
                  └── Sprint 14 depends on 13 (protocol types inform philosophy doc)
Sprint 15 depends on 13 (protocol types used in integration tests)
Sprint 16 is independent of 15 but benefits from sequential context
Sprint 17 depends on 13 (Hounfour AccessPolicy/ConversationSealingPolicy)
```

---

## Sprint 13: Hounfour Protocol Alignment

**Goal**: Import `loa-hounfour` as a dependency and align Dixie's type definitions with the ecosystem's formalized protocol types. This is the highest-priority strategic recommendation — the protocol IS the interface contract.

**Success Criteria**: `loa-hounfour` installed as dependency. Core types (`AccessPolicy`, `AgentIdentity`, `BillingEntry`) imported and used where they replace custom types. Protocol compliance tests pass.

**Philosophy**: Before protobuf, every Google service defined its own serialization. After protobuf, services that spoke the same protocol could be validated mechanically. Adopting Hounfour isn't about code reuse — it's about contract alignment. When the cross-system E2E validator (Freeside PR #63) arrives, Dixie should already speak the protocol language.

> Source: Bridgebuilder Part V, S-1; Part VI, Autopoiesis of Protocols

### Tasks

#### 13.1 Install loa-hounfour and audit type overlap

**Description**: Install `loa-hounfour` as a dependency. Audit all Dixie-defined types (`AllowlistData`, `AuditEntry`, `DixieConfig`, `BffError`, types in `types.ts`) against Hounfour protocol types. Create a mapping document showing which Dixie types map to which Hounfour types, which are subsets, and which are genuinely novel.

**Acceptance Criteria**:
- `loa-hounfour` installed in `app/package.json`
- Type audit document as comment block in `app/src/types.ts`
- Mapping table: `AllowlistData` ↔ `AccessPolicy`, `AuditEntry` ↔ `AuditEvent`, etc.
- Identify types that have NO Hounfour equivalent (these are Dixie-specific)
- No runtime changes — this is analysis only
- TypeScript compiles cleanly with the new dependency

**For Future Agents**: The Hounfour package exports from `loa-hounfour/protocol`. Check the package's `exports` field in `package.json` for available type paths. If the package is not published to npm, it may need to be referenced via git URL or workspace protocol.

#### 13.2 Replace custom types with Hounfour protocol types

**Description**: Where the audit (13.1) identifies direct mappings, replace Dixie's custom types with imports from `loa-hounfour`. Focus on types that cross the service boundary (types sent to/received from loa-finn).

**Acceptance Criteria**:
- `app/src/types.ts` imports from `loa-hounfour` for protocol-aligned types
- `BillingEntry` used if Dixie handles any billing-adjacent data
- `AgentIdentity` used in the identity route response types
- Custom types retained only where Hounfour has no equivalent
- Each replacement includes an inline comment: `// Aligned: loa-hounfour/{TypeName}`
- All existing tests pass without modification (type changes should be structural, not behavioral)
- TypeScript compiles cleanly

#### 13.3 Add AccessPolicy type to allowlist architecture

**Description**: The Hounfour `AccessPolicy` type (4 access types: none, read_only, time_limited, role_based) formalizes what the allowlist currently implements ad-hoc. Add `AccessPolicy` as the type governing who can access what, even if the current implementation only uses the `role_based` variant. This prepares the architecture for soul memory governance (Sprint 17).

**Acceptance Criteria**:
- `AccessPolicy` imported from `loa-hounfour`
- Allowlist entries gain an optional `policy` field typed as `AccessPolicy`
- Default policy: `{ type: 'role_based', role: 'team' }` (matches current behavior)
- Existing allowlist JSON file format backward-compatible (policy optional)
- ADR comment explaining: "Phase 1 uses role_based only. Phase 2 adds time_limited for conviction-based tier expiry. Phase 3 adds per-conversation policies for soul memory governance."
- At least 2 unit tests: default policy applied, custom policy stored

**For Future Agents**: The `AccessPolicy` type is the governance primitive for soul memory. When implementing Sprint 17's architecture, conversation access control maps directly to `AccessPolicy` variants. Do not create parallel access control types.

#### 13.4 Add protocol compliance validation

**Description**: Create a test suite that validates Dixie's data shapes conform to Hounfour protocol types. This catches drift — if either Dixie's types or Hounfour's types change, the compliance tests fail.

**Acceptance Criteria**:
- `app/tests/unit/protocol-compliance.test.ts` created
- Tests verify: Dixie's allowlist entry shape satisfies `AccessPolicy` constraints
- Tests verify: Identity route response shape aligns with `AgentIdentity`
- Tests verify: Audit entry shape aligns with Hounfour event types (if applicable)
- At least 4 compliance tests
- All existing 125+ tests still pass
- TypeScript compiles cleanly

---

## Sprint 14: Communitarian Architecture & Decision Trail

**Goal**: Close the 4 undocumented decision trail gaps identified in the Bridgebuilder review. The choice between Darwinian agents (Conway, #80) and communitarian agents (Dixie's allowlist governance) is the most fundamental architectural decision in the codebase — and it's never stated.

**Success Criteria**: ADR documents exist for all 4 decision trail gaps. Each ADR is grounded in code references, ecosystem context, and explains the implications for future development. The Conway positioning is clear enough that a future agent won't accidentally implement Darwinian features that contradict the communitarian model.

**Philosophy**: Code is written once but read hundreds of times. Every non-obvious decision deserves an explanation that tells the reader *why*, not just *what*. The communitarian model is implicit in the allowlist gate, conviction-based tiers, and community governance — but implicit decisions create drift. An undocumented architectural philosophy is an invitation for future agents to contradict it.

> Source: Bridgebuilder Part III (The Conway Question), Part V (S-2), Part V (Decision Trail Check)

### Tasks

#### 14.1 Write communitarian architecture ADR

**Description**: Create an architectural decision record documenting why Dixie implements communitarian (Ostrom) agents rather than autonomous (Darwinian/Conway) agents. This is the most fundamental decision trail gap identified by the Bridgebuilder.

The ADR should cover:
- Why community-embedded rather than autonomous
- Why allowlist governance rather than open market access
- Why conviction-based tiers rather than flat pricing
- How this relates to the Web4 "social monies" thesis (meow.bio/web4.html)
- Implications for downstream decisions: memory architecture, revenue model, personality evolution

**Acceptance Criteria**:
- `grimoires/loa/context/adr-communitarian-agents.md` created
- References Issue #80 (Conway's Automaton), the Web4 thesis, and loa-finn#66
- Explains the three decision forks: memory (library vs brain), revenue (community-funded vs self-funded), personality (serve vs survive)
- Code references: `app/src/middleware/allowlist.ts` (allowlist as governance gate), `app/src/server.ts` (middleware pipeline as constitution)
- Actionable: a future developer or agent reading this ADR knows exactly what NOT to build and why
- No functional code changes

#### 14.2 Write Conway competitive positioning document

**Description**: Document how Dixie's architecture positions relative to Conway's maximalist vision (#80). Conway envisions: existence → compute → money → value creation → write access. Dixie rejects autonomous economic agency in favor of community governance. This document explains the *relationship* between the two visions.

**Acceptance Criteria**:
- `grimoires/loa/context/adr-conway-positioning.md` created
- Maps Conway's agent lifecycle against Dixie's governance model
- Identifies the x402 bridge: community provides social capital, x402 provides economic plumbing (the hybrid model from Part III)
- References loa-finn#80, loa-freeside#62 (Billing RFC)
- Addresses the question: "Can Dixie agents eventually become economically autonomous?" with nuanced answer
- No functional code changes

#### 14.3 Write Hounfour protocol alignment strategy

**Description**: Document the strategy for progressive adoption of Hounfour protocol maturity levels. Dixie is currently at Level 1 (Interface). The path to Level 2 (Structural) requires aggregate boundaries and state machines. Level 3 (Behavioral) requires formal temporal invariants.

**Acceptance Criteria**:
- `grimoires/loa/context/adr-hounfour-alignment.md` created
- Maps Dixie's current type definitions to Hounfour maturity levels
- Defines milestones: Level 1 → Level 2 (Sprint 13 achieves this), Level 2 → Level 3 (formal invariants), Level 3 → Level 4 (cross-system validation via Freeside PR #63's E2E validator)
- References loa-hounfour PR #1, PR #2, Issue #247 (autopoiesis)
- Includes concrete code examples showing the progression
- No functional code changes

#### 14.4 Add inline decision trail comments in source code

**Description**: Add decision trail comments in key source files that reference the ADR documents. These comments serve as waypoints for developers and agents navigating the codebase.

**Acceptance Criteria**:
- `app/src/middleware/allowlist.ts`: Comment referencing communitarian ADR explaining allowlist as governance primitive
- `app/src/server.ts`: Comment referencing Conway positioning explaining middleware pipeline as constitutional ordering
- `app/src/middleware/payment.ts`: Comment referencing x402 bridge model from Conway positioning ADR
- `app/src/types.ts`: Comment referencing Hounfour alignment strategy explaining protocol maturity progression
- All comments use `// DECISION:` prefix for searchability
- No functional code changes
- All existing tests pass

---

## Sprint 15: Hermetic Integration Testing

**Goal**: Build a hermetic integration test suite that proves Dixie composes correctly against real loa-finn, not mocks. Address the residual risk from Part IV: the WebSocket bidirectional proxy pipe logic remains the least-tested code path.

**Success Criteria**: `docker-compose.integration.yml` brings up dixie + loa-finn + Redis. Integration tests validate the full flow: allowlist → JWT → chat → streaming → citations. WebSocket proxy pipe logic has dedicated tests.

**Philosophy**: Hermetic testing catches 40% of bugs that unit tests miss (Winters, Manshreck, Wright, "Software Engineering at Google", Chapter 14). Mocked tests prove the code is correct against our assumptions. Hermetic tests prove our assumptions are correct against reality.

> Source: Bridgebuilder Part V (S-3), Part IV (residual risk: ws-upgrade.ts bidirectional pipe)

### Tasks

#### 15.1 Create Docker Compose integration environment

**Description**: Create `deploy/docker-compose.integration.yml` that brings up a real loa-finn instance alongside Dixie. The environment should be hermetic — no external dependencies, all state ephemeral.

**Acceptance Criteria**:
- `deploy/docker-compose.integration.yml` defines: dixie, loa-finn, redis
- loa-finn configured with Oracle binding enabled (knowledge sources from Dixie's corpus)
- Shared knowledge volume between dixie init container and loa-finn
- Environment variables set for integration (test JWT keys, test admin key, test allowlist)
- `docker compose -f deploy/docker-compose.integration.yml up` starts all services within 30 seconds
- Health endpoints return healthy for both dixie and loa-finn
- `docker compose down` cleans up all containers and volumes

#### 15.2 Create integration test suite for full proxy flow

**Description**: Write integration tests that exercise the full request path through real HTTP/WebSocket. These tests prove the proxy layer, JWT forwarding, error mapping, and circuit breaker work against real loa-finn semantics.

**Acceptance Criteria**:
- `app/tests/integration/proxy-flow.test.ts` created
- Test: health endpoint returns healthy with real loa-finn status
- Test: unauthenticated request returns 401
- Test: non-allowlisted wallet returns 403
- Test: allowlisted API key can create session via POST /api/chat
- Test: allowlisted user receives streaming response via WebSocket
- Test: response includes knowledge metadata (sources_used array non-empty)
- Test: circuit breaker opens when loa-finn is stopped, half-opens on restart
- Tests run against Docker Compose (not mocks)
- Test runner handles container startup/health-check wait

#### 15.3 Add WebSocket bidirectional proxy pipe tests

**Description**: The `ws-upgrade.ts` file contains 153 lines of raw networking code that handles bidirectional WebSocket proxying. Part IV identified this as the residual risk — Sprint 10 added tests for rejection paths, but the actual pipe logic (frame forwarding, backpressure, cleanup on close) remains untested.

**Acceptance Criteria**:
- `app/tests/integration/ws-proxy-pipe.test.ts` created
- Test: message sent from client arrives at upstream (forward direction)
- Test: message sent from upstream arrives at client (reverse direction)
- Test: upstream close triggers client close (cleanup cascade)
- Test: client close triggers upstream close (cleanup cascade)
- Test: large message (>64KB) passes through without corruption
- Tests use real WebSocket connections (not mocks)
- At least 5 integration tests

#### 15.4 Create JWT exchange integration test

**Description**: Validate the full JWT lifecycle against real loa-finn: Dixie issues JWT → loa-finn validates JWT → session created → streaming response. This proves JWT format compatibility between the two services.

**Acceptance Criteria**:
- Test: Dixie-issued JWT is accepted by loa-finn for session creation
- Test: Expired JWT is rejected by loa-finn with appropriate error
- Test: JWT with correct wallet but wrong issuer is rejected
- Test: Ticket flow (POST /api/ws/ticket → WS connect) works end-to-end with real loa-finn
- At least 4 integration tests
- All existing 125+ unit tests still pass

---

## Sprint 16: Tool Use Visualization & Experience Layer

**Goal**: Close the experience gap identified in Part III: Dixie proxies loa-finn's tool sandbox capabilities but the web UI doesn't surface them. When the Oracle uses tools (search, read, write, edit), the user should see the process — not just the result. Also surface BEAUVOIR personality metadata.

**Success Criteria**: Tool-call streaming events render as expandable inline blocks in the chat UI. The Oracle's identity card surfaces BEAUVOIR personality metadata. The user experience shifts from "the AI gave me an answer" to "the AI *worked* to get me an answer."

**Philosophy**: The "surprise" factor from Issue #66 comes from showing the agent's reasoning, not just its conclusions. Anthropic's Claude UI, ChatGPT's code interpreter, and Cursor's inline tool use all demonstrate this pattern. The visualization IS the differentiator.

> Source: Bridgebuilder Part III (The Soul Gap), Part V (S-4), Part II (tool sandbox capabilities)

### Tasks

#### 16.1 Parse tool_call and tool_result streaming events

**Description**: Update `web/src/lib/ws.ts` to parse `tool_call` and `tool_result` event types from the WebSocket stream. These events are already defined in SDD §6.1 but not currently handled by the frontend.

**Acceptance Criteria**:
- `tool_call` events parsed with fields: `name`, `args`
- `tool_result` events parsed with fields: `name`, `result`
- Events emitted as intermediate entries in the message stream (between chunks)
- Accumulated tool calls stored in message metadata for display
- At least 3 unit tests: parse tool_call, parse tool_result, accumulate in message

#### 16.2 Create ToolUseDisplay component

**Description**: Create `web/src/components/ToolUseDisplay.tsx` per SDD §4.6.5. Renders tool call events as expandable inline blocks within the chat message. Shows tool name, arguments (truncated), execution status, and result preview.

**Acceptance Criteria**:
- Tool calls render as collapsible inline blocks with distinct visual styling
- Shows tool name with icon (wrench emoji or similar)
- Shows arguments (truncated to 100 chars with "expand" option)
- Spinner while tool is executing (between tool_call and tool_result)
- Checkmark when done, with result preview (truncated)
- Multiple tool calls in a single message render as stacked blocks
- At least 3 component tests: single tool, multiple tools, loading state

#### 16.3 Integrate tool use into chat flow

**Description**: Wire `ToolUseDisplay` into `MessageBubble.tsx` so that tool calls appear inline within the assistant's streaming response. Tool calls should appear at the point in the message where they occurred, not after the full message.

**Acceptance Criteria**:
- Tool calls appear inline as the message streams (not appended at end)
- Chat auto-scrolls to show tool call as it appears
- Tool results appear when available, followed by continued text streaming
- Message metadata includes tool use summary (count of tools used, total time)
- Existing citation panel still works alongside tool use display
- At least 2 integration tests: streaming with tool calls, tool + citations together

#### 16.4 Surface BEAUVOIR personality in Oracle identity

**Description**: The Oracle's identity endpoint (`GET /api/identity/oracle`) returns personality data from loa-finn's identity graph including the BEAUVOIR hash and dAMP-96 summary. Surface this in the web UI as an "Oracle identity card" — a lightweight component showing the Oracle's personality traits derived from the dAMP-96 engine.

**Acceptance Criteria**:
- Oracle identity card component renders personality summary from `/api/identity/oracle`
- Shows Oracle name, personality hash (truncated), and key personality traits from dAMP-96 summary
- Card appears in sidebar or as a dismissible header
- Card links to the persona description (if available)
- Graceful degradation: if identity endpoint returns empty/error, card hidden
- At least 2 component tests: card renders with data, card hidden on error

---

## Sprint 17: Soul Memory Architecture Preparation

**Goal**: Document the architectural options for soul memory — the single biggest experiential differentiator identified in Issue #66. "Without it, the dNFT is a chatbot with personality. With it, it's 'my agent.'" This sprint is design and documentation only — no implementation — to ensure the architecture is right before building.

**Success Criteria**: Architecture options document exists with 3 approaches evaluated against Hounfour governance types. API surface designed for memory operations. Decision recommendation with rationale. The next development cycle can begin soul memory implementation immediately.

**Philosophy**: ChatGPT's memory system chose the simplest approach (PostgreSQL storage) and later had to retrofit governance. Hounfour's `ConversationSealingPolicy` and `AccessPolicy` types (PR #1, PR #2) suggest the governance-first approach is correct for this ecosystem. Design the governance, then build the storage.

> Source: Bridgebuilder Part III (The Soul Memory Problem), Part V (S-5), Part VI (Hounfour protocol maturity)

### Tasks

#### 17.1 Write soul memory architecture options document

**Description**: Document 3 architectural approaches to soul memory, evaluated against the Hounfour governance primitives. Each option should include: data model, storage technology, governance model (who reads, who writes, what happens on NFT transfer), performance characteristics, and implementation complexity.

**Options to evaluate**:
- **Option A**: Conversation history in PostgreSQL with per-user encryption (simplest — ChatGPT's approach)
- **Option B**: Event-sourced memory with append-only log governed by `ConversationSealingPolicy` (matches Hounfour's behavioral guarantees)
- **Option C**: On-chain metadata pointer + off-chain encrypted storage (matches dNFT ownership transfer semantics — memory travels with the token)

**Acceptance Criteria**:
- `grimoires/loa/context/adr-soul-memory-architecture.md` created
- All 3 options evaluated with pros/cons table
- Each option assessed against: Hounfour AccessPolicy compatibility, NFT transfer semantics, encryption requirements, query patterns, storage cost at scale
- Hounfour `ConversationSealingPolicy` explained: what happens to conversations when an NFT transfers? Does previous owner retain read access? (4 types: none, read_only, time_limited, role_based)
- Recommendation with rationale (expected: Option B for governance-first, with Option C as Phase 3 evolution)
- References loa-hounfour PR #1, PR #2, Issue #66, Conway (#80)
- No functional code changes

#### 17.2 Design soul memory API surface

**Description**: Define the API endpoints that soul memory will require. This establishes the contract between the web frontend, Dixie BFF, and loa-finn's persistence layer before any code is written.

**Acceptance Criteria**:
- `grimoires/loa/context/adr-soul-memory-api.md` created
- API endpoints defined:
  - `GET /api/memory/:nftId` — Retrieve memory context for a dNFT
  - `POST /api/memory/:nftId/seal` — Seal a conversation (per ConversationSealingPolicy)
  - `GET /api/memory/:nftId/history` — Paginated conversation history
  - `DELETE /api/memory/:nftId/:conversationId` — Owner-initiated memory deletion
- Each endpoint specifies: auth requirements, request/response shapes, Hounfour type references, error cases
- AccessPolicy integration: how the allowlist's `AccessPolicy` governs memory access
- Rate limiting considerations for memory-heavy operations
- No functional code changes

#### 17.3 Design memory governance model

**Description**: Document the governance rules for soul memory. This is the most complex design question: when an NFT transfers ownership, what happens to the memory? The Hounfour protocol has answers (`AccessPolicy`, `ConversationSealingPolicy`), but they need to be mapped to concrete Dixie behaviors.

**Acceptance Criteria**:
- `grimoires/loa/context/adr-soul-memory-governance.md` created
- Governance scenarios documented:
  - Owner chats with agent → conversation stored with `read_write` access
  - NFT transfers → previous conversations sealed per `ConversationSealingPolicy`
  - New owner starts chatting → fresh memory context, sealed conversations inaccessible (or read-only per policy)
  - Admin revokes access → memory sealed, governance log entry
  - Agent proactively surfaces memory → how context window manages memory injection
- Relationship to Web4 "social monies" thesis: memory as shared community resource vs private property
- Relationship to Conway model: memory in communitarian model (library, governed) vs Darwinian model (brain, owned)
- No functional code changes

#### 17.4 Create soul memory type stubs

**Description**: Create TypeScript type definitions for the soul memory data model, using Hounfour types as the governance layer. These stubs prepare the codebase for implementation without adding runtime behavior.

**Acceptance Criteria**:
- `app/src/types/memory.ts` created with type definitions only (no runtime code)
- Types include: `SoulMemory`, `ConversationContext`, `MemoryEntry`, `SealedConversation`
- Types import `AccessPolicy` and `ConversationSealingPolicy` from `loa-hounfour`
- Types include JSDoc comments explaining governance semantics
- Type-only file — no imports at runtime, no functional changes
- TypeScript compiles cleanly
- All existing tests pass

---

## Risk Buffer

Each sprint includes implicit buffer for:
- loa-finn API discovery (PR #82 routes may need exploration)
- Docker networking between containers
- ECS/Terraform deployment iteration
- Knowledge source authoring quality
- Hounfour package resolution (may need git URL if not on npm)
- Docker Compose integration test flakiness (container startup races)

## Sprint-to-Requirement Mapping

| Requirement | Sprint Coverage |
|-------------|----------------|
| FR-1: BFF Gateway | Sprint 1 (skeleton), Sprint 4 (chat proxy), Sprint 15 (hermetic validation) |
| FR-2: Knowledge Corpus | Sprint 3 (sources + registry) |
| FR-3: Allowlist Access | Sprint 2 (middleware + auth + admin), Sprint 13 (protocol alignment) |
| FR-4: Web Chat UI | Sprint 4 (full UI), Sprint 16 (tool use + BEAUVOIR) |
| FR-5: Oracle dNFT Identity | Sprint 5 (identity + binding), Sprint 16 (identity card) |
| FR-6: Deployment | Sprint 1 (Docker), Sprint 3 (Terraform), Sprint 6 (staging deploy), Sprint 15 (integration env) |

## Sprint-to-Finding Mapping (Bridgebuilder Review — Original)

| Finding | Severity | Sprint Coverage |
|---------|----------|----------------|
| F-1: WebSocket token in URL | High | Sprint 7 (7.1, 7.2, 7.3) |
| F-2: AllowlistStore split-brain | High | Sprint 8 (8.3) |
| F-3: Circuit breaker silent transitions | Medium | Sprint 8 (8.1) |
| F-4: JWT HS256→ES256 migration | Medium | Sprint 7 (7.5) |
| F-5: Audit log unbounded | Medium | Sprint 8 (8.2) |
| F-6: No x402 payment hook | Medium | Sprint 9 (9.1) |
| F-7: Config no JWT validation | Low | Sprint 7 (7.4) |
| F-8: Missing ADR for typing | Low | Sprint 9 (9.2) |

## Sprint-to-Finding Mapping (Bridge Iterations)

| Finding | Severity | Sprint Coverage |
|---------|----------|----------------|
| F-1-iter1: TLS certificate validation | High | Sprint 10 |
| F-2-iter1: Unbounded ticket store | High | Sprint 10 |
| F-3-iter1: Self-write detection race | Medium | Sprint 11 |
| F-4-iter1: Audit log O(n) eviction | Medium | Sprint 11 |
| F-5-iter1: Socket cleanup after rejection | Medium | Sprint 10 |
| F-6-iter1: No ws-upgrade test coverage | Medium | Sprint 10 |
| F-7-iter1: Admin key not constant-time | Medium | Sprint 10 |
| F-8-iter1: Naive scheme replacement | Low | Sprint 11 |
| F-9-iter1: JWT errors silently swallowed | Low | Sprint 11 |
| F-10-iter1: Tracing type assertions | Low | Sprint 11 |
| F-1-iter2: Admin key length timing leak | Medium | Sprint 12 |
| F-3-iter2: Dead parentSpanId variable | Low | Sprint 12 |
| F-4-iter2: Missing route-level 429 test | Low | Sprint 12 |

## Sprint-to-Finding Mapping (Bridgebuilder Persona Review — Strategic)

| Finding | Severity | Category | Sprint Coverage |
|---------|----------|----------|----------------|
| S-1: Adopt Hounfour protocol types | HIGH | Architecture | Sprint 13 (13.1-13.4) |
| S-2: Document communitarian philosophy | MEDIUM | Documentation | Sprint 14 (14.1, 14.2) |
| S-3: Hermetic integration tests | MEDIUM | Testing | Sprint 15 (15.1-15.4) |
| S-4: Surface tool use in web UI | LOW | Experience | Sprint 16 (16.1-16.3) |
| S-5: Soul memory architecture prep | LOW | Architecture | Sprint 17 (17.1-17.4) |
| Decision trail: Communitarian vs autonomous | — | Decision Gap | Sprint 14 (14.1) |
| Decision trail: Hounfour alignment strategy | — | Decision Gap | Sprint 14 (14.3) |
| Decision trail: Soul memory options | — | Decision Gap | Sprint 17 (17.1) |
| Decision trail: Conway positioning | — | Decision Gap | Sprint 14 (14.2) |
| Residual: WS proxy pipe untested | — | Risk | Sprint 15 (15.3) |
| Residual: BEAUVOIR not surfaced | — | Risk | Sprint 16 (16.4) |

## Success Metrics Per Sprint

| Sprint | Key Metric |
|--------|-----------|
| 1 | `docker compose up` → health endpoint returns 200 |
| 2 | Unauthorized request returns 403, authorized returns 200 |
| 3 | `sources.json` has ≥20 sources, all pass health validation |
| 4 | User can chat via web UI, see streaming markdown + citations |
| 5 | Oracle identity queryable, integration tests pass |
| 6 | Staging deployed, gold-set evaluation ≥ 90% pass rate |
| 7 | WebSocket uses tickets (no JWT in URL), config rejects empty JWT key |
| 8 | Circuit breaker transitions visible in logs, audit bounded, allowlist consistent |
| 9 | x402 hook point in pipeline, all ADR comments in place, full test pass |
| 10 | TLS validated, ticket caps enforced, admin key constant-time, ws-upgrade tested |
| 11 | Write-nonce detection, batch eviction, explicit scheme, JWT error classification |
| 12 | Length-safe comparison, dead code removed, route-level cap test — flatline |
| 13 | `loa-hounfour` installed, protocol types replacing custom types, compliance tests pass |
| 14 | 4 ADR documents created, all decision trail gaps closed, inline DECISION comments |
| 15 | Hermetic tests pass against real loa-finn, WS proxy pipe tested, JWT exchange validated |
| 16 | Tool use visible in chat UI, BEAUVOIR personality surfaced, experience gap narrowed |
| 17 | 3 soul memory ADRs created, API surface designed, governance model documented, type stubs ready |
| 18 | Admin API secured, path injection blocked, wallet propagation fixed, runtime validation added |

---

## Sprint 18: Security Hardening III (Bridge Iter 3)

**Goal**: Address all 3 HIGH-severity and 4 critical MEDIUM-severity findings from Bridgebuilder Review iteration 1 (bridge-20260220-451207). These are production blockers.

**Success Criteria**: Admin API rejects empty keys. Path parameters validated. Wallet propagation works end-to-end for JWT flows. Runtime body validation on security-critical routes. All existing tests pass + new tests for each fix.

> Source: Bridgebuilder Review iter 1 — SEC-001, SEC-002, SEC-003, SEC-004, ARCH-002, RES-002, CODE-004

### Tasks

#### 18.1 Fix admin API empty-key bypass (SEC-001)

**Description**: DIXIE_ADMIN_KEY defaults to empty string. `safeEqual('', '')` returns true. Add startup validation that rejects empty admin keys in non-test environments, and add an early-return guard in the admin middleware.

**Acceptance Criteria**:
- `loadConfig()` throws if `DIXIE_ADMIN_KEY` is empty and `NODE_ENV !== 'test'`
- Admin middleware returns 403 when `adminKey` is empty string (defense in depth)
- Existing admin tests updated to set DIXIE_ADMIN_KEY explicitly
- New test: empty admin key → 403

#### 18.2 Add path parameter validation for sessionId (SEC-002)

**Description**: `body.sessionId` is interpolated into URL paths without validation. Add a validation function for path parameters and apply it to sessionId in chat.ts and id in sessions.ts.

**Acceptance Criteria**:
- New `validatePathParam(value: string): boolean` utility that enforces `/^[a-zA-Z0-9_-]+$/`
- Chat route validates `body.sessionId` before URL interpolation, returns 400 on invalid
- Sessions route validates `c.req.param('id')` before URL interpolation
- New test: malicious sessionId (`../../admin`) → 400
- New test: valid sessionId → passes through

#### 18.3 Add wallet bridge middleware (SEC-003)

**Description**: JWT middleware stores wallet via `c.set('wallet')` but routes read `c.req.header('x-wallet-address')`. Add a bridge middleware that copies the wallet from context to the request header, matching the pattern already used in ws-ticket.test.ts.

**Acceptance Criteria**:
- New middleware in `app/src/middleware/wallet-bridge.ts` that copies `c.get('wallet')` to `x-wallet-address` header
- Middleware registered in server.ts after JWT middleware and before route handlers
- Integration test: JWT-authenticated request → wallet forwarded to finn via X-Wallet-Address header
- ws-ticket.test.ts bridge middleware removed (now handled by production middleware)

#### 18.4 Add runtime body validation with Zod (ARCH-002)

**Description**: `c.req.json<T>()` provides zero runtime validation. Add Zod schemas for chat and auth route bodies and validate before processing.

**Acceptance Criteria**:
- Zod added as dependency
- Chat route body schema: `{ prompt: z.string().min(1).max(10000), sessionId: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional() }`
- Auth route body schema: `{ message: z.string(), signature: z.string() }`
- Invalid body → 400 with structured error response
- New tests: non-string prompt → 400, missing prompt → 400, valid body → passes

#### 18.5 Fix WebSocket reconnect counter and OracleIdentityCard auth (RES-002, CODE-004)

**Description**: WebSocket reconnect counter never resets on success. OracleIdentityCard fetches without auth token. Fix both frontend issues.

**Acceptance Criteria**:
- `ws.ts`: Reset `reconnectAttempts` to 0 on successful WebSocket open
- `OracleIdentityCard.tsx`: Use `apiFetch` from api module instead of raw `fetch`
- `useChat.ts`: Use `crypto.randomUUID()` for message IDs instead of `Date.now()`
- Existing web tests updated if needed
