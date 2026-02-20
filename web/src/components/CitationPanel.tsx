import React, { useState } from 'react';
import type { KnowledgeEvent } from '../lib/ws';

interface Props {
  knowledge: KnowledgeEvent['data'];
}

export const CitationPanel: React.FC<Props> = ({ knowledge }) => {
  const [expanded, setExpanded] = useState(false);

  if (!knowledge.sources_used.length) return null;

  return (
    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-500 dark:text-gray-400 hover:text-honey-500 transition-colors"
      >
        Sources: {knowledge.sources_used.join(', ')}
        <span className="ml-1">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1">
          {knowledge.sources_used.map((source) => (
            <div
              key={source}
              className="text-xs bg-gray-50 dark:bg-gray-900 rounded px-2 py-1"
            >
              {source}
            </div>
          ))}
          <div className="text-xs text-gray-400 mt-1">
            Mode: {knowledge.mode} · Tokens: {knowledge.tokens_used}
          </div>
        </div>
      )}
    </div>
  );
};
