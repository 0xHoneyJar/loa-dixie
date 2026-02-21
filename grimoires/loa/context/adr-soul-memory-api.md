# ADR: Soul Memory API Surface

**Status**: Proposed
**Date**: 2026-02-20
**Sprint**: 17 (Soul Memory Architecture Preparation)
**Architecture**: Event-Sourced Memory (see adr-soul-memory-architecture.md)

## Overview

This document defines the API contract between the web frontend, Dixie BFF, and loa-finn's persistence layer for soul memory operations. All endpoints are wallet-authenticated via JWT and enforce AccessPolicy governance.

---

## Endpoints

### GET /api/memory/:nftId

Retrieve the current memory context for a dNFT. Returns the active memory projection — a summarized view of the agent's accumulated knowledge about the user.

**Auth**: JWT required. Wallet in JWT must match current NFT owner OR hold a role in the active AccessPolicy.

**Request**:
```
GET /api/memory/oracle
Authorization: Bearer <jwt>
```

**Response (200)**:
```json
{
  "nftId": "oracle",
  "owner": "0x1234...abcd",
  "activeContext": {
    "summary": "User is a DeFi researcher interested in governance mechanisms...",
    "keyTopics": ["governance", "tokenomics", "defi"],
    "interactionCount": 47,
    "lastInteraction": "2026-02-19T14:30:00Z"
  },
  "conversationCount": 12,
  "sealedConversationCount": 3,
  "accessPolicy": {
    "type": "read_only",
    "audit_required": true,
    "revocable": true
  }
}
```

**Error Responses**:

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid JWT |
| 403 | Wallet does not own NFT and has no AccessPolicy grant |
| 404 | NFT not found |

**Notes**: The `activeContext.summary` is a compressed representation suitable for LLM context injection. It is regenerated from the event log projection, not stored verbatim.

---

### POST /api/memory/:nftId/seal

Seal a conversation according to ConversationSealingPolicy. Sealing encrypts conversation data and applies the specified access policy. This is the governance action triggered on NFT transfer or manual owner request.

**Auth**: JWT required. Only current NFT owner or system-level transfer handler.

**Request**:
```json
POST /api/memory/oracle/seal
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "conversationId": "conv-abc-123",
  "sealingPolicy": {
    "encryption_scheme": "aes-256-gcm",
    "key_derivation": "hkdf-sha256",
    "key_reference": "kref-2026-02-20-oracle",
    "access_audit": true,
    "access_policy": {
      "type": "time_limited",
      "duration_hours": 720,
      "audit_required": true,
      "revocable": true
    }
  }
}
```

**Response (200)**:
```json
{
  "sealed": true,
  "conversationId": "conv-abc-123",
  "sealedAt": "2026-02-20T10:00:00Z",
  "accessPolicy": {
    "type": "time_limited",
    "duration_hours": 720,
    "expiresAt": "2026-03-22T10:00:00Z"
  }
}
```

**Error Responses**:

| Status | Condition |
|--------|-----------|
| 400 | Invalid ConversationSealingPolicy (fails validateSealingPolicy) |
| 401 | Missing or invalid JWT |
| 403 | Not the NFT owner |
| 404 | Conversation not found |
| 409 | Conversation already sealed |

**Validation**: The request body's `sealingPolicy` is validated using `validateSealingPolicy()` from `@0xhoneyjar/loa-hounfour/core`. Cross-field invariants enforced:
- `encryption_scheme !== 'none'` requires `key_derivation !== 'none'` and `key_reference` present
- `access_policy.type === 'time_limited'` requires `duration_hours`
- `access_policy.type === 'role_based'` requires non-empty `roles` array

---

### GET /api/memory/:nftId/history

Paginated conversation history for a dNFT. Returns conversation metadata (not full message content) for the current owner's sessions. Sealed conversations appear as metadata-only entries.

**Auth**: JWT required. Wallet must own NFT or have AccessPolicy grant.

**Request**:
```
GET /api/memory/oracle/history?page=1&limit=20&status=all
Authorization: Bearer <jwt>
```

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number (1-indexed) |
| limit | number | 20 | Items per page (max 50) |
| status | string | "all" | Filter: "active", "sealed", "all" |

**Response (200)**:
```json
{
  "nftId": "oracle",
  "conversations": [
    {
      "id": "conv-abc-123",
      "title": "Governance mechanisms discussion",
      "status": "active",
      "messageCount": 15,
      "createdAt": "2026-02-18T09:00:00Z",
      "updatedAt": "2026-02-19T14:30:00Z"
    },
    {
      "id": "conv-def-456",
      "title": "[Sealed] Previous owner conversation",
      "status": "sealed",
      "messageCount": null,
      "sealedAt": "2026-02-15T00:00:00Z",
      "accessPolicy": {
        "type": "read_only",
        "audit_required": true
      },
      "createdAt": "2026-02-10T12:00:00Z",
      "updatedAt": "2026-02-14T18:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

**Error Responses**:

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid JWT |
| 403 | No access (not owner, no AccessPolicy grant) |
| 404 | NFT not found |

**Notes**: Sealed conversations expose metadata but not content. If the requester has an AccessPolicy grant with `audit_required: true`, the access event is logged.

---

### DELETE /api/memory/:nftId/:conversationId

Owner-initiated memory deletion. Permanently removes a conversation from the memory event log. This is a destructive operation that cannot be undone.

**Auth**: JWT required. Only current NFT owner (no delegated access).

**Request**:
```
DELETE /api/memory/oracle/conv-abc-123
Authorization: Bearer <jwt>
```

**Response (200)**:
```json
{
  "deleted": true,
  "conversationId": "conv-abc-123",
  "deletedAt": "2026-02-20T10:00:00Z"
}
```

**Error Responses**:

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid JWT |
| 403 | Not the NFT owner (AccessPolicy grants cannot delete) |
| 404 | Conversation not found |
| 409 | Conversation is sealed (must unseal first) |

**Notes**: Deletion appends a `delete` event to the log (the original events are not physically removed, but the projection excludes them). Sealed conversations must be unsealed before deletion, which requires the sealing key.

---

## AccessPolicy Integration

The allowlist middleware already manages per-wallet `AccessPolicy` objects (see `app/src/middleware/allowlist.ts`). Memory API endpoints extend this:

1. **Request arrives** → JWT middleware extracts wallet
2. **Allowlist check** → `hasWallet()` verifies basic access
3. **Ownership check** → NFT owner lookup (via finn or cached)
4. **AccessPolicy check** → If not owner, check if wallet has an AccessPolicy grant for the requested NFT
5. **Policy enforcement**:
   - `none`: 403
   - `read_only`: Allow GET endpoints, deny POST/DELETE
   - `time_limited`: Check `duration_hours` against seal timestamp
   - `role_based`: Check wallet's roles against policy's `roles` array
6. **Audit**: If `audit_required: true`, log the access event

## Rate Limiting

Memory operations are heavier than chat operations due to event log queries and projection updates.

| Endpoint | Rate Limit | Window | Rationale |
|----------|-----------|--------|-----------|
| GET /api/memory/:nftId | 60/min | Per wallet | Context injection happens frequently |
| POST /api/memory/:nftId/seal | 10/min | Per wallet | Sealing involves encryption, infrequent |
| GET /api/memory/:nftId/history | 30/min | Per wallet | Pagination browsing |
| DELETE /api/memory/:nftId/:conversationId | 5/min | Per wallet | Destructive, should be rare |

Rate limiting is enforced at the BFF layer (Dixie) before proxying to finn.

## Dixie BFF Role

Dixie proxies memory requests to loa-finn with the same pattern as chat:

1. Validate JWT locally (HS256 shared secret)
2. Extract wallet from JWT claims
3. Forward to finn with `X-Wallet-Address` header
4. Apply rate limits before forwarding
5. Return response to client

Dixie does NOT store memory data — finn owns persistence. Dixie owns auth validation, rate limiting, and request routing.
