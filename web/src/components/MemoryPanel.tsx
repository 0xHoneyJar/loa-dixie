import React, { useState } from 'react';

export interface MemoryContext {
  contextTokens: number;
  topics: string[];
  conversationCount?: number;
  lastAccessed?: string;
}

interface Props {
  memory: MemoryContext | null;
  isActive: boolean;
}

/**
 * MemoryPanel — Phase 2 component for soul memory display.
 *
 * Shows active memory context summary, recent topics, and conversation count.
 * Visually communicates that "it remembers me" — the key differentiator (PRD FR-1).
 */
export const MemoryPanel: React.FC<Props> = ({ memory, isActive }) => {
  const [expanded, setExpanded] = useState(false);

  if (!memory) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 italic px-3 py-2">
        No memory context active
      </div>
    );
  }

  return (
    <div className="border border-green-200 dark:border-green-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900 transition-colors text-left"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`}
        />
        <span className="text-xs font-medium text-green-700 dark:text-green-300">
          Soul Memory
        </span>
        <span className="text-xs text-green-500 dark:text-green-400 ml-auto">
          {memory.contextTokens} tokens
        </span>
        <span className="text-xs">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="px-3 py-2 bg-white dark:bg-gray-800 space-y-2">
          {/* Active topics */}
          {memory.topics.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Recent Topics
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {memory.topics.map((topic) => (
                  <span
                    key={topic}
                    className="px-1.5 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            {memory.conversationCount !== undefined && (
              <span>
                {memory.conversationCount} conversation{memory.conversationCount !== 1 ? 's' : ''}
              </span>
            )}
            {memory.lastAccessed && (
              <span>
                Last: {new Date(memory.lastAccessed).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
