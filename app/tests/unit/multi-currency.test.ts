import { describe, it, expect } from 'vitest';
import { MICRO_USD } from '../../src/types/multi-currency.js';
import type { Currency, CurrencyAmount, MultiBudget } from '../../src/types/multi-currency.js';

describe('multi-currency types', () => {
  it('MICRO_USD constant has correct shape', () => {
    expect(MICRO_USD.code).toBe('micro-usd');
    expect(MICRO_USD.decimals).toBe(6);
    expect(MICRO_USD.community).toBeUndefined();
  });

  it('Currency type supports community-scoped currencies', () => {
    const communityToken: Currency = {
      code: 'review-tokens',
      decimals: 0,
      community: 'community-abc',
    };
    expect(communityToken.community).toBe('community-abc');
  });

  it('CurrencyAmount uses bigint for precision', () => {
    const amount: CurrencyAmount = {
      currency: MICRO_USD,
      amount: 100_000n, // 0.1 USD in micro-usd
    };
    expect(amount.amount).toBe(100_000n);
    expect(typeof amount.amount).toBe('bigint');
  });

  it('MultiBudget supports multiple balances', () => {
    const budget: MultiBudget = {
      balances: new Map([
        ['micro-usd', { currency: MICRO_USD, amount: 500_000n }],
      ]),
      defaultCurrency: 'micro-usd',
    };
    expect(budget.balances.get('micro-usd')?.amount).toBe(500_000n);
    expect(budget.defaultCurrency).toBe('micro-usd');
  });
});
