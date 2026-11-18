// How many Gemini requests a user may make, so the bundled Google key isn't drained.
//
// The limits live on the VPS, in limits-server/limits.json (an array of
// { username, limit, currentUsage }). takeRequest asks that server (EXPO_PUBLIC_LIMITS_URL) for a
// slot before each Gemini request. The limit there is a total, not per hour: reset someone by
// editing currentUsage in the file. A username that isn't in it has no limit.
//
// If the server can't be reached (no URL set, network error, timeout or 5xx), we fall back to
// FALLBACK_PER_HOUR requests per hour for everyone, counted on this device (AsyncStorage) over a
// rolling hour.
//
// None of this is a security boundary: anyone can pull the Gemini key out of the bundle.

import AsyncStorage from '@react-native-async-storage/async-storage';

const HOUR = 60 * 60 * 1000;
const storageKey = (user: string) => `orava.ratelimit.${user}`;

const LIMITS_URL = process.env.EXPO_PUBLIC_LIMITS_URL?.replace(/\/+$/, '');
const SERVER_TIMEOUT = 3000;
/** Requests per hour per device for every user while the limits server can't be reached. */
const FALLBACK_PER_HOUR = 20;

/** Thrown instead of calling Gemini when the user has used up their requests. */
export class RateLimitError extends Error {
  constructor(
    /** Requests allowed: in total (server), or per hour (local fallback). */
    readonly limit: number,
    /**
     * When the next request is allowed (ms since epoch). Only set by the local hourly fallback;
     * the server's limit is a total quota that doesn't reset by itself.
     */
    readonly retryAt?: number,
    /** Requests used so far (server only). */
    readonly currentUsage?: number,
  ) {
    super(
      retryAt === undefined
        ? `Request limit reached (${limit} requests).`
        : `Request limit reached (${limit} per hour).`,
    );
    this.name = 'RateLimitError';
  }
}

/** "5 min" until `at` (at least "1 min"). */
export function minutesUntil(at: number) {
  return `${Math.max(1, Math.ceil((at - Date.now()) / 60000))} min`;
}

/**
 * Asks the limits server for a slot. Returns true if allowed, throws RateLimitError on 429, and
 * returns false if the server can't answer (so the caller falls back to the local count).
 */
async function takeFromServer(user: string): Promise<boolean> {
  if (!LIMITS_URL) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SERVER_TIMEOUT);
  try {
    const res = await fetch(`${LIMITS_URL}/take`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user }),
      signal: ctrl.signal,
    });
    if (res.status === 429) {
      const body = (await res.json().catch(() => ({}))) as { limit?: number; currentUsage?: number };
      throw new RateLimitError(body.limit ?? 0, undefined, body.currentUsage);
    }
    return res.ok;
  } catch (e) {
    if (e instanceof RateLimitError) throw e;
    return false; // network error or timeout
  } finally {
    clearTimeout(timer);
  }
}

// One local check at a time per user, so two requests at once can't both take the last slot.
const queues = new Map<string, Promise<unknown>>();

function takeLocal(user: string): Promise<void> {
  const prev = queues.get(user) ?? Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(async () => {
      const limit = FALLBACK_PER_HOUR;
      const now = Date.now();
      const raw = await AsyncStorage.getItem(storageKey(user)).catch(() => null);
      let times: number[] = [];
      try {
        times = raw ? (JSON.parse(raw) as number[]).filter((t) => t > now - HOUR) : [];
      } catch {
        // Unreadable: start counting again.
      }
      if (times.length >= limit) {
        const retryAt = times.length ? Math.min(...times) + HOUR : now + HOUR;
        throw new RateLimitError(limit, retryAt);
      }
      times.push(now);
      await AsyncStorage.setItem(storageKey(user), JSON.stringify(times)).catch(() => {});
    });
  queues.set(user, next);
  return next;
}

/**
 * Records one Gemini request for `user`, or throws RateLimitError if their requests are used up.
 * Asks the limits server; falls back to the local hourly count if it can't be reached.
 * Call it right before the request.
 */
export async function takeRequest(user: string): Promise<void> {
  if (await takeFromServer(user)) return;
  await takeLocal(user);
}

// The "limit reached" modal listens here (components/LimitModal.tsx).
type Listener = (e: RateLimitError) => void;
const listeners = new Set<Listener>();

export function onLimitReached(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportLimit(e: RateLimitError) {
  listeners.forEach((l) => l(e));
}
