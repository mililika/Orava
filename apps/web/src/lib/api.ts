// The only place in the web app that talks to our server. Every request and response shape comes
// from @orava/contracts. The session is an httpOnly cookie the browser sends by itself
// (`credentials: 'include'`); this code never sees it.

import {
  AccountResponse,
  ApiErrorBody,
  type ErrorCode,
  type LoginRequest,
  LoginResponse,
  MeResponse,
  type UserDto,
} from '@orava/contracts';
import type { Account } from '@orava/core';

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

let onUnauthorized: (() => void) | undefined;

/** Called on every 401, e.g. when the session expired: App.tsx goes back to the login screen. */
export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  onUnauthorized = handler;
}

async function request<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  schema: Schema<T> | null,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network', 'Cannot reach the server. Check your connection.');
  }

  if (!res.ok) {
    const parsed = ApiErrorBody.safeParse(await res.json().catch(() => null));
    if (res.status === 401) onUnauthorized?.();
    throw parsed.success
      ? new ApiError(res.status, parsed.data.error.code, parsed.data.error.message)
      : new ApiError(res.status, 'internal', `Server error (${res.status}).`);
  }

  if (!schema) return undefined as T;
  const json: unknown = await res.json();
  // In development, a server/client mismatch fails loudly here instead of somewhere in the UI.
  return __DEV__ ? schema.parse(json) : (json as T);
}

/** Starts a session (sets the cookie). Throws ApiError: 401 wrong login, 429 too many tries. */
export async function login(username: string, password: string): Promise<UserDto> {
  const body: LoginRequest = { username, password };
  return (await request('POST', '/auth/login', LoginResponse, body)).user;
}

export async function logout(): Promise<void> {
  await request('POST', '/auth/logout', null);
}

/** The signed-in user, or null when there's no valid session (e.g. after a reload). */
export async function me(): Promise<UserDto | null> {
  try {
    return (await request('GET', '/me', MeResponse)).user;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

/** The signed-in user's balance and transactions, newest first. */
export function getAccount(): Promise<Account> {
  return request('GET', '/account', AccountResponse);
}
