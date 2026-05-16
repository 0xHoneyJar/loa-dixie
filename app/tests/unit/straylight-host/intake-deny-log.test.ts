import { describe, expect, it } from 'vitest';
import {
  createInMemoryIntakeDenyLog,
  type IntakeDenyEntry,
} from '../../../src/services/straylight-host/intake-deny-log.js';

const FIXED_TS = '2026-05-16T12:00:00.000Z';

function sampleInput(
  overrides: Partial<Omit<IntakeDenyEntry, 'intake_log_entry_id'>> = {},
): Omit<IntakeDenyEntry, 'intake_log_entry_id'> {
  return {
    caller_tenant: 'tenant-A',
    caller_actor_id: 'actor-1',
    reason: 'cross_tenant_recall_refused',
    ts: FIXED_TS,
    ...overrides,
  };
}

describe('createInMemoryIntakeDenyLog — entry id', () => {
  it('produces a content-addressed id with the expected prefix shape', () => {
    const log = createInMemoryIntakeDenyLog();
    const entry = log.append(sampleInput());
    expect(entry.intake_log_entry_id).toMatch(/^idlog_[0-9a-f]{32}$/);
  });

  it('produces deterministic ids across fresh logs for the same content+seq', () => {
    const a = createInMemoryIntakeDenyLog().append(sampleInput());
    const b = createInMemoryIntakeDenyLog().append(sampleInput());
    expect(a.intake_log_entry_id).toBe(b.intake_log_entry_id);
  });

  it('produces different ids when content differs', () => {
    const log = createInMemoryIntakeDenyLog();
    const a = log.append(sampleInput({ caller_actor_id: 'actor-1' }));
    const b = createInMemoryIntakeDenyLog().append(
      sampleInput({ caller_actor_id: 'actor-2' }),
    );
    expect(a.intake_log_entry_id).not.toBe(b.intake_log_entry_id);
  });
});

describe('createInMemoryIntakeDenyLog — list', () => {
  it('returns entries in insertion order', () => {
    const log = createInMemoryIntakeDenyLog();
    const first = log.append(sampleInput({ caller_actor_id: 'actor-1' }));
    const second = log.append(sampleInput({ caller_actor_id: 'actor-2' }));
    const third = log.append(sampleInput({ caller_actor_id: 'actor-3' }));
    expect(log.list()).toEqual([first, second, third]);
  });
});

describe('createInMemoryIntakeDenyLog — listForTenant', () => {
  it('filters entries by caller_tenant', () => {
    const log = createInMemoryIntakeDenyLog();
    const a1 = log.append(sampleInput({ caller_tenant: 'tenant-A', caller_actor_id: 'a-1' }));
    log.append(sampleInput({ caller_tenant: 'tenant-B', caller_actor_id: 'b-1' }));
    const a2 = log.append(sampleInput({ caller_tenant: 'tenant-A', caller_actor_id: 'a-2' }));

    const forA = log.listForTenant('tenant-A');
    expect(forA).toEqual([a1, a2]);
  });

  it('does not leak entries across tenants when appends are interleaved', () => {
    const log = createInMemoryIntakeDenyLog();
    log.append(sampleInput({ caller_tenant: 'tenant-A', caller_actor_id: 'a-1' }));
    log.append(sampleInput({ caller_tenant: 'tenant-B', caller_actor_id: 'b-1' }));
    log.append(sampleInput({ caller_tenant: 'tenant-A', caller_actor_id: 'a-2' }));
    log.append(sampleInput({ caller_tenant: 'tenant-B', caller_actor_id: 'b-2' }));
    log.append(sampleInput({ caller_tenant: 'tenant-A', caller_actor_id: 'a-3' }));

    const forA = log.listForTenant('tenant-A');
    const forB = log.listForTenant('tenant-B');

    expect(forA).toHaveLength(3);
    expect(forB).toHaveLength(2);
    expect(forA.every((e) => e.caller_tenant === 'tenant-A')).toBe(true);
    expect(forB.every((e) => e.caller_tenant === 'tenant-B')).toBe(true);
    expect(forA.map((e) => e.caller_actor_id)).toEqual(['a-1', 'a-2', 'a-3']);
    expect(forB.map((e) => e.caller_actor_id)).toEqual(['b-1', 'b-2']);
  });
});
