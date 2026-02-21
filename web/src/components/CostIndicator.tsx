import React from 'react';
import type { EconomicEvent } from '../lib/ws';

interface Props {
  economic: EconomicEvent['data'];
}

/**
 * CostIndicator — Phase 2 component for per-message cost transparency.
 *
 * Displays inference cost in a human-readable format with token breakdown.
 * Part of the Web4 economic relationship (PRD FR-7).
 */
export const CostIndicator: React.FC<Props> = ({ economic }) => {
  const costCents = economic.cost_micro_usd / 10_000;
  const displayCost = costCents < 0.01
    ? '<$0.01'
    : `$${costCents.toFixed(2)}`;

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-1">
      <span title={`${economic.cost_micro_usd} micro-USD`}>
        {displayCost}
      </span>
      <span className="opacity-50">·</span>
      <span className="font-mono" title={`Model: ${economic.model}`}>
        {shortModelName(economic.model)}
      </span>
      <span className="opacity-50">·</span>
      <span title={tokenBreakdownTitle(economic.tokens)}>
        {economic.tokens.total.toLocaleString()} tokens
      </span>
    </div>
  );
};

function shortModelName(model: string): string {
  if (model.includes('opus')) return 'Opus';
  if (model.includes('sonnet')) return 'Sonnet';
  if (model.includes('haiku')) return 'Haiku';
  if (model.includes('gpt-4o-mini')) return '4o-mini';
  if (model.includes('gpt-4o')) return 'GPT-4o';
  return model.split('-').pop() ?? model;
}

function tokenBreakdownTitle(tokens: EconomicEvent['data']['tokens']): string {
  const parts = [
    `Prompt: ${tokens.prompt}`,
    `Completion: ${tokens.completion}`,
  ];
  if (tokens.memory_context > 0) parts.push(`Memory: ${tokens.memory_context}`);
  if (tokens.knowledge > 0) parts.push(`Knowledge: ${tokens.knowledge}`);
  parts.push(`Total: ${tokens.total}`);
  return parts.join('\n');
}
