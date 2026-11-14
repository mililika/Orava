export interface OravaChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OravaMoneySummary {
  period: string;
  income: number;
  spending: number;
  score: number;
  health_message: string;
  health_reasons: string[];
  safe_to_spend_this_week: string;
  safe_to_spend_remaining: number;
  per_day_after_today: number;
  everyday_extras: string;
  everyday_extras_change: string;
  kept_rate: string;
  breakdown: Record<string, number>;
}

export interface OravaStatus {
  data: Record<string, string>;
  chat_configured: boolean;
}

interface OravaReply {
  answer: string;
  data_status: Record<string, string>;
}

const API_URL = (process.env.EXPO_PUBLIC_ORAVA_API_URL ?? '').replace(/\/+$/, '');

function requireUrl() {
  if (!API_URL) {
    throw new Error('Set EXPO_PUBLIC_ORAVA_API_URL in mobile/.env, then restart Expo.');
  }
  return API_URL;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = requireUrl();
  let response: Response;
  try {
    response = await fetch(`${url}${path}`, init);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error('Cannot reach Ask Orava. Check the server address and connection.');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('Ask Orava returned an unreadable response.');
  }

  if (!response.ok) {
    const detail =
      typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string'
        ? body.detail
        : 'Ask Orava could not complete the request.';
    throw new Error(detail);
  }
  return body as T;
}

export function getOravaStatus(signal?: AbortSignal) {
  return request<OravaStatus>('/api/status', { signal });
}

export function askOrava(
  question: string,
  history: OravaChatMessage[],
  moneySummary: OravaMoneySummary,
  signal?: AbortSignal,
) {
  return request<OravaReply>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history: history.slice(-8), money_summary: moneySummary }),
    signal,
  });
}
