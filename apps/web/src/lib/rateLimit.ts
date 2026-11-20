// How many Gemini requests a user may make per hour, so the bundled Google key isn't drained.
//
// The limits are rate-limits.json in the app root (apps/web/): a map from username to requests per
// hour, e.g. {"demo": 200, "misha": 2}. A username that isn't in it has no limit. The file is
// bundled into the app, so restart Expo (or rebuild) after editing it.
//
// Counted on this device (AsyncStorage), over a rolling hour. It stops casual overuse, not a
// determined user: real protection needs the Gemini call behind a server.

import AsyncStorage from '@react-native-async-storage/async-storage';

import LIMITS_FILE from '../../rate-limits.json';

const HOUR = 60 * 60 * 1000;
const storageKey = (user: string) => `orava.ratelimit.${user}`;

/** Thrown instead of calling Gemini when the user has used up this hour's requests. */
export class RateLimitError extends Error {
  constructor(
    /** Requests allowed per hour. */
    readonly limit: number,
    /** When the next request is allowed (ms since epoch). */
    readonly retryAt: number,
  ) {
    super(`Request limit reached (${limit} per hour).`);
    this.name = 'RateLimitError';
  }
}

/** "5 min" until `at` (at least "1 min"). */
export function minutesUntil(at: number) {
  return `${Math.max(1, Math.ceil((at - Date.now()) / 60000))} min`;
}

/** Requests per hour by username; entries that aren't a number of 0 or more are skipped. */
const LIMITS: Record<string, number> = {};
for (const [user, n] of Object.entries(LIMITS_FILE as Record<string, unknown>)) {
  if (typeof n === 'number' && n >= 0) LIMITS[user] = Math.floor(n);
}

function limitFor(user: string): number | null {
  return LIMITS[user] ?? LIMITS[user.toLowerCase()] ?? null;
}

// One check at a time per user, so two requests at once can't both take the last slot.
const queues = new Map<string, Promise<unknown>>();

/**
 * Records one Gemini request for `user`, or throws RateLimitError if this hour's are used up.
 * Call it right before the request.
 */
export function takeRequest(user: string): Promise<void> {
  const prev = queues.get(user) ?? Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(async () => {
      const limit = limitFor(user);
      if (limit === null) return;
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
