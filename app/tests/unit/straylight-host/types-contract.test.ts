// Drift detector for the Dixie-local Straylight recall-host mirror.
//
// This file is NOT a schema authority. Its sole job is to fail loudly if
// the local mirror in `app/src/services/straylight-host/types.ts` drifts
// away from the closed enums and structural shapes the wedge wire contract
// pins. When the follow-up dependency-wiring PR replaces the local mirror
// with `import type { ... } from '@loa/straylight/host'`, this file becomes
// redundant and should be deleted along with the local mirror it guards.

import { describe, expect, it } from 'vitest';
import type {
  DeniedReason,
  EstateSummaryCounts,
  EstateSummaryResponse,
  ExclusionReason,
  HostFrame,
} from '../../../src/services/straylight-host/types.js';

describe('DeniedReason mirror', () => {
  it('exactly matches the Straylight host contract values', () => {
    const expected = [
      'class_validation_failed',
      'policy_unavailable',
      'signer_not_competent',
      'cross_tenant_recall_refused',
      'storage_unavailable',
      'blocked_by_policy',
      'privacy_scope_refusal',
      'frame_unsupported',
      'tenant_resolution_failed',
    ] as const satisfies readonly DeniedReason[];

    // Compile-time guard: any DeniedReason value NOT in `expected` makes
    // _Missing non-never, and the assignment of literal `true` to the
    // resulting `false` type fails to typecheck.
    type _Missing = Exclude<DeniedReason, (typeof expected)[number]>;
    const _noExtras: _Missing extends never ? true : false = true;
    expect(_noExtras).toBe(true);

    expect(expected).toHaveLength(9);
    expect(new Set<string>(expected).size).toBe(9);
  });
});

describe('ExclusionReason mirror', () => {
  it('exactly matches the six receipt categories', () => {
    const expected = [
      'included',
      'excluded',
      'redacted',
      'challenged',
      'revoked',
      'blocked-by-policy',
    ] as const satisfies readonly ExclusionReason[];

    type _Missing = Exclude<ExclusionReason, (typeof expected)[number]>;
    const _noExtras: _Missing extends never ? true : false = true;
    expect(_noExtras).toBe(true);

    expect(expected).toHaveLength(6);
    expect(new Set<string>(expected).size).toBe(6);
  });
});

describe('HostFrame mirror', () => {
  it('is exactly actor_private | public_discord', () => {
    const expected = ['actor_private', 'public_discord'] as const satisfies readonly HostFrame[];

    type _Missing = Exclude<HostFrame, (typeof expected)[number]>;
    const _noExtras: _Missing extends never ? true : false = true;
    expect(_noExtras).toBe(true);

    expect(expected).toHaveLength(2);
  });
});

describe('Surface 6 EstateSummaryCounts shape', () => {
  const counts: EstateSummaryCounts = {
    by_class: {},
    by_status: {},
    by_privacy_scope: { actor_private: 0, public_discord: 0 },
    by_risk_level: {},
    _widened_privacy_scope: {
      public: 0,
      tenant: 0,
      actor_private: 0,
      sealed: 0,
    },
  };

  it('_widened_privacy_scope retains the four-key trace shape', () => {
    const keys = Object.keys(counts._widened_privacy_scope).sort();
    expect(keys).toEqual(['actor_private', 'public', 'sealed', 'tenant']);
  });

  it('by_privacy_scope retains the two-key served shape', () => {
    const keys = Object.keys(counts.by_privacy_scope).sort();
    expect(keys).toEqual(['actor_private', 'public_discord']);
  });

  it('is the counts payload type used by summarized EstateSummaryResponse', () => {
    const response: EstateSummaryResponse = {
      outcome: 'summarized',
      actor_id: 'actor-1',
      estate_id: 'estate-1',
      counts,
    };
    expect(response.outcome).toBe('summarized');
  });
});
