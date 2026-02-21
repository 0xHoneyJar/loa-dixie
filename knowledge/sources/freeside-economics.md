---
generated_date: "2026-02-20"
source_repo: 0xHoneyJar/loa-freeside
provenance: loa-freeside-pr-76
version: "1.0.0"
tags: ["architectural", "philosophical"]
max_age_days: 90
---

# Freeside Economics

Formalization of the 14 Linear Temporal Logic (LTL) conservation properties governing the billing system. From loa-freeside PR #76.

---

## 1. Conservation Properties

The billing system is governed by 14 LTL properties that ensure economic integrity:

1. **Credit conservation**: Total credits minted = total credits consumed + total remaining
2. **Lot ordering**: FIFO consumption order is strictly maintained
3. **Non-negative balances**: No wallet can have negative credit balance
4. **Settlement atomicity**: Each settlement either fully completes or fully rolls back
5. **Expiration monotonicity**: Expired lots are never re-activated
6. **Transfer invariance**: Credit balance is preserved across NFT transfers
7. **Tier monotonicity**: Conviction can only increase tier access (ratchet)
8. **Rate limit conservation**: Consumed rate limit budget = allocated - remaining
9. **DLQ completeness**: Every failed settlement has a DLQ entry
10. **Audit trail**: Every balance change has a corresponding event
11. **Idempotent settlement**: Replaying a settlement request produces the same result
12. **Budget enforcement**: No inference call proceeds without sufficient balance
13. **Cross-service consistency**: loa-finn usage records match freeside settlement records
14. **Temporal ordering**: Events are processed in causal order

## 2. Pricing Model

- **Base cost**: Per-token cost varies by model tier
- **Tool surcharge**: Tool execution adds flat fee per tool call
- **Knowledge enrichment**: Counted as input tokens at base rate
- **Minimum charge**: 1 micro-USD per message (prevents zero-cost abuse)
