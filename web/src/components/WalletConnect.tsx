import React from 'react';
import type { AuthState } from '../hooks/useAuth';

interface Props {
  auth: AuthState & {
    connect: (message: string, signature: string) => Promise<unknown>;
    disconnect: () => void;
  };
}

/**
 * Wallet connection button.
 * In Phase 1, uses a simplified flow. Full wagmi integration in Phase 2.
 */
export const WalletConnect: React.FC<Props> = ({ auth }) => {
  if (auth.isLoading) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
      >
        Connecting...
      </button>
    );
  }

  if (auth.isConnected && auth.wallet) {
    const truncated = `${auth.wallet.slice(0, 6)}...${auth.wallet.slice(-4)}`;
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
          {truncated}
        </span>
        <button
          onClick={auth.disconnect}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        // Placeholder — full SIWE flow wired with wagmi in Phase 2
        // For now, show an alert
        alert('Connect your wallet to access the Oracle. Full SIWE flow coming in Phase 2.');
      }}
      className="px-4 py-2 bg-honey-500 hover:bg-honey-600 text-white rounded-lg text-sm font-medium transition-colors"
    >
      Connect Wallet
    </button>
  );
};
