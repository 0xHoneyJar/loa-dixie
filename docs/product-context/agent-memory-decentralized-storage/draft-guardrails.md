# Draft Guardrails — Dixie Agent Memory + Decentralized Storage

Status: Draft only. Do not implement before @janitooor review.

Allowed during this draft:
- Read docs, API reference, architecture, existing routes/services.
- Generate or update planning artifacts.
- Create GitHub issues.
- Create a draft PR.

Forbidden until @janitooor review:
- No app/src implementation changes.
- No app/src/db migrations.
- No web implementation changes.
- No deploy changes.
- No .claude System Zone edits.
- No package.json or lockfile changes.
- No Hounfour-like schema changes.
- No production behavior enabled.

Cross-repo boundary:
- Dixie owns product/BFF/oracle framing and product-context.
- Finn owns runtime implementation of memory, storage adapters, commitments, identity, audit trails.
- Hounfour owns shared schemas/contracts.
- Freeside owns community-facing product surfaces.
