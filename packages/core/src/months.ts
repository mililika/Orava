// Transactions → one total per calendar month. Every other calculation starts from these.
// Pure: no UI, no network.

import type { Transaction, Basket } from './types';
import { basketOf, SPENDING_BASKETS } from './baskets';

export interface MonthTotals {
  /** YYYY-MM */
  month: string;
  income: number;
  /** Net money moved to investments (deposits − withdrawals). Counts as kept. */
  invested: number;
  /** Spending per category, positive euros (refunds subtract). Only spending baskets. */
  byCategory: Record<string, number>;
  /** Balance after the month's last transaction. */
  endBalance: number;
  /** Lowest balance reached during the month. */
  lowBalance: number;
  /** Money swept to another bank (Salary Sweep). */
  sweptOut: number;
}

export interface BasketSums {
  fixed: number;
  needs: number;
  surprises: number;
  slips: number;
  spending: number;
}

/** Category multipliers for "what if": e.g. { Restaurants: 0.8 } = 20% less on restaurants. */
export type Multipliers = Record<string, number>;

/**
 * Monthly totals, oldest month first.
 * `txs` is newest first (as the app keeps them) and `balance` is the balance after the newest one;
 * balances before that are worked out backwards from it.
 */
export function monthlyTotals(txs: Transaction[], balance: number): MonthTotals[] {
  const sorted = [...txs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const byMonth = new Map<string, MonthTotals>();
  let bal = balance;
  for (const t of sorted) {
    const key = t.date.slice(0, 7);
    let m = byMonth.get(key);
    if (!m) {
      m = {
        month: key,
        income: 0,
        invested: 0,
        byCategory: {},
        endBalance: bal,
        lowBalance: bal,
        sweptOut: 0,
      };
      byMonth.set(key, m);
    }
    // Lowest balance after any of the month's transactions (same as the dataset's balance_after_eur).
    m.lowBalance = Math.min(m.lowBalance, bal);
    const basket = basketOf(t.category, t.amount);
    if (basket === 'income') m.income += t.amount;
    else if (basket === 'invested') m.invested -= t.amount;
    else if (basket === 'transfer') {
      if (t.category === 'Invest Withdraw') m.invested -= t.amount;
      else if (t.amount < 0) m.sweptOut -= t.amount;
    } else m.byCategory[t.category] = (m.byCategory[t.category] ?? 0) - t.amount;
    bal -= t.amount; // balance before this transaction = after the previous one
  }
  return [...byMonth.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

export function basketSums(byCategory: Record<string, number>, mult: Multipliers = {}): BasketSums {
  const s: BasketSums = { fixed: 0, needs: 0, surprises: 0, slips: 0, spending: 0 };
  for (const [cat, eur] of Object.entries(byCategory)) {
    const b = basketOf(cat, -1) as Basket;
    if (!SPENDING_BASKETS.includes(b)) continue;
    const v = eur * (mult[cat] ?? 1);
    s[b as keyof Omit<BasketSums, 'spending'>] += v;
    s.spending += v;
  }
  return s;
}

/** Average spending per category over the given months. */
export function averageByCategory(months: MonthTotals[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of months) {
    for (const [c, v] of Object.entries(m.byCategory)) out[c] = (out[c] ?? 0) + v / months.length;
  }
  return out;
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
export const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export function monthLabel(month: string, style: 'long' | 'short' = 'long') {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', {
    month: style,
    ...(style === 'long' ? { year: 'numeric' } : {}),
  });
}
