---
generated_date: "2026-02-20"
source_repo: 0xHoneyJar/loa-finn
provenance: loa-finn-pr-82
version: "1.0.0"
tags: ["technical", "architectural"]
max_age_days: 60
---

# Identity Graph

The identity graph maps dNFT agents to their on-chain identities, ownership history, and behavioral signals. Delivered in loa-finn PR #82.

---

## 1. Identity Resolution

Each dNFT has a canonical identity composed of:
- `nft_id`: Contract address + token ID
- `owner_address`: Current wallet owner (EIP-55 checksummed)
- `agent_id`: Internal agent identifier in loa-finn
- `damp96_vector`: Personality dimensions
- `beauvoir_hash`: Hash of current personality document

## 2. Signal System

Signals track meaningful interactions and state changes:
- **ownership_transfer**: NFT changed hands (triggers personality recalibration check)
- **session_created**: New conversation started
- **tool_used**: Agent executed a tool during conversation
- **knowledge_accessed**: Specific knowledge sources were retrieved
- **conviction_updated**: User's conviction score changed

## 3. API Surface

loa-finn exposes identity graph endpoints:
- `GET /api/identity/:nftId` — Full identity including dAMP summary
- `GET /api/identity/:nftId/signals` — Recent signals for the agent
- `GET /api/identity/:nftId/damp` — 96-dial personality vector
- `POST /api/identity/:nftId/transfer` — Process ownership transfer event

## 4. Ownership Verification

The identity graph integrates with on-chain state to verify ownership. When a user claims to own a dNFT, the system verifies the `ownerOf(tokenId)` call matches the authenticated wallet address. This is used by Dixie's allowlist as an additional authorization signal in future phases.
