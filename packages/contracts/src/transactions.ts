// Transactions as the API sends them. The endpoints and their request bodies come in section 05.

import { CATEGORY_LIST } from '@orava/core';
import { z } from 'zod';

/**
 * The categories a new transaction may have, built from @orava/core's list, so a new category
 * only needs adding there. For request bodies (section 05).
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
