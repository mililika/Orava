// The contract between the money data and Orava.
// The UI only ever reads an OravaState; the logic only ever reads a MonthSnapshot.

/** The four moods of the squirrel design. */
export type Mood = 'happy' | 'okay' | 'worried' | 'alert';

export type Basket = 'mustPayRegular' | 'mustPaySurprises' | 'everydaySlips' | 'needs' | 'income';

/** One month of an account, already summed up. Amounts are positive euros. */
export interface MonthSnapshot {
  balance: number;
  income: number;
  /** Rent/mortgage and utilities. */
  mustPayRegular: number;
  /** Home & Tech, Health and other irregular must-pays. */
  mustPaySurprises: number;
  /** Groceries and transport. */
  needs: number;
  /** Restaurants, fast food, lifestyle, entertainment. */
  everydaySlips: number;
  /** What everyday slips usually are for this person (e.g. average of last 3 months). */
  everydaySlipsBaseline: number;
}

export interface OravaState {
  mood: Mood;
  /** 0–100, higher is healthier. */
  score: number;
  /** One short sentence Orava says. */
  message: string;
  /** Why this mood was picked, in plain words. */
  reasons: string[];
  savingRate: number;
}
