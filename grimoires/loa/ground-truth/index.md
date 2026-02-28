# Ground Truth Index — loa-dixie

> Generated: 2026-02-28 | Git SHA: 36bcbd09 | Sprint 124 (cycle-020)

## Summary

| Metric | Value |
|--------|-------|
| Source modules (non-test) | 133 |
| Service modules | 66 |
| Middleware modules | 17 |
| Route modules | 16 |
| Type definitions | 16 |
| Database migrations | 16 (003-015, including down migrations) |
| Utility modules | 5 |
| Core modules | 7 (config, errors, index, server, telemetry, validation, ws-upgrade) |

## File Tree

```
app/src/
├── config.ts                     # DixieConfig, loadConfig(), env parsing
├── errors.ts                     # Error types
├── index.ts                      # Entry point: serve(), graceful shutdown
├── server.ts                     # createDixieApp(): middleware pipeline + route wiring
├── telemetry.ts                  # OpenTelemetry SDK init
├── types.ts                      # Shared type definitions
├── validation.ts                 # Input validation utilities
├── ws-upgrade.ts                 # WebSocket upgrade handler
│
├── db/
│   ├── client.ts                 # createDbPool(), DbPool type
│   ├── migrate.ts                # Migration runner
│   ├── pool.ts                   # Pool configuration
│   ├── transaction.ts            # Transaction helpers
│   └── migrations/
│       ├── 003_schedules.sql
│       ├── 004_autonomous_permissions.sql
│       ├── 005_reputation_aggregates.sql
│       ├── 006_reputation_task_cohorts.sql
│       ├── 007_reputation_events.sql
│       ├── 008_mutation_log.sql
│       ├── 009_audit_trail.sql
│       ├── 010_knowledge_freshness.sql
│       ├── 011_dynamic_contracts.sql
│       ├── 012_audit_chain_uniqueness.sql
│       ├── 013_fleet_orchestration.sql (+down)
│       ├── 014_outbox.sql (+down)
│       └── 015_agent_ecology.sql (+down)
│
├── middleware/
│   ├── allowlist.ts              # Position 11: wallet/API-key gate
│   ├── body-limit.ts             # Position 5: payload size limit
│   ├── conformance-middleware.ts  # Conformance signal middleware
│   ├── conviction-tier.ts        # Position 13: BGT conviction resolver
│   ├── cors.ts                   # Position 4: CORS
│   ├── economic-metadata.ts      # Position 15: cost tracking
│   ├── fleet-auth.ts             # Fleet-specific auth
│   ├── jwt.ts                    # Position 8: JWT extraction
│   ├── logger.ts                 # Position 7: structured logging
│   ├── memory-context.ts         # Position 14: soul memory injection
│   ├── payment.ts                # Position 12: x402 micropayment
│   ├── rate-limit.ts             # Position 10: rate limiting
│   ├── request-id.ts             # Position 1: trace ID generation
│   ├── service-jwt.ts            # Service-to-service JWT
│   ├── tba-auth.ts               # TBA (Token Bound Account) auth
│   ├── tracing.ts                # Position 2: OpenTelemetry spans
│   └── wallet-bridge.ts          # Position 9: wallet header bridge
│
├── proxy/
│   └── finn-client.ts            # FinnClient: HTTP proxy to loa-finn
│
├── routes/
│   ├── admin.ts                  # /api/admin
│   ├── agent.ts                  # /api/agent (TBA-authenticated)
│   ├── auth.ts                   # /api/auth
│   ├── autonomous.ts             # /api/autonomous
│   ├── chat.ts                   # /api/chat
│   ├── enrich.ts                 # /api/enrich
│   ├── fleet.ts                  # /api/fleet (cycle-012+)
│   ├── health.ts                 # /api/health
│   ├── identity.ts               # /api/identity
│   ├── learning.ts               # /api/learning
│   ├── memory.ts                 # /api/memory
│   ├── personality.ts            # /api/personality
│   ├── reputation.ts             # /api/reputation
│   ├── schedule.ts               # /api/schedule
│   ├── sessions.ts               # /api/sessions
│   └── ws-ticket.ts              # /api/ws/ticket
│
├── services/                     # 66 service modules — see Service Catalog
│   ├── access-policy-validator.ts
│   ├── agent-identity-service.ts
│   ├── agent-model-router.ts
│   ├── agent-secret-provider.ts
│   ├── agent-spawner.ts
│   ├── audit-trail-store.ts
│   ├── autonomous-engine.ts
│   ├── bridge-insights.ts
│   ├── circulation-protocol.ts
│   ├── collection-score-aggregator.ts
│   ├── collective-insight-service.ts
│   ├── compound-learning.ts
│   ├── conductor-engine.ts
│   ├── conformance-signal.ts
│   ├── conformance-suite.ts
│   ├── conservation-laws.ts
│   ├── context-enrichment-engine.ts
│   ├── conviction-boundary.ts
│   ├── conviction-resolver.ts
│   ├── corpus-meta.ts
│   ├── cross-governor-event-bus.ts
│   ├── dynamic-contract-store.ts
│   ├── enrichment-client.ts
│   ├── enrichment-service.ts
│   ├── exploration.ts
│   ├── fleet-governor.ts
│   ├── fleet-metrics.ts
│   ├── fleet-monitor.ts
│   ├── fleet-saga.ts
│   ├── freshness-disclaimer.ts
│   ├── governance-errors.ts
│   ├── governance-mutation.ts
│   ├── governed-resource.ts
│   ├── governor-registry.ts
│   ├── knowledge-governor.ts
│   ├── knowledge-priority-store.ts
│   ├── meeting-geometry-router.ts
│   ├── memory-auth.ts
│   ├── memory-store.ts
│   ├── migration-proposal.ts
│   ├── mutation-log-store.ts
│   ├── nft-transfer-handler.ts
│   ├── notification-service.ts
│   ├── outbox-worker.ts
│   ├── personality-cache.ts
│   ├── pg-reputation-store.ts
│   ├── projection-cache.ts
│   ├── protocol-diff-engine.ts
│   ├── protocol-version.ts
│   ├── quality-feedback.ts
│   ├── redis-client.ts
│   ├── reputation-cache.ts
│   ├── reputation-event-store.ts
│   ├── reputation-scoring-engine.ts
│   ├── reputation-service.ts
│   ├── resource-governor.ts
│   ├── retry-engine.ts
│   ├── schedule-store.ts
│   ├── scoring-path-logger.ts
│   ├── scoring-path-tracker.ts
│   ├── signal-emitter.ts
│   ├── sovereignty-engine.ts
│   ├── state-machine.ts
│   ├── stream-enricher.ts
│   ├── task-registry.ts
│   └── ticket-store.ts
│
├── types/
│   ├── agent-api.ts
│   ├── agent-identity.ts
│   ├── autonomous.ts
│   ├── bridge-insights.ts
│   ├── circulation.ts
│   ├── conviction.ts
│   ├── dynamic-contract.ts
│   ├── economic.ts
│   ├── fleet.ts
│   ├── hono-env.ts
│   ├── insight.ts
│   ├── knowledge-governance.ts
│   ├── memory.ts
│   ├── reputation-evolution.ts
│   ├── schedule.ts
│   └── stream-events.ts
│
└── utils/
    ├── crypto.ts
    ├── error-handler.ts
    ├── keyword-extract.ts
    ├── normalize-wallet.ts
    └── span-sanitizer.ts
```

## Checksums

Full SHA256 checksums for all 133 source modules are in `checksums.json` (same directory).

## Verification

```bash
# Verify a single file
sha256sum app/src/server.ts
# Expected: f0e35066a88f785245d9af9dad2d4832ab77b2a5c745a7d5a0d05949beff0425

# Verify all files against checksums.json
python3 -c "
import json, hashlib, sys
with open('grimoires/loa/ground-truth/checksums.json') as f:
    data = json.load(f)
ok, fail = 0, 0
for path, expected in data['files'].items():
    try:
        with open(path, 'rb') as fh:
            actual = hashlib.sha256(fh.read()).hexdigest()
        if actual == expected:
            ok += 1
        else:
            fail += 1
            print(f'MISMATCH: {path}')
    except FileNotFoundError:
        fail += 1
        print(f'MISSING: {path}')
print(f'{ok} OK, {fail} FAILED')
sys.exit(1 if fail else 0)
"
```
