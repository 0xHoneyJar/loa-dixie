// Phase 26E — capability holder.
//
// ADR-026C §3.3, §3.4, §3.5, §3.7 + ADR-026D §4.a, §4.b, §4.d:
//   * Mint via `createDixieCapability()`; never synthesise `{nonce,proof}`.
//   * Cache one capability per process; never serialise across processes.
//   * On `runtime_seam:proof_invalid` (env-key rotation), re-mint exactly
//     once and retry the call. A second consecutive `proof_invalid` is
//     surfaced — the env was rotated mid-call twice or the rotation broke
//     constructor minting itself.
//   * Missing or empty `STRAYLIGHT_RUNTIME_DIXIE_KEY` → constructor throws
//     `DixieCapabilityError`; the holder propagates with no fall-back.
//
// The `withCapability` API never hands the capability object out to the
// caller — it accepts a callback that runs against a freshly-prepared
// capability slot. This prevents the route from accidentally logging,
// persisting, or serialising the capability.

import {
  createDixieCapability,
  DixieCapabilityError,
  type DixieCapability,
} from '@loa/straylight/runtime/recall-intake';
import type { RecallIntakeResponse } from '@loa/straylight/host';

export type { DixieCapability };
export { DixieCapabilityError };

export interface CapabilityHolder {
  withCapability<T extends RecallIntakeResponse>(fn: (cap: DixieCapability) => T): T;
  /** Test/observability: how many times has the holder minted? */
  inspectMintCount(): number;
  /** Test hook: drop the cached capability so the next call mints fresh. */
  forgetForTesting(): void;
}

interface CapabilitySlot {
  cap: DixieCapability;
}

function isProofInvalid(resp: RecallIntakeResponse): boolean {
  if (resp.outcome !== 'denied') return false;
  return resp.raw_reasons.some((r) => r === 'runtime_seam:proof_invalid');
}

export function createCapabilityHolder(): CapabilityHolder {
  let slot: CapabilitySlot | undefined;
  let mintCount = 0;

  function mint(): CapabilitySlot {
    const cap = createDixieCapability();
    mintCount += 1;
    return { cap };
  }

  return {
    withCapability(fn) {
      if (!slot) slot = mint();
      const first = fn(slot.cap);
      if (!isProofInvalid(first)) return first;
      // Single re-mint on rotation. If the constructor cannot mint (env-key
      // gone), the throw propagates — fail-closed per ADR-026D §4.a.
      slot = mint();
      const second = fn(slot.cap);
      // A second consecutive proof_invalid is propagated unchanged; the
      // route maps it to the runtime-seam refusal shape. We do NOT loop.
      return second;
    },
    inspectMintCount() {
      return mintCount;
    },
    forgetForTesting() {
      slot = undefined;
    },
  };
}
