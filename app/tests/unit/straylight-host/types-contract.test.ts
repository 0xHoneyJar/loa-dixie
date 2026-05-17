// Slim package-contract tripwires for the Straylight recall-host wire surface.
//
// Type imports are sourced (type-only) from the tag-pinned
// `@loa/straylight/host` package — no runtime import. The job of this file
// is to fail loudly if a future Straylight tag bump silently widens or
// reshapes the closed enums and shapes that Dixie's relay logic depends
// on. Compile-time guards (`Exclude<...> extends never`) catch new values;
// runtime expectations cover cardinality and key-set sanity.

import { describe, expect, it } from 'vitest';
import type {
  DeniedReason,
  EstateSummaryCounts,
  EstateSummaryResponse,
  ExclusionReason,
  HostFrame,
} from '@loa/straylight/host';

describe('@loa/straylight/host — DeniedReason closed vocabulary', () => {
  it('matches the nine pinned values exactly', () => {
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

    type _Missing = Exclude<DeniedReason, (typeof expected)[number]>;
    const _noExtras: _Missing extends never ? true : false = true;
    expect(_noExtras).toBe(true);

    expect(expected).toHaveLength(9);
    expect(new Set<string>(expected).size).toBe(9);
  });
});

describe('@loa/straylight/host — ExclusionReason closed vocabulary', () => {
  it('matches the six receipt categories exactly', () => {
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

describe('@loa/straylight/host — HostFrame supported values', () => {
  it('is exactly actor_private | public_discord', () => {
    const expected = ['actor_private', 'public_discord'] as const satisfies readonly HostFrame[];

    type _Missing = Exclude<HostFrame, (typeof expected)[number]>;
    const _noExtras: _Missing extends never ? true : false = true;
    expect(_noExtras).toBe(true);

    expect(expected).toHaveLength(2);
  });
});

describe('@loa/straylight/host — EstateSummaryCounts shape', () => {
  it('by_privacy_scope retains the two-key served shape', () => {
    type Keys = keyof EstateSummaryCounts['by_privacy_scope'];
    type _Missing = Exclude<Keys, 'actor_private' | 'public_discord'>;
    type _Extras = Exclude<'actor_private' | 'public_discord', Keys>;
    const _noMissing: _Missing extends never ? true : false = true;
    const _noExtras: _Extras extends never ? true : false = true;
    expect(_noMissing).toBe(true);
    expect(_noExtras).toBe(true);
  });

  it('_widened_privacy_scope retains the four-key trace shape', () => {
    type Keys = keyof EstateSummaryCounts['_widened_privacy_scope'];
    type Expected = 'public' | 'tenant' | 'actor_private' | 'sealed';
    type _Missing = Exclude<Keys, Expected>;
    type _Extras = Exclude<Expected, Keys>;
    const _noMissing: _Missing extends never ? true : false = true;
    const _noExtras: _Extras extends never ? true : false = true;
    expect(_noMissing).toBe(true);
    expect(_noExtras).toBe(true);
  });

  it('is the counts payload type used by summarized EstateSummaryResponse', () => {
    type SummarizedCounts = Extract<
      EstateSummaryResponse,
      { outcome: 'summarized' }
    >['counts'];
    type _Same = SummarizedCounts extends EstateSummaryCounts
      ? EstateSummaryCounts extends SummarizedCounts
        ? true
        : false
      : false;
    const _same: _Same = true;
    expect(_same).toBe(true);
  });
});
