/** Typed HTTP client for the Dixie BFF API */

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function apiFetch<T>(
  path: string,
  opts?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts?.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(path, { ...opts, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, ...body };
  }

  return res.json() as Promise<T>;
}

export interface ChatResponse {
  sessionId: string;
  messageId: string;
}

export interface SessionSummary {
  id: string;
  firstMessage: string;
  createdAt: string;
}

export const api = {
  /** Generic GET request */
  get<T>(path: string): Promise<T> {
    return apiFetch<T>(path);
  },

  sendChat(prompt: string, sessionId?: string): Promise<ChatResponse> {
    return apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, sessionId }),
    });
  },

  listSessions(): Promise<SessionSummary[]> {
    return apiFetch('/api/sessions');
  },

  verifySiwe(
    message: string,
    signature: string,
  ): Promise<{ token: string; wallet: string }> {
    return apiFetch('/api/auth/siwe', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    });
  },

  verifyToken(): Promise<{ wallet: string; role: string }> {
    return apiFetch('/api/auth/verify');
  },
};
