// Host-side intake-deny log — Dixie-local adapter mirror.
//
// The host emits an "intake-deny audit log entry referencing the wedge's
// `recall_denied` event for chain-of-custody". This log is distinct from
// the wedge's per-estate hash-chained AuditLog: it is the host's own
// intake-side trail. It is per-tenant (NOT cross-tenant); cross-estate /
// cross-tenant chain links are forbidden by host invariants.
//
// This in-memory implementation is deliberately minimal: no persistence,
// no hash chain, no signatures. A future durable Dixie BFF will replace it
// with a per-tenant durable store; the public shape stays the same.
//
// Deterministic entry IDs are computed with Node's `crypto.createHash`
// over a canonical JSON serialisation of the entry content. We do NOT
// import Hounfour or Straylight content-id helpers — those dependencies
// are out of scope for this adapter-boundary slice.

import { createHash } from 'node:crypto';

import type { IntakeDenyEntry, IntakeDenyLog } from '@loa/straylight/host';

export type { IntakeDenyEntry, IntakeDenyLog };

const CANONICAL_KEYS = [
  'caller_tenant',
  'caller_actor_id',
  'target_actor_id',
  'target_estate_id',
  'target_receipt_id',
  'target_assertion_id',
  'reason',
  'wedge_audit_event_ref',
  'ts',
  'seq',
] as const;

function deterministicEntryId(content: Record<string, unknown>): string {
  const canonical = JSON.stringify(content, [...CANONICAL_KEYS]);
  const digest = createHash('sha256').update(canonical).digest('hex');
  return `idlog_${digest.slice(0, 32)}`;
}

export function createInMemoryIntakeDenyLog(): IntakeDenyLog {
  const entries: IntakeDenyEntry[] = [];
  return {
    append(input) {
      const id = deterministicEntryId({
        caller_tenant: input.caller_tenant,
        caller_actor_id: input.caller_actor_id,
        target_actor_id: input.target_actor_id ?? null,
        target_estate_id: input.target_estate_id ?? null,
        target_receipt_id: input.target_receipt_id ?? null,
        target_assertion_id: input.target_assertion_id ?? null,
        reason: input.reason,
        wedge_audit_event_ref: input.wedge_audit_event_ref ?? null,
        ts: input.ts,
        seq: entries.length,
      });
      const entry: IntakeDenyEntry = { ...input, intake_log_entry_id: id };
      entries.push(entry);
      return entry;
    },
    list() {
      return entries;
    },
    listForTenant(tenant_id) {
      return entries.filter((e) => e.caller_tenant === tenant_id);
    },
  };
}
