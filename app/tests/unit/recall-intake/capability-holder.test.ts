// ADR-026C §3.3, §3.4, §3.5, §3.7; ADR-026D §4.a, §4.b, §4.c, §4.d.
//
// Capability holder behavior:
//   * missing/empty STRAYLIGHT_RUNTIME_DIXIE_KEY → constructor throws,
//     no fall-back-to-allow;
//   * rotation (proof_invalid) → exactly one re-mint, then propagate;
//   * never synthesizes {nonce,proof}; never serializes across processes.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createCapabilityHolder,
  DixieCapabilityError,
} from '../../../src/services/straylight-recall-intake/index.js';
import type { RecallIntakeResponse } from '@loa/straylight/host';

const KEY = 'phase-26e-test-key-32-bytes-min-aaaaaa';

describe('capability-holder — fail-closed env binding', () => {
  beforeEach(() => {
    delete process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY;
  });
  afterEach(() => {
    delete process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY;
  });

  it('throws DixieCapabilityError when env key is missing (ADR-026D §4.a)', () => {
    const holder = createCapabilityHolder();
    expect(() =>
      holder.withCapability((): RecallIntakeResponse => {
        throw new Error('callback should not run');
      }),
    ).toThrow(DixieCapabilityError);
    expect(holder.inspectMintCount()).toBe(0);
  });

  it('throws DixieCapabilityError when env key is empty (ADR-026D §4.a)', () => {
    process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY = '';
    const holder = createCapabilityHolder();
    expect(() =>
      holder.withCapability((): RecallIntakeResponse => {
        throw new Error('callback should not run');
      }),
    ).toThrow(DixieCapabilityError);
  });
});

describe('capability-holder — re-mint on rotation', () => {
  beforeEach(() => {
    process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY = KEY;
  });
  afterEach(() => {
    delete process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY;
  });

  it('caches one capability across calls (ADR-026C §3.5)', () => {
    const holder = createCapabilityHolder();
    const served: RecallIntakeResponse = {
      outcome: 'served',
      pack: {} as never,
      receipt: {} as never,
    };
    holder.withCapability(() => served);
    holder.withCapability(() => served);
    holder.withCapability(() => served);
    expect(holder.inspectMintCount()).toBe(1);
  });

  it('re-mints exactly once on proof_invalid then retries (ADR-026D §4.b)', () => {
    const holder = createCapabilityHolder();
    let calls = 0;
    const result = holder.withCapability((): RecallIntakeResponse => {
      calls += 1;
      if (calls === 1) {
        return {
          outcome: 'denied',
          reason: 'storage_unavailable',
          raw_reasons: ['runtime_seam:proof_invalid'],
        };
      }
      return {
        outcome: 'served',
        pack: {} as never,
        receipt: {} as never,
      };
    });
    expect(calls).toBe(2);
    expect(holder.inspectMintCount()).toBe(2);
    expect(result.outcome).toBe('served');
  });

  it('does not loop on consecutive proof_invalid (single re-mint, then propagate)', () => {
    const holder = createCapabilityHolder();
    let calls = 0;
    const result = holder.withCapability((): RecallIntakeResponse => {
      calls += 1;
      return {
        outcome: 'denied',
        reason: 'storage_unavailable',
        raw_reasons: ['runtime_seam:proof_invalid'],
      };
    });
    expect(calls).toBe(2);
    expect(holder.inspectMintCount()).toBe(2);
    expect(result.outcome).toBe('denied');
    expect((result as { raw_reasons: string[] }).raw_reasons).toContain(
      'runtime_seam:proof_invalid',
    );
  });

  it('does not re-mint on capability_unrecognized (4.c — non-recoverable)', () => {
    const holder = createCapabilityHolder();
    let calls = 0;
    holder.withCapability((): RecallIntakeResponse => {
      calls += 1;
      return {
        outcome: 'denied',
        reason: 'storage_unavailable',
        raw_reasons: ['runtime_seam:capability_unrecognized'],
      };
    });
    expect(calls).toBe(1);
    expect(holder.inspectMintCount()).toBe(1);
  });
});
