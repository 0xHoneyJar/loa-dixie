/** WebSocket connection manager for streaming chat */

export type StreamEventType =
  | 'chunk'
  | 'tool_call'
  | 'usage'
  | 'knowledge'
  | 'done'
  | 'error';

export interface StreamEvent {
  type: StreamEventType;
  data: unknown;
}

export interface ChunkEvent {
  type: 'chunk';
  data: { content: string };
}

export interface ToolCallEvent {
  type: 'tool_call';
  data: { name: string; args: string; status: 'running' | 'done'; result?: string };
}

export interface KnowledgeEvent {
  type: 'knowledge';
  data: {
    sources_used: string[];
    mode: 'full' | 'reduced';
    tokens_used: number;
  };
}

export interface DoneEvent {
  type: 'done';
  data: { content: string; usage?: { input: number; output: number } };
}

export interface ErrorEvent {
  type: 'error';
  data: { message: string };
}

export type ChatStreamEvent =
  | ChunkEvent
  | ToolCallEvent
  | KnowledgeEvent
  | DoneEvent
  | ErrorEvent;

export type StreamCallback = (event: ChatStreamEvent) => void;

export function connectChatStream(
  sessionId: string,
  token: string,
  onEvent: StreamCallback,
  onClose?: () => void,
): { close: () => void } {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws/chat/${sessionId}?token=${encodeURIComponent(token)}`;

  let ws: WebSocket | null = new WebSocket(url);
  let reconnectAttempts = 0;
  const maxReconnect = 3;
  let closed = false;

  function handleMessage(ev: MessageEvent) {
    try {
      const event = JSON.parse(ev.data as string) as ChatStreamEvent;
      onEvent(event);
    } catch {
      // ignore malformed messages
    }
  }

  function handleClose() {
    if (closed) return;
    if (reconnectAttempts < maxReconnect) {
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 8000);
      setTimeout(() => {
        if (closed) return;
        ws = new WebSocket(url);
        ws.onmessage = handleMessage;
        ws.onclose = handleClose;
      }, delay);
    } else {
      onClose?.();
    }
  }

  ws.onmessage = handleMessage;
  ws.onclose = handleClose;

  return {
    close() {
      closed = true;
      ws?.close();
      ws = null;
    },
  };
}
