import { Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
/** Stops a flood of random usernames or IPs from growing the map without bound. */
const MAX_KEYS = 10_000;

/**
 * Login throttling: at most 10 failed logins per IP and per username in any 15 minutes; the next
 * try gets 429 until the oldest failure is 15 minutes old. Only failures count, so the shared
 * `demo` login keeps working for everyone who types the right password.
 *
 * Not @nestjs/throttler: its guard counts every request before the handler runs, so it can't tell
 * a failed login from a good one.
 *
 * In memory, per server instance. Fine while Cloud Run runs 1–2 instances (the limit is then at
 * most 2× as loose); with more, move this to a shared store.
 */
@Injectable()
export class LoginAttempts {
  /** Key (`ip:…` or `user:…`) → times of recent failures, oldest first. */
  private readonly failures = new Map<string, number[]>();

  /** Seconds until the next try is allowed, or 0 if it's allowed now. */
  retryAfter(ip: string, username: string): number {
    const now = Date.now();
    const wait = Math.max(this.waitFor(`ip:${ip}`, now), this.waitFor(`user:${username}`, now));
    return Math.ceil(wait / 1000);
  }

  recordFailure(ip: string, username: string): void {
    const now = Date.now();
    if (this.failures.size >= MAX_KEYS) this.prune(now);
    for (const key of [`ip:${ip}`, `user:${username}`]) {
      this.failures.set(key, [...this.recent(key, now), now]);
    }
  }

  /** A good login clears that username's failures (the IP's stay). */
  recordSuccess(username: string): void {
    this.failures.delete(`user:${username}`);
  }

  private waitFor(key: string, now: number): number {
    const times = this.recent(key, now);
    return times.length >= MAX_FAILURES ? times[times.length - MAX_FAILURES] + WINDOW_MS - now : 0;
  }

  private recent(key: string, now: number): number[] {
    return (this.failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  }

  private prune(now: number): void {
    for (const key of this.failures.keys()) {
      const times = this.recent(key, now);
      if (times.length) this.failures.set(key, times);
      else this.failures.delete(key);
    }
  }
}
