import React from 'react';
import { Chat } from './components/Chat';
import { WalletConnect } from './components/WalletConnect';
import { useAuth } from './hooks/useAuth';
import { useChat } from './hooks/useChat';

export const App: React.FC = () => {
  const auth = useAuth();
  const chat = useChat();

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <span className="text-xl">🐝</span>
          <span className="font-semibold text-lg">Dixie</span>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            Oracle
          </span>
        </div>
        <WalletConnect auth={auth} />
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-hidden">
        <Chat
          messages={chat.messages}
          isLoading={chat.isLoading}
          error={chat.error}
          onSend={chat.sendMessage}
          onNewSession={chat.newSession}
        />
      </main>
    </div>
  );
};
