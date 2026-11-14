// Fake account data for the prototype, shaped like rows of the S-Bank `transactions` table.
// Later this file gets replaced by calls to the backend; nothing else needs to change,
// as long as screens keep receiving `Transaction[]` and a `MonthSnapshot`.

import type { Basket, MonthSnapshot } from '../orava/types';

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

/** Balance at the start of the month, before any of the transactions below. */
export const OPENING_BALANCE = 1200;

/** Usual monthly everyday slips for this customer (restaurants + lifestyle + entertainment). */
export const SLIPS_BASELINE = 581;

let seq = 0;
const tx = (
  date: string,
  category: string,
  merchant: string,
  amount: number,
  type = 'purchase',
): Transaction => ({ id: `t${++seq}`, date, category, type, merchant, amount });

/** September 2026, newest first. Totals roughly match the dataset's average customer. */
export const SEPTEMBER: Transaction[] = [
  tx('2026-09-28', 'Groceries', 'S-market', -140.75),
  tx('2026-09-27', 'Restaurants', 'Pizzeria', -54.6),
  tx('2026-09-25', 'Entertainment', 'Finnkino', -51.0),
  tx('2026-09-24', 'Transportation', 'Neste fuel', -99.5),
  tx('2026-09-22', 'Groceries', 'Prisma', -141.75),
  tx('2026-09-20', 'Restaurants', 'Rax Buffet', -58.9),
  tx('2026-09-19', 'Utilities', 'Helen electricity', -45.0, 'utilities_payment'),
  tx('2026-09-18', 'Home & Tech', 'Tokmanni', -205.0),
  tx('2026-09-16', 'Lifestyle', 'Sokos', -150.0),
  tx('2026-09-15', 'Salary', 'Employer Oy', 3480.0, 'salary'),
  tx('2026-09-13', 'Groceries', 'Alepa', -155.1),
  tx('2026-09-12', 'Restaurants', 'Hesburger', -64.2),
  tx('2026-09-11', 'Health', 'Pharmacy', -112.0),
  tx('2026-09-10', 'Utilities', 'Elisa phone', -54.8, 'utilities_payment'),
  tx('2026-09-08', 'Transportation', 'HSL travel card', -120.0),
  tx('2026-09-06', 'Entertainment', 'Spotify & concerts', -69.0),
  tx('2026-09-05', 'Restaurants', 'Restaurant Sea Horse', -72.3),
  tx('2026-09-04', 'Groceries', 'S-market', -182.4),
  tx('2026-09-03', 'Transportation', 'ABC fuel', -110.5),
  tx('2026-09-02', 'Utilities', 'HSY water', -61.2, 'utilities_payment'),
  tx('2026-09-01', 'Housing', 'Rent', -1088.0, 'housing_payment'),
];

/** Which Orava basket each category belongs to. */
const BASKET: Record<string, Basket> = {
  Salary: 'income',
  'Other Income': 'income',
  Housing: 'mustPayRegular',
  Utilities: 'mustPayRegular',
  'Home & Tech': 'mustPaySurprises',
  Health: 'mustPaySurprises',
  Groceries: 'needs',
  Transportation: 'needs',
  Travel: 'everydaySlips',
  Restaurants: 'everydaySlips',
  Lifestyle: 'everydaySlips',
  Entertainment: 'everydaySlips',
};

/** The Orava basket a category belongs to, if any. */
export function basketOf(category: string) {
  return BASKET[category];
}

export function balanceOf(txs: Transaction[]) {
  return txs.reduce((b, t) => b + t.amount, OPENING_BALANCE);
}

/** Transactions of the newest month in the list (YYYY-MM), plus the earlier ones. */
export function splitLatestMonth(txs: Transaction[]) {
  const latest = txs.reduce((m, t) => (t.date.slice(0, 7) > m ? t.date.slice(0, 7) : m), '');
  return {
    month: txs.filter((t) => t.date.slice(0, 7) === latest),
    earlier: txs.filter((t) => t.date.slice(0, 7) !== latest),
  };
}

/** Average monthly everyday slips over the earlier months; falls back to the demo number. */
export function slipsBaselineOf(earlier: Transaction[]) {
  const months = new Set(earlier.map((t) => t.date.slice(0, 7)));
  if (months.size === 0) return SLIPS_BASELINE;
  const total = earlier
    .filter((t) => BASKET[t.category] === 'everydaySlips')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  return total / months.size;
}

/** Sums a month of transactions into the snapshot Orava's logic reads. */
export function buildSnapshot(
  txs: Transaction[],
  balance = balanceOf(txs),
  slipsBaseline = SLIPS_BASELINE,
): MonthSnapshot {
  // "This week" = the last 7 days of data, ending on the newest transaction.
  const latest = txs.reduce((d, t) => (t.date > d ? t.date : d), '');
  const weekStart = latest ? shiftDays(latest, -6) : '';
  const [y, m] = latest ? latest.split('-').map(Number) : [2026, 1];

  const s: MonthSnapshot = {
    balance,
    income: 0,
    mustPayRegular: 0,
    mustPaySurprises: 0,
    needs: 0,
    everydaySlips: 0,
    everydaySlipsBaseline: slipsBaseline,
    slipsThisWeek: 0,
    eatOutThisWeek: 0,
    daysInMonth: new Date(Date.UTC(y, m, 0)).getUTCDate(),
  };
  for (const t of txs) {
    const key = BASKET[t.category];
    if (!key) continue;
    s[key] += Math.abs(t.amount);
    if (t.date >= weekStart && t.amount < 0) {
      if (key === 'everydaySlips') s.slipsThisWeek += -t.amount;
      if (t.category === 'Restaurants') s.eatOutThisWeek += 1;
    }
  }
  return s;
}

/** A YYYY-MM-DD date moved by a number of days. */
export function shiftDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
