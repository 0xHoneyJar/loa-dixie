# Sprint 13: Hounfour Protocol Alignment — Implementation Report

**Sprint**: sprint-13 (global ID: 13)
**Status**: Complete
**Date**: 2026-02-20
**Source**: Bridgebuilder Part V, S-1 (HIGH); Part VI, Autopoiesis of Protocols

## Summary

Installed `@0xhoneyjar/loa-hounfour` as a dependency and aligned Dixie's type system with the ecosystem's formalized protocol types. The protocol IS the interface contract — adopting Hounfour types ensures mechanical validation when the cross-system E2E validator (Freeside PR #63) arrives.

## Tasks Completed

### 13.1 Install loa-hounfour and audit type overlap

- **Installed**: `@0xhoneyjar/loa-hounfour@7.0.0` via local file reference
- **Type Audit**: Documented in `app/src/types.ts` header comment — comprehensive mapping table:
  - `CircuitState` → Hounfour `CircuitState` (naming divergence: `half-open` vs `half_open`)
  - `ServiceHealth`, `HealthResponse`, `FinnHealthResponse`, `ErrorResponse` → Dixie-specific (no Hounfour equivalent)
  - `AllowlistData` → Hounfour `AccessPolicy` (partial mapping, formalized in 13.3)
  - `OracleIdentity` → Hounfour `AgentIdentity` (subset)
- **No runtime changes** — analysis only
- **TypeScript compiles cleanly**

### 13.2 Replace custom types with Hounfour protocol types

- **Re-exported from types.ts**: `AccessPolicy`, `AgentIdentity`, `HounfourCircuitState` from Hounfour
- **Identity route**: Updated `app/src/routes/identity.ts` — `OracleIdentity` documented as subset of `AgentIdentity`, import added for type reference
- **Retained Dixie-specific types**: `ServiceHealth`, `HealthResponse`, `FinnHealthResponse`, `ErrorResponse`, `CircuitState` — these are BFF-internal concerns, not protocol boundaries
- **All 125 existing tests pass without modification**

### 13.3 Add AccessPolicy type to allowlist architecture

- **AllowlistData**: Added optional `policy` field typed as `AccessPolicy`
- **Default policy**: `{ type: 'role_based', roles: ['team'], audit_required: true, revocable: false }`
- **New methods**: `getPolicy()` and `setPolicy()` on `AllowlistStore`
- **Backward-compatible**: Existing allowlist files without `policy` field continue to work
- **ADR comment**: Explains Phase 1 (role_based), Phase 2 (time_limited for conviction), Phase 3 (per-conversation for soul memory)
- **DECISION comment** added to allowlist.ts referencing communitarian architecture ADR

### 13.4 Add protocol compliance validation

- **New test file**: `app/tests/unit/protocol-compliance.test.ts`
- **10 compliance tests**:
  - AccessPolicy: DEFAULT_ACCESS_POLICY shape, time_limited expressible, none expressible, read_only expressible
  - AgentIdentity: OracleIdentity subset check, type importability
  - CircuitState: mapping between Dixie and Hounfour naming conventions, toHounfour utility
  - AllowlistStore: policy field accepts AccessPolicy, backward-compatibility without policy
- **Test count**: 125 → 135 (all passing)

## Files Changed

| File | Change |
|------|--------|
| `app/package.json` | Added `@0xhoneyjar/loa-hounfour` dependency |
| `app/src/types.ts` | Type audit, Hounfour re-exports, documentation |
| `app/src/routes/identity.ts` | AgentIdentity import, documentation |
| `app/src/middleware/allowlist.ts` | AccessPolicy import, DEFAULT_ACCESS_POLICY, getPolicy/setPolicy |
| `app/tests/unit/protocol-compliance.test.ts` | New: 10 compliance tests |
| `grimoires/loa/ledger.json` | sprint-13 status: planned → in_progress |

## Test Results

```
Test Files  20 passed (20)
     Tests  135 passed (135)
  Duration  3.05s
```

## Architecture Notes

**Naming divergence (CircuitState)**: Dixie uses `half-open` (kebab-case), Hounfour uses `half_open` (snake_case). Decision: retain Dixie's naming for internal BFF concern. When reporting to protocol-level consumers, map via: `s === 'half-open' ? 'half_open' : s`. This is documented in types.ts and tested in protocol-compliance.test.ts.

**AccessPolicy as governance primitive**: The allowlist gate is the first governance layer. AccessPolicy formalizes the progression: Phase 1 (role_based team access) → Phase 2 (time_limited conviction tiers) → Phase 3 (per-conversation soul memory governance). Sprint 17's soul memory architecture maps directly to AccessPolicy variants.

## Acceptance Criteria Verification

- [x] loa-hounfour installed in app/package.json
- [x] Type audit documented in app/src/types.ts
- [x] Hounfour types imported (AccessPolicy, AgentIdentity, CircuitState)
- [x] Custom types retained where no Hounfour equivalent
- [x] AccessPolicy added to AllowlistData (optional, backward-compatible)
- [x] Default policy applied (role_based, team)
- [x] Protocol compliance tests (10 tests)
- [x] All 135 tests pass
- [x] TypeScript compiles cleanly
