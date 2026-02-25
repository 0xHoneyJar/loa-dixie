/**
 * Governance Mutation — Actor-attributed mutation tracking for governance operations.
 *
 * Implements hounfour v8.1.0 GovernanceMutation with required actor_id.
 * Provides mutation creation, validation, and in-memory append-only log.
 *
 * Actor types:
 * - Human: wallet address (EIP-55 checksummed), e.g., "0x1234...abcd"
 * - System: "system:dixie-bff" for automated operations
 * - Autonomous: "autonomous:<nft_id>" for agent-driven operations
 *
 * See: SDD §3.3 (GovernanceMutation), PRD FR-7
 * @since cycle-007 — Sprint 75, Tasks S3-T1, S3-T2
 */
import type { GovernanceMutation } from '@0xhoneyjar/loa-hounfour/commons';

// ---------------------------------------------------------------------------
// Actor ID Strategy (S3-T2)
// ---------------------------------------------------------------------------

/** The three actor types in Dixie's governance model. */
export type ActorType = 'human' | 'system' | 'autonomous';

/**
 * Resolve an actor_id string from context.
 *
 * Actor ID format:
 * - Human operations: wallet address as-is (EIP-55 checksummed hex)
 * - System operations: "system:dixie-bff"
 * - Autonomous operations: "autonomous:{nftId}"
 *
 * @param type - The actor type
 * @param identifier - The wallet address or nft_id (required for human/autonomous)
 * @returns A formatted actor_id string
 * @since cycle-007 — Sprint 75, Task S3-T2
 */
export function resolveActorId(type: ActorType, identifier?: string): string {
  switch (type) {
    case 'human':
      if (!identifier) throw new Error('Human actor requires wallet address');
      return identifier;
    case 'system':
      return 'system:dixie-bff';
    case 'autonomous':
      if (!identifier) throw new Error('Autonomous actor requires nft_id');
      return `autonomous:${identifier}`;
  }
}

// ---------------------------------------------------------------------------
// Mutation Creation (S3-T1)
// ---------------------------------------------------------------------------

/**
 * Create a GovernanceMutation envelope with required actor_id.
 *
 * @param actorId - The actor performing the mutation (from resolveActorId)
 * @param expectedVersion - The expected resource version (optimistic concurrency)
 * @returns A valid GovernanceMutation envelope
 * @since cycle-007 — Sprint 75, Task S3-T1
 */
export function createMutation(actorId: string, expectedVersion: number): GovernanceMutation {
  if (!actorId) {
    throw new Error('actor_id is required for governance mutations (v8.1.0)');
  }
  return {
    mutation_id: crypto.randomUUID(),
    expected_version: expectedVersion,
    mutated_at: new Date().toISOString(),
    actor_id: actorId,
  };
}

// ---------------------------------------------------------------------------
// Mutation Log (S3-T1)
// ---------------------------------------------------------------------------

/**
 * In-memory append-only mutation log.
 *
 * Stores governance mutations in chronological order. The log is append-only:
 * entries cannot be modified or deleted. This provides an audit trail of
 * all governance mutations for debugging and compliance.
 *
 * @since cycle-007 — Sprint 75, Task S3-T1
 */
export class MutationLog {
  private readonly entries: GovernanceMutation[] = [];
  private currentVersion: number = 0;

  /**
   * Append a mutation to the log.
   *
   * Validates the expected_version against the current version.
   * If versions mismatch, throws an error (optimistic concurrency conflict).
   *
   * @param mutation - The governance mutation to append
   * @throws Error if expected_version does not match current version
   */
  append(mutation: GovernanceMutation): void {
    if (mutation.expected_version !== this.currentVersion) {
      throw new Error(
        `Version conflict: expected ${mutation.expected_version}, current ${this.currentVersion}`,
      );
    }
    this.entries.push(mutation);
    this.currentVersion++;
  }

  /** Get the current version number. */
  get version(): number {
    return this.currentVersion;
  }

  /** Get the full mutation history (read-only). */
  get history(): ReadonlyArray<GovernanceMutation> {
    return this.entries;
  }

  /** Get the most recent mutation, or undefined if empty. */
  get latest(): GovernanceMutation | undefined {
    return this.entries[this.entries.length - 1];
  }

  /** Clear the log (testing utility). */
  clear(): void {
    this.entries.length = 0;
    this.currentVersion = 0;
  }
}
