import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { type SessionUser, SessionsRepository } from '../db/sessions.repository.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Sliding: every day the session is used, it gets another 30 days. */
export const SESSION_TTL_MS = 30 * DAY_MS;
const SLIDE_AFTER_MS = DAY_MS;

/** 32 random bytes as base64url: always 43 characters of A–Z, a–z, 0–9, - and _. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

/** The database only ever stores this, so a leaked `sessions` table can't be used to sign in. */
function idOf(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Server sessions. The token is random and only lives in the browser's cookie; the `sessions`
 * row is keyed by its sha256.
 */
@Injectable()
export class SessionsService {
  constructor(private readonly sessions: SessionsRepository) {}

  /** Starts a session and returns the token for the cookie. */
  async create(userId: string): Promise<string> {
    const now = new Date();
    const token = randomBytes(32).toString('base64url');
    await this.sessions.deleteExpiredOf(userId, now);
    await this.sessions.create(idOf(token), userId, new Date(now.getTime() + SESSION_TTL_MS));
    return token;
  }

  /**
   * The session's user, or undefined if the token is unknown or expired. Slides the expiry;
   * `renewed` says it did, so the cookie's lifetime can be extended too.
   */
  async get(token: string): Promise<{ user: SessionUser; renewed: boolean } | undefined> {
    if (!TOKEN_SHAPE.test(token)) return undefined;
    const id = idOf(token);
    const session = await this.sessions.find(id);
    if (!session) return undefined;

    const now = Date.now();
    if (session.expiresAt.getTime() <= now) {
      await this.sessions.delete(id);
      return undefined;
    }
    // At most one write a day per session, not one per request.
    const renewed = now - session.lastSeenAt.getTime() > SLIDE_AFTER_MS;
    if (renewed) await this.sessions.touch(id, new Date(now), new Date(now + SESSION_TTL_MS));
    return { user: session.user, renewed };
  }

  async delete(token: string): Promise<void> {
    if (TOKEN_SHAPE.test(token)) await this.sessions.delete(idOf(token));
  }
}
