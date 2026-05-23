// Phase 30 — Recall Wedge contract type-availability tripwire.
//
// Phase 30 (loa-straylight 7f7bf9b) re-exports the Phase 29B Recall Wedge
// host contract through `@loa/straylight/host`. `@loa/straylight/host` is
// a TYPES-ONLY surface for Dixie: this file proves the new Phase 30
// contract names compile under `import type` from that subpath, without
// runtime-importing or invoking any helper values.
//
// Runtime invocation of helper values (e.g. `summarizeRecallWedgeInspection`,
// `createRecallWedgeInspectionReceipt`) is deferred to a later authorized
// runtime host export or Dixie-side adapter — not Phase 30B.
//
// If a future Straylight tag bump renames or removes any of the names
// guarded below, this file fails at typecheck. The runtime assertions
// exercise only locally constructed plain values and do NOT touch
// `@loa/straylight/host` at runtime.

import { describe, expect, it } from 'vitest';
import type {
  RecallWedgeActorScope,
  RecallWedgeBoundaryOwner,
  RecallWedgeContractBoundary,
  RecallWedgeEnvironmentFrame,
  RecallWedgeEnvironmentSurface,
  RecallWedgeHostKind,
  RecallWedgeInclusionDecision,
  RecallWedgeInspectionItem,
  RecallWedgeInspectionReceipt,
  RecallWedgeInspectionRequest,
  RecallWedgeInspectionSummary,
  RecallWedgeRiskLevel,
  RecallWedgeSourceCorpusRef,
  StraylightRecallWedgeContractVersion,
} from '@loa/straylight/host';

// Helper-signature types are sourced via `typeof Host.<helper>`, which
// remains a type-only reference — no value binding is created.
import type * as Host from '@loa/straylight/host';

type AssertRecallWedgeContractReadOnlyBoundarySig =
  typeof Host.assertRecallWedgeContractReadOnlyBoundary;
type CreateRecallWedgeSourceCorpusRefSig = typeof Host.createRecallWedgeSourceCorpusRef;
type CreateRecallWedgeInspectionReceiptSig = typeof Host.createRecallWedgeInspectionReceipt;
type SummarizeRecallWedgeInspectionSig = typeof Host.summarizeRecallWedgeInspection;
type DefaultRecallWedgeHostKindType = typeof Host.DEFAULT_RECALL_WEDGE_HOST_KIND;
type RecallWedgeActiveHostKindsType = typeof Host.RECALL_WEDGE_ACTIVE_HOST_KINDS;
type RecallWedgeContractBoundaryConstType = typeof Host.RECALL_WEDGE_CONTRACT_BOUNDARY;
type StraylightRecallWedgeContractVersionConstType =
  typeof Host.STRAYLIGHT_RECALL_WEDGE_CONTRACT_VERSION;

describe('@loa/straylight/host — Phase 30 contract version is the pinned literal', () => {
  it('StraylightRecallWedgeContractVersion is exactly the Phase 29B literal', () => {
    type Expected = 'phase-29b.recall-wedge-contract.v0';
    type _Same = StraylightRecallWedgeContractVersion extends Expected
      ? Expected extends StraylightRecallWedgeContractVersion
        ? true
        : false
      : false;
    const _same: _Same = true;
    expect(_same).toBe(true);
  });

  it('the constant export is structurally the same literal type', () => {
    type _Same = StraylightRecallWedgeContractVersionConstType extends StraylightRecallWedgeContractVersion
      ? StraylightRecallWedgeContractVersion extends StraylightRecallWedgeContractVersionConstType
        ? true
        : false
      : false;
    const _same: _Same = true;
    expect(_same).toBe(true);
  });
});

describe('@loa/straylight/host — Phase 30 boundary-owner closed vocabulary', () => {
  it('RecallWedgeBoundaryOwner matches the five enumerated lanes exactly', () => {
    const expected = [
      'straylight',
      'hounfour',
      'dixie',
      'finn',
      'loa',
    ] as const satisfies readonly RecallWedgeBoundaryOwner[];

    type _Missing = Exclude<RecallWedgeBoundaryOwner, (typeof expected)[number]>;
    const _noExtras: _Missing extends never ? true : false = true;
    expect(_noExtras).toBe(true);

    expect(expected).toHaveLength(5);
    expect(new Set<string>(expected).size).toBe(5);
  });
});

describe('@loa/straylight/host — Phase 30 host-kind closed vocabulary', () => {
  it('RecallWedgeHostKind matches the three enumerated host kinds exactly', () => {
    const expected = [
      'dixie-first-inspection-bff',
      'finn-runtime-enforcement-later',
      'test',
    ] as const satisfies readonly RecallWedgeHostKind[];

    type _Missing = Exclude<RecallWedgeHostKind, (typeof expected)[number]>;
    const _noExtras: _Missing extends never ? true : false = true;
    expect(_noExtras).toBe(true);

    expect(expected).toHaveLength(3);
  });

  it('RECALL_WEDGE_ACTIVE_HOST_KINDS is a readonly tuple over RecallWedgeHostKind', () => {
    type _ActiveIsHostKind = RecallWedgeActiveHostKindsType[number] extends RecallWedgeHostKind
      ? true
      : false;
    const _ok: _ActiveIsHostKind = true;
    expect(_ok).toBe(true);
  });

  it('DEFAULT_RECALL_WEDGE_HOST_KIND is a RecallWedgeHostKind', () => {
    type _IsHostKind = DefaultRecallWedgeHostKindType extends RecallWedgeHostKind ? true : false;
    const _ok: _IsHostKind = true;
    expect(_ok).toBe(true);
  });
});

describe('@loa/straylight/host — Phase 30 surface / risk / decision closed vocabularies', () => {
  it('RecallWedgeEnvironmentSurface matches the four enumerated surfaces exactly', () => {
    const expected = [
      'operator',
      'dixie-bff',
      'finn-runtime',
      'test',
    ] as const satisfies readonly RecallWedgeEnvironmentSurface[];

    type _Missing = Exclude<RecallWedgeEnvironmentSurface, (typeof expected)[number]>;
    const _noExtras: _Missing extends never ? true : false = true;
    expect(_noExtras).toBe(true);

    expect(expected).toHaveLength(4);
  });

  it('RecallWedgeRiskLevel matches the four enumerated risk levels exactly', () => {
    const expected = [
      'low',
      'standard',
      'high',
      'restricted',
    ] as const satisfies readonly RecallWedgeRiskLevel[];

    type _Missing = Exclude<RecallWedgeRiskLevel, (typeof expected)[number]>;
    const _noExtras: _Missing extends never ? true : false = true;
    expect(_noExtras).toBe(true);

    expect(expected).toHaveLength(4);
  });

  it('RecallWedgeInclusionDecision matches the four total outcomes exactly', () => {
    const expected = [
      'include',
      'exclude',
      'redact',
      'refuse',
    ] as const satisfies readonly RecallWedgeInclusionDecision[];

    type _Missing = Exclude<RecallWedgeInclusionDecision, (typeof expected)[number]>;
    const _noExtras: _Missing extends never ? true : false = true;
    expect(_noExtras).toBe(true);

    expect(expected).toHaveLength(4);
  });
});

describe('@loa/straylight/host — Phase 30 record shapes are reachable', () => {
  it('RecallWedgeSourceCorpusRef carries the Phase 29A metadata keys', () => {
    type Required = 'packageName' | 'packageVersion' | 'corpus' | 'pathPrefix';
    type _HasRequired = Required extends keyof RecallWedgeSourceCorpusRef ? true : false;
    const _ok: _HasRequired = true;
    expect(_ok).toBe(true);
  });

  it('RecallWedgeActorScope carries actor_id and estate_id', () => {
    type _HasRequired = 'actor_id' | 'estate_id' extends keyof RecallWedgeActorScope ? true : false;
    const _ok: _HasRequired = true;
    expect(_ok).toBe(true);
  });

  it('RecallWedgeEnvironmentFrame carries purpose and surface', () => {
    type _HasRequired = 'purpose' | 'surface' extends keyof RecallWedgeEnvironmentFrame
      ? true
      : false;
    const _ok: _HasRequired = true;
    expect(_ok).toBe(true);
  });

  it('RecallWedgeInspectionRequest exposes the explicit boolean knobs', () => {
    type Required =
      | 'request_id'
      | 'actor_scope'
      | 'environment'
      | 'include_challenged'
      | 'include_revoked'
      | 'include_forgotten'
      | 'source_corpus';
    type _HasRequired = Required extends keyof RecallWedgeInspectionRequest ? true : false;
    const _ok: _HasRequired = true;
    expect(_ok).toBe(true);
  });

  it('RecallWedgeInspectionItem carries decision, reason, and source_ref', () => {
    type Required = 'decision' | 'reason' | 'source_ref';
    type _HasRequired = Required extends keyof RecallWedgeInspectionItem ? true : false;
    const _ok: _HasRequired = true;
    expect(_ok).toBe(true);
  });

  it('RecallWedgeInspectionReceipt carries the four decision counters', () => {
    type Counters =
      | 'included_count'
      | 'excluded_count'
      | 'redacted_count'
      | 'refused_count';
    type _HasCounters = Counters extends keyof RecallWedgeInspectionReceipt ? true : false;
    const _ok: _HasCounters = true;
    expect(_ok).toBe(true);
  });

  it('RecallWedgeInspectionSummary carries the four decision counters', () => {
    type Counters =
      | 'included_count'
      | 'excluded_count'
      | 'redacted_count'
      | 'refused_count';
    type _Same = Counters extends keyof RecallWedgeInspectionSummary
      ? keyof RecallWedgeInspectionSummary extends Counters
        ? true
        : false
      : false;
    const _same: _Same = true;
    expect(_same).toBe(true);
  });
});

describe('@loa/straylight/host — Phase 30 contract-boundary constant type', () => {
  it('RecallWedgeContractBoundary mirrors the constant boundary export', () => {
    type _Same = RecallWedgeContractBoundary extends RecallWedgeContractBoundaryConstType
      ? RecallWedgeContractBoundaryConstType extends RecallWedgeContractBoundary
        ? true
        : false
      : false;
    const _same: _Same = true;
    expect(_same).toBe(true);
  });

  it('the boundary constant pins the Phase 29B contract_version literal', () => {
    type Version = RecallWedgeContractBoundary['contract_version'];
    type _Same = Version extends StraylightRecallWedgeContractVersion
      ? StraylightRecallWedgeContractVersion extends Version
        ? true
        : false
      : false;
    const _same: _Same = true;
    expect(_same).toBe(true);
  });
});

describe('@loa/straylight/host — Phase 30 helper signatures are reachable as types', () => {
  it('helper-signature types resolve as functions (type-only)', () => {
    type _IsFn<T> = T extends (...args: never[]) => unknown ? true : false;
    const _assert: _IsFn<AssertRecallWedgeContractReadOnlyBoundarySig> = true;
    const _create: _IsFn<CreateRecallWedgeSourceCorpusRefSig> = true;
    const _receipt: _IsFn<CreateRecallWedgeInspectionReceiptSig> = true;
    const _summary: _IsFn<SummarizeRecallWedgeInspectionSig> = true;
    expect(_assert).toBe(true);
    expect(_create).toBe(true);
    expect(_receipt).toBe(true);
    expect(_summary).toBe(true);
  });
});
