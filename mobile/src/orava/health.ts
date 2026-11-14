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

/** Tag colour: good = green, neutral = gray, warn = orange, bad = red (a big problem). */
export type Tone = 'good' | 'neutral' | 'warn' | 'bad';

/** One small score card under Orava's verdict. */
export interface Stat {
  key: 'safe' | 'kept' | 'slips';
  label: string;
  /** Big number, already formatted. */
  value: string;
  /** Small line under the value. */
  sub: string;
  tag: { text: string; tone: Tone };
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
  stats: Stat[];
  safe: SafeToSpend;
  split: SplitPart[];
}

const SAVINGS_GOAL = 0.1;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const money = (n: number) => `€${Math.round(Math.abs(n)).toLocaleString('en-GB')}`;

export function buildHealth(txs: Transaction[], balance: number): HealthReport {
  const { month, earlier } = splitLatestMonth(txs);
  const snap = buildSnapshot(month, balance, slipsBaselineOf(earlier));
  const orava = evaluateOrava(snap);

  const income = snap.income;
  const out = month.filter((t) => t.amount < 0);
  const spending = out.reduce((sum, t) => sum - t.amount, 0);
  const kept = income - spending;
  const savingRate = income > 0 ? kept / income : 0;

  const safe = safeToSpend(month, earlier, snap.income, snap.mustPayRegular, spending);
  const slipsRatio =
    snap.everydaySlipsBaseline > 0 ? snap.everydaySlips / snap.everydaySlipsBaseline : 1;
  const slipsPct = Math.round((slipsRatio - 1) * 100);

  const weekDays = Math.min(7, safe.daysLeft);
  const weekSafe = (Math.max(0, safe.left) * weekDays) / Math.max(1, safe.daysLeft);
  const short = safe.goal - safe.forecastKept;

  const stats: Stat[] = [
    {
      key: 'safe',
      label: 'Safe to spend',
      value: money(weekSafe),
      sub: safe.daysLeft <= 7 ? 'rest of the month' : 'this week',
      tag:
        safe.left < 0
          ? { text: 'Over', tone: 'bad' }
          : short > 0
            ? { text: 'Tight', tone: 'warn' }
            : { text: 'Comfortable', tone: 'good' },
    },
    {
      key: 'kept',
      label: 'Kept',
      value: income > 0 ? pct(savingRate) : '–',
      sub: 'of income',
      tag:
        kept < 0
          ? { text: 'Overspent', tone: 'bad' }
          : savingRate >= 0.1
            ? { text: 'On track', tone: 'good' }
            : { text: 'Low', tone: 'warn' },
    },
    {
      key: 'slips',
      label: 'Everyday slips',
      value: money(snap.everydaySlips),
      sub: `${slipsPct < 0 ? '−' : slipsPct > 0 ? '+' : ''}${Math.abs(slipsPct)}% vs usual`,
      tag:
        slipsRatio > 1.4
          ? { text: 'Way above', tone: 'bad' }
          : slipsRatio >= 1.15
            ? { text: 'Above usual', tone: 'warn' }
            : { text: 'Usual', tone: 'neutral' },
    },
  ];

  return {
    period: monthName(month[0]?.date),
    income,
    spending,
    orava,
    stats,
    safe,
    split: splitOf(snap, income, spending),
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

function monthName(date?: string) {
  if (!date) return 'This month';
  const [y, m] = date.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}
