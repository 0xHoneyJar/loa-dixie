import React, { useState } from 'react';
import type { ReasoningTraceEvent } from '../lib/ws';

interface Props {
  traces: ReasoningTraceEvent['data'][];
}

/**
 * ReasoningTrace — Phase 2 component for "show thinking" toggle.
 *
 * Renders the agent's reasoning steps in a collapsible panel.
 * Opt-in: only shown when the user enables "show thinking" mode.
 * Part of process transparency (SDD §4.4).
 */
export const ReasoningTrace: React.FC<Props> = ({ traces }) => {
  const [expanded, setExpanded] = useState(false);

  if (!traces.length) return null;

  return (
    <div className="mt-2 border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors text-purple-700 dark:text-purple-300"
      >
        <span className="font-medium">Thinking</span>
        <span className="text-purple-400 dark:text-purple-500">
          {traces.length} step{traces.length !== 1 ? 's' : ''}
        </span>
        <span className="ml-auto">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="px-3 py-2 space-y-2 bg-white dark:bg-gray-800">
          {traces.map((trace) => (
            <div key={trace.step} className="text-xs">
              <span className="font-mono text-purple-500 dark:text-purple-400 mr-2">
                {trace.step}.
              </span>
              <span className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {trace.thought}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
