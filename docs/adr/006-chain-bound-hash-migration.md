# ADR-006: Chain-Bound Hash Migration Strategy

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-02-28 |
| Context | Sprint 121 (P3 canonical migration) |
| Resolves | T2.5 (DEFERRED from Sprint 117) |

## Context

Dixie and hounfour use **different algorithms** for chain-bound audit entry hashing.
Swapping in-place would invalidate every existing audit chain entry — a data integrity
catastrophe for a governance system where tamper-evidence is foundational.

### Algorithm Divergence

**Dixie (v9 legacy)** — Double-hash via synthetic entry:
1. `contentHash = computeAuditEntryHash(entry, domainTag)`
2. Create synthetic entry: `{ entry_id: contentHash, timestamp: previousHash, event_type: 'chain_binding' }`
3. `chainHash = computeAuditEntryHash(syntheticEntry, domainTag)`

**Hounfour canonical** — Direct concatenation:
1. `contentHash = computeAuditEntryHash(entry, domainTag)`
2. `chainInput = "${contentHash}:${previousHash}"` (UTF-8, colon 0x3A)
3. `chainHash = "sha256:" + hex(sha256(chainInput))`

These produce **different hashes for identical inputs**. Both provide chain integrity
(tampering with `previous_hash` invalidates the entry's hash), but through different
mechanisms.

### Domain Tag Compatibility

Additionally, hounfour's canonical `computeChainBoundHash` validates domain tags via
`validateDomainTag()` which requires segments matching `/^[a-z0-9][a-z0-9_-]*$/`.
Dixie's existing domain tags use dots in the version segment (`9.0.0`), which fails
canonical validation. New entries must use a dot-free version format.

## Decision

Implement **version-aware verification** using the hash domain tag as the algorithm
discriminator, structurally identical to TLS cipher suite negotiation.

### Option A: In-place swap to canonical (rejected)
- Invalidates all existing chain entries
- Requires data migration (re-hash every entry)
- Unacceptable for a governance audit system

### Option B: Version-aware verification (chosen)
- New entries use canonical algorithm with `v10` domain tag format
- Existing entries verified with legacy algorithm (detect dots in version)
- Mixed chains verified entry-by-entry with the algorithm that created each
- Zero data migration, zero chain invalidation

### Option C: Parallel chains (rejected)
- Maintain separate legacy and canonical chains
- Complex, no benefit over version dispatch
- Cross-chain references would be ambiguous

## Implementation

### Domain Tag Format

| Era | Format | Example |
|-----|--------|---------|
| Legacy (v9) | `loa-dixie:audit:{type}:{semver}` | `loa-dixie:audit:reputation:9.0.0` |
| Canonical (v10) | `loa-dixie:audit:{type}:v10` | `loa-dixie:audit:reputation:v10` |

Version detection: if the last segment contains dots → legacy algorithm.

### Verification Dispatch

```
for each entry in chain:
  version = extractVersion(entry.hash_domain_tag)
  if version contains dots (legacy):
    recompute = computeChainBoundHash_v9(entry, domainTag, expectedPrevious)
  else (canonical):
    recompute = canonicalChainBoundHash(entry, domainTag, expectedPrevious)
  verify recompute === entry.entry_hash
```

A single chain may contain entries from both eras. The transition point occurs when
an entry with a v10 domain tag follows an entry with a v9 domain tag. This is safe
because the chain binding uses the *stored hash* of the previous entry (not a
recomputed one), so the algorithm boundary doesn't break the chain.

## Consequences

### Positive
- Zero data migration needed
- Existing chains remain fully verifiable forever
- New entries get canonical algorithm (cross-service compatible)
- Clean version discrimination via domain tag

### Negative
- Must maintain legacy algorithm code indefinitely (frozen, ~15 LOC)
- Verification logic slightly more complex (dispatch per entry)

### FAANG Parallel
This is structurally identical to how TLS handles cipher suite migration — both
endpoints advertise supported algorithms, and verification uses the algorithm that
was negotiated when the data was created. Google's Certificate Transparency logs
face the same constraint: you can't re-hash existing SCTs.
