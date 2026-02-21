---
generated_date: "2026-02-20"
source_repo: 0xHoneyJar/loa-freeside
provenance: loa-freeside-pr-76
version: "1.0.0"
tags: ["technical", "architectural"]
max_age_days: 60
---

# Freeside API Reference

API surface documented in loa-freeside PR #76 (Neuromancer Codex). Freeside is the infrastructure and billing settlement layer for the 0xHoneyJar ecosystem.

---

## 1. Billing Endpoints

- `POST /api/billing/settle` — Finalize billing for a session (called by loa-finn)
- `GET /api/billing/balance/:wallet` — Get credit balance for a wallet
- `POST /api/billing/purchase` — Purchase credits (on-chain transaction reference)
- `GET /api/billing/lots/:wallet` — List FIFO credit lots

## 2. Discord + Telegram Surfaces

Freeside hosts the bot surfaces that connect to loa-finn:
- Discord: slash commands (`/ask`, `/oracle`, `/status`)
- Telegram: inline commands and group chat integration
- Both surfaces authenticate via service-to-service JWT

## 3. Authentication Flow

Freeside uses JWT-based auth with two flows:
- **User auth**: SIWE → JWT (for web interfaces)
- **Service auth**: Pre-shared S2S JWT (for loa-finn → freeside calls)
- **Bot auth**: Platform-specific tokens (Discord bot token, Telegram bot token)

## 4. Settlement Protocol

When loa-finn completes a session, it sends a settlement request to freeside:
1. `POST /api/billing/settle { session_id, wallet, usage }`
2. Freeside debits credits from FIFO lots
3. Returns settlement confirmation with updated balance
4. Failed settlements enter Dead Letter Queue (DLQ)
