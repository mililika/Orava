import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB, type Db } from './db.js';
import { users } from './schema.js';

/** A user as the server sees it. Login itself is Supabase Auth's job; this is our app's data. */
export interface User {
  id: string;
  username: string;
  /** Euros. */
  openingBalance: number;
  /** Gemini requests per hour; null = the server's default. */
  aiHourlyLimit: number | null;
}

const columns = {
  id: users.id,
  username: users.username,
  openingBalance: users.openingBalanceEur,
  aiHourlyLimit: users.aiHourlyLimit,
};

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The user linked to a Supabase Auth user (the access token's `sub`). */
  async findByAuthUserId(authUserId: string): Promise<User | undefined> {
    const [row] = await this.db
      .select(columns)
      .from(users)
      .where(eq(users.authUserId, authUserId))
      .limit(1);
    return row;
  }

  async findById(id: string): Promise<User | undefined> {
    const [row] = await this.db.select(columns).from(users).where(eq(users.id, id)).limit(1);
    return row;
  }
}
