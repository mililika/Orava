import { Inject, Injectable } from '@nestjs/common';
import type { Transaction } from '@orava/core';
import { and, desc, eq, isNull, sql, sum } from 'drizzle-orm';

import { DB, type Db } from './db.js';
import { transactions, users } from './schema.js';

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
   * Opening balance + the sum of the transactions that aren't deleted, in euros, summed in
   * Postgres as `numeric` so cents never pick up float errors. Undefined if the user doesn't exist.
   */
  async balanceOf(userId: string): Promise<number | undefined> {
    const [row] = await this.db
      .select({
        balance:
          sql<number>`${users.openingBalanceEur} + coalesce(${sum(transactions.amountEur)}, 0)`.mapWith(
            Number,
          ),
      })
      .from(users)
      .leftJoin(transactions, and(eq(transactions.userId, users.id), notDeleted))
      .where(eq(users.id, userId))
      .groupBy(users.id);
    return row?.balance;
  }
}
