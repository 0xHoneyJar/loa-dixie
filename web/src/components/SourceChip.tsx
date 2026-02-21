import React from 'react';
import type { SourceSelectionEvent } from '../lib/ws';

interface Props {
  sources: SourceSelectionEvent['data']['sources'];
  classification?: string[];
}

/**
 * SourceChip — Phase 2 component for displaying knowledge source selections.
 *
 * Shows which sources the agent consulted before generating a response,
 * with relevance indicators. Part of the "process transparency" layer (SDD §4.4).
 */
export const SourceChip: React.FC<Props> = ({ sources, classification }) => {
  if (!sources.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {sources.map((source) => (
        <span
          key={source.name}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
          title={`${source.type} · relevance: ${Math.round(source.relevance * 100)}%`}
        >
          <span className="opacity-60">{sourceIcon(source.type)}</span>
          <span className="font-medium">{source.name}</span>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: relevanceColor(source.relevance) }}
          />
        </span>
      ))}
      {classification && classification.length > 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500 self-center ml-1">
          {classification.join(' · ')}
        </span>
      )}
    </div>
  );
};

function sourceIcon(type: string): string {
  switch (type) {
    case 'knowledge_base': return 'KB';
    case 'tool': return 'T';
    case 'memory': return 'M';
    case 'web': return 'W';
    default: return '?';
  }
}

function relevanceColor(relevance: number): string {
  if (relevance >= 0.8) return '#22c55e'; // green-500
  if (relevance >= 0.5) return '#eab308'; // yellow-500
  return '#6b7280'; // gray-500
}
