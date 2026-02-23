/**
 * Protocol Diff Engine — hounfour version comparison infrastructure.
 *
 * Compares two hounfour version snapshots to produce a structured
 * ProtocolChangeManifest. This enables Level 6 (Adaptive Protocol
 * Co-Evolution): protocol changes are auto-detected, and downstream
 * consumers can subscribe to change events for migration planning.
 *
 * Since only one version of hounfour is installed at a time, the engine
 * works by snapshotting the current version's schema registry and
 * comparing against a previously saved snapshot. Actual cross-version
 * diffing works when you have two snapshots from different versions.
 *
 * Parallel: Avro schema evolution — schemas carry version metadata and
 * compatibility rules (BACKWARD, FORWARD, FULL). The diff engine serves
 * a similar role to Confluent Schema Registry's compatibility checker.
 *
 * @since Sprint 12 — Task 12.1 (Level 6 Foundation)
 * @see grimoires/loa/context/adr-hounfour-alignment.md (Level 6 definition)
 */
import {
  CONTRACT_VERSION,
  validators,
  getCrossFieldValidatorSchemas,
} from '@0xhoneyjar/loa-hounfour';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A snapshot of hounfour's schema registry at a specific version.
 *
 * Captures the validator names, cross-field validator schemas, and
 * schema $ids known at snapshot time. This is the "photograph" that
 * the diff engine compares.
 */
export interface SchemaRegistrySnapshot {
  /** Hounfour CONTRACT_VERSION at snapshot time. */
  readonly version: string;
  /** ISO 8601 timestamp when snapshot was taken. */
  readonly snapshot_at: string;
  /** Names of all validators in the `validators` object. */
  readonly validator_names: readonly string[];
  /** Schema $ids that have registered cross-field validators. */
  readonly cross_field_schemas: readonly string[];
  /** Schema $ids discovered from validator compilation (subset visible at runtime). */
  readonly schema_ids: readonly string[];
}

/**
 * A single field-level or validator-level change between two versions.
 */
export interface ProtocolChange {
  /** Category of change. */
  readonly category: 'new_field' | 'removed_field' | 'new_validator' | 'deprecated_validator' | 'new_evaluator' | 'breaking_change';
  /** Human-readable description of the change. */
  readonly description: string;
  /** The schema or validator name affected. */
  readonly affected: string;
  /** Severity: informational, advisory, or breaking. */
  readonly severity: 'informational' | 'advisory' | 'breaking';
}

/**
 * The output of diffing two hounfour version snapshots.
 *
 * Machine-readable JSON manifest that consumers can subscribe to
 * for automated migration planning.
 */
export interface ProtocolChangeManifest {
  /** Source version (older). */
  readonly from_version: string;
  /** Target version (newer). */
  readonly to_version: string;
  /** ISO 8601 timestamp when diff was computed. */
  readonly computed_at: string;
  /** New validators added in to_version. */
  readonly new_validators: readonly ProtocolChange[];
  /** Validators present in from_version but absent in to_version. */
  readonly deprecated_validators: readonly ProtocolChange[];
  /** New cross-field evaluators added in to_version. */
  readonly new_evaluators: readonly ProtocolChange[];
  /** Cross-field evaluators removed in to_version. */
  readonly removed_evaluators: readonly ProtocolChange[];
  /** New schema $ids added in to_version. */
  readonly new_fields: readonly ProtocolChange[];
  /** Schema $ids removed in to_version. */
  readonly removed_fields: readonly ProtocolChange[];
  /** Breaking changes that require migration. */
  readonly breaking_changes: readonly ProtocolChange[];
  /** Total count of all changes. */
  readonly total_changes: number;
}

// ─── Event system ────────────────────────────────────────────────────

/**
 * Change event emitted when a diff is computed.
 * Consumers subscribe to receive structured change notifications.
 */
export interface ProtocolChangeEvent {
  readonly type: 'protocol_change';
  readonly manifest: ProtocolChangeManifest;
}

type ChangeEventHandler = (event: ProtocolChangeEvent) => void;

// ─── Engine ──────────────────────────────────────────────────────────

/**
 * ProtocolDiffEngine — compares two hounfour version manifests.
 *
 * Usage:
 * 1. Snapshot the current version: `const snap = engine.snapshotCurrentVersion()`
 * 2. Save the snapshot (e.g., to a JSON file)
 * 3. After upgrading hounfour, snapshot again
 * 4. Diff: `const manifest = engine.diffVersions(oldSnap, newSnap)`
 *
 * For convenience, `diffVersions(fromVersion, toVersion)` can also accept
 * version strings and look up pre-registered snapshots.
 *
 * @since Sprint 12 — Task 12.1
 */
export class ProtocolDiffEngine {
  /** Registered snapshots keyed by version string. */
  private readonly snapshots = new Map<string, SchemaRegistrySnapshot>();

  /** Event subscribers. */
  private readonly listeners: ChangeEventHandler[] = [];

  /**
   * Snapshot the current hounfour version's schema registry.
   *
   * Introspects the `validators` object and `getCrossFieldValidatorSchemas()`
   * to capture the current state of the protocol.
   */
  snapshotCurrentVersion(): SchemaRegistrySnapshot {
    const validatorNames = Object.keys(validators);

    // Cross-field validator schemas
    const crossFieldSchemas = getCrossFieldValidatorSchemas();

    // Schema $ids: we can discover these from the cross-field registry
    // plus the validator names (which map 1:1 to schema $ids by convention).
    // The actual $ids are PascalCase versions of the camelCase validator names.
    const schemaIds = validatorNames.map(name =>
      name.charAt(0).toUpperCase() + name.slice(1),
    );

    const snapshot: SchemaRegistrySnapshot = {
      version: CONTRACT_VERSION,
      snapshot_at: new Date().toISOString(),
      validator_names: validatorNames,
      cross_field_schemas: crossFieldSchemas,
      schema_ids: schemaIds,
    };

    // Auto-register the snapshot
    this.registerSnapshot(snapshot);

    return snapshot;
  }

  /**
   * Register a snapshot for later lookup by version string.
   */
  registerSnapshot(snapshot: SchemaRegistrySnapshot): void {
    this.snapshots.set(snapshot.version, snapshot);
  }

  /**
   * Diff two version snapshots.
   *
   * Accepts either version strings (looked up from registered snapshots)
   * or snapshot objects directly.
   */
  diffVersions(
    from: string | SchemaRegistrySnapshot,
    to: string | SchemaRegistrySnapshot,
  ): ProtocolChangeManifest {
    const fromSnap = typeof from === 'string' ? this.resolveSnapshot(from) : from;
    const toSnap = typeof to === 'string' ? this.resolveSnapshot(to) : to;

    const newValidators: ProtocolChange[] = [];
    const deprecatedValidators: ProtocolChange[] = [];
    const newEvaluators: ProtocolChange[] = [];
    const removedEvaluators: ProtocolChange[] = [];
    const newFields: ProtocolChange[] = [];
    const removedFields: ProtocolChange[] = [];
    const breakingChanges: ProtocolChange[] = [];

    // Diff validators
    const fromValidatorSet = new Set(fromSnap.validator_names);
    const toValidatorSet = new Set(toSnap.validator_names);

    for (const name of toSnap.validator_names) {
      if (!fromValidatorSet.has(name)) {
        newValidators.push({
          category: 'new_validator',
          description: `New validator added: ${name}`,
          affected: name,
          severity: 'informational',
        });
      }
    }

    for (const name of fromSnap.validator_names) {
      if (!toValidatorSet.has(name)) {
        deprecatedValidators.push({
          category: 'deprecated_validator',
          description: `Validator removed: ${name}. Consumers using this validator must migrate.`,
          affected: name,
          severity: 'breaking',
        });
        breakingChanges.push({
          category: 'breaking_change',
          description: `Validator ${name} was removed between ${fromSnap.version} and ${toSnap.version}`,
          affected: name,
          severity: 'breaking',
        });
      }
    }

    // Diff cross-field evaluators
    const fromCFSet = new Set(fromSnap.cross_field_schemas);
    const toCFSet = new Set(toSnap.cross_field_schemas);

    for (const schema of toSnap.cross_field_schemas) {
      if (!fromCFSet.has(schema)) {
        newEvaluators.push({
          category: 'new_evaluator',
          description: `New cross-field evaluator for schema: ${schema}`,
          affected: schema,
          severity: 'advisory',
        });
      }
    }

    for (const schema of fromSnap.cross_field_schemas) {
      if (!toCFSet.has(schema)) {
        removedEvaluators.push({
          category: 'new_evaluator',
          description: `Cross-field evaluator removed for schema: ${schema}`,
          affected: schema,
          severity: 'advisory',
        });
      }
    }

    // Diff schema $ids (proxy for field-level changes)
    const fromSchemaSet = new Set(fromSnap.schema_ids);
    const toSchemaSet = new Set(toSnap.schema_ids);

    for (const id of toSnap.schema_ids) {
      if (!fromSchemaSet.has(id)) {
        newFields.push({
          category: 'new_field',
          description: `New schema added: ${id}`,
          affected: id,
          severity: 'informational',
        });
      }
    }

    for (const id of fromSnap.schema_ids) {
      if (!toSchemaSet.has(id)) {
        removedFields.push({
          category: 'removed_field',
          description: `Schema removed: ${id}. Consumers referencing this schema must migrate.`,
          affected: id,
          severity: 'breaking',
        });
        breakingChanges.push({
          category: 'breaking_change',
          description: `Schema ${id} was removed between ${fromSnap.version} and ${toSnap.version}`,
          affected: id,
          severity: 'breaking',
        });
      }
    }

    const totalChanges =
      newValidators.length +
      deprecatedValidators.length +
      newEvaluators.length +
      removedEvaluators.length +
      newFields.length +
      removedFields.length +
      breakingChanges.length;

    const manifest: ProtocolChangeManifest = {
      from_version: fromSnap.version,
      to_version: toSnap.version,
      computed_at: new Date().toISOString(),
      new_validators: newValidators,
      deprecated_validators: deprecatedValidators,
      new_evaluators: newEvaluators,
      removed_evaluators: removedEvaluators,
      new_fields: newFields,
      removed_fields: removedFields,
      breaking_changes: breakingChanges,
      total_changes: totalChanges,
    };

    // Emit change event
    this.emit({ type: 'protocol_change', manifest });

    return manifest;
  }

  /**
   * Subscribe to protocol change events.
   * Returns an unsubscribe function.
   */
  onProtocolChange(handler: ChangeEventHandler): () => void {
    this.listeners.push(handler);
    return () => {
      const idx = this.listeners.indexOf(handler);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Get a registered snapshot by version string.
   */
  getSnapshot(version: string): SchemaRegistrySnapshot | undefined {
    return this.snapshots.get(version);
  }

  // ─── Private ─────────────────────────────────────────────────────

  private resolveSnapshot(version: string): SchemaRegistrySnapshot {
    const snap = this.snapshots.get(version);
    if (!snap) {
      throw new Error(
        `No snapshot registered for version ${version}. ` +
        `Register snapshots via registerSnapshot() or snapshotCurrentVersion().`,
      );
    }
    return snap;
  }

  private emit(event: ProtocolChangeEvent): void {
    for (const handler of this.listeners) {
      handler(event);
    }
  }
}
