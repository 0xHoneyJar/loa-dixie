import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { CitationPanel } from './CitationPanel';
import { ToolUseDisplay } from './ToolUseDisplay';
import type { ChatMessage } from '../hooks/useChat';

interface Props {
  message: ChatMessage;
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-honey-500 text-white'
            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div className="prose dark:prose-invert prose-sm max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                {message.content}
              </ReactMarkdown>
            </div>

            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-honey-400 animate-pulse ml-1" />
            )}

            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolUseDisplay toolCalls={message.toolCalls} />
            )}

            {message.knowledge && (
              <CitationPanel knowledge={message.knowledge} />
            )}
          </>
        )}
      </div>
    </div>
  );
};
