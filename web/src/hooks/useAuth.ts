import { useState, useCallback } from 'react';
import { api, setAuthToken } from '../lib/api';

export interface AuthState {
  wallet: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * SIWE authentication hook.
 * Manages wallet connection and JWT token lifecycle.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    wallet: null,
    isConnected: false,
    isLoading: false,
    error: null,
  });

  const connect = useCallback(async (message: string, signature: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await api.verifySiwe(message, signature);
      setAuthToken(result.token);
      setState({
        wallet: result.wallet,
        isConnected: true,
        isLoading: false,
        error: null,
      });
      return result;
    } catch (err) {
      const errorMsg =
        err instanceof Object && 'message' in err
          ? (err as { message: string }).message
          : 'Authentication failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMsg,
      }));
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    setAuthToken(null);
    setState({
      wallet: null,
      isConnected: false,
      isLoading: false,
      error: null,
    });
  }, []);

  return { ...state, connect, disconnect };
}
