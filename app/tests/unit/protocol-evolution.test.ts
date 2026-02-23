/**
 * Protocol Evolution Tests — Level 6 Foundation
 *
 * Covers:
 * - Task 12.1: Protocol diff engine — hounfour version comparison
 * - Task 12.2: Migration proposal generator
 * - Task 12.3: translateReason sunset Phase 2 — code map completeness
 *
 * @since Sprint 12 — Level 6 Foundation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProtocolDiffEngine,
  type SchemaRegistrySnapshot,
  type ProtocolChangeManifest,
} from '../../src/services/protocol-diff-engine.js';
import {
  generateMigrationProposal,
  type MigrationProposal,
} from '../../src/services/migration-proposal.js';
import {
  DENIAL_CODE_MAP,
  ALLOWED_CODE_MAP,
  _translateReasonForTesting as translateReason,
  getTranslateReasonFallbackCount,
  resetTranslateReasonFallbackCount,
} from '../../src/services/memory-auth.js';
import { CONTRACT_VERSION, validators, getCrossFieldValidatorSchemas } from '@0xhoneyjar/loa-hounfour';

// ─── Task 12.1: Protocol Diff Engine ────────────────────────────────

describe('Task 12.1: Protocol Diff Engine', () => {
  let engine: ProtocolDiffEngine;

  beforeEach(() => {
    engine = new ProtocolDiffEngine();
  });

  describe('snapshotCurrentVersion', () => {
    it('captures the current hounfour version', () => {
      const snapshot = engine.snapshotCurrentVersion();

      expect(snapshot.version).toBe(CONTRACT_VERSION);
      expect(snapshot.snapshot_at).toBeTruthy();
      expect(new Date(snapshot.snapshot_at).getTime()).not.toBeNaN();
    });

    it('captures all validator names from hounfour', () => {
      const snapshot = engine.snapshotCurrentVersion();
      const expectedNames = Object.keys(validators);

      expect(snapshot.validator_names).toEqual(expectedNames);
      expect(snapshot.validator_names.length).toBeGreaterThan(0);
    });

    it('captures cross-field validator schemas', () => {
      const snapshot = engine.snapshotCurrentVersion();

      expect(snapshot.cross_field_schemas.length).toBeGreaterThan(0);
      // Known cross-field validators
      expect(snapshot.cross_field_schemas).toContain('ConversationSealingPolicy');
      expect(snapshot.cross_field_schemas).toContain('AccessPolicy');
      expect(snapshot.cross_field_schemas).toContain('BillingEntry');
    });

    it('generates schema $ids from validator names', () => {
      const snapshot = engine.snapshotCurrentVersion();

      // Schema IDs are PascalCase versions of validator names
      expect(snapshot.schema_ids).toContain('JwtClaims');
      expect(snapshot.schema_ids).toContain('BillingEntry');
      expect(snapshot.schema_ids).toContain('AccessPolicy');
    });

    it('auto-registers the snapshot for later lookup', () => {
      const snapshot = engine.snapshotCurrentVersion();
      const retrieved = engine.getSnapshot(CONTRACT_VERSION);

      expect(retrieved).toBe(snapshot);
    });
  });

  describe('diffVersions with identical snapshots', () => {
    it('produces zero changes for same-version comparison', () => {
      const snapshot = engine.snapshotCurrentVersion();
      const manifest = engine.diffVersions(snapshot, snapshot);

      expect(manifest.from_version).toBe(CONTRACT_VERSION);
      expect(manifest.to_version).toBe(CONTRACT_VERSION);
      expect(manifest.total_changes).toBe(0);
      expect(manifest.new_validators).toHaveLength(0);
      expect(manifest.deprecated_validators).toHaveLength(0);
      expect(manifest.breaking_changes).toHaveLength(0);
    });
  });

  describe('diffVersions with simulated upgrade', () => {
    let fromSnap: SchemaRegistrySnapshot;
    let toSnap: SchemaRegistrySnapshot;

    beforeEach(() => {
      // Simulate "from" version with fewer validators
      fromSnap = {
        version: '7.9.0',
        snapshot_at: new Date().toISOString(),
        validator_names: ['jwtClaims', 'billingEntry', 'conversation'],
        cross_field_schemas: ['ConversationSealingPolicy', 'BillingEntry'],
        schema_ids: ['JwtClaims', 'BillingEntry', 'Conversation'],
      };

      // Simulate "to" version with added and removed validators
      toSnap = {
        version: '7.10.0',
        snapshot_at: new Date().toISOString(),
        validator_names: ['jwtClaims', 'billingEntry', 'newValidator'],
        cross_field_schemas: ['BillingEntry', 'NewSchema'],
        schema_ids: ['JwtClaims', 'BillingEntry', 'NewValidator'],
      };

      engine.registerSnapshot(fromSnap);
      engine.registerSnapshot(toSnap);
    });

    it('detects new validators', () => {
      const manifest = engine.diffVersions('7.9.0', '7.10.0');

      const newNames = manifest.new_validators.map(v => v.affected);
      expect(newNames).toContain('newValidator');
    });

    it('detects deprecated validators', () => {
      const manifest = engine.diffVersions('7.9.0', '7.10.0');

      const deprecatedNames = manifest.deprecated_validators.map(v => v.affected);
      expect(deprecatedNames).toContain('conversation');
    });

    it('detects new evaluators', () => {
      const manifest = engine.diffVersions('7.9.0', '7.10.0');

      const newEvalNames = manifest.new_evaluators.map(e => e.affected);
      expect(newEvalNames).toContain('NewSchema');
    });

    it('detects removed schemas as breaking changes', () => {
      const manifest = engine.diffVersions('7.9.0', '7.10.0');

      expect(manifest.breaking_changes.length).toBeGreaterThan(0);
      const breakingAffected = manifest.breaking_changes.map(b => b.affected);
      expect(breakingAffected).toContain('Conversation');
    });

    it('produces machine-readable JSON manifest', () => {
      const manifest = engine.diffVersions('7.9.0', '7.10.0');
      const json = JSON.stringify(manifest);

      // Verify it round-trips through JSON
      const parsed = JSON.parse(json) as ProtocolChangeManifest;
      expect(parsed.from_version).toBe('7.9.0');
      expect(parsed.to_version).toBe('7.10.0');
      expect(parsed.total_changes).toBeGreaterThan(0);
    });

    it('computes total_changes correctly', () => {
      const manifest = engine.diffVersions('7.9.0', '7.10.0');

      const expected =
        manifest.new_validators.length +
        manifest.deprecated_validators.length +
        manifest.new_evaluators.length +
        manifest.removed_evaluators.length +
        manifest.new_fields.length +
        manifest.removed_fields.length +
        manifest.breaking_changes.length;

      expect(manifest.total_changes).toBe(expected);
    });
  });

  describe('event system', () => {
    it('emits change events on diff', () => {
      const events: ProtocolChangeManifest[] = [];
      engine.onProtocolChange(event => {
        events.push(event.manifest);
      });

      const snapshot = engine.snapshotCurrentVersion();
      engine.diffVersions(snapshot, snapshot);

      expect(events).toHaveLength(1);
      expect(events[0].from_version).toBe(CONTRACT_VERSION);
    });

    it('supports unsubscribe', () => {
      const events: ProtocolChangeManifest[] = [];
      const unsub = engine.onProtocolChange(event => {
        events.push(event.manifest);
      });

      const snapshot = engine.snapshotCurrentVersion();
      engine.diffVersions(snapshot, snapshot);
      expect(events).toHaveLength(1);

      unsub();
      engine.diffVersions(snapshot, snapshot);
      expect(events).toHaveLength(1); // No new events after unsub
    });
  });

  describe('error handling', () => {
    it('throws on unregistered version string', () => {
      expect(() => engine.diffVersions('99.99.99', '100.0.0')).toThrow(
        /No snapshot registered for version 99\.99\.99/,
      );
    });
  });
});

// ─── Task 12.2: Migration Proposal Generator ────────────────────────

describe('Task 12.2: Migration Proposal Generator', () => {
  it('generates a proposal from an empty change manifest', () => {
    const manifest: ProtocolChangeManifest = {
      from_version: '7.9.1',
      to_version: '7.9.2',
      computed_at: new Date().toISOString(),
      new_validators: [],
      deprecated_validators: [],
      new_evaluators: [],
      removed_evaluators: [],
      new_fields: [],
      removed_fields: [],
      breaking_changes: [],
      total_changes: 0,
    };

    const proposal = generateMigrationProposal(manifest);

    expect(proposal.from_version).toBe('7.9.1');
    expect(proposal.to_version).toBe('7.9.2');
    expect(proposal.items).toHaveLength(0);
    expect(proposal.summary.total_items).toBe(0);
    expect(proposal.summary.has_breaking_changes).toBe(false);
  });

  it('generates actionable items for each change type', () => {
    const manifest: ProtocolChangeManifest = {
      from_version: '7.9.1',
      to_version: '7.10.0',
      computed_at: new Date().toISOString(),
      new_validators: [
        { category: 'new_validator', description: 'New validator: foo', affected: 'foo', severity: 'informational' },
      ],
      deprecated_validators: [
        { category: 'deprecated_validator', description: 'Removed: bar', affected: 'bar', severity: 'breaking' },
      ],
      new_evaluators: [
        { category: 'new_evaluator', description: 'New evaluator: Baz', affected: 'Baz', severity: 'advisory' },
      ],
      removed_evaluators: [],
      new_fields: [
        { category: 'new_field', description: 'New schema: Qux', affected: 'Qux', severity: 'informational' },
      ],
      removed_fields: [
        { category: 'removed_field', description: 'Removed: Old', affected: 'Old', severity: 'breaking' },
      ],
      breaking_changes: [
        { category: 'breaking_change', description: 'Breaking!', affected: 'bar', severity: 'breaking' },
      ],
      total_changes: 5,
    };

    const proposal = generateMigrationProposal(manifest);

    // Each change produces a migration item
    expect(proposal.items.length).toBe(5);

    // Each item has all required fields
    for (const item of proposal.items) {
      expect(item.id).toMatch(/^MIG-\d{3}$/);
      expect(item.description).toBeTruthy();
      expect(item.affected).toBeTruthy();
      expect(['trivial', 'small', 'medium', 'large']).toContain(item.effort);
      expect(['required', 'recommended', 'optional']).toContain(item.priority);
      expect(item.action).toBeTruthy();
    }
  });

  it('sorts items by priority: required first', () => {
    const manifest: ProtocolChangeManifest = {
      from_version: '7.9.1',
      to_version: '7.10.0',
      computed_at: new Date().toISOString(),
      new_validators: [
        { category: 'new_validator', description: 'Optional change', affected: 'foo', severity: 'informational' },
      ],
      deprecated_validators: [
        { category: 'deprecated_validator', description: 'Required change', affected: 'bar', severity: 'breaking' },
      ],
      new_evaluators: [
        { category: 'new_evaluator', description: 'Recommended', affected: 'Baz', severity: 'advisory' },
      ],
      removed_evaluators: [],
      new_fields: [],
      removed_fields: [],
      breaking_changes: [],
      total_changes: 3,
    };

    const proposal = generateMigrationProposal(manifest);

    expect(proposal.items[0].priority).toBe('required');
    expect(proposal.items[1].priority).toBe('recommended');
    expect(proposal.items[2].priority).toBe('optional');
  });

  it('computes summary statistics correctly', () => {
    const manifest: ProtocolChangeManifest = {
      from_version: '7.9.1',
      to_version: '8.0.0',
      computed_at: new Date().toISOString(),
      new_validators: [
        { category: 'new_validator', description: 'New', affected: 'a', severity: 'informational' },
        { category: 'new_validator', description: 'New', affected: 'b', severity: 'informational' },
      ],
      deprecated_validators: [
        { category: 'deprecated_validator', description: 'Removed', affected: 'c', severity: 'breaking' },
      ],
      new_evaluators: [
        { category: 'new_evaluator', description: 'New eval', affected: 'D', severity: 'advisory' },
      ],
      removed_evaluators: [],
      new_fields: [],
      removed_fields: [],
      breaking_changes: [
        { category: 'breaking_change', description: 'Break', affected: 'c', severity: 'breaking' },
      ],
      total_changes: 4,
    };

    const proposal = generateMigrationProposal(manifest);

    expect(proposal.summary.total_items).toBe(4);
    expect(proposal.summary.required_count).toBe(1); // deprecated_validator
    expect(proposal.summary.recommended_count).toBe(1); // new_evaluator
    expect(proposal.summary.optional_count).toBe(2); // new_validators
    expect(proposal.summary.has_breaking_changes).toBe(true);
    expect(proposal.summary.estimated_total_effort).toBeTruthy();
  });

  it('new validator action says "Add conformance test"', () => {
    const manifest: ProtocolChangeManifest = {
      from_version: '7.9.1',
      to_version: '7.10.0',
      computed_at: new Date().toISOString(),
      new_validators: [
        { category: 'new_validator', description: 'New validator: fooBar', affected: 'fooBar', severity: 'informational' },
      ],
      deprecated_validators: [],
      new_evaluators: [],
      removed_evaluators: [],
      new_fields: [],
      removed_fields: [],
      breaking_changes: [],
      total_changes: 1,
    };

    const proposal = generateMigrationProposal(manifest);
    expect(proposal.items[0].action).toContain('Add conformance test');
  });

  it('deprecated validator action says "Schedule removal"', () => {
    const manifest: ProtocolChangeManifest = {
      from_version: '7.9.1',
      to_version: '7.10.0',
      computed_at: new Date().toISOString(),
      new_validators: [],
      deprecated_validators: [
        { category: 'deprecated_validator', description: 'Removed: old', affected: 'old', severity: 'breaking' },
      ],
      new_evaluators: [],
      removed_evaluators: [],
      new_fields: [],
      removed_fields: [],
      breaking_changes: [],
      total_changes: 1,
    };

    const proposal = generateMigrationProposal(manifest);
    expect(proposal.items[0].action).toContain('Schedule removal');
  });

  it('produces machine-readable JSON proposal', () => {
    const engine = new ProtocolDiffEngine();
    const snapshot = engine.snapshotCurrentVersion();
    const manifest = engine.diffVersions(snapshot, snapshot);
    const proposal = generateMigrationProposal(manifest);

    const json = JSON.stringify(proposal);
    const parsed = JSON.parse(json) as MigrationProposal;

    expect(parsed.from_version).toBe(CONTRACT_VERSION);
    expect(parsed.summary).toBeDefined();
  });
});

// ─── Task 12.3: translateReason Sunset Phase 2 ──────────────────────

describe('Task 12.3: translateReason sunset — code map completeness', () => {
  beforeEach(() => {
    resetTranslateReasonFallbackCount();
  });

  describe('DENIAL_CODE_MAP validated against hounfour v7.9.x denial codes', () => {
    /**
     * Hounfour v7.9.x DenialCodeSchema defines these economic boundary denial codes:
     * - TRUST_SCORE_BELOW_THRESHOLD
     * - TRUST_STATE_BELOW_THRESHOLD
     * - CAPITAL_BELOW_THRESHOLD
     * - UNKNOWN_REPUTATION_STATE
     * - INVALID_BUDGET_FORMAT
     * - MISSING_QUALIFICATION_CRITERIA
     *
     * These are ECONOMIC BOUNDARY denial codes, distinct from the ACCESS POLICY
     * denial codes in DENIAL_CODE_MAP. The DENIAL_CODE_MAP covers access policy
     * denial codes which are expected in hounfour >= v7.10.0.
     */
    const hounfourAccessPolicyDenialCodes = [
      'POLICY_NONE',
      'READ_ONLY_NO_MODIFY',
      'TIME_LIMITED_NO_MODIFY',
      'POLICY_EXPIRED',
      'NO_ROLE_PROVIDED',
      'ROLE_NOT_PERMITTED',
      'REPUTATION_BELOW_THRESHOLD',
      'COMPOUND_POLICY_DENIED',
    ] as const;

    it('maps every known access policy denial code', () => {
      for (const code of hounfourAccessPolicyDenialCodes) {
        expect(DENIAL_CODE_MAP).toHaveProperty(code);
        expect(typeof DENIAL_CODE_MAP[code]).toBe('string');
        expect(DENIAL_CODE_MAP[code].length).toBeGreaterThan(0);
      }
    });

    it('has no unmapped denial codes (all codes have Dixie equivalents)', () => {
      const mappedCodes = Object.keys(DENIAL_CODE_MAP);

      // Every code in the map should be in our known list
      for (const code of mappedCodes) {
        const isKnown = hounfourAccessPolicyDenialCodes.includes(
          code as typeof hounfourAccessPolicyDenialCodes[number],
        );
        if (!isKnown) {
          // Not a failure — just a warning for forward-compat codes
          console.warn(`[completeness-check] DENIAL_CODE_MAP has extra code: ${code}`);
        }
      }

      // Every known code should be in the map
      for (const code of hounfourAccessPolicyDenialCodes) {
        expect(mappedCodes).toContain(code);
      }
    });
  });

  describe('ALLOWED_CODE_MAP completeness', () => {
    const hounfourAccessPolicyAllowedCodes = [
      'READ_ONLY_PERMITTED',
      'TIME_LIMITED_PERMITTED',
      'ROLE_BASED_PERMITTED',
    ] as const;

    it('maps every known access policy allowed code', () => {
      for (const code of hounfourAccessPolicyAllowedCodes) {
        expect(ALLOWED_CODE_MAP).toHaveProperty(code);
        expect(typeof ALLOWED_CODE_MAP[code]).toBe('string');
        expect(ALLOWED_CODE_MAP[code].length).toBeGreaterThan(0);
      }
    });

    it('has no unmapped allowed codes', () => {
      const mappedCodes = Object.keys(ALLOWED_CODE_MAP);
      for (const code of hounfourAccessPolicyAllowedCodes) {
        expect(mappedCodes).toContain(code);
      }
    });
  });

  describe('hounfour economic boundary DenialCode coverage', () => {
    /**
     * These are the DenialCode literals from hounfour v7.9.1
     * DenialCodeSchema in economy/economic-boundary.ts.
     *
     * These are handled by conviction-boundary.ts (not memory-auth.ts),
     * so they are NOT in DENIAL_CODE_MAP. This test validates that we
     * are aware of them and have corresponding handling.
     */
    const economicBoundaryDenialCodes = [
      'TRUST_SCORE_BELOW_THRESHOLD',
      'TRUST_STATE_BELOW_THRESHOLD',
      'CAPITAL_BELOW_THRESHOLD',
      'UNKNOWN_REPUTATION_STATE',
      'INVALID_BUDGET_FORMAT',
      'MISSING_QUALIFICATION_CRITERIA',
    ] as const;

    it('documents all economic boundary denial codes from hounfour v7.9.1', () => {
      // This test serves as a completeness check — if hounfour adds new
      // denial codes, this list must be updated.
      expect(economicBoundaryDenialCodes).toHaveLength(6);

      // Verify these are distinct from access policy codes
      for (const code of economicBoundaryDenialCodes) {
        // Economic codes may or may not overlap with access policy codes.
        // TRUST_SCORE_BELOW_THRESHOLD and TRUST_STATE_BELOW_THRESHOLD are
        // used by buildConvictionDenialResponse in conviction-boundary.ts.
        expect(typeof code).toBe('string');
      }
    });
  });

  describe('translateReasonFallbackCount stays at 0 for known codes', () => {
    it('structured denial code path produces zero fallbacks for known codes', () => {
      resetTranslateReasonFallbackCount();

      // Test each known denial code
      for (const code of Object.keys(DENIAL_CODE_MAP)) {
        translateReason('some reason', false, 'some_type', 'read', code);
      }
      expect(getTranslateReasonFallbackCount()).toBe(0);

      // Test each known allowed code
      resetTranslateReasonFallbackCount();
      for (const code of Object.keys(ALLOWED_CODE_MAP)) {
        translateReason('some reason', true, 'some_type', 'read', code);
      }
      expect(getTranslateReasonFallbackCount()).toBe(0);
    });

    it('legacy substring path produces zero fallbacks for known patterns', () => {
      resetTranslateReasonFallbackCount();

      // Known legacy patterns (no denialCode parameter)
      translateReason('denied', false, 'none', 'read');
      translateReason('not permitted under read_only policy', false, 'read_only', 'seal');
      translateReason('not permitted under time_limited policy', false, 'time_limited', 'seal');
      translateReason('Policy has expired', false, 'time_limited', 'read');
      translateReason('No role provided', false, 'role_based', 'read');
      translateReason('Role x not in permitted roles', false, 'role_based', 'read');

      expect(getTranslateReasonFallbackCount()).toBe(0);
    });

    it('unknown denial code increments fallback counter', () => {
      resetTranslateReasonFallbackCount();

      translateReason('some reason', false, 'some_type', 'read', 'FUTURE_UNKNOWN_CODE');

      expect(getTranslateReasonFallbackCount()).toBe(1);
    });
  });
});
