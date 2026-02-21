import { useState, useEffect, useCallback } from 'react';
import type { ConvictionTier } from '../components/ConvictionBadge.js';

interface ConvictionState {
  tier: ConvictionTier;
  bgtStaked: number;
  modelPool: string;
  source: string;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to read conviction tier from response headers.
 *
 * The conviction tier is resolved server-side by the conviction-tier middleware
 * and returned in the X-Conviction-Tier response header on every API response.
 * This hook extracts tier info from the last API response.
 */
export function useConviction(): ConvictionState & { refresh: () => void } {
  const [state, setState] = useState<ConvictionState>({
    tier: 'observer',
    bgtStaked: 0,
    modelPool: 'pool_observer',
    source: 'default',
    loading: true,
    error: null,
  });

  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    // Fetch conviction tier from a lightweight API call (health endpoint returns headers)
    fetch('/api/health', { credentials: 'include' })
      .then((res) => {
        const tier = (res.headers.get('x-conviction-tier') ?? 'observer') as ConvictionTier;
        const modelPool = res.headers.get('x-model-pool') ?? 'pool_observer';
        const source = res.headers.get('x-conviction-source') ?? 'default';

        setState({
          tier,
          bgtStaked: 0, // BGT amount not returned in headers — display only
          modelPool,
          source,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch conviction tier',
        }));
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
