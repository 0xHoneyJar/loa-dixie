# ADR: translateReason Sunset Plan

**Status**: Active
**Date**: 2026-02-24
**Sprint**: 6 (Task 6.4)
**Author**: Sprint 6 Implementation

## 1. Why translateReason Exists

The `translateReason` function in `app/src/services/memory-auth.ts` translates
hounfour's `AccessPolicyResult.reason` strings into Dixie's legacy reason codes.

**Root cause**: Hounfour v7.x returns human-readable reason strings from
`evaluateAccessPolicy()`, but Dixie's consumers (tests, frontend, API clients)
depend on machine-readable, stable reason codes like `access_policy_expired`,
`read_only_no_modify`, etc.

The translation layer exists because:
1. Hounfour was adopted incrementally (Strangler Fig pattern from Sprint 1)
2. Dixie's API contract predates hounfour adoption and uses its own reason vocabulary
3. Hounfour's reason strings are human-readable and not contractually stable

## 2. Current State (Sprint 6, hounfour v7.9.2)

### Translation Method
- **Primary**: Substring matching on `AccessPolicyResult.reason` string
- **New (Sprint 6)**: Structured `denial_code` mapping when available (forward-compatible)
- **Fallback**: Logs warning + increments counter when no pattern matches

### Consumer Audit

All code paths that depend on reason string output from `translateReason`:

| File | Usage | Reason Codes Used |
|------|-------|-------------------|
| `app/src/services/memory-auth.ts` | `authorizeMemoryAccess()` return | All codes |
| `app/tests/unit/memory-auth.test.ts` | Test assertions | `access_policy_none`, `read_only_no_modify`, `time_limited_no_modify`, `access_policy_expired`, `role_based_no_roles_provided`, `role_based_insufficient_role`, `access_policy_read_only`, `access_policy_time_limited`, `access_policy_role_based`, `unknown_access_policy_type` |
| `app/src/routes/memory.ts` | Passes through to API response | All denial codes |
| `app/src/middleware/memory-context.ts` | Reads `allowed` boolean only | None directly |

### Reason Code Registry

| Dixie Reason Code | Policy Type | Allowed | Substring Match Pattern |
|---|---|---|---|
| `access_policy_none` | `none` | false | (policy type check) |
| `read_only_no_modify` | `read_only` | false | `not permitted under read_only` |
| `time_limited_no_modify` | `time_limited` | false | `not permitted under time_limited` |
| `access_policy_expired` | `time_limited` | false | `expired` |
| `role_based_no_roles_provided` | `role_based` | false | `No role provided` |
| `role_based_insufficient_role` | `role_based` | false | `not in permitted roles` |
| `access_policy_read_only` | `read_only` | true | (policy type check) |
| `access_policy_time_limited` | `time_limited` | true | (policy type check) |
| `access_policy_role_based` | `role_based` | true | (policy type check) |
| `unknown_access_policy_type` | any | false | (fallback) |

### Pre-translateReason Reason Codes (Dixie-native, not translated)

These are returned BEFORE `translateReason` is called (by `authorizeMemoryAccess` directly):

| Reason Code | Origin |
|---|---|
| `owner` | Owner check |
| `delegated` | Delegated wallet check |
| `delegated_wallets_cannot_modify` | Delegated wallet modify attempt |
| `role_based_no_roles_defined` | Empty roles on policy |
| `role_based_no_roles_provided` | No roles on request |
| `role_based_insufficient_role` | Role mismatch |
| `role_based_no_modify` | Role-based modify attempt |
| `missing_wallet` | Empty wallet input |
| `unknown_access_policy_type` | Unknown policy type |

### Fragility Assessment

The substring matching is fragile because:
1. Hounfour can change reason wording in minor versions
2. No contractual stability guarantee on reason strings
3. Fallback counter (`translateReasonFallbackCount`) exists specifically to detect breakage
4. Each hounfour upgrade requires manual verification of substring patterns

## 3. Target State

### Hounfour Structured Denial Codes (>= v7.10.0)

When hounfour introduces structured `denial_code` on `AccessPolicyResult`:

```typescript
interface AccessPolicyResult {
  allowed: boolean;
  reason: string;
  denial_code?: string;  // New: structured, stable, machine-readable
}
```

Dixie's `translateReason` will:
1. Check for `denial_code` first (structured path)
2. Map via `DENIAL_CODE_MAP` / `ALLOWED_CODE_MAP` (stable, no substring matching)
3. Fall back to substring matching only for hounfour < v7.10.0

### End State

Once all consumers are on hounfour >= v7.10.0:
1. Remove substring matching entirely
2. `translateReason` becomes a simple lookup table
3. Eventually, Dixie reason codes align with hounfour denial codes (no translation needed)

## 4. Sunset Criteria

The substring matching path can be removed when ALL of the following are true:

- [ ] Hounfour >= v7.10.0 ships with `denial_code` on `AccessPolicyResult`
- [ ] Dixie upgrades to hounfour >= v7.10.0
- [ ] `translateReasonFallbackCount` metric shows 0 fallback hits for 30 days
- [ ] All mapped denial codes in `DENIAL_CODE_MAP` have been validated against hounfour's actual codes
- [ ] Integration tests confirm structured codes produce correct Dixie reason codes
- [ ] API consumers have been notified of deprecation (if reason codes change)

### Sunset Timeline (Estimated)

| Phase | When | Action |
|-------|------|--------|
| Phase 1 (current) | Sprint 6 | Add structured code support alongside substring matching |
| Phase 2 | hounfour v7.10.0 release | Validate DENIAL_CODE_MAP against actual codes |
| Phase 3 | +30 days after Phase 2 | Monitor fallback counter, fix any unmapped codes |
| Phase 4 | +60 days after Phase 2 | Remove substring matching, simplify to lookup |
| Phase 5 | Future | Align Dixie reason codes with hounfour denial codes |

## 5. API Version Tracking

### Hounfour Version Compatibility

| Hounfour Version | denial_code Available | Dixie Behavior |
|---|---|---|
| < v7.10.0 (current: v7.9.2) | No | Substring matching only |
| >= v7.10.0 (planned) | Yes | Structured codes preferred, substring fallback |
| >= v7.11.0 (estimated) | Yes, complete | Structured codes only (substring removed) |

### Version Detection

The denial code feature is detected at runtime by checking for the property:
```typescript
const denialCode = (result as Record<string, unknown>).denial_code as string | undefined;
```

No compile-time version check needed - the property is simply absent in older versions.

## 6. Related Documents

- `app/src/services/memory-auth.ts` — Implementation
- `app/tests/unit/memory-auth.test.ts` — Consumer tests
- `grimoires/loa/context/adr-hounfour-alignment.md` — Hounfour protocol alignment ADR
- Hounfour CHANGELOG — Track `denial_code` introduction
