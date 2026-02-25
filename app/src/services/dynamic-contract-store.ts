/**
 * DynamicContractStore — Durable DynamicContract persistence.
 *
 * Stores Hounfour DynamicContract state in PostgreSQL. Enforces
 * monotonic expansion verification before saving contract updates.
 *
 * @since cycle-009 Sprint 4 — Task 4.2 (FR-7)
 */
import type {
  DynamicContract,
  ProtocolSurface,
} from '../types/dynamic-contract.js';
import { verifyMonotonicExpansion } from '../types/dynamic-contract.js';
import type { DbPool } from '../db/client.js';

/**
 * Error thrown when a contract update violates monotonic expansion.
 */
export class MonotonicViolationError extends Error {
  constructor(
    readonly nftId: string,
    readonly violations: Array<{ violation_type: string; details: string }>,
  ) {
    const summary = violations
      .map((v) => `${v.violation_type}: ${v.details}`)
      .join('; ');
    super(
      `Monotonic expansion violation for ${nftId}: ${summary}`,
    );
    this.name = 'MonotonicViolationError';
  }
}

/**
 * Error thrown when a concurrent process wrote a newer contract version,
 * causing the UPSERT version guard to reject the write.
 */
export class StaleContractVersionError extends Error {
  constructor(
    readonly nftId: string,
    readonly attemptedVersion: string,
  ) {
    super(
      `Stale contract version for ${nftId}: attempted to write version ${attemptedVersion} but a newer version already exists`,
    );
    this.name = 'StaleContractVersionError';
  }
}

export class DynamicContractStore {
  constructor(private readonly pool: DbPool) {}

  /**
   * Get the active contract for an NFT.
   */
  async getContract(nftId: string): Promise<DynamicContract | undefined> {
    const result = await this.pool.query<{ contract_data: DynamicContract }>(
      'SELECT contract_data FROM dynamic_contracts WHERE nft_id = $1',
      [nftId],
    );
    return result.rows[0]?.contract_data;
  }

  /**
   * Create or update a contract. Verifies monotonic expansion before saving.
   * Throws MonotonicViolationError if the contract violates expansion.
   */
  async putContract(nftId: string, contract: DynamicContract): Promise<void> {
    // Verify monotonic expansion
    const expansionResult = verifyMonotonicExpansion(contract);
    if (!expansionResult.valid) {
      throw new MonotonicViolationError(nftId, expansionResult.violations);
    }

    const result = await this.pool.query(
      `INSERT INTO dynamic_contracts (nft_id, contract_id, contract_data, contract_version)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (nft_id) DO UPDATE SET
         contract_data = EXCLUDED.contract_data,
         contract_version = EXCLUDED.contract_version,
         updated_at = now()
       WHERE dynamic_contracts.contract_version < EXCLUDED.contract_version`,
      [
        nftId,
        contract.contract_id,
        JSON.stringify(contract),
        contract.contract_version,
      ],
    );

    // INSERT returns rowCount 1 for a fresh insert.
    // ON CONFLICT ... DO UPDATE returns rowCount 1 when the WHERE passes.
    // If the WHERE clause rejects the update (a newer version already stored),
    // rowCount is 0 — the UPSERT became a no-op.
    if (result.rowCount === 0) {
      throw new StaleContractVersionError(nftId, contract.contract_version);
    }
  }

  /**
   * Get the protocol surface for an NFT at a given reputation state.
   */
  async getSurface(
    nftId: string,
    reputationState: string,
  ): Promise<ProtocolSurface | undefined> {
    const contract = await this.getContract(nftId);
    if (!contract) return undefined;

    return contract.surfaces[reputationState as keyof typeof contract.surfaces];
  }
}
