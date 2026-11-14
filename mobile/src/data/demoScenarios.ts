// One-tap demo scenarios. Each one returns the transactions to add on top of the
// account's own data so that a specific Orava alert fires, using the real rules
// in src/orava/alerts.ts. Amounts are worked out from the current numbers, so it
// works on the built-in demo month and on real Supabase data alike.

import type { AlertKind, MonthSnapshot, OravaState } from '../orava/types';
import type { Tab } from '../components/AppChrome';
import { shiftDays, type Transaction } from './demoAccount';

export const SCENARIOS: {
  kind: AlertKind;
  title: string;
  note: string;
  /** The tab to land on, so the pop-up shows straight away. */
  tab: Tab;
}[] = [
  {
    kind: 'fraud',
    title: 'Unusual payment',
    note: 'A big payment to a shop never used before → “Was this you?”',
    tab: 'sbank',
  },
  {
    kind: 'overspend',
    title: 'Overspending',
    note: '3 meals out in a day → “Psst, restaurants are up”',
    tab: 'sbank',
  },
  {
    kind: 'safe',
    title: 'Over safe-to-spend',
    note: 'A jacket that goes past this week’s safe amount',
    tab: 'etukortti',
  },
  {
    kind: 'good',
    title: 'Good news',
    note: 'Side-gig income lifts savings past 20% → “Nice one!”',
    tab: 'etukortti',
  },
];

let seq = 0;
const tx = (
  date: string,
  category: string,
  merchant: string,
  amount: number,
  type = 'purchase',
): Transaction => ({ id: `demo${++seq}`, date, category, type, merchant, amount });

export function buildScenario(
  kind: AlertKind,
  txs: Transaction[],
  state: OravaState,
  snapshot: MonthSnapshot,
): Transaction[] {
  // "Today" = the day after the newest transaction, unless that starts a new month.
  const latest = txs.reduce((d, t) => (t.date > d ? t.date : d), '2026-09-28');
  const next = shiftDays(latest, 1);
  const day = next.slice(0, 7) === latest.slice(0, 7) ? next : latest;

  switch (kind) {
    case 'fraud': {
      const purchases = txs.filter((t) => t.amount < 0).map((t) => -t.amount);
      const amount = Math.max(649, Math.ceil(median(purchases) * 4));
      return [tx(day, 'Home & Tech', 'Nordvolt Electronics', -amount)];
    }
    case 'overspend':
      return [
        tx(day, 'Restaurants', 'Takeaway', -32.5),
        tx(day, 'Restaurants', 'Pizzeria Napoli', -41),
        tx(day, 'Restaurants', 'Burger Bar Kallio', -29),
      ];
    case 'safe': {
      const amount = Math.max(120, Math.ceil(state.safeThisWeek + 40));
      return [tx(day, 'Lifestyle', 'New jacket', -amount)];
    }
    case 'good': {
      // Enough extra income to keep 22% of it: kept + x ≥ 0.22 × (income + x).
      const need = (0.22 * snapshot.income - state.kept) / 0.78;
      const amount = Math.max(400, Math.ceil(need / 50) * 50);
      return [tx(day, 'Other Income', 'Side gig', amount, 'other_income')];
    }
  }
}

function median(xs: number[]) {
  if (xs.length === 0) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
