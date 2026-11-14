// The contract between the money data and Orava.
// The UI only ever reads an OravaState; the logic only ever reads a MonthSnapshot.

export type Mood = 'thriving' | 'content' | 'curious' | 'worried' | 'alarmed';

/**
 * The three baskets from the S-Bank brief, with Everyday spending split in two:
 * essentials (groceries, transport) and flexible (restaurants, lifestyle, ...).
 */
export type Basket = 'regular' | 'unexpected' | 'everydayEssential' | 'flexible' | 'income';

/** Flexible spending this period vs. the same days in earlier, fully covered months. */
export interface FlexibleComparison {
  /** Flexible spending on days 1..days of the current month. */
  current: number;
  /** Average flexible spending on days 1..days of the comparison months. */
  usual: number;
  /** Same day range for every month compared: days 1..days. */
  days: number;
  /** Comparison months, YYYY-MM, oldest first. */
  months: string[];
}

/** One month of an account, already summed up. Amounts are positive euros. */
export interface MonthSnapshot {
  balance: number;
  /** Salary and Other Income only. */
  income: number;
  /** Regular essentials: housing, utilities. */
  regular: number;
  /** Unexpected necessities: health, home & tech. */
  unexpected: number;
  /** Everyday spending, essentials: groceries, transport. */
  everydayEssential: number;
  /** Everyday spending, flexible: restaurants, lifestyle, entertainment, travel. */
  flexible: number;
  /** Money out in categories we don't recognise. Counted as spending (the cautious choice). */
  otherOut: number;
  /** Money in from categories we don't recognise (e.g. own transfers). Shown, never counted as income. */
  otherIn: number;
  /** Null when there are no reliable earlier months to compare with. */
  flexibleComparison: FlexibleComparison | null;
}

/** The conditions that produced the mood. Used to decide what may be called a reason. */
export type MoodBasis =
  'balance' | 'overspend' | 'lowSaving' | 'flexibleHigh' | 'flexibleUp' | 'saving' | 'ok';

export interface OravaState {
  mood: Mood;
  /** 0–100, higher is healthier. */
  score: number;
  /** One short sentence Orava says. */
  message: string;
  /** Why this mood was picked, in plain words. */
  reasons: string[];
  /** Which rule(s) produced the mood. */
  basis: MoodBasis[];
  savingRate: number;
  /** Income minus spending this period. */
  kept: number;
}
