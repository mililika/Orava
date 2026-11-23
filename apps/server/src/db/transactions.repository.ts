import { Inject, Injectable } from '@nestjs/common';
import type { Transaction } from '@orava/core';
import { and, desc, eq, isNull, sql, sum } from 'drizzle-orm';

import { DB, type Db } from './db.js';
import { transactions } from './schema.js';
import type { User } from './users.repository.js';

/** Deleted transactions are hidden everywhere. */
const notDeleted = isNull(transactions.deletedAt);

@Injectable()
export class TransactionsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The user's transactions, newest first, without deleted ones. */
  async list(userId: string): Promise<Transaction[]> {
    const rows = await this.db
      .select({
        id: transactions.id,
        date: transactions.date,
        category: transactions.category,
        type: transactions.type,
        merchant: transactions.merchant,
        amount: transactions.amountEur,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), notDeleted))
      .orderBy(desc(transactions.date), desc(transactions.id));
    return rows.map((row) => ({ ...row, id: String(row.id) }));
  }

  /**
   * Opening balance + the sum of the transactions that aren't deleted, in euros, added in
   * Postgres as `numeric` so cents never pick up float errors. Takes the opening balance from the
   * already-loaded user, so only `transactions` is read.
   */
  async balanceOf(user: Pick<User, 'id' | 'openingBalance'>): Promise<number> {
    const [row] = await this.db
      .select({
        balance:
          sql<number>`${String(user.openingBalance)}::numeric + coalesce(${sum(transactions.amountEur)}, 0)`.mapWith(
            Number,
          ),
      })
      .from(transactions)
      .where(and(eq(transactions.userId, user.id), notDeleted));
    return row?.balance ?? user.openingBalance;
  }
}
