// The only place in the web app that talks to our server. Every request and response shape comes
// from @orava/contracts. Each request carries the Supabase Auth access token (lib/auth.ts).

import { AccountResponse, ApiErrorBody, type ErrorCode } from '@orava/contracts';
import type { Account } from '@orava/core';

import { accessToken, signOut } from './auth';

/** Any zod schema from @orava/contracts (zod itself isn't a dependency of the web app). */
type Schema<T> = { parse(data: unknown): T };

// Empty in production: the API is on the same origin, behind Vercel's /api rewrite.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? 'http://localhost:8080' : '');

/** A failed call. `message` is safe to show; `code` is what to switch on. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'network',
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  schema: Schema<T>,
  body?: unknown,
): Promise<T> {
  const token = await accessToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network', 'Cannot reach the server. Check your connection.');
  }

  if (!res.ok) {
    const parsed = ApiErrorBody.safeParse(await res.json().catch(() => null));
    // The session ended or the login has no Orava account: end it here too. App's onSignedOut
    // listener then shows the login screen.
    if (res.status === 401) await signOut();
    throw parsed.success
      ? new ApiError(res.status, parsed.data.error.code, parsed.data.error.message)
      : new ApiError(res.status, 'internal', `Server error (${res.status}).`);
  }

  const json: unknown = await res.json();
  // In development, a server/client mismatch fails loudly here instead of somewhere in the UI.
  return __DEV__ ? schema.parse(json) : (json as T);
}

/** The signed-in user's balance and transactions, newest first. 401 when signed out. */
export function getAccount(): Promise<Account> {
  return request('GET', '/account', AccountResponse);
}
