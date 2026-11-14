// Financial health: the few numbers that explain a customer's money patterns.
// Pure function, like logic.ts: transactions + balance in, HealthReport out. No UI.

import {
  BASKET,
  buildSnapshot,
  slipsBaselineOf,
  splitLatestMonth,
  type Transaction,
} from '../data/demoAccount';
import { evaluateOrava } from './logic';
import type { OravaState } from './types';

export type Status = 'good' | 'watch' | 'alert';

export interface Tile {
  key: 'month' | 'today' | 'saved' | 'buffer';
  /** One or two words. */
  label: string;
  /** Big number, already formatted. */
  value: string;
  /** Small unit after the value, e.g. "/100". */
  unit?: string;
  /** How far toward a healthy target, 0–1 (drawn as a thin bar). */
  progress: number;
  status: Status;
  /** One sentence, shown only when the tile is tapped. */
  note: string;
}

export interface SpendSlice {
  category: string;
  amount: number;
  /** Share of this month's spending, 0–1. */
  share: number;
}

/** Where the month's income goes, in four buckets (Bills, Essentials, Extras, Saved). */
export interface SplitPart {
  key: 'bills' | 'essentials' | 'extras' | 'saved';
  label: string;
  amount: number;
  /** Share of the bar (income, or spending when spending is higher), 0–1. */
  share: number;
}

/** What is safe to spend for the rest of the month, and how it is worked out. */
export interface SafeToSpend {
  /** Income in (plus a salary still expected this month). */
  income: number;
  incomeExpected: number;
  /** Rent and utilities: paid already plus the ones still coming. */
  bills: number;
  billsUpcoming: number;
  /** Savings goal for the month (share of income). */
  goal: number;
  goalRate: number;
  /** Everything except bills, spent so far this month. */
  spent: number;
  /** spendable − spent; negative means over. */
  left: number;
  monthName: string;
  /** Days left in the month, today included. */
  daysLeft: number;
  today: { budget: number; spent: number; left: number };
  /** Even share of what's left for each day after today. */
  perDayAfter: number;
  /** If spending keeps today's pace: what stays with you at month end. */
  forecastKept: number;
}

export interface HealthReport {
  /** e.g. "September 2026". */
  period: string;
  income: number;
  spending: number;
  orava: OravaState;
  tiles: Tile[];
  safe: SafeToSpend;
  split: SplitPart[];
  /** Spending by category, biggest first; small ones folded into "Other". */
  breakdown: SpendSlice[];
}

const SAVINGS_GOAL = 0.1;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const money = (n: number) => `€${Math.round(Math.abs(n)).toLocaleString('en-GB')}`;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const statusOf = (n: number, good: number, watch: number): Status =>
  n >= good ? 'good' : n >= watch ? 'watch' : 'alert';

export function buildHealth(txs: Transaction[], balance: number): HealthReport {
  const { month, earlier } = splitLatestMonth(txs);
  const snap = buildSnapshot(month, balance, slipsBaselineOf(earlier));
  const orava = evaluateOrava(snap);

  const income = snap.income;
  const out = month.filter((t) => t.amount < 0);
  const spending = out.reduce((sum, t) => sum - t.amount, 0);
  const kept = income - spending;
  const savingRate = income > 0 ? kept / income : 0;

  // Buffer: how many months the balance would last at the usual monthly spending.
  const avgSpend = averageMonthlySpending(txs) || spending;
  const bufferMonths = avgSpend > 0 ? Math.max(0, balance) / avgSpend : 0;

  const safe = safeToSpend(month, earlier, snap.income, snap.mustPayRegular, spending);
  const daily = dailyScore(safe.today.budget, safe.today.spent);

  const tiles: Tile[] = [
    {
      key: 'month',
      label: 'Month',
      value: String(orava.score),
      unit: '/100',
      progress: orava.score / 100,
      status: statusOf(orava.score, 70, 40),
      note: 'Your health score for the month: how much you keep, and whether extras are above your usual.',
    },
    {
      key: 'today',
      label: 'Today',
      value: String(daily),
      unit: '/100',
      progress: daily / 100,
      status: statusOf(daily, 70, 40),
      note:
        safe.today.left >= 0
          ? `Today you spent ${money(safe.today.spent)} of a safe ${money(safe.today.budget)}.`
          : `Today you spent ${money(safe.today.spent)}, ${money(safe.today.left)} over a safe ${money(safe.today.budget)}.`,
    },
    {
      key: 'saved',
      label: 'Saved',
      value: `${kept < 0 ? '−' : ''}${money(kept)}`,
      unit: income > 0 ? pct(savingRate) : undefined,
      progress: clamp01(savingRate / 0.2),
      status: savingRate >= 0.1 ? 'good' : savingRate >= 0 ? 'watch' : 'alert',
      note:
        income <= 0
          ? 'No income arrived this month yet.'
          : `Income minus spending so far this month. Keeping 10–20% is a healthy habit.`,
    },
    {
      key: 'buffer',
      label: 'Buffer',
      value: bufferMonths.toFixed(1),
      unit: 'months',
      progress: clamp01(bufferMonths / 3),
      status: statusOf(bufferMonths, 3, 1),
      note: 'How long your balance would last at your usual spending. Aim for 3 months.',
    },
  ];

  return {
    period: monthName(month[0]?.date),
    income,
    spending,
    orava,
    tiles,
    safe,
    split: splitOf(snap, income, spending),
    breakdown: breakdownOf(out, spending),
  };
}

/**
 * Safe to spend = income − bills (paid + still coming) − savings goal − what's already spent.
 * "Today" is the newest day in the data, so the prototype works on past datasets too.
 */
function safeToSpend(
  month: Transaction[],
  earlier: Transaction[],
  incomeIn: number,
  billsPaid: number,
  spending: number,
): SafeToSpend {
  const todayDate = month.reduce((d, t) => (t.date > d ? t.date : d), '');
  const [y, m, d] = (todayDate || '2000-01-01').split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const daysLeft = daysInMonth - d + 1;

  // Last month tells us what usually comes: salary and regular bills not seen yet this month.
  const { month: prev } = splitLatestMonth(earlier);
  const prevIncome = prev
    .filter((t) => BASKET[t.category] === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const incomeExpected = incomeIn === 0 ? prevIncome : 0;
  const paidMerchants = new Set(
    month.filter((t) => BASKET[t.category] === 'mustPayRegular').map((t) => t.merchant),
  );
  const billsUpcoming = prev
    .filter((t) => BASKET[t.category] === 'mustPayRegular' && !paidMerchants.has(t.merchant))
    .reduce((s, t) => s - t.amount, 0);

  const income = incomeIn + incomeExpected;
  const bills = billsPaid + billsUpcoming;
  const goal = Math.max(0, income * SAVINGS_GOAL);
  const spendable = income - bills - goal;
  const spent = spending - billsPaid;
  const left = spendable - spent;

  const spentToday = month
    .filter((t) => t.date === todayDate && t.amount < 0 && BASKET[t.category] !== 'mustPayRegular')
    .reduce((s, t) => s - t.amount, 0);
  const budget = Math.max(0, left + spentToday) / daysLeft;
  const perDayAfter = daysLeft > 1 ? Math.max(0, left) / (daysLeft - 1) : 0;

  // Forecast: everyday spending keeps the pace of the days so far.
  const projectedSpent = d > 0 ? (spent / d) * daysInMonth : spent;
  const forecastKept = income - bills - projectedSpent;

  return {
    income,
    incomeExpected,
    bills,
    billsUpcoming,
    goal,
    goalRate: SAVINGS_GOAL,
    spent,
    left,
    monthName: monthName(todayDate).split(' ')[0],
    daysLeft,
    today: { budget, spent: spentToday, left: budget - spentToday },
    perDayAfter,
    forecastKept,
  };
}

/** 100 = spent nothing today, 70 = spent exactly the safe amount, 0 = twice the safe amount. */
function dailyScore(budget: number, spent: number) {
  if (spent <= 0) return budget > 0 ? 100 : 50;
  if (budget <= 0) return 0;
  const r = spent / budget;
  const score = r <= 1 ? 100 - 30 * r : 70 - 70 * (r - 1);
  return Math.round(Math.max(0, Math.min(100, score)));
}

function splitOf(
  snap: ReturnType<typeof buildSnapshot>,
  income: number,
  spending: number,
): SplitPart[] {
  const bills = snap.mustPayRegular;
  const extras = snap.everydaySlips;
  // Groceries, transport, surprises, and any category the basket map doesn't know.
  const essentials = Math.max(0, spending - bills - extras);
  const saved = Math.max(0, income - spending);
  const base = Math.max(income, spending) || 1;
  const parts: Omit<SplitPart, 'share'>[] = [
    { key: 'bills', label: 'Bills', amount: bills },
    { key: 'essentials', label: 'Essentials', amount: essentials },
    { key: 'extras', label: 'Extras', amount: extras },
    { key: 'saved', label: 'Saved', amount: saved },
  ];
  return parts.map((p) => ({ ...p, share: p.amount / base }));
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
