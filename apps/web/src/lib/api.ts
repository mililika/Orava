// The only place in the web app that talks to our server. Every request and response shape comes
// from @orava/contracts. Each request carries the Supabase Auth access token (lib/auth.ts).

import {
  AccountResponse,
  AiLimitDetails,
  ApiErrorBody,
  ChatEvent,
  type ChatRequest,
  type CreateTransactionRequest,
  CreateTransactionResponse,
  type ErrorCode,
  type OverviewDto,
  OverviewResponse,
} from '@orava/contracts';
import type { Account } from '@orava/core';
// expo/fetch streams response bodies (the chat) on every platform; on web it's the browser's fetch.
import { fetch } from 'expo/fetch';

import { reportLimit } from './aiLimit';
import { accessToken, signOut } from './auth';

/** Any zod schema from @orava/contracts (zod itself isn't a dependency of the web app). */
type Schema<T> = { parse(data: unknown): T };

/** For 204 responses, which have no body to check. */
const NO_CONTENT: Schema<void> = { parse: () => undefined };

// Empty in production: the API is on the same origin, behind Vercel's /api rewrite.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? 'http://localhost:8080' : '');

/** A failed call. `message` is safe to show; `code` is what to switch on. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'network',
    message: string,
    /** Extra machine-readable info, e.g. `AiLimitDetails` for `ai_limit`. */
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** For 429 `ai_limit`: when the user can ask again, and their hourly limit. */
  get aiLimit(): AiLimitDetails | null {
    if (this.code !== 'ai_limit') return null;
    const parsed = AiLimitDetails.safeParse(this.details);
    return parsed.success ? parsed.data : null;
  }
}

/**
 * AI errors that are part of normal use, so not worth a console warning: no AI on the server, or
 * the AI limit (the limit modal shows that).
 */
export const isExpectedAiError = (e: unknown) =>
  e instanceof ApiError && (e.code === 'ai_unavailable' || e.code === 'ai_limit');

/** Sends a request with the access token; returns the response once it's OK, else throws ApiError. */
async function send(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
  signal?: AbortSignal,
) {
  const token = await accessToken();
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new ApiError(0, 'network', 'Cannot reach the server. Check your connection.');
  }
  if (res.ok) return res;

  const parsed = ApiErrorBody.safeParse(await res.json().catch(() => null));
  // The session ended or the login has no Orava account: end it here too. App's onSignedOut
  // listener then shows the login screen.
  if (res.status === 401) await signOut();
  if (!parsed.success) throw new ApiError(res.status, 'internal', `Server error (${res.status}).`);
  const { code, message, details } = parsed.data.error;
  const error = new ApiError(res.status, code, message, details);
  // Orava's AI limit: LimitModal shows the server's message and when the user can ask again.
  if (error.aiLimit) reportLimit({ message, retryAt: error.aiLimit.retryAt });
  throw error;
}

async function request<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  schema: Schema<T>,
  body?: unknown,
): Promise<T> {
  const res = await send(method, path, body);
  if (res.status === 204) return undefined as T;
  const json: unknown = await res.json();
  // In development, a server/client mismatch fails loudly here instead of somewhere in the UI.
  return __DEV__ ? schema.parse(json) : (json as T);
}

export function getAccount(): Promise<Account> {
  return request('GET', '/account', AccountResponse);
}

export function createTransaction(
  body: CreateTransactionRequest,
): Promise<CreateTransactionResponse> {
  return request('POST', '/transactions', CreateTransactionResponse, body);
}

export function deleteTransaction(id: string): Promise<void> {
  return request('DELETE', `/transactions/${encodeURIComponent(id)}`, NO_CONTENT);
}

/** Orava's read of a month (Gemini, cached on the server until the month's data changes). */
export async function getOverview(month: string): Promise<OverviewDto> {
  const { overview } = await request(
    'GET',
    `/ai/overview?month=${encodeURIComponent(month)}`,
    OverviewResponse,
  );
  return overview;
}

/**
 * Asks Orava. `onText` gets the reply so far as it streams in; resolves with the whole reply.
 * Throws ApiError if there's no reply: before the stream (limit, no AI, network), an `error`
 * event, or a stream that ends without `done`.
 */
export async function streamChat(
  body: ChatRequest,
  onText: (soFar: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await send('POST', '/ai/chat', body, signal);
  let reply: string | null = null;
  const onEvent = (event: ChatEvent) => {
    if (event.type === 'delta') onText(event.text);
    else if (event.type === 'done') reply = event.text;
    else throw new ApiError(502, 'internal', event.message);
  };
  // Each event is a "data: {json}" line followed by a blank line; one can span network chunks.
  const take = (lines: string[]) => {
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      let data: unknown;
      try {
        data = JSON.parse(line.slice(5));
      } catch {
        continue; // a malformed line
      }
      const event = ChatEvent.safeParse(data);
      if (event.success) onEvent(event.data);
    }
  };
  const reader = res.body?.getReader();
  if (!reader) take((await res.text()).split(/\r?\n/));
  const decoder = new TextDecoder();
  let buffer = '';
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    take(lines);
  }
  if (reader) take([buffer + decoder.decode()]);
  if (reply === null) throw new ApiError(502, 'internal', 'The reply ended early.');
  return reply;
}
