/**
 * Typed HTTP client for E2E smoke tests — includes diagnostics on failure.
 */

const BASE_URL = process.env.DIXIE_E2E_URL ?? 'http://localhost:3001';

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface TypedResponse<T = unknown> {
  status: number;
  headers: Headers;
  body: T;
  raw: string;
}

/**
 * Make an HTTP request to the staging Dixie BFF.
 * On failure, includes response body and headers in the error for diagnostics.
 */
export async function request<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<TypedResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeout ?? 15_000);

  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...opts.headers,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });

    const raw = await res.text();
    let body: T;
    try {
      body = JSON.parse(raw) as T;
    } catch {
      body = raw as unknown as T;
    }

    return { status: res.status, headers: res.headers, body, raw };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`E2E request failed: ${opts.method ?? 'GET'} ${url} — ${message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Convenience: GET request.
 */
export function get<T = unknown>(path: string, opts?: Omit<RequestOptions, 'method'>) {
  return request<T>(path, { ...opts, method: 'GET' });
}

/**
 * Convenience: POST request.
 */
export function post<T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) {
  return request<T>(path, { ...opts, method: 'POST', body });
}
