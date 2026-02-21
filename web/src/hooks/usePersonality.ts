import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { PersonalityData } from '../components/PersonalityCard';

export interface PersonalityState {
  personality: PersonalityData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * usePersonality — State management hook for BEAUVOIR personality data.
 *
 * Fetches personality from /api/personality/:nftId on mount.
 * Provides refresh capability for personality evolution events.
 */
export function usePersonality(nftId: string | null) {
  const [state, setState] = useState<PersonalityState>({
    personality: null,
    isLoading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    if (!nftId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await api.get<PersonalityData>(
        `/api/personality/${encodeURIComponent(nftId)}`,
      );
      setState({ personality: result, isLoading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load personality',
      }));
    }
  }, [nftId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refresh: fetch };
}
