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

/**
 * Connect to the chat WebSocket stream using a short-lived ticket.
 *
 * The `getTicket` callback is called before each connection (including reconnects)
 * to obtain a fresh single-use ticket. This replaces the previous pattern of passing
 * the JWT directly in the URL query string.
 *
 * @param sessionId - Chat session ID
 * @param getTicket - Async callback that returns a fresh wst_ ticket
 * @param onEvent - Called for each streaming event
 * @param onClose - Called when connection permanently closes (after max reconnects)
 */
export function connectChatStream(
  sessionId: string,
  getTicket: () => Promise<string>,
  onEvent: StreamCallback,
  onClose?: () => void,
): { close: () => void } {
  let ws: WebSocket | null = null;
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
        connect();
      }, delay);
    } else {
      onClose?.();
    }
  }

  function connect() {
    getTicket()
      .then((ticket) => {
        if (closed) return;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${window.location.host}/ws/chat/${sessionId}?ticket=${encodeURIComponent(ticket)}`;
        ws = new WebSocket(url);
        ws.onmessage = handleMessage;
        ws.onclose = handleClose;
        // RES-002: Reset reconnect counter on successful connection
        ws.onopen = () => { reconnectAttempts = 0; };
      })
      .catch(() => {
        // Ticket acquisition failed — treat as connection failure
        handleClose();
      });
  }

  // Initial connection
  connect();

  return {
    close() {
      closed = true;
      ws?.close();
      ws = null;
    },
  };
}
