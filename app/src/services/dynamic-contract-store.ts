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

    await this.pool.query(
      `INSERT INTO dynamic_contracts (nft_id, contract_id, contract_data, contract_version)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (nft_id) DO UPDATE SET
         contract_data = $3,
         contract_version = $4,
         updated_at = now()`,
      [
        nftId,
        contract.contract_id,
        JSON.stringify(contract),
        contract.contract_version,
      ],
    );
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
