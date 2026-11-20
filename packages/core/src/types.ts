// The contract between the money data and Orava.
// The UI only ever reads an OravaState; the logic reads monthly totals (see months.ts).

/** The four moods of the squirrel design. */
export type Mood = 'happy' | 'okay' | 'worried' | 'alert';

/**
 * Where each category's money belongs. The challenge's three baskets are
 * `fixed` (mandatory and regular), `surprises` (mandatory and irregular) and
 * `slips` (everyday spending that slips through your fingers). `needs` is
 * groceries and transport. `invested` counts as kept money, and `transfer`
 * is money moving between your own accounts, which is neither spent nor earned.
 */
export type Basket = 'income' | 'fixed' | 'needs' | 'surprises' | 'slips' | 'invested' | 'transfer';

export interface OravaState {
  mood: Mood;
  /** 0–100, higher is healthier. Null when the account is not the customer's main bank. */
  score: number | null;
  /** One short sentence Orava says. */
  message: string;
  /** Why this mood was picked, in plain words. */
  reasons: string[];
}

/** One row of the account, shaped like the S-Bank `transactions` table. */
export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  category: string; // same values as the `category` column
  type: string; // same values as the `transaction_type` column
  merchant: string;
  amount: number; // negative = money out
}

/** What a signed-in user sees: their transactions (newest first) and current balance. */
export interface Account {
  username: string;
  txs: Transaction[];
  balance: number;
}
