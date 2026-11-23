// The database's tables, written to match the schema in todo/03-database.md exactly. The SQL there
// (run once by the owner in Supabase) is the source of truth: this file only types the queries.
// Never run drizzle-kit generate, migrate or push against it.

import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Stored lowercased and trimmed. */
    username: text('username').notNull().unique('users_username_key'),
    /**
     * The Supabase Auth user (`auth.users.id`, the access token's `sub`) who signs in as this
     * user. Null until the owner links one. Passwords live in Supabase Auth, never here.
     */
    authUserId: uuid('auth_user_id').unique('users_auth_user_id_key'),
    /** Balance before the first transaction, in euros. */
    openingBalanceEur: numeric('opening_balance_eur', { precision: 14, scale: 2, mode: 'number' })
      .notNull()
      .default(0),
    /** Gemini requests per hour; null = the server's default. */
    aiHourlyLimit: integer('ai_hourly_limit'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'users_username_check',
      sql`${t.username} <> '' and ${t.username} = lower(btrim(${t.username}))`,
    ),
    check('users_ai_hourly_limit_check', sql`${t.aiHourlyLimit} >= 0`),
  ],
);

export const transactions = pgTable(
  'transactions',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(), // YYYY-MM-DD string
    category: text('category').notNull(),
    type: text('type').notNull(),
    merchant: text('merchant').notNull(),
    /** Euros; negative = money out. Never 0. */
    amountEur: numeric('amount_eur', { precision: 12, scale: 2, mode: 'number' }).notNull(),
    /** 'seed' = loaded with the original data, 'user' = added in the app. */
    source: text('source', { enum: ['seed', 'user'] })
      .notNull()
      .default('user'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Soft delete: hidden everywhere once set. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('transactions_user_date_idx')
      .on(t.userId, t.date.desc(), t.id.desc())
      .where(sql`${t.deletedAt} is null`),
    check('transactions_amount_eur_check', sql`${t.amountEur} <> 0`),
    check('transactions_source_check', sql`${t.source} in ('seed', 'user')`),
  ],
);
