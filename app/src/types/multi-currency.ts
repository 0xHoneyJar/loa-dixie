/**
 * Multi-Currency Budget Types — Foundation for ResourceGovernor multi-currency awareness.
 *
 * The THJ ecosystem operates with multiple value-denominated resources:
 * - micro-usd: Primary budget unit for autonomous operations
 * - review-tokens: Community-issued tokens for peer review participation
 * - imagination-credits: Creative output budget per community
 *
 * These types provide the scaffold for ResourceGovernor<T> to manage budgets
 * denominated in any currency, enabling per-community economic policies.
 *
 * Relationship to existing code:
 * - `DixieConfig.autonomousBudgetDefaultMicroUsd` → expressed as `CurrencyAmount<typeof MICRO_USD>`
 * - `ResourceGovernor.budget` → will evolve to `MultiBudget` in a future sprint
 *
 * @since Sprint 7 (G-71) — Task 7.4: Multi-currency budget type scaffold
 */

/**
 * A currency definition in the THJ ecosystem.
 *
 * Community-scoped currencies enable per-community economic policies:
 * Community A might have generous creative budgets but strict review limits,
 * while Community B has the opposite configuration.
 */
export interface Currency {
  /** Currency code (e.g., 'micro-usd', 'review-tokens', 'imagination-credits') */
  readonly code: string;
  /** Decimal precision (6 for micro-usd, 0 for tokens) */
  readonly decimals: number;
  /** Optional community scope — null means global (cross-community) */
  readonly community?: string;
}

/**
 * A specific amount of a currency.
 *
 * Uses bigint for amount to avoid floating-point precision issues
 * in financial calculations. The actual value is amount / 10^decimals.
 */
export interface CurrencyAmount<C extends Currency = Currency> {
  /** The currency this amount is denominated in */
  readonly currency: C;
  /** Amount in the smallest unit (e.g., micro-USD for 'micro-usd') */
  readonly amount: bigint;
}

/**
 * Multi-currency budget — balances across multiple currencies.
 *
 * The defaultCurrency determines which balance is checked when
 * a budget operation doesn't specify a currency explicitly.
 */
export interface MultiBudget {
  /** Map from currency code to balance */
  readonly balances: ReadonlyMap<string, CurrencyAmount>;
  /** The currency code used when none is specified */
  readonly defaultCurrency: string;
}

/** Standard currencies used in the THJ ecosystem */
export const MICRO_USD: Currency = { code: 'micro-usd', decimals: 6 } as const;
