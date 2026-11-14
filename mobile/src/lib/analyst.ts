export interface AnalystMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnalystStatus {
  data: Record<string, string>;
  chat_configured: boolean;
}

export interface AnalystReply {
  answer: string;
  data_status: Record<string, string>;
}

const API_URL = (process.env.EXPO_PUBLIC_ANALYST_API_URL ?? '').replace(/\/+$/, '');

export const analystEnabled = process.env.EXPO_PUBLIC_ANALYST_ENABLED === 'true';

function requireUrl() {
  if (!API_URL) {
    throw new Error('Set EXPO_PUBLIC_ANALYST_API_URL in mobile/.env, then restart Expo.');
  }
  return API_URL;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${requireUrl()}${path}`, init);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error('Cannot reach the analyst service. Check the server address and connection.');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('The analyst service returned an unreadable response.');
  }

  if (!response.ok) {
    const detail =
      typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string'
        ? body.detail
        : 'The analyst request could not be completed.';
    throw new Error(detail);
  }
  return body as T;
}

export function getAnalystStatus(signal?: AbortSignal) {
  return request<AnalystStatus>('/api/status', { signal });
}

export function askAnalyst(
  question: string,
  history: AnalystMessage[],
  signal?: AbortSignal,
) {
  return request<AnalystReply>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history: history.slice(-8) }),
    signal,
  });
}
