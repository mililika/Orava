// Financial health: the few numbers that explain a customer's money patterns.
// Pure function, like logic.ts: transactions + balance in, HealthReport out. No UI.

import {
  buildSnapshot,
  slipsBaselineOf,
  splitLatestMonth,
  type Transaction,
} from '../data/demoAccount';
import { evaluateOrava } from './logic';
import type { OravaState } from './types';

export type Status = 'good' | 'watch' | 'alert';

export interface Metric {
  key: 'savingRate' | 'fixedShare' | 'slips' | 'buffer';
  label: string;
  /** Big number, already formatted. */
  value: string;
  status: Status;
  /** Plain-words reading of the number, one sentence. */
  note: string;
}

export interface SpendSlice {
  category: string;
  amount: number;
  /** Share of this month's spending, 0–1. */
  share: number;
}

export interface HealthReport {
  /** e.g. "September 2026". */
  period: string;
  income: number;
  spending: number;
  orava: OravaState;
  metrics: Metric[];
  /** Spending by category, biggest first; small ones folded into "Other". */
  breakdown: SpendSlice[];
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function buildHealth(txs: Transaction[], balance: number): HealthReport {
  const { month, earlier } = splitLatestMonth(txs);
  const snap = buildSnapshot(month, balance, slipsBaselineOf(earlier));
  const orava = evaluateOrava(snap);

  const income = snap.income;
  const out = month.filter((t) => t.amount < 0);
  const spending = out.reduce((sum, t) => sum - t.amount, 0);
  const kept = income - spending;
  const savingRate = income > 0 ? kept / income : 0;
  const fixedShare = income > 0 ? snap.mustPayRegular / income : 0;
  const slipRatio =
    snap.everydaySlipsBaseline > 0 ? snap.everydaySlips / snap.everydaySlipsBaseline : 1;

  // Buffer: how many months the balance would last at the usual monthly spending.
  const avgSpend = averageMonthlySpending(txs) || spending;
  const bufferMonths = avgSpend > 0 ? Math.max(0, balance) / avgSpend : 0;

  const metrics: Metric[] = [
    {
      key: 'savingRate',
      label: 'Kept this month',
      value: income > 0 ? pct(savingRate) : '–',
      status: savingRate >= 0.1 ? 'good' : savingRate >= 0 ? 'watch' : 'alert',
      note:
        income <= 0
          ? 'No income arrived this month yet.'
          : kept >= 0
            ? `Of your income, €${Math.round(kept)} stayed with you. 10% or more is a healthy habit.`
            : `You spent €${Math.round(-kept)} more than came in.`,
    },
    {
      key: 'fixedShare',
      label: 'Fixed costs',
      value: income > 0 ? pct(fixedShare) : '–',
      status: fixedShare <= 0.4 ? 'good' : fixedShare <= 0.55 ? 'watch' : 'alert',
      note: 'Rent and bills, as a share of income. Under 40% leaves room to breathe.',
    },
    {
      key: 'slips',
      label: 'Everyday extras',
      value: `${slipRatio >= 1 ? '+' : '−'}${Math.round(Math.abs(slipRatio - 1) * 100)}%`,
      status: slipRatio <= 1.15 ? 'good' : slipRatio <= 1.4 ? 'watch' : 'alert',
      note: `Eating out, shopping and fun: €${Math.round(snap.everydaySlips)} vs. your usual €${Math.round(snap.everydaySlipsBaseline)}.`,
    },
    {
      key: 'buffer',
      label: 'Safety buffer',
      value: `${bufferMonths.toFixed(1)} mo`,
      status: bufferMonths >= 3 ? 'good' : bufferMonths >= 1 ? 'watch' : 'alert',
      note: 'How long your balance lasts at your usual spending. Aim for 3 months.',
    },
  ];

  return {
    period: monthName(month[0]?.date),
    income,
    spending,
    orava,
    metrics,
    breakdown: breakdownOf(out, spending),
  };
}

const MAX_SLICES = 7;

function breakdownOf(out: Transaction[], spending: number): SpendSlice[] {
  const by = new Map<string, number>();
  for (const t of out) by.set(t.category, (by.get(t.category) ?? 0) - t.amount);
  const sorted = [...by.entries()]
    .map(([category, amount]) => ({ category, amount, share: spending ? amount / spending : 0 }))
    .sort((a, b) => b.amount - a.amount);
  if (sorted.length <= MAX_SLICES) return sorted;
  const top = sorted.slice(0, MAX_SLICES - 1);
  const rest = sorted.slice(MAX_SLICES - 1).reduce((s, x) => s + x.amount, 0);
  return [...top, { category: 'Other', amount: rest, share: spending ? rest / spending : 0 }];
}

/** Average spending of the last (up to) 3 months in the data. */
function averageMonthlySpending(txs: Transaction[]) {
  const byMonth = new Map<string, number>();
  for (const t of txs) {
    if (t.amount >= 0) continue;
    const m = t.date.slice(0, 7);
    byMonth.set(m, (byMonth.get(m) ?? 0) - t.amount);
  }
  const last = [...byMonth.entries()].sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 3);
  return last.length ? last.reduce((s, [, v]) => s + v, 0) / last.length : 0;
}

function monthName(date?: string) {
  if (!date) return 'This month';
  const [y, m] = date.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}
