// One-tap demo scenarios for the Demo panel. Each one returns the transactions to add
// (oldest first) so that one of Orava's reactions in src/orava/scenarios.ts fires on the
// last of them. Amounts are worked out from the account's income, so it works on the
// built-in demo data and on real Supabase data alike.

import { monthlyIncome } from '../orava/scenarios';
import type { Transaction } from './demoAccount';

export type DemoKind = 'unusual' | 'restaurant' | 'coffee' | 'income';

export const DEMOS: { kind: DemoKind; title: string; note: string; color: string }[] = [
  {
    kind: 'unusual',
    title: 'Unusual payment',
    note: 'A big payment to a new shop → “Was this you?” with freeze card',
    color: '#C8323A',
  },
  {
    kind: 'restaurant',
    title: 'Big restaurant bill',
    note: 'One expensive dinner → Orava offers a gentle limit',
    color: '#D2652A',
  },
  {
    kind: 'coffee',
    title: 'Coffee streak',
    note: 'Third coffee this week → a friendly nudge',
    color: '#C98A2B',
  },
  {
    kind: 'income',
    title: 'Extra income',
    note: 'A side gig pays out → Orava suggests saving some',
    color: '#2E9B5F',
  },
];

export type DemoTx = Omit<Transaction, 'id' | 'type'>;

export function buildDemo(kind: DemoKind, history: Transaction[], today: string): DemoTx[] {
  const income = monthlyIncome(history, today);
  switch (kind) {
    case 'unusual':
      // Rule: any non-fixed payment ≥ 20% of monthly income.
      return [
        {
          date: today,
          category: 'Home & Tech',
          merchant: 'Nordvolt Electronics',
          amount: -Math.max(649, Math.ceil(income * 0.25)),
        },
      ];
    case 'restaurant':
      // Rule: one Restaurants payment ≥ 5% of monthly income.
      return [
        {
          date: today,
          category: 'Restaurants',
          merchant: 'Restaurant Sea Horse',
          amount: -Math.max(85, Math.ceil(income * 0.052)),
        },
      ];
    case 'coffee':
      // Rule: 3rd+ coffee within 7 days.
      return [-4.9, -5.2, -4.6].map((amount) => ({
        date: today,
        category: 'Coffee',
        merchant: 'Robert’s Coffee',
        amount,
      }));
    case 'income':
      // Rule: any income that is not salary.
      return [{ date: today, category: 'Other Income', merchant: 'Side gig', amount: 400 }];
  }
}
