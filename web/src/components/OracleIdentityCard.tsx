import React, { useEffect, useState } from 'react';
import { getAuthToken } from '../lib/api';

interface OracleIdentity {
  nftId: string;
  name: string;
  damp96_summary: Record<string, unknown> | null;
  beauvoir_hash: string | null;
}

interface Props {
  /** When true, card can be dismissed */
  dismissible?: boolean;
}

/**
 * Oracle Identity Card — surfaces BEAUVOIR personality metadata.
 *
 * Fetches identity from GET /api/identity/oracle and displays the Oracle's
 * personality traits derived from the dAMP-96 engine. Gracefully hidden
 * when the identity endpoint returns empty/error data.
 *
 * Sprint 16, Task 16.4 — Bridgebuilder Part III (The Soul Gap)
 */
export const OracleIdentityCard: React.FC<Props> = ({ dismissible = true }) => {
  const [identity, setIdentity] = useState<OracleIdentity | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // CODE-004: Use auth token for identity fetch (endpoint is behind allowlist)
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch('/api/identity/oracle', { headers })
      .then((res) => {
        if (!res.ok) throw new Error('Identity fetch failed');
        return res.json() as Promise<OracleIdentity>;
      })
      .then((data) => {
        if (!cancelled) setIdentity(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Graceful degradation: hidden on error or missing data
  if (error || !identity || dismissed) return null;

  // Extract personality traits from dAMP-96 summary
  const traits = identity.damp96_summary
    ? Object.entries(identity.damp96_summary)
        .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
        .slice(0, 4)
    : [];

  const truncatedHash = identity.beauvoir_hash
    ? `${identity.beauvoir_hash.slice(0, 16)}...`
    : null;

  return (
    <div className="relative border border-honey-300 dark:border-honey-600 rounded-xl p-4 bg-honey-50 dark:bg-gray-900">
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
          aria-label="Dismiss identity card"
        >
          &times;
        </button>
      )}

      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-honey-400 flex items-center justify-center text-white font-bold text-sm">
          {identity.name.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold text-sm">{identity.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {identity.nftId}
          </p>
        </div>
      </div>

      {traits.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {traits.map(([key, value]) => (
            <span
              key={key}
              className="text-xs px-2 py-0.5 rounded-full bg-honey-100 dark:bg-honey-900 text-honey-700 dark:text-honey-300"
            >
              {key}: {String(value)}
            </span>
          ))}
        </div>
      )}

      {truncatedHash && (
        <p className="text-xs text-gray-400 font-mono" title={identity.beauvoir_hash ?? ''}>
          BEAUVOIR {truncatedHash}
        </p>
      )}
    </div>
  );
};
