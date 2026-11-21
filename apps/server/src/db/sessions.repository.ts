import { Inject, Injectable } from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';

import { DB, type Db } from './db.js';
import { sessions, users } from './schema.js';
import type { User } from './users.repository.js';

/** The user a session belongs to, as handlers see it: everything but the password hash. */
export type SessionUser = Omit<User, 'passwordHash'>;

export interface Session {
  expiresAt: Date;
  lastSeenAt: Date;
  user: SessionUser;
}

/**
 * The `sessions` table. `id` is always the sha256 of the cookie's token (see SessionsService);
 * this class never sees the token itself.
 */
@Injectable()
export class SessionsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(id: string, userId: string, expiresAt: Date): Promise<void> {
    await this.db.insert(sessions).values({ id, userId, expiresAt });
  }

  /** The session and its user in one query. Expiry is checked by the caller. */
  async find(id: string): Promise<Session | undefined> {
    const [row] = await this.db
      .select({
        expiresAt: sessions.expiresAt,
        lastSeenAt: sessions.lastSeenAt,
        user: {
          id: users.id,
          username: users.username,
          openingBalance: users.openingBalanceEur,
          aiHourlyLimit: users.aiHourlyLimit,
        },
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.id, id))
      .limit(1);
    return row;
  }

  async touch(id: string, lastSeenAt: Date, expiresAt: Date): Promise<void> {
    await this.db.update(sessions).set({ lastSeenAt, expiresAt }).where(eq(sessions.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, id));
  }

  /** Housekeeping on login, so a user's old sessions don't pile up forever. */
  async deleteExpiredOf(userId: string, now: Date): Promise<void> {
    await this.db
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, now)));
  }
}
