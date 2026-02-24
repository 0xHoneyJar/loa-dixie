# Bridgebuilder Review: Hounfour v7.9.2 Full Adoption (Cycle-003)

**Bridge ID**: `bridge-20260223-hounfour-l4`
**Iteration**: 1
**Date**: 2026-02-23
**Scope**: 4 sprints (aab4a3d..222c52e), 15 files, +852 / -181 lines in `app/src/`
**Reviewer**: Bridgebuilder (Opus 4.6)

---

## Stream 1: Architectural Insights

### The Big Picture

This cycle completes a four-level protocol adoption journey that began at Sprint 13 (Level 1: type imports) and culminates here at Level 4 (Civilizational: E2E conformance). The work is structurally disciplined -- each sprint builds precisely on the previous one's foundation, and the dependency graph between changes is clean. There is no speculative code; everything that was added either replaces a hand-rolled implementation with a hounfour delegation, or provides new functionality that the protocol layer enables.

The overall design philosophy is **delegation over duplication**: rather than maintaining parallel implementations of access control, economic arithmetic, and state machine validation, Dixie now delegates these concerns to hounfour while maintaining a thin translation layer for backward compatibility. This is the correct architecture for a BFF that sits between protocol-level truth and application-level concerns.

### Sprint 1: Type Foundation & Validator Migration

The most delicate work in the cycle. Memory-auth migrated from `toLowerCase()` wallet comparison to hounfour's `checksumAddress()`, and sealing policy validation moved from a hand-rolled if-chain to hounfour's compiled TypeBox validators.

The `checksumAddress` migration is the kind of change that looks trivial but has deep security implications. EIP-55 checksum comparison is the canonical way to compare Ethereum addresses; case-insensitive comparison can theoretically produce false matches on adversarial inputs where mixed-case encoding hides ambiguity. The migration is correct and important.

The access-policy-validator refactoring (`app/src/services/access-policy-validator.ts`) deserves recognition for its two-phase approach: TypeBox schema validation first (structural), then hounfour's cross-field validator (semantic). This is the correct layering -- structural validation catches garbage early and cheaply, while semantic validation catches invariant violations that a schema alone cannot express.

### Sprint 2: Access Control & Economic Arithmetic

This is the densest sprint in terms of correctness-critical code. Two major migrations:

**evaluateAccessPolicy integration** (`memory-auth.ts`): The old `checkAccessPolicy` switch statement was replaced with delegation to hounfour's `evaluateAccessPolicy`, wrapped in a `translateReason` function that preserves backward-compatible reason codes. This is a textbook "Strangler Fig" migration pattern -- the new engine does the work, but the API surface is preserved through a translation layer.

The `translateReason` function deserves scrutiny. It matches on substring presence in hounfour's reason strings (`hounfourReason.includes('not permitted under read_only')`). This is fragile by nature -- if hounfour changes its reason string wording, the translation silently falls through to `'unknown_access_policy_type'`. The code is aware of this risk (it has a catch-all), but the failure mode is degraded rather than catastrophic: consumers get a generic denial code rather than a specific one. This is an acceptable trade-off for a migration, but should be hardened in a future sprint.

**BigInt economic migration** (`types/economic.ts`): The move from `number`-based pricing to BigInt-safe strings via hounfour's `computeCostMicro` is well-executed. The `computeCost` facade preserving the `number` return type while delegating to `computeCostBigInt` internally is clean backward compatibility. The model pricing table moved from an array (linear scan with sort) to a `Map` (O(1) lookup + prefix fallback), which is both a correctness improvement (deterministic longest-prefix) and a performance improvement.

### Sprint 3: Economic Boundary & Reputation Foundation

The conviction-boundary module (`conviction-boundary.ts`) is architecturally the most interesting piece. It maps Dixie's 5-tier conviction model to hounfour's trust/capital snapshot model, creating a bridge between two different governance abstractions. The tier-to-trust-profile mapping table (`TIER_TRUST_PROFILES`) is the Rosetta Stone of this integration -- it encodes the Ostrom-inspired graduated sanctions model into hounfour's 4-state reputation engine.

The `buildConvictionDenialResponse` function implements "denial as feedback" -- 403 responses that include denial codes and evaluation gaps. This is an excellent pattern for Web4 protocols where denials should be actionable, not opaque. The function is used consistently across all routes that gate on conviction tier.

The reputation-service (`reputation-service.ts`) is explicitly labeled as "foundation wiring -- not yet called from routes." This is honest and correct. The service wraps hounfour governance functions with typed Dixie methods, creating a service surface that future sprints can integrate. All methods are synchronous and pure, which means the integration risk at wire-up time will be minimal.

### Sprint 4: Conformance Suite

The conformance suite (`conformance-suite.ts`) is the Level 4 gate. It validates sample payloads against hounfour schemas to prove that Dixie's data shapes conform to the protocol specification. The approach of testing against canonical sample payloads rather than runtime traffic is pragmatic -- it validates the type layer without requiring a running system.

The `getSamplePayloads` function is comprehensive: it covers all AccessPolicy variants (role_based, time_limited, none) and ConversationSealingPolicy variants (with and without encryption). The `satisfies` operator usage on payload literals provides compile-time assurance that the samples are valid TypeScript, while the runtime validation proves they conform to the hounfour schema.

---

### Cross-Cutting Concerns

**Double Serialization in finn-client.ts**: The request body is serialized twice -- once for `computeReqHash` (`JSON.stringify(opts.body)`) and once for `fetch` (`JSON.stringify(opts.body)`). This is wasteful but not incorrect. The hash computation needs the exact bytes that will be sent, and the two serializations are deterministic for the same input, so correctness is preserved. A future optimization could serialize once and pass the string to both consumers.

**Time-Limited Policy Legacy Bridge**: The `expires_at` to `policy_created_at + duration_hours` conversion in `memory-auth.ts` (lines 137-151) uses epoch (1970-01-01) as a synthetic creation time and computes `duration_hours = expiresMs / 3600_000`. This is mathematically correct but semantically surprising -- a policy created "at epoch" with a duration of millions of hours. It works because hounfour only checks `policy_created_at + duration_hours > now`, and the arithmetic preserves the original `expires_at` semantics. But it mutates the policy object in-place (`policyRecord.duration_hours = ...`), which could surprise callers who hold a reference to the original policy.

**State Machine Naming Divergence**: The `types.ts` type audit table documents the `half-open` vs `half_open` naming divergence between Dixie and hounfour. The mapping advice (`dixieState === 'half-open' ? 'half_open' : dixieState`) is correct but lives only in a comment. The state-machine module uses hounfour's `HounfourCircuitState` (snake_case), while the FinnClient uses Dixie's `CircuitState` (kebab-case). This dual-type situation is explicitly documented and intentional, but it means there's a runtime boundary where one type must be mapped to the other. I don't see that mapping code -- it should exist wherever Dixie reports circuit state to protocol-level consumers.

---

## Stream 2: Findings

<!-- bridge-findings-start -->
{
  "schema_version": 1,
  "bridge_id": "bridge-20260223-hounfour-l4",
  "iteration": 1,
  "findings": [
    {
      "id": "high-1",
      "title": "In-place mutation of AccessPolicy object in time_limited legacy bridge",
      "severity": "HIGH",
      "category": "correctness",
      "file": "app/src/services/memory-auth.ts:147-149",
      "description": "The time_limited legacy bridge mutates the `accessPolicy` parameter in-place by assigning `policyRecord.duration_hours`. The `accessPolicy` parameter comes from the caller and is typed as `AccessPolicy`, but it is cast to `Record<string, unknown>` and then mutated. If the caller holds a reference to this object and inspects it after the call, it will see a `duration_hours` field that was not originally present. More critically, if `authorizeMemoryAccess` is called multiple times with the same policy object (e.g., checking access for multiple wallets), the mutation from the first call persists, which is correct behavior -- but only by accident. If hounfour's `evaluateAccessPolicy` ever reads `duration_hours` differently on a pre-mutated object, the second call could produce a different result than the first.",
      "suggestion": "Create a shallow copy of the policy before mutation: `const policyRecord = { ...accessPolicy } as Record<string, unknown>;` and pass the copy to `evaluateAccessPolicy`. This isolates the legacy bridge transformation from the caller's reference.",
      "faang_parallel": "Google's Protobuf design principle: messages passed to functions should be treated as immutable unless explicitly documented otherwise. Defensive copying at API boundaries prevents action-at-a-distance bugs.",
      "teachable_moment": "In-place mutation of function parameters is a category of bug that is invisible in unit tests (which typically create fresh objects per test case) but surfaces in integration tests or production where objects are reused. The fix is trivially cheap (one spread operator) and eliminates an entire category of potential bugs."
    },
    {
      "id": "high-2",
      "title": "checksumAddress called on potentially invalid/empty wallet strings without guard",
      "severity": "HIGH",
      "category": "security",
      "file": "app/src/services/memory-auth.ts:77-83",
      "description": "The `ownerWallet` falsy guard (line 77) prevents calling `checksumAddress` on an empty owner wallet. However, the `wallet` parameter itself has no guard. If `wallet` is an empty string, `checksumAddress('')` will be called, and the behavior depends on hounfour's implementation -- it may throw, return an invalid checksum, or silently pass. Similarly, `delegatedWallets` entries (line 83) are checksummed without validation. An array containing empty strings or non-hex values would be passed to `checksumAddress` without protection.",
      "suggestion": "Add an early guard: `if (!wallet) return { allowed: false, reason: 'missing_wallet' };` at the top of `authorizeMemoryAccess`. For delegated wallets, either pre-filter empty/invalid entries or wrap `checksumAddress(d)` in a try-catch that skips invalid entries.",
      "faang_parallel": "AWS IAM's policy evaluator rejects requests with missing principal identifiers before evaluating any policy rules. Fail-fast on invalid identity is a defense-in-depth pattern.",
      "teachable_moment": "Wallet addresses from HTTP headers can be empty strings, undefined, or garbage. Every function that operates on wallet addresses should validate format before calling cryptographic utilities that assume well-formed input."
    },
    {
      "id": "medium-1",
      "title": "translateReason uses fragile substring matching on hounfour reason strings",
      "severity": "MEDIUM",
      "category": "resilience",
      "file": "app/src/services/memory-auth.ts:38-53",
      "description": "The `translateReason` function matches hounfour's reason strings using `includes()` substring checks (e.g., `hounfourReason.includes('not permitted under read_only')`). If hounfour changes the wording of these strings in a patch release, the translation will silently fall through to `'unknown_access_policy_type'` for denial cases or pass through the raw hounfour reason for allowed cases. This is a coupling to an unstable API surface (human-readable reason strings are not typically part of a library's semantic versioning contract).",
      "suggestion": "Two options: (1) If hounfour exposes structured denial codes (e.g., an enum or code field on the result), prefer matching on those. (2) If not, add a unit test that exercises each translation path against the actual hounfour library to catch breakage on version bumps. Additionally, consider logging the raw hounfour reason when the fallback path is taken, so the translation gap is observable.",
      "faang_parallel": "Netflix's Zuul gateway uses structured error codes for upstream service failures, not string matching. When migrating from string matching to structured codes, the intermediate step is always: match on strings, but add observability for the fallback path.",
      "teachable_moment": "String-based API contracts are implicit and fragile. When you must match on strings, treat the fallback path as a first-class concern: log it, alert on it, test against it. The goal is to ensure that when the string changes, you learn about it in CI, not in production."
    },
    {
      "id": "medium-2",
      "title": "Agent route cost computation uses hardcoded magic numbers instead of BigInt pricing",
      "severity": "MEDIUM",
      "category": "correctness",
      "file": "app/src/routes/agent.ts:162-163,204-206",
      "description": "The agent route computes costs using hardcoded floating-point arithmetic: `Math.ceil((200 * 0.003 + 400 * 0.015) * 1000)` for the pre-flight estimate (line 162) and `Math.ceil((finnResponse.input_tokens * 0.003 + finnResponse.output_tokens * 0.015) * 1000)` for the actual cost (line 204-206). Meanwhile, Sprint 2 migrated all economic arithmetic to BigInt-safe computation via `computeCostBigInt`. The agent route was not updated to use the new pricing infrastructure, creating a correctness divergence: the `/query` endpoint computes costs differently from the stream enricher's economic metadata.",
      "suggestion": "Replace the hardcoded cost computation with: `import { computeCost } from '../types/economic.js'; const costMicroUsd = computeCost(finnResponse.model, finnResponse.input_tokens, finnResponse.output_tokens);` For the pre-flight estimate, use the same function with estimated token counts. This ensures all cost computation flows through the same BigInt-safe path.",
      "faang_parallel": "Stripe's billing system requires all monetary computation to flow through a single canonical arithmetic library. Parallel computation paths with different rounding behavior cause billing disputes.",
      "teachable_moment": "When migrating arithmetic to a new precision model (float to BigInt), the most dangerous state is 'partial migration' -- where some paths use the old arithmetic and some use the new. The divergence is usually invisible until the amounts are large enough for rounding differences to matter. A grep for the old arithmetic patterns after migration is essential."
    },
    {
      "id": "medium-3",
      "title": "Double JSON.stringify in finn-client request path",
      "severity": "MEDIUM",
      "category": "performance",
      "file": "app/src/proxy/finn-client.ts:91-92,110",
      "description": "When a mutation request has a body, `JSON.stringify(opts.body)` is called at line 91 for the request hash computation, and then again at line 110 for the actual fetch body. For large request payloads (e.g., agent queries with conversation history), this doubles the serialization cost. Both serializations produce identical output since `JSON.stringify` is deterministic for the same input, so only one is needed.",
      "suggestion": "Serialize once and reuse: `const bodyString = JSON.stringify(opts.body);` is already computed at line 91. Pass `bodyString` directly to fetch: `body: isMutation ? bodyString : (opts?.body ? JSON.stringify(opts.body) : undefined)`. Or more cleanly, serialize unconditionally at the top and use the string for both purposes.",
      "faang_parallel": "Google's gRPC library serializes protocol buffers once and reuses the byte buffer for both integrity (checksums) and transport. This is standard practice in high-throughput RPC frameworks.",
      "teachable_moment": "JSON.stringify is deceptively expensive -- it walks the entire object graph, allocates strings, and handles edge cases (circular references, toJSON methods, etc.). For request-path code that runs on every API call, eliminating redundant serializations is a measurable improvement under load."
    },
    {
      "id": "medium-4",
      "title": "Conformance suite only validates sample payloads, not runtime coverage",
      "severity": "MEDIUM",
      "category": "protocol",
      "file": "app/src/services/conformance-suite.ts:115-177",
      "description": "The conformance suite validates hardcoded sample payloads against hounfour schemas. This proves that Dixie's *intended* data shapes conform, but does not validate that *actual runtime* payloads conform. If a route handler constructs an AccessPolicy with a typo in a field name or a new developer adds a policy type without updating the samples, the conformance suite will still pass. This is a 'testing the test data' problem -- the samples are valid by construction (they use `satisfies AccessPolicy`), so the schema validation is largely redundant with the TypeScript compiler.",
      "suggestion": "Consider adding a runtime validation mode: a middleware or hook that validates actual payloads in development/staging. The conformance suite is valuable for CI (proving schema compatibility), but runtime validation catches drift that compile-time checks cannot. Even a sampling approach (validate 1% of production payloads) would catch drift early.",
      "teachable_moment": "There are two kinds of conformance testing: 'sample conformance' (do our canonical examples pass?) and 'runtime conformance' (do our actual outputs pass?). Both are valuable, but they catch different failure modes. Sample conformance is necessary but not sufficient for Level 4 maturity."
    },
    {
      "id": "medium-5",
      "title": "Missing guard for ownerWallet empty string vs undefined in memory-auth",
      "severity": "MEDIUM",
      "category": "correctness",
      "file": "app/src/services/memory-auth.ts:77",
      "description": "The guard `if (ownerWallet && ...)` catches `undefined`, `null`, and empty string `''`. However, a wallet address of `'0x0'` or `'0x0000000000000000000000000000000000000000'` (the zero address) would pass this guard and be checksummed. If a soul memory record has the zero address as its owner (which could happen through data migration artifacts or incomplete initialization), the owner check would succeed for any wallet that also checksums to the zero address. The zero address is a well-known Ethereum burn address and should never be treated as a valid owner.",
      "suggestion": "Add a zero-address guard: `const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'; if (ownerWallet && checksumAddress(ownerWallet) !== checksumAddress(ZERO_ADDRESS)) {`. Alternatively, if hounfour provides a `isValidAddress` utility, use that.",
      "faang_parallel": "OpenZeppelin's Solidity library guards against the zero address in every ownership transfer function. The zero address is a well-known footgun in Ethereum development -- it's syntactically valid but semantically means 'nobody.'",
      "teachable_moment": "The zero address is the Ethereum equivalent of NULL in SQL -- it's a valid value that represents absence. Functions that compare wallet addresses for ownership should always exclude the zero address, because 'owned by nobody' should never grant access."
    },
    {
      "id": "medium-6",
      "title": "conviction-boundary creates new Date objects in hot path for every evaluation",
      "severity": "MEDIUM",
      "category": "performance",
      "file": "app/src/services/conviction-boundary.ts:79,85-86,92",
      "description": "The `evaluateEconomicBoundaryForWallet` function creates 3 `new Date()` instances per call (lines 79, 85-86, 92) plus an ISO string serialization for each. Date construction and ISO serialization are not free operations -- each involves system clock reads and string allocation. In a hot path (every authenticated request that checks conviction tier), this is unnecessary overhead. The three timestamps will differ by microseconds at most.",
      "suggestion": "Compute the timestamp once at the top of the function: `const now = new Date(); const nowIso = now.toISOString();` and reuse `nowIso` for all three snapshot timestamps. For `budget_period_end`, compute from `now.getTime()` instead of `Date.now()`.",
      "teachable_moment": "Date construction in JavaScript reads the system clock, which involves a kernel syscall on some platforms. In hot paths, creating dates once and reusing them is a micro-optimization that adds up under load. The general principle: 'compute once, reference many' applies to any impure function call in a hot loop."
    },
    {
      "id": "low-1",
      "title": "CircuitState dual-type mapping not implemented",
      "severity": "LOW",
      "category": "protocol",
      "file": "app/src/types.ts:117-120",
      "description": "The type audit table in `types.ts` documents the naming divergence between Dixie's `CircuitState` ('half-open') and hounfour's `CircuitState` ('half_open') and provides a mapping formula in a comment (line 118). However, no actual mapping function exists in the codebase. The `state-machine.ts` module defines `CircuitStateMachine` using hounfour's `HounfourCircuitState`, while `finn-client.ts` uses Dixie's `CircuitState`. When Dixie eventually needs to report circuit state to a hounfour-consuming service (e.g., in health responses or protocol-level telemetry), the mapping will be needed.",
      "suggestion": "Add a mapping utility in `types.ts` or `state-machine.ts`: `export function toProtocolCircuitState(dixie: CircuitState): HounfourCircuitState { return dixie === 'half-open' ? 'half_open' : dixie; }` Even if unused today, having the mapping in place prevents the 'I forgot about the naming divergence' bug when the integration point arrives.",
      "teachable_moment": "When you document a type divergence in comments but don't provide the mapping code, you're creating a deferred bug. Future developers will see the hounfour type, assume Dixie's type is compatible, and introduce a subtle mismatch. The mapping function is cheap insurance."
    },
    {
      "id": "low-2",
      "title": "ReputationService is a stateless class wrapping pure functions -- could be a module",
      "severity": "LOW",
      "category": "architecture",
      "file": "app/src/services/reputation-service.ts:52-157",
      "description": "The `ReputationService` class has no instance state, no constructor parameters, and all methods are pure function delegations to hounfour. A class with no state and no dependencies is functionally equivalent to a module of exported functions. The class form adds ceremonial overhead (instantiation, method binding for callbacks) without providing any of the benefits that classes are designed for (encapsulation, state management, polymorphism).",
      "suggestion": "This is explicitly labeled as 'foundation wiring' for a future sprint that will add PostgreSQL persistence. If the plan is to add a database connection as a constructor parameter, the class form is forward-looking and correct. If not, consider refactoring to plain function exports. No action needed now -- this is a design intent question.",
      "faang_parallel": "Google's Go codebase prefers package-level functions over methods on empty structs. The test for 'should this be a class?' is: does it hold state or need polymorphism? If neither, plain functions are simpler.",
      "teachable_moment": "Classes without state are a code smell in most languages, but they're sometimes used as 'service placeholders' that will gain state later. The key is to document the intent explicitly, which this code does ('foundation wiring'). Without that documentation, a future developer would reasonably refactor to plain functions."
    },
    {
      "id": "low-3",
      "title": "access-policy-validator throws a plain object, not an Error",
      "severity": "LOW",
      "category": "resilience",
      "file": "app/src/services/access-policy-validator.ts:59-66",
      "description": "The `assertValidAccessPolicy` function throws a plain object `{ status: 400, body: { ... } }` rather than an Error instance. While this matches the BffError pattern used in finn-client.ts, it means that error monitoring tools (Sentry, Datadog) that inspect `Error.stack` for stack traces will not capture useful debugging information. The thrown object will appear as '[object Object]' in generic catch handlers that call `String(err)` or `err.message`.",
      "suggestion": "This is consistent with the codebase's existing BffError pattern (finn-client also throws plain objects). If the BffError pattern is intentional (it matches Hono's error handling expectations), document it. If not, consider creating a `BffError` class that extends `Error` and carries the status/body fields, giving you both stack traces and structured error data.",
      "teachable_moment": "There's a tension between structured error objects (good for HTTP error mapping) and Error instances (good for stack traces and monitoring). The resolution is usually a custom Error class that carries both. But consistency within a codebase is more important than theoretical purity -- if the whole codebase throws plain objects, switching one function creates inconsistency."
    },
    {
      "id": "low-4",
      "title": "Hardcoded budget_period_end of 30 days in conviction-boundary",
      "severity": "LOW",
      "category": "correctness",
      "file": "app/src/services/conviction-boundary.ts:85",
      "description": "The `capitalSnapshot.budget_period_end` is hardcoded to 30 days from now. This is a reasonable default, but it's not configurable and doesn't align with any documented budget period. If the actual budget period is different (e.g., monthly billing cycles that reset on calendar month boundaries, or weekly budgets for lower tiers), the economic boundary evaluation will use incorrect period information.",
      "suggestion": "Make the budget period configurable, either as a parameter to `evaluateEconomicBoundaryForWallet` or as a constant that can be overridden. Document the 30-day assumption in the function's JSDoc.",
      "teachable_moment": "Magic numbers in business logic are debt that compounds. '30 days' means different things in different contexts: is it 30 calendar days? 720 hours? The next billing cycle? Making it explicit (even as a named constant with a comment) prevents future misinterpretation."
    },
    {
      "id": "praise-1",
      "title": "Exemplary type audit table in types.ts",
      "severity": "PRAISE",
      "category": "architecture",
      "file": "app/src/types.ts:7-53",
      "description": "The type audit table at the top of `types.ts` is one of the best pieces of architectural documentation I've seen in a review. It maps every Dixie type to its hounfour equivalent (or explicitly marks it as Dixie-specific), tracks the import barrel for each hounfour import across the entire codebase, and documents the one naming divergence with a footnote explaining the rationale. This table is a living import map that makes it trivial to answer 'where does Dixie use hounfour?' and 'what Dixie types have protocol equivalents?' This is the kind of documentation that prevents architecture drift.",
      "faang_parallel": "Google's C++ style guide recommends 'type correspondence tables' when wrapping external libraries. This table serves the same purpose: it makes the boundary between Dixie's types and hounfour's protocol types explicit and auditable.",
      "teachable_moment": "Type audit tables are underused in TypeScript codebases. When adopting an external type system, a table that maps your types to theirs (including 'no equivalent' entries) is invaluable for onboarding, auditing, and migration planning."
    },
    {
      "id": "praise-2",
      "title": "Strangler Fig migration pattern in memory-auth evaluateAccessPolicy",
      "severity": "PRAISE",
      "category": "architecture",
      "file": "app/src/services/memory-auth.ts:32-53,88-159",
      "description": "The migration from hand-rolled `checkAccessPolicy` to hounfour's `evaluateAccessPolicy` follows the Strangler Fig pattern precisely: the new engine does all the work, but the `translateReason` function preserves the exact same API surface (reason codes) that existing consumers depend on. The role_based path retains Dixie-specific pre-checks (empty roles array, missing caller roles) before delegating to hounfour, which means Dixie's stricter invariants are preserved while gaining hounfour's richer evaluation engine. This is how you migrate access control: preserve the contract, replace the engine.",
      "faang_parallel": "Amazon's migration from their legacy authorization system to Cedar followed the same pattern: new engine evaluates, translation layer preserves the old API surface, rollout is gradual. The key insight is that access control migrations must be invisible to callers.",
      "teachable_moment": "The Strangler Fig pattern works especially well for authorization code because the contract (allowed/denied + reason) is simple and testable. By keeping the old reason codes, existing tests continue to pass without modification -- they're testing the contract, not the implementation."
    },
    {
      "id": "praise-3",
      "title": "Backward-compatible computeCost facade with BigInt internals",
      "severity": "PRAISE",
      "category": "architecture",
      "file": "app/src/types/economic.ts:76-96",
      "description": "The `computeCost` / `computeCostBigInt` layering is an elegant backward-compatible migration. Existing consumers that call `computeCost(model, prompt, completion)` get the same `number` return type they always did, but internally the computation now uses BigInt-safe arithmetic via hounfour. New consumers that need BigInt precision can call `computeCostBigInt` directly. The `Number()` conversion is safe because the doc correctly notes the threshold (~$9 trillion in micro-USD) is astronomically above any practical cost.",
      "teachable_moment": "When migrating numeric precision (float to BigInt, 32-bit to 64-bit), the facade pattern lets you upgrade internals without breaking callers. The key is documenting the safety threshold -- the point at which the facade's narrower type (number) would lose precision."
    },
    {
      "id": "praise-4",
      "title": "Denial-as-feedback pattern in conviction-boundary",
      "severity": "PRAISE",
      "category": "protocol",
      "file": "app/src/services/conviction-boundary.ts:117-156",
      "description": "The `buildConvictionDenialResponse` function returns structured denial responses that include `denial_codes` and `evaluation_gap`. This transforms a 403 from a dead end into actionable feedback: the client learns not just that they were denied, but exactly what they're missing (trust score gap, reputation state gap) and by how much. This is consistently used across all conviction-gated routes (agent, autonomous, schedule). The pattern embodies the hounfour v7.9.1 Q4 philosophy: 'denial as feedback, not death.'",
      "faang_parallel": "Stripe's API returns structured decline codes with 'next steps' for payment failures. The principle is the same: a denial response should tell the caller what to do differently, not just 'no.'",
      "teachable_moment": "In access control systems, the denial response is as important as the grant response. A 403 with a denial code and a gap metric lets clients build UI that says 'You need 200 more BGT staked to access this feature' instead of 'Access denied.' This is the difference between a wall and a staircase."
    },
    {
      "id": "praise-5",
      "title": "Request integrity via computeReqHash + deriveIdempotencyKey",
      "severity": "PRAISE",
      "category": "security",
      "file": "app/src/proxy/finn-client.ts:87-99",
      "description": "The finn-client now computes request hashes and derives idempotency keys for all mutation methods (POST/PUT/PATCH) using hounfour's integrity functions. The idempotency key incorporates tenant identity (nftId), request hash, provider, and path -- making it deterministic for identical requests but unique across different tenants and endpoints. This provides both integrity verification (loa-finn can verify the request wasn't tampered with) and idempotency (retried requests with the same key won't be processed twice). The implementation is clean: only mutation methods get integrity headers, and the headers are spread into the existing headers object without disrupting other headers.",
      "faang_parallel": "AWS API Gateway uses HMAC-signed request hashes for request integrity, and all AWS APIs support idempotency keys for mutations. The combination of both is defense-in-depth for distributed systems.",
      "teachable_moment": "Idempotency keys should be derived from the request content (not random UUIDs) when you want natural deduplication: the same request from the same tenant to the same endpoint always produces the same key. This means network retries are automatically deduplicated without client-side state."
    },
    {
      "id": "speculation-1",
      "title": "Runtime conformance middleware for Level 5 maturity",
      "severity": "SPECULATION",
      "category": "protocol",
      "file": "app/src/services/conformance-suite.ts:185-204",
      "description": "The conformance suite validates sample payloads in CI, achieving Level 4 (Civilizational) maturity. A natural next step would be Level 5: runtime conformance. A Hono middleware that validates outgoing response bodies against hounfour schemas (in development/staging, not production) would catch drift between what the code produces and what the protocol requires. This could be implemented as a sampling middleware that validates a configurable percentage of responses, with violations logged to the signal emitter for observability.",
      "suggestion": "Consider a future sprint that adds: `createConformanceMiddleware({ sampleRate: 0.01, schemas: [...], onViolation: 'log' })` that wraps response bodies with schema validation. In production, set sampleRate to 0.001; in staging, set to 1.0. Violations feed into the existing NATS signal pipeline for alerting."
    }
  ]
}
<!-- bridge-findings-end -->

---

## Summary

| Severity | Count | Action |
|----------|-------|--------|
| HIGH     | 2     | Must fix before merge |
| MEDIUM   | 6     | Should fix (3 correctness, 1 resilience, 1 performance, 1 protocol) |
| LOW      | 4     | Nice to have |
| PRAISE   | 5     | Celebration |
| SPECULATION | 1  | Future idea |

### Must-Fix Items

1. **high-1**: The in-place mutation of the `accessPolicy` object in the time_limited legacy bridge (`memory-auth.ts:147-149`) should be replaced with a shallow copy. This is a one-line fix (`const policyRecord = { ...accessPolicy } as Record<string, unknown>;`) that eliminates a category of potential bugs.

2. **high-2**: The missing wallet validation guard at the top of `authorizeMemoryAccess` should be added. An empty or invalid wallet string reaching `checksumAddress` is undefined behavior.

### Architectural Assessment

The cycle achieves what it set out to do: Level 4 protocol maturity through systematic delegation to hounfour. The architecture is sound -- Dixie maintains a thin translation/adaptation layer while the protocol library does the heavy lifting. The backward compatibility strategy (facades, reason code translation, dual types with documented divergence) is well-executed.

The one area where the migration is incomplete is the agent route's cost computation (`medium-2`), which still uses hardcoded floating-point arithmetic instead of the BigInt-safe `computeCost` function. This should be addressed before merge to avoid correctness divergence between the agent API's cost reporting and the stream enricher's economic metadata.

Overall: strong engineering with clear intent, good documentation, and appropriate use of established migration patterns. The five PRAISE findings are genuinely earned -- this is careful, thoughtful work.
