// The signed-in user's account: `GET /api/account`. Section 05 adds the write side
// (adding and deleting transactions) in transactions.ts.

import { z } from 'zod';

import { TransactionDto } from './transactions';

/** `GET /api/account`: @orava/core's `Account` shape, with `txs` newest first. */
export const AccountResponse = z.object({
  username: z.string(),
  /** Euros: opening balance + every transaction that isn't deleted. */
  balance: z.number(),
  txs: z.array(TransactionDto),
});
export type AccountResponse = z.infer<typeof AccountResponse>;
