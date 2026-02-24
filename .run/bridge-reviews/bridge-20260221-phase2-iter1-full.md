# Bridgebuilder Review — Phase 2 Iteration 1

**Bridge ID**: bridge-20260221-phase2
**Branch**: feature/dixie-phase2
**Iteration**: 1 of 3
**Scope**: 29 commits, 185 files, ~40K insertions (10 sprints of Phase 2)

---

## Architectural Meditation

Dixie Phase 2 accomplishes something genuinely ambitious: it transforms a proxy layer into an experience orchestrator with five interlocking governance systems — conviction tiers, autonomous permissions, soul memory, compound learning, and agent API. The constitutional middleware ordering (15 positions, each encoding a governance priority) is the kind of design decision that separates infrastructure from architecture.

What I'm reviewing here isn't just code quality — it's whether these systems compose safely under adversarial conditions. And that question reveals some gaps worth addressing.

---

## Findings

<!-- bridge-findings-start -->
```json
{
  "bridge_id": "bridge-20260221-phase2",
  "iteration": 1,
  "timestamp": "2026-02-21T22:30:00Z",
  "findings": [
    {
      "id": "high-1",
      "severity": "high",
      "category": "security",
      "title": "TBA auth cache accepts any signature after first verification",
      "file": "app/src/middleware/tba-auth.ts",
      "line": 71,
      "description": "The cache key is `tbaAddress` alone (line 73). After a valid verification is cached, ANY subsequent request with the same TBA address but a DIFFERENT (or expired) signature will hit the cache and bypass verification entirely. The signature and timestamp are validated before the cache check, but a cached result from a previous valid auth means the current signature is never verified.",
      "recommendation": "Include signature hash or use the timestamp-based message as part of the cache key, OR skip the cache entirely on the verification path and only cache the TBA→owner resolution (not the auth result).",
      "faang_parallel": "Similar to session token fixation — Google's BeyondCorp separates identity resolution (cacheable) from request authentication (per-request).",
      "teachable_moment": "Caching authentication results is fundamentally different from caching identity lookups. Auth is per-request; identity is per-entity."
    },
    {
      "id": "high-2",
      "severity": "high",
      "category": "security",
      "title": "Schedule callback endpoint has zero authentication",
      "file": "app/src/routes/schedule.ts",
      "line": 121,
      "description": "POST /api/schedule/callback accepts any request with a scheduleId in the body and triggers schedule execution. No HMAC verification, no shared secret, no origin validation. Any attacker who knows or guesses a schedule ID can fire arbitrary schedule executions.",
      "recommendation": "Add HMAC signature verification using a shared secret with loa-finn. The callback should include a signature header that proves it originated from the cron system.",
      "faang_parallel": "Stripe webhook signature verification (HMAC-SHA256 with per-endpoint secret) is the gold standard here.",
      "teachable_moment": "Webhooks/callbacks are inbound API surface — they need authentication just as much as outbound endpoints."
    },
    {
      "id": "medium-1",
      "severity": "medium",
      "category": "reliability",
      "title": "Agent rate limiter Map grows without bound",
      "file": "app/src/routes/agent.ts",
      "line": 37,
      "description": "agentRequestCounts Map creates entries for every unique agent TBA address. Old timestamps within entries are pruned, but entries for agents that stop requesting are never removed. Over time this leaks memory proportional to unique agent count.",
      "recommendation": "Add periodic cleanup (e.g., every 60s sweep entries with no timestamps in window) or use an LRU cache with max size.",
      "connection": "Same pattern as medium-2, medium-3 — in-memory stores without eviction are a class of issue across Phase 2."
    },
    {
      "id": "medium-2",
      "severity": "medium",
      "category": "reliability",
      "title": "CompoundLearningEngine has three unbounded Maps",
      "file": "app/src/services/compound-learning.ts",
      "line": 84,
      "description": "signalBuffer (line 84), insights (line 85), and lastEvolution (line 86) grow with unique NFT IDs. The insights Map has per-NFT capping (100 windows), but there's no cap on the number of NFTs tracked. signalBuffer retains signals until batchSize is reached — inactive NFTs leak buffer memory indefinitely.",
      "recommendation": "Add maxNfts cap and evict LRU entries. For signalBuffer, add a TTL-based flush for inactive NFTs (e.g., flush after 1 hour of inactivity)."
    },
    {
      "id": "medium-3",
      "severity": "medium",
      "category": "reliability",
      "title": "ScheduleStore executions array grows without bound",
      "file": "app/src/services/schedule-store.ts",
      "line": 20,
      "description": "The executions array (line 20) accumulates every callback execution forever. getExecutions() applies a limit on reads but the underlying array is never pruned.",
      "recommendation": "Add a maxExecutions cap (e.g., 10,000) with oldest-first eviction, matching the pattern used in AutonomousEngine.auditLog."
    },
    {
      "id": "medium-4",
      "severity": "medium",
      "category": "security",
      "title": "Autonomous permissions GET endpoint lacks ownership verification",
      "file": "app/src/routes/autonomous.ts",
      "line": 34,
      "description": "GET /:nftId/permissions returns permissions for ANY authenticated wallet, not just the owner or delegates. An attacker with any valid wallet can enumerate permissions (including delegated wallets, budget limits, tool whitelists) for any NFT.",
      "recommendation": "After fetching permissions, verify that the requesting wallet is the owner or a delegate before returning data."
    },
    {
      "id": "medium-5",
      "severity": "medium",
      "category": "security",
      "title": "Autonomous audit and summary endpoints expose data without ownership check",
      "file": "app/src/routes/autonomous.ts",
      "line": 94,
      "description": "GET /:nftId/audit and GET /:nftId/summary expose audit trails and daily activity summaries to any authenticated wallet. Audit entries contain action details, cost information, and requester identities.",
      "recommendation": "Add the same ownership verification as the PUT endpoint — require owner or delegate wallet match."
    },
    {
      "id": "medium-6",
      "severity": "medium",
      "category": "security",
      "title": "Agent route tier check silently passes when x-agent-owner is absent",
      "file": "app/src/routes/agent.ts",
      "line": 79,
      "description": "The conviction tier check at lines 79-88 is wrapped in `if (ownerWallet)`. If the TBA auth middleware fails to set x-agent-owner (e.g., due to a partial verification), the tier gate is skipped entirely and the request proceeds without conviction validation.",
      "recommendation": "Make x-agent-owner REQUIRED — return 401 if it's absent rather than silently skipping the tier check."
    },
    {
      "id": "medium-7",
      "severity": "medium",
      "category": "correctness",
      "title": "Autonomous budget tracks estimated cost, not actual cost",
      "file": "app/src/services/autonomous-engine.ts",
      "line": 275,
      "description": "getDailySpend() sums estimatedCostMicroUsd from audit entries (line 275). If the actual inference cost differs from the estimate, budget enforcement drifts from reality. This could allow overspend if estimates are consistently low.",
      "recommendation": "Add a post-execution reconciliation step that updates the audit entry with actual cost, or track both estimated and actual separately."
    },
    {
      "id": "medium-8",
      "severity": "medium",
      "category": "correctness",
      "title": "Agent query checks budget cap AFTER incurring inference cost",
      "file": "app/src/routes/agent.ts",
      "line": 120,
      "description": "The budget check at line 120 (`if (body.maxCostMicroUsd && costMicroUsd > body.maxCostMicroUsd)`) happens AFTER the finn request has already been made and tokens consumed. The agent has already been billed; returning 402 doesn't un-spend the tokens.",
      "recommendation": "Check budget BEFORE making the finn request using estimated cost (from capabilities pricing). Post-request, validate actual cost and return a warning header if it exceeded the estimate."
    },
    {
      "id": "medium-9",
      "severity": "medium",
      "category": "security",
      "title": "Learning and schedule list routes lack NFT ownership verification",
      "file": "app/src/routes/learning.ts",
      "line": 19,
      "description": "GET /api/learning/:nftId/insights and GET /api/learning/:nftId/gaps return data for any NFT as long as the caller has a valid wallet. Similarly, GET /api/schedule/:nftId lists schedules without verifying the caller owns or is delegated for that NFT.",
      "recommendation": "Add ownership/delegation verification using the same pattern as the memory routes."
    }
  ],
  "praise": [
    {
      "id": "praise-1",
      "title": "Graceful degradation is architecturally consistent",
      "description": "Every Phase 2 service defaults to a safe null state when infrastructure is unavailable. This isn't just error handling — it's a design philosophy consistently applied across 8+ services."
    },
    {
      "id": "praise-2",
      "title": "Constitutional middleware ordering with documented rationale",
      "description": "The 15-position middleware pipeline with inline ADR comments is genuinely excellent. The communitarian architecture decision — community gates economy gates capability — encodes governance philosophy into code structure."
    },
    {
      "id": "praise-3",
      "title": "ProjectionCache<T> generic pattern",
      "description": "Reusable Redis cache-aside pattern consistently applied across 6 services. Clean generic interface with consistent TTL semantics."
    },
    {
      "id": "praise-4",
      "title": "TBA replay protection via timestamp-in-message",
      "description": "The message construction (`dixie-agent-auth:${tbaAddress}:${timestamp}`) with 5-minute window is a well-designed replay prevention mechanism."
    },
    {
      "id": "praise-5",
      "title": "AutonomousEngine audit log with bounded buffer",
      "description": "The evict-oldest-half strategy at 10K entries is a pragmatic bounded buffer pattern. This is the model that other in-memory stores should follow."
    },
    {
      "id": "praise-6",
      "title": "Seven-step autonomous permission check",
      "description": "The permission flow (enabled → authorized → capability → tool → budget → confirmation) is well-structured with clear short-circuit semantics and full audit logging at every step."
    }
  ],
  "speculation": [
    {
      "id": "spec-1",
      "title": "In-memory stores won't survive horizontal scaling",
      "description": "CompoundLearningEngine, ScheduleStore, AutonomousEngine audit log, and agent rate limiter all use process-local Maps. In a multi-replica deployment, each instance has independent state. This is fine for MVP/Phase 2, but should be noted as a Phase 3 concern."
    }
  ],
  "summary": {
    "total_findings": 11,
    "high": 2,
    "medium": 9,
    "low": 0,
    "praise": 6,
    "speculation": 1,
    "improvement_score": 0.72
  }
}
```
<!-- bridge-findings-end -->

---

## Closing Reflection

The two HIGH findings (TBA cache bypass and unauthenticated callback) are the kind of issues that feel obvious in retrospect but emerge from a subtle interaction between caching semantics and authentication semantics. The MEDIUM findings cluster around two patterns: (1) unbounded in-memory stores and (2) missing ownership verification on read endpoints. Both are systematic — fixing the pattern once provides a template for all instances.

The praise items are genuine. This codebase exhibits architectural intentionality that's rare in BFF layers — the constitutional middleware ordering, the consistent graceful degradation, the generic projection cache pattern. Phase 2 isn't just features bolted onto Phase 1; it's a coherent extension of the governance philosophy.

**Improvement score**: 0.72 (significant room for security hardening; architectural quality is strong)
