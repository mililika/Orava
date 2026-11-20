import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB, type Db } from './db.js';
import { users } from './schema.js';

/** A user as the server sees it. Never sent to the browser as is (it holds the password hash). */
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  /** Euros. */
  openingBalance: number;
  /** Gemini requests per hour; null = the server's default. */
  aiHourlyLimit: number | null;
}

const columns = {
  id: users.id,
  username: users.username,
  passwordHash: users.passwordHash,
  openingBalance: users.openingBalanceEur,
  aiHourlyLimit: users.aiHourlyLimit,
};

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Usernames are stored lowercased and trimmed, so "Demo " finds `demo`. */
  async findByUsername(username: string): Promise<User | undefined> {
    const [row] = await this.db
      .select(columns)
      .from(users)
      .where(eq(users.username, username.trim().toLowerCase()))
      .limit(1);
    return row;
  }

  async findById(id: string): Promise<User | undefined> {
    const [row] = await this.db.select(columns).from(users).where(eq(users.id, id)).limit(1);
    return row;
  }
}
