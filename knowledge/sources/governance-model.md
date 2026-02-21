---
generated_date: "2026-02-20"
source_repo: 0xHoneyJar/loa-finn
provenance: loa-finn-pr-82
version: "1.0.0"
tags: ["architectural", "philosophical"]
max_age_days: 90
---

# Governance Model

The governance model combines SIWE authentication, transfer listening, and conviction scoring to create a trust gradient for dNFT agent access. Delivered in loa-finn PR #82.

---

## 1. SIWE Authentication

Sign-In With Ethereum (SIWE) is the primary authentication method:
1. User connects wallet via WalletConnect or browser extension
2. Frontend generates SIWE message with domain, address, nonce, expiry
3. User signs message with private key
4. Backend verifies signature and issues JWT
5. JWT contains wallet address, role, and expiration

## 2. Transfer Listener

A blockchain event listener monitors dNFT transfer events:
- Detects `Transfer(from, to, tokenId)` events on the mibera contract
- Updates identity graph with new owner
- Triggers personality recalibration check (if compound learning enabled)
- Updates conviction scores for both sender and receiver

## 3. Conviction Scoring

Conviction is a composite score measuring community engagement:
- **Holding duration**: Longer holding → higher conviction
- **Governance participation**: Voting, proposals → higher conviction
- **Community activity**: Discord/Telegram engagement → higher conviction
- **Agent interaction frequency**: Regular use → higher conviction

Conviction determines:
- Model tier access (which AI models the user can invoke)
- Rate limits (higher conviction = more generous limits)
- Feature access (advanced tools, longer sessions)

## 4. Role-Based Access

| Role | Source | Access Level |
|------|--------|-------------|
| `anonymous` | No auth | Public endpoints only |
| `holder` | NFT ownership verified | Basic model access |
| `team` | Allowlist (Dixie) | Full Oracle access |
| `admin` | Admin key | Management APIs |
