// Transactions as the API sends them, and the bodies for adding (`POST /api/transactions`) and
// deleting (`DELETE /api/transactions/:id`) one.

import { CATEGORIES, CATEGORY_LIST } from '@orava/core';
import { z } from 'zod';

/**
 * The categories a new transaction may have, built from @orava/core's list, so a new category
 * only needs adding there.
 */
export const Category = z.enum(CATEGORY_LIST);
export type Category = z.infer<typeof Category>;

/**
 * One transaction, the same shape as @orava/core's `Transaction` (checked at compile time in
 * checks.ts). `category` is a plain string, not `Category`: rows from the dataset may hold a
 * value the app doesn't list, which the app shows as "Other".
 */
export const TransactionDto = z.object({
  id: z.string(),
  /** YYYY-MM-DD */
  date: z.iso.date(),
  category: z.string(),
  /** The dataset's `transaction_type` value, e.g. `purchase` or `salary`. */
  type: z.string(),
  merchant: z.string(),
  /** Euros; negative = money out. */
  amount: z.number(),
});
export type TransactionDto = z.infer<typeof TransactionDto>;

/** Largest amount one transaction may have, in euros, either way. */
export const MAX_AMOUNT = 1_000_000;

/** Longest description (`merchant`) a new transaction may have. */
export const MAX_MERCHANT_LENGTH = 80;

/**
 * `POST /api/transactions`. The server sets the date (the user's "today") and the `type` (from
 * the category). The sign of `amount` must match the category: positive for income categories
 * (Salary, …), negative for the rest.
 */
export const CreateTransactionRequest = z
  .object({
    category: Category,
    merchant: z.string().trim().min(1).max(MAX_MERCHANT_LENGTH),
    /** Euros, at most two decimals; negative = money out. */
    amount: z
      .number()
      .min(-MAX_AMOUNT)
      .max(MAX_AMOUNT)
      .multipleOf(0.01)
      .refine((n) => n !== 0, 'Amount must not be zero'),
  })
  .refine((t) => (CATEGORIES[t.category].income ? t.amount > 0 : t.amount < 0), {
    path: ['amount'],
    message: 'Income needs a positive amount, an expense a negative one',
  });
export type CreateTransactionRequest = z.infer<typeof CreateTransactionRequest>;

/**
 * `POST /api/transactions` → 201: the saved transaction. `DELETE /api/transactions/:id` → 204, or
 * 404 if it isn't the user's. Neither sends the balance: it's the opening balance + the listed
 * transactions, which the client already has.
 */
export const CreateTransactionResponse = z.object({ tx: TransactionDto });
export type CreateTransactionResponse = z.infer<typeof CreateTransactionResponse>;

/**
 * The `:id` route param: a transaction id as the API sends it, a positive integer as a string,
 * small enough to be an exact JS number.
 */
export const TransactionIdParam = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d{0,14}$/, 'Expected a transaction id')
    .transform(Number),
});
export type TransactionIdParam = z.infer<typeof TransactionIdParam>;
