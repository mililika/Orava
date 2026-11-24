import { Inject, Injectable } from '@nestjs/common';
import type { Transaction } from '@orava/core';
import { and, count, desc, eq, isNull, max, sql, sum } from 'drizzle-orm';

import { DB, type Db } from './db.js';
import { transactions, users } from './schema.js';
import type { User } from './users.repository.js';

/** Deleted transactions are hidden everywhere. */
const notDeleted = isNull(transactions.deletedAt);

/** The user's rows from one source: loaded with the data (`seed`) or added in the app (`user`). */
const bySource = (userId: string, source: 'seed' | 'user') =>
  and(eq(transactions.userId, userId), eq(transactions.source, source));

const txColumns = {
  id: transactions.id,
  date: transactions.date,
  category: transactions.category,
  type: transactions.type,
  merchant: transactions.merchant,
  amount: transactions.amountEur,
};

type TxRow = { [K in keyof typeof txColumns]: (typeof txColumns)[K]['_']['data'] };

/** Ids go to the client as strings, as @orava/core's `Transaction` has them. */
const toTransaction = (row: TxRow): Transaction => ({ ...row, id: String(row.id) });

/** A transaction to add; the caller decides the date and type. */
export type NewTransaction = Omit<Transaction, 'id'>;

@Injectable()
export class TransactionsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The user's transactions (newest first) and balance: what @orava/core's reports start from. */
  async accountOf(user: User): Promise<{ txs: Transaction[]; balance: number }> {
    const [txs, balance] = await Promise.all([this.list(user.id), this.balanceOf(user)]);
    return { txs, balance };
  }

  /** The user's transactions, newest first, without deleted ones. */
  async list(userId: string): Promise<Transaction[]> {
    const rows = await this.db
      .select(txColumns)
      .from(transactions)
      .where(and(eq(transactions.userId, userId), notDeleted))
      .orderBy(desc(transactions.date), desc(transactions.id));
    return rows.map(toTransaction);
  }

  /**
   * Adds a transaction the user entered in the app (`source = 'user'`), unless they've already
   * added `limit` of them (deleted ones included, so deleting doesn't free a slot). Undefined when
   * over the limit. Locks the user's row while counting, so parallel requests can't both get
   * through at `limit - 1`.
   */
  async addWithinLimit(
    userId: string,
    tx: NewTransaction,
    limit: number,
  ): Promise<Transaction | undefined> {
    return this.db.transaction(async (db) => {
      await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
      const [added] = await db
        .select({ n: count() })
        .from(transactions)
        .where(bySource(userId, 'user'));
      if ((added?.n ?? 0) >= limit) return undefined;
      const [row] = await db
        .insert(transactions)
        .values({
          userId,
          date: tx.date,
          category: tx.category,
          type: tx.type,
          merchant: tx.merchant,
          amountEur: tx.amount,
          source: 'user',
        })
        .returning(txColumns);
      return toTransaction(row!);
    });
  }

  /**
   * Marks one of the user's transactions deleted. False if there's no such transaction, it's
   * another user's, or it's already deleted.
   */
  async softDelete(userId: string, id: number): Promise<boolean> {
    const rows = await this.db
      .update(transactions)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId), notDeleted))
      .returning({ id: transactions.id });
    return rows.length > 0;
  }

  /**
   * The date of the user's newest seed transaction (deleted ones included, so deleting it doesn't
   * move "today"). Undefined for a user without seed data.
   */
  async newestSeedDate(userId: string): Promise<string | undefined> {
    const [row] = await this.db
      .select({ date: max(transactions.date) })
      .from(transactions)
      .where(bySource(userId, 'seed'));
    return row?.date ?? undefined;
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
