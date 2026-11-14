// The contract between the money data and Orava.
// The UI only ever reads an OravaState and OravaAlerts; the logic only reads a MonthSnapshot
// (plus the raw transactions, for spotting unusual payments).

/**
 * Happy 75+, Calm 55–74, Worried 40–54, Alert under 40.
 * An unusual payment (or a balance below zero) always means Alert, whatever the score.
 */
export type Mood = 'happy' | 'calm' | 'worried' | 'alert';

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
  /** What everyday slips usually are for this person (e.g. average of earlier months). */
  everydaySlipsBaseline: number;
  /** Everyday slips in the last 7 days of data. */
  slipsThisWeek: number;
  /** Restaurant payments in the last 7 days of data. */
  eatOutThisWeek: number;
  /** Days in this month, to turn the monthly usual into a weekly one. */
  daysInMonth: number;
}

export interface OravaState {
  mood: Mood;
  /** 0–100, higher is healthier. */
  score: number;
  /** One short sentence Orava says. */
  message: string;
  /** Why this mood was picked, in plain words. */
  reasons: string[];
  /** Share of income kept this month (0.2 = 20%). Can be negative. */
  savingRate: number;
  /** Euros kept this month (income minus spending). */
  kept: number;
  /** What's left this week for everyday extras. Negative = over. */
  safeThisWeek: number;
  /** The usual weekly amount for everyday extras. */
  weeklyAllowance: number;
  /** Everyday slips vs usual, in % (+40 = 40% above usual). */
  slipsDeltaPct: number;
}

export type AlertKind = 'fraud' | 'overspend' | 'safe' | 'good';

/** Something Orava wants to tell you, shown as a nudge on the other tabs. */
export interface OravaAlert {
  /** Stable id: a dismissed alert stays dismissed, a new one shows again. */
  id: string;
  kind: AlertKind;
  title: string;
  text: string;
  cta: string;
  /** For `fraud`: the payment in question and why it looks unusual. */
  payment?: { txId: string; merchant: string; amount: number; date: string; category: string };
  reasons?: string[];
}
