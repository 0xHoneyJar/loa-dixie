import React, { useState } from 'react';
import type { ToolCallEvent } from '../lib/ws';

interface Props {
  toolCalls: ToolCallEvent['data'][];
}

export const ToolUseDisplay: React.FC<Props> = ({ toolCalls }) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!toolCalls.length) return null;

  return (
    <div className="mt-2 space-y-1">
      {toolCalls.map((tool, idx) => (
        <div
          key={idx}
          className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
        >
          <button
            onClick={() =>
              setExpandedIdx(expandedIdx === idx ? null : idx)
            }
            className="w-full flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {tool.status === 'running' ? (
              <span className="w-3 h-3 border-2 border-honey-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-green-500">✓</span>
            )}
            <span className="font-mono font-medium">{tool.name}</span>
            <span className="text-gray-400 truncate flex-1 text-left">
              {tool.args.slice(0, 60)}
              {tool.args.length > 60 ? '...' : ''}
            </span>
            <span>{expandedIdx === idx ? '▼' : '▶'}</span>
          </button>

          {expandedIdx === idx && (
            <div className="px-3 py-2 bg-white dark:bg-gray-800">
              <p className="font-mono text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {tool.args}
              </p>
              {tool.result && (
                <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 whitespace-pre-wrap">
                    {tool.result.slice(0, 500)}
                    {tool.result.length > 500 ? '...' : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
