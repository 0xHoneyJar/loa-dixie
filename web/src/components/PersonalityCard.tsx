import React from 'react';

export interface PersonalityData {
  nftId: string;
  name: string;
  traits: string[];
  antiNarration: string[];
  damp96Summary: Record<string, number>;
  version: string;
  lastEvolved: string;
}

interface Props {
  personality: PersonalityData;
}

/**
 * PersonalityCard — Phase 2 component for BEAUVOIR personality display.
 *
 * Shows the agent's personality traits, anti-narration boundaries,
 * and dAMP-96 personality dials. Part of FR-3 personality surfacing.
 */
export const PersonalityCard: React.FC<Props> = ({ personality }) => {
  const dials = Object.entries(personality.damp96Summary);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-honey-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-honey-200 dark:border-honey-800 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-honey-500 flex items-center justify-center text-white font-bold text-lg">
          {personality.name.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {personality.name}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            v{personality.version}
          </span>
        </div>
      </div>

      {/* Traits */}
      <div className="mb-3">
        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">
          Personality Traits
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {personality.traits.map((trait) => (
            <span
              key={trait}
              className="px-2 py-0.5 text-xs rounded-full bg-honey-100 dark:bg-honey-900 text-honey-700 dark:text-honey-300"
            >
              {trait}
            </span>
          ))}
        </div>
      </div>

      {/* Anti-narration (personality boundaries) */}
      {personality.antiNarration.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">
            Personality Boundaries
          </h4>
          <ul className="space-y-0.5">
            {personality.antiNarration.map((constraint, idx) => (
              <li
                key={idx}
                className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-1.5"
              >
                <span className="text-red-400 mt-0.5 shrink-0">—</span>
                {constraint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* dAMP-96 dials */}
      {dials.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">
            Personality Dials
          </h4>
          <div className="space-y-1.5">
            {dials.map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-300 w-24 truncate">
                  {formatDialName(key)}
                </span>
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-honey-500 rounded-full transition-all"
                    style={{ width: `${Math.round(value * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">
                  {Math.round(value * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last evolved timestamp */}
      <div className="mt-3 pt-2 border-t border-honey-200 dark:border-honey-800">
        <span className="text-xs text-gray-400">
          Last evolved: {new Date(personality.lastEvolved).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

function formatDialName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
