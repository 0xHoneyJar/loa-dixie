import { useState, useCallback, useRef } from 'react';
import { api, getAuthToken } from '../lib/api';
import {
  connectChatStream,
  type ChatStreamEvent,
  type KnowledgeEvent,
  type ToolCallEvent,
} from '../lib/ws';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  knowledge?: KnowledgeEvent['data'];
  toolCalls?: ToolCallEvent['data'][];
}

export interface ChatState {
  messages: ChatMessage[];
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Chat state management hook.
 * Sends messages via HTTP, receives streaming responses via WebSocket.
 */
export function useChat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    sessionId: null,
    isLoading: false,
    error: null,
  });

  const streamRef = useRef<{ close: () => void } | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: text,
      };

      // Optimistic user message
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        isLoading: true,
        error: null,
      }));

      try {
        const result = await api.sendChat(text, state.sessionId ?? undefined);

        // Create assistant message placeholder
        const assistantMsg: ChatMessage = {
          id: result.messageId,
          role: 'assistant',
          content: '',
          isStreaming: true,
          toolCalls: [],
        };

        setState((prev) => ({
          ...prev,
          sessionId: result.sessionId,
          messages: [...prev.messages, assistantMsg],
        }));

        // Connect WebSocket for streaming
        const token = getAuthToken();
        if (token) {
          streamRef.current?.close();
          streamRef.current = connectChatStream(
            result.sessionId,
            token,
            (event: ChatStreamEvent) => {
              setState((prev) => {
                const messages = [...prev.messages];
                const lastIdx = messages.length - 1;
                const last = messages[lastIdx];
                if (!last || last.role !== 'assistant') return prev;

                switch (event.type) {
                  case 'chunk':
                    messages[lastIdx] = {
                      ...last,
                      content:
                        last.content +
                        (event.data as { content: string }).content,
                    };
                    break;
                  case 'tool_call':
                    messages[lastIdx] = {
                      ...last,
                      toolCalls: [
                        ...(last.toolCalls ?? []),
                        event.data as ToolCallEvent['data'],
                      ],
                    };
                    break;
                  case 'knowledge':
                    messages[lastIdx] = {
                      ...last,
                      knowledge: event.data as KnowledgeEvent['data'],
                    };
                    break;
                  case 'done':
                    messages[lastIdx] = {
                      ...last,
                      content:
                        (event.data as { content: string }).content ||
                        last.content,
                      isStreaming: false,
                    };
                    break;
                  case 'error':
                    messages[lastIdx] = {
                      ...last,
                      content:
                        last.content ||
                        (event.data as { message: string }).message,
                      isStreaming: false,
                    };
                    break;
                }

                return { ...prev, messages, isLoading: false };
              });
            },
            () => {
              setState((prev) => ({ ...prev, isLoading: false }));
            },
          );
        }
      } catch (err) {
        const errorMsg =
          err instanceof Object && 'message' in err
            ? (err as { message: string }).message
            : 'Failed to send message';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMsg,
        }));
      }
    },
    [state.sessionId],
  );

  const newSession = useCallback(() => {
    streamRef.current?.close();
    setState({
      messages: [],
      sessionId: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return { ...state, sendMessage, newSession };
}
