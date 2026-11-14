// Orava's instant reactions to a single new transaction.
// Hardcoded rules for the prototype; later an AI model replaces reactTo() with the same
// signature: new transaction + history in, a Reaction (or nothing) out. Pure, no UI.
//
// Rules, first match wins:
//  1. Big restaurant bill    one Restaurants payment ≥ 5% of monthly income      → worried
//  2. Unusual payment        any other non-fixed payment ≥ 20% of monthly income  → alert + "Was this you?"
//  3. Coffee streak          3rd+ coffee in 7 days                                → worried
//  4. Extra income           any income that is not salary                        → happy

import type { Transaction } from '../data/demoAccount';
import type { Mood } from './types';

export type ReactionAction = 'confirm' | 'freeze' | 'limit' | 'dismiss';

export interface Reaction {
  /** The transaction Orava is reacting to. */
  txId: string;
  mood: Mood;
  /** Speaker line, e.g. "Orava · unusual payment". */
  who?: string;
  message: string;
  actions?: { id: ReactionAction; label: string; primary?: boolean }[];
}

const FIXED = new Set(['Housing', 'Utilities']);
const COFFEE = /coffee|café|cafe|kahvi|espresso|latte|cappuccino|starbucks|robert'?s/i;
const FALLBACK_INCOME = 3000;

const euro = (n: number) => `€${Math.round(Math.abs(n)).toLocaleString('en-GB')}`;

export function isCoffee(t: Transaction) {
  return t.category === 'Coffee' || COFFEE.test(t.merchant);
}

/** `history` includes `tx` itself. */
export function reactTo(tx: Transaction, history: Transaction[]): Reaction | null {
  const income = monthlyIncome(history, tx.date);
  const cost = -tx.amount;
  const share = cost / income;

  if (tx.amount < 0 && tx.category === 'Restaurants' && share >= 0.05) {
    return {
      txId: tx.id,
      mood: 'worried',
      who: 'Orava · heads up',
      message: `That one meal was ${euro(cost)}, ${Math.round(share * 100)}% of your monthly income in one go. Treats are fine! Want me to keep eating out under a limit for the rest of the month?`,
      actions: [
        { id: 'limit', label: 'Set a gentle limit', primary: true },
        { id: 'dismiss', label: 'It was worth it' },
      ],
    };
  }

  if (tx.amount < 0 && !FIXED.has(tx.category) && share >= 0.2) {
    return {
      txId: tx.id,
      mood: 'alert',
      who: 'Orava · unusual payment',
      message: `Whoa, ${euro(cost)} to ${tx.merchant}. That’s ${Math.round(share * 100)}% of your monthly income and not like you. Was this you?`,
      actions: [
        { id: 'confirm', label: 'Yes, it was me', primary: true },
        { id: 'freeze', label: 'No, freeze my card' },
      ],
    };
  }

  if (tx.amount < 0 && isCoffee(tx)) {
    const week = history.filter(
      (t) => t.amount < 0 && isCoffee(t) && daysBetween(t.date, tx.date) < 7,
    );
    if (week.length >= 3) {
      const spent = week.reduce((s, t) => s - t.amount, 0);
      return {
        txId: tx.id,
        mood: 'worried',
        who: 'Orava · heads up',
        message: `That’s coffee number ${week.length} this week, ${euro(spent)} so far. At this pace it’s about ${euro((spent / 7) * 30)} a month. A thermos could fill your nut stash instead!`,
        actions: [
          { id: 'limit', label: 'Remind me next time', primary: true },
          { id: 'dismiss', label: 'I need it' },
        ],
      };
    }
    return null;
  }

  if (tx.amount > 0 && tx.category !== 'Salary') {
    return {
      txId: tx.id,
      mood: 'happy',
      who: 'Orava · doing great',
      message: `Nice, +${euro(tx.amount)}! Tucking even a quarter of it (${euro(tx.amount / 4)}) away would grow your safety buffer.`,
    };
  }

  return null;
}

/** Income in the month of `date`; falls back to the average month, then to a typical salary. */
export function monthlyIncome(history: Transaction[], date: string) {
  const month = date.slice(0, 7);
  const salary = (t: Transaction) => t.category === 'Salary';
  const thisMonth = history
    .filter((t) => t.date.startsWith(month) && salary(t))
    .reduce((s, t) => s + t.amount, 0);
  if (thisMonth > 0) return thisMonth;
  const all = history.filter(salary);
  const months = new Set(all.map((t) => t.date.slice(0, 7))).size;
  return months ? all.reduce((s, t) => s + t.amount, 0) / months : FALLBACK_INCOME;
}

function daysBetween(a: string, b: string) {
  return Math.abs(Date.parse(b) - Date.parse(a)) / 86_400_000;
}
