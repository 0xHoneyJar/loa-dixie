import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { MemoryContext } from '../components/MemoryPanel';

export interface MemoryState {
  memory: MemoryContext | null;
  isLoading: boolean;
  error: string | null;
}

interface MemoryProjectionResponse {
  nftId: string;
  projection: {
    totalEvents: number;
    recentTopics: string[];
    lastAccessedAt: string;
    conversationCount: number;
    tokenBudget: number;
  } | null;
}

/**
 * useMemory — State management hook for soul memory context.
 *
 * Fetches memory projection from /api/memory/:nftId on mount.
 * Maps the response to the MemoryContext shape consumed by MemoryPanel.
 */
export function useMemory(nftId: string | null) {
  const [state, setState] = useState<MemoryState>({
    memory: null,
    isLoading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    if (!nftId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await api.get<MemoryProjectionResponse>(
        `/api/memory/${encodeURIComponent(nftId)}`,
      );

      if (!result.projection) {
        setState({ memory: null, isLoading: false, error: null });
        return;
      }

      const memory: MemoryContext = {
        contextTokens: result.projection.tokenBudget,
        topics: result.projection.recentTopics,
        conversationCount: result.projection.conversationCount,
        lastAccessed: result.projection.lastAccessedAt,
      };

      setState({ memory, isLoading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load memory',
      }));
    }
  }, [nftId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refresh: fetch };
}
