# ADR-003: Span Sanitizer as Privacy Constitution

**Status**: Accepted
**Date**: 2026-02-26
**Source**: Bridgebuilder Deep Review BB-DEEP-06

## Context

The span sanitizer (`app/src/utils/span-sanitizer.ts`) implements a default-deny allowlist architecture for OpenTelemetry span attributes. Every span type has an explicit allowlist — attributes not in the allowlist are silently dropped. Identity-bearing attributes (wallet addresses, operator IDs) are automatically hashed via SHA-256 truncated to 12 characters.

This is not just a security pattern — it is a constitutional pattern. The allowlist declares what the system is permitted to observe about itself. Everything not in the allowlist is constitutionally invisible.

## Decision

### Architecture

1. **Default-deny**: Unknown attributes are stripped, not passed through. New span types start with an empty allowlist.
2. **Per-span-type granularity**: Each of the 6 span types has its own allowlist, reflecting the different privacy requirements of each observability surface.
3. **Identity hashing**: Attributes matching `HASH_FIELDS` are automatically transformed via `hashForSpan()` (SHA-256/12). The raw value never reaches the OTEL exporter.
4. **Error redaction**: Error messages in spans are truncated and sanitized to prevent PII leakage via stack traces.

### Current Allowlists

| Span Type | Allowed Attributes |
|-----------|-------------------|
| `dixie.request` | method, url, status_code, duration_ms |
| `dixie.auth` | auth_type, wallet_hash, tier |
| `dixie.finn.inference` | model, tokens, latency_ms, circuit_state |
| `dixie.reputation.update` | model_id, score, ema_value |
| `dixie.fleet.spawn` | task_type, cost, identity_hash |
| `dixie.governance.check` | resource_type, decision, witness_count, denial_reason |

### Regulatory Parallels

- **GDPR Purpose Limitation (Article 5(1)(b))**: Data collected for observability may only be used for observability. The allowlist enforces purpose limitation at the collection boundary.
- **Stripe PCI Telemetry**: Default-deny attribute allowlists prevent PAN/CVV leakage into observability systems.
- **Ostrom's Principle 4 (Monitoring)**: The system can observe itself, but only within the privacy boundary set by the allowlist.

### Future Governance Target

The allowlists are currently hardcoded constants. When conviction voting (knowledge-priority-store) matures, community members could vote on which attributes are observable — effectively amending the privacy constitution:

- A sovereign-tier holder might vote to make `wallet_hash` observable for accountability
- An observer-tier holder might vote to restrict it

The per-span-type architecture already supports this — the allowlists just need to become configurable rather than hardcoded (e.g., via `.loa.config.yaml` or governance store).

## Consequences

- All OTEL spans go through `startSanitizedSpan()` or `addSanitizedAttributes()` — no raw `span.setAttribute()` calls
- Adding a new attribute to a span requires updating the corresponding allowlist
- The allowlist serves as both security control and documentation of observable surface area
- Future governance integration can make allowlists community-configurable without architectural changes
