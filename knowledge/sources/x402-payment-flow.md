---
generated_date: "2026-02-20"
source_repo: 0xHoneyJar/loa-finn
provenance: loa-finn-pr-82
version: "1.0.0"
tags: ["technical", "architectural"]
max_age_days: 60
---

# x402 Payment Flow

The x402 micropayment protocol enables per-message billing for dNFT agent interactions. Delivered in loa-finn PR #82.

---

## 1. Credit System

Users pre-purchase credits denominated in micro-USD (BigInt arithmetic, 6 decimal places). Credits are stored per-wallet in the billing subsystem.

- **Purchase**: On-chain transaction → credit mint → wallet balance updated
- **Consumption**: Each agent message debits credits based on model cost + tool usage
- **Balance check**: Pre-flight check before each inference call

## 2. FIFO Lot Accounting

Credits are tracked as First-In-First-Out (FIFO) lots. Each purchase creates a new lot with:
- `lot_id`: Unique identifier
- `amount_micro_usd`: BigInt credit amount
- `created_at`: Purchase timestamp
- `expires_at`: Optional expiration
- `remaining`: Current balance

Consumption draws from the oldest unexpired lot first (FIFO). This ensures purchased credits are used before promotional or bonus credits.

## 3. Conservation Invariant

The billing system maintains a strict conservation invariant: `sum(all_lots) == sum(all_debits) + sum(remaining_balances)`. This is verified on every settlement cycle. Violations trigger a DLQ (Dead Letter Queue) entry for manual review.

## 4. Tier-Based Access

Conviction scoring determines tier access:
- **Tier 1** (basic holders): Standard models, rate-limited
- **Tier 2** (active community): Premium models, higher limits
- **Tier 3** (governance participants): All models, priority routing
- **Oracle/Team**: Full access, all models, no rate limits (allowlist-gated)
