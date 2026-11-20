// Money health: everything the Money health screen shows, from transactions + balance.
// Pure, like the modules it combines: no UI, no network.
//
//   months.ts     transactions → monthly totals (baskets, balances)
//   score.ts      score over the last 3 months, cited anchors (main bank or spending account)
//   logic.ts      score → Orava's mood and sentence
//   growth.ts     idle money and what it, and monthly saving, could become
//   recurring.ts  regular payments
//   ahead.ts      coming up: what the next 3 months leave to spend, from a usual month and last year

import type { Transaction, OravaState } from './types';
import { basketOf } from './baskets';
import { categoryInfo } from './categories';
import { growthOf, type Growth } from './growth';
import { evaluateOrava } from './logic';
import { averageByCategory, monthLabel, monthlyTotals, sum, type MonthTotals } from './months';
import { findRecurring, recurringKeyOf, type RecurringSummary } from './recurring';
import { isSecondaryAccount, scoreOf, type Score } from './score';
import { aheadOf, SAVINGS_GOAL, type Ahead } from './ahead';
import { monthRange } from './history';

/** Tag colour: good = green, neutral = gray, warn = orange, bad = red (a big problem). */
export type Tone = 'good' | 'neutral' | 'warn' | 'bad';

/** One small score card under Orava's verdict. */
export interface Stat {
  key: 'month' | 'watch' | 'kept' | 'stays' | 'idle';
  label: string;
  /** Big number, already formatted. */
  value: string;
  /** Small line under the value. */
  sub: string;
  tag: { text: string; tone: Tone };
}

/** Where income goes, monthly average of the score window, in buckets. */
export interface SplitPart {
  key: 'moved' | 'bills' | 'essentials' | 'surprises' | 'extras' | 'saved';
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
  /** Regular payments this month: paid already plus the ones still coming. */
  bills: number;
  billsUpcoming: number;
  /** Savings goal for the month (share of income), after regular investing. */
  goal: number;
  goalRate: number;
  /** Everything except regular payments, spent so far this month. */
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

/** This month's everyday spending against your usual pace up to the same day. */
export interface Pace {
  /** Spent so far this month (everything except housing and utilities). */
  spent: number;
  /** What you usually spend by this day: 6-month average × share of the month gone. */
  usual: number;
  /** The category furthest above its usual pace, if any is more than €10 over. */
  watch: { category: string; spent: number; usual: number; over: number } | null;
  /** Day of the month today, and days in the month. */
  day: number;
  daysInMonth: number;
  /** (Income − housing and utilities) ÷ days in the month: what can go out each day. */
  dailyLimit: number;
  /** Everyday spending so far ÷ days gone. */
  dailySoFar: number;
}

/** One group of this month's spending, with its categories (largest first). */
export interface MonthGroup {
  key: 'moved' | 'bills' | 'essentials' | 'surprises' | 'extras';
  label: string;
  amount: number;
  items: MonthItem[];
  /** Of `amount`: regular payments not paid yet this month, already counted, shown dotted. */
  upcoming: number;
}

/** One line of a group: a category's spending so far, or a regular payment still to come. */
export interface MonthItem {
  category: string;
  amount: number;
  /** A regular payment not paid yet: its payee and typical day of the month. */
  due?: { name: string; day: number };
}

/** A regular payment not paid yet this month. */
export interface Upcoming {
  name: string;
  category: string;
  amount: number;
  day: number;
}

/** This month so far: income, and where it has gone. */
export interface ThisMonth {
  /** e.g. "September". */
  name: string;
  income: number;
  /** The salary hasn't arrived yet this month: income is last month's, as expected. */
  expected: boolean;
  groups: MonthGroup[];
  /** Spent on housing, essentials, surprises and extras. */
  spent: number;
  /**
   * Income minus spending, minus regular payments still to come (and money moved to another
   * bank). Money put into investments counts as left over, as in the Left over tile and score.
   */
  left: number;
  /** The part of `left` that went to investments. */
  invested: number;
}

export interface HealthReport {
  /** e.g. "September 2026". */
  period: string;
  /** This month so far. */
  income: number;
  spending: number;
  balance: number;
  /** True when this is not the customer's main bank (salary swept elsewhere, no rent here). */
  partial: boolean;
  orava: OravaState;
  /** Main-bank score, or the spending-account score when `partial`. */
  score: Score;
  growth: Growth;
  stats: Stat[];
  safe: SafeToSpend;
  pace: Pace;
  thisMonth: ThisMonth;
  split: SplitPart[];
  recurring: RecurringSummary;
  ahead: Ahead;
  /** Monthly totals, oldest first: input for the what-if simulator. */
  months: MonthTotals[];
  /** All transactions, newest first: input for the history view. */
  txs: Transaction[];
}

/**
 * The Money health report as it was at the end of `month` (YYYY-MM): only the transactions up
 * to that month, and the balance as it was then (today's balance minus everything after). The
 * newest month in the data is "now", so it gets the live report; earlier months are finished.
 * Used by the Money health month switcher and by the server to build AI context for any month.
 */
export function reportForMonth(txs: Transaction[], balance: number, month: string): HealthReport {
  if (month >= monthRange(txs).last) return buildHealth(txs, balance);
  const upTo = txs.filter((t) => t.date.slice(0, 7) <= month);
  const after = txs.filter((t) => t.date.slice(0, 7) > month).reduce((a, t) => a + t.amount, 0);
  return buildHealth(upTo, balance - after, { finished: true });
}

const money = (n: number) => `€${Math.round(Math.abs(n)).toLocaleString('en-GB')}`;

/**
 * `finished`: the data is a month that is over, so nothing is "still to come" in it.
 */
export function buildHealth(
  txs: Transaction[],
  balance: number,
  { finished = false }: { finished?: boolean } = {},
): HealthReport {
  const months = monthlyTotals(txs, balance);
  const current = months[months.length - 1];
  const partial = isSecondaryAccount(months);
  const variant = partial ? 'pocket' : 'main';
  const score = scoreOf(months, balance, {}, variant);
  const orava = evaluateOrava(score, balance);
  const growth = growthOf(score, variant);
  const recurring = findRecurring(txs);
  const safe = safeToSpend(txs, months, recurring);

  const thisMonthSpend = current ? sum(Object.values(current.byCategory)) : 0;

  const pace = paceOf(txs, months);
  const kept = score.pillars.find((p) => p.key === 'kept');
  const within = score.pillars.find((x) => x.key === 'within');
  const p = score.perMonth;
  const stayShare = p.income > 0 ? (p.income - p.swept) / p.income : 0;
  const signed = (n: number) => `${n < 0 ? '−' : '+'}${money(n)}`;

  // This month: what can still go out each day from tomorrow (safe to spend ÷ days after today),
  // the same number Ask Orava uses. A finished month: what went out per day against the limit.
  const restDays = Math.max(1, safe.daysLeft - 1);
  const perDayLeft = Math.max(0, safe.left) / restDays;
  const monthStat: Stat = finished
    ? {
        key: 'month',
        label: 'Spent per day',
        value: money(pace.dailySoFar),
        sub: `limit ${money(pace.dailyLimit)}/day`,
        tag:
          pace.dailySoFar <= pace.dailyLimit
            ? { text: 'Good', tone: 'good' }
            : pace.dailySoFar <= pace.dailyLimit * 1.1
              ? { text: 'High', tone: 'warn' }
              : { text: 'Over', tone: 'bad' },
      }
    : {
        key: 'month',
        label: 'Left per day',
        value: money(perDayLeft),
        sub:
          safe.left < 0
            ? `${money(safe.left)} over`
            : `${money(safe.left)} for ${restDays} day${restDays === 1 ? '' : 's'}`,
        tag:
          safe.left < 0
            ? { text: 'Over', tone: 'bad' }
            : perDayLeft < pace.dailySoFar
              ? { text: 'Tight', tone: 'warn' }
              : { text: 'Good', tone: 'good' },
      };
  const watchStat: Stat = pace.watch
    ? {
        key: 'watch',
        label: 'Overspending',
        value: signed(pace.watch.over),
        sub: categoryInfo(pace.watch.category).name,
        tag: { text: 'Over', tone: 'warn' },
      }
    : {
        key: 'watch',
        label: 'Overspending',
        value: 'None',
        sub: 'all on pace',
        tag: { text: 'Good', tone: 'good' },
      };
  const idleStat: Stat = {
    key: 'idle',
    label: 'Idle money',
    value: money(growth.idle),
    sub: 'unused 3 mo',
    tag: growth.idle <= 0 ? { text: 'Good', tone: 'good' } : { text: 'Idle', tone: 'warn' },
  };

  const stats: Stat[] = partial
    ? [
        monthStat,
        {
          key: 'stays',
          label: 'Stays here',
          value: `${Math.round(stayShare * 100)}%`,
          sub: 'of salary',
          tag:
            (within?.value ?? 0) < 0
              ? { text: 'Over', tone: 'bad' }
              : { text: 'Good', tone: 'good' },
        },
        idleStat,
      ]
    : [
        monthStat,
        {
          key: 'kept',
          label: 'Avg left over',
          value: `${p.income - p.spending < 0 ? '−' : ''}${money(p.income - p.spending)}`,
          sub: 'a month, last 3',
          tag:
            kept!.value < 0
              ? { text: 'Over', tone: 'bad' }
              : kept!.value >= 0.1
                ? { text: 'Good', tone: 'good' }
                : { text: 'Low', tone: 'warn' },
        },
        watchStat,
      ];

  return {
    period: current ? monthLabel(current.month) : 'This month',
    income: current?.income ?? 0,
    spending: thisMonthSpend,
    balance,
    partial,
    orava,
    score,
    growth,
    stats,
    safe,
    pace,
    thisMonth: thisMonthOf(
      months,
      (finished ? [] : recurring.items)
        .filter((i) => !i.paidThisMonth && i.basket !== 'invested' && i.basket !== 'transfer')
        .map((i) => ({ name: i.name, category: i.category, amount: i.monthly, day: i.day })),
    ),
    split: splitOf(score),
    recurring,
    ahead: aheadOf(months, balance),
    months,
    txs,
  };
}

const GROUPS: { key: MonthGroup['key']; label: string; basket: string }[] = [
  { key: 'bills', label: 'Housing', basket: 'fixed' },
  { key: 'essentials', label: 'Essentials', basket: 'needs' },
  { key: 'surprises', label: 'Surprises', basket: 'surprises' },
  { key: 'extras', label: 'Flexible spending', basket: 'slips' },
];

/** This month's income and what it went on, by group and category. */
export function thisMonthOf(months: MonthTotals[], upcoming: Upcoming[] = []): ThisMonth {
  const current = months[months.length - 1];
  const prev = months[months.length - 2];
  const expected = !!current && current.income === 0 && !!prev;
  const income = expected ? prev.income : (current?.income ?? 0);
  const moved = expected ? prev.sweptOut : (current?.sweptOut ?? 0);
  const by = current?.byCategory ?? {};

  const groups: MonthGroup[] = [];
  if (moved > 0) {
    groups.push({
      key: 'moved',
      label: 'To your other bank',
      amount: moved,
      items: [],
      upcoming: 0,
    });
  }
  for (const g of GROUPS) {
    const paid: MonthItem[] = Object.entries(by)
      .filter(([c, v]) => basketOf(c, -1) === g.basket && v > 0)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    // Regular payments still to come count as spent already, in their own group.
    const coming: MonthItem[] = upcoming
      .filter((u) => basketOf(u.category, -1) === g.basket)
      .sort((a, b) => a.day - b.day)
      .map((u) => ({ category: u.category, amount: u.amount, due: { name: u.name, day: u.day } }));
    const items = [...paid, ...coming];
    const amount = sum(items.map((i) => i.amount));
    if (amount > 0) {
      groups.push({
        key: g.key,
        label: g.label,
        amount,
        items,
        upcoming: sum(coming.map((i) => i.amount)),
      });
    }
  }
  const spent = sum(groups.filter((g) => g.key !== 'moved').map((g) => g.amount - g.upcoming));
  const left = income - sum(groups.map((g) => g.amount));
  return {
    name: current ? monthLabel(current.month).split(' ')[0] : 'This month',
    income,
    expected,
    groups,
    spent,
    left,
    invested: Math.min(Math.max(0, left), Math.max(0, current?.invested ?? 0)),
  };
}

/** Months behind "usual" in the This month and Watch tiles. */
const USUAL_MONTHS = 6;
/** Everyday baskets: housing and utilities come once a month, so they're left out of the pace. */
const EVERYDAY = ['needs', 'surprises', 'slips'];

/**
 * This month so far against the usual pace: each category's average over the 6 months before,
 * times the share of the month gone. "Today" is the newest day in the data.
 */
function paceOf(txs: Transaction[], months: MonthTotals[]): Pace {
  const current = months[months.length - 1];
  if (!current) {
    return {
      spent: 0,
      usual: 0,
      watch: null,
      day: 1,
      daysInMonth: 30,
      dailyLimit: 0,
      dailySoFar: 0,
    };
  }
  const todayDate = txs.reduce((d, t) => (t.date > d ? t.date : d), '');
  const [y, m, d] = todayDate.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const share = d / daysInMonth;
  const usualBy = averageByCategory(months.slice(-1 - USUAL_MONTHS, -1));
  const cats = new Set([...Object.keys(usualBy), ...Object.keys(current.byCategory)]);

  let spent = 0;
  let usual = 0;
  let watch: Pace['watch'] = null;
  for (const c of cats) {
    if (!EVERYDAY.includes(basketOf(c, -1))) continue;
    const now = current.byCategory[c] ?? 0;
    const pace = (usualBy[c] ?? 0) * share;
    spent += now;
    usual += pace;
    if (now - pace >= 10 && (!watch || now - pace > watch.over)) {
      watch = { category: c, spent: now, usual: pace, over: now - pace };
    }
  }
  // Daily limit: this month's income (last month's if the salary isn't in yet), minus money moved
  // to another bank, minus housing and utilities (this month's, or the usual if not paid yet).
  const month = thisMonthOf(months);
  const moved = month.groups.find((g) => g.key === 'moved')?.amount ?? 0;
  const fixedNow = month.groups.find((g) => g.key === 'bills')?.amount ?? 0;
  const fixedUsual = sum(
    Object.entries(usualBy)
      .filter(([c]) => basketOf(c, -1) === 'fixed')
      .map(([, v]) => v),
  );
  const free = month.income - moved - Math.max(fixedNow, fixedUsual);
  return {
    spent,
    usual,
    watch,
    day: d,
    daysInMonth,
    dailyLimit: Math.max(0, free) / daysInMonth,
    dailySoFar: spent / Math.max(1, d),
  };
}

/**
 * Buckets of the average month: Housing (rent + utilities), Essentials, Surprises, Flexible spending, Saved. For a spending
 * account the salary moved on to the other bank comes first ("To your other bank").
 */
export function splitOf(s: Score): SplitPart[] {
  const p = s.perMonth;
  const saved = Math.max(0, p.income - p.swept - p.spending);
  const base = Math.max(p.income, p.swept + p.spending) || 1;
  const parts: Omit<SplitPart, 'share'>[] = [
    ...(p.swept > 0
      ? [{ key: 'moved' as const, label: 'To your other bank', amount: p.swept }]
      : []),
    { key: 'bills', label: 'Housing', amount: p.fixed },
    { key: 'essentials', label: 'Essentials', amount: p.needs },
    { key: 'surprises', label: 'Surprises', amount: p.surprises },
    { key: 'extras', label: 'Flexible spending', amount: p.slips },
    { key: 'saved', label: 'Saved', amount: saved },
  ];
  // A spending account often has no bills or surprises here: leave out empty slices.
  const shown = s.variant === 'pocket' ? parts.filter((x) => x.amount >= 1) : parts;
  return shown.map((x) => ({ ...x, share: x.amount / base }));
}

/**
 * Safe to spend = income − regular payments (paid + still coming) − savings goal − what's
 * already spent on everything else. "Today" is the newest day in the data, so the prototype
 * works on past datasets too.
 */
function safeToSpend(
  txs: Transaction[],
  months: MonthTotals[],
  recurring: RecurringSummary,
): SafeToSpend {
  const todayDate = txs.reduce((d, t) => (t.date > d ? t.date : d), '');
  const [y, m, d] = (todayDate || '2000-01-01').split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const daysLeft = daysInMonth - d + 1;
  const month = txs.filter((t) => t.date.startsWith(todayDate.slice(0, 7)));
  const prev = months[months.length - 2];

  const incomeIn = sum(
    month.filter((t) => basketOf(t.category, t.amount) === 'income').map((t) => t.amount),
  );
  const incomeExpected = incomeIn === 0 ? (prev?.income ?? 0) : 0;
  // Money moved on to another bank is not spendable here: what was swept this month, or last
  // month's sweep when the salary is still to come or hasn't been moved on yet.
  const sweptNow = sum(
    month.filter((t) => t.category === 'Salary Sweep' && t.amount < 0).map((t) => -t.amount),
  );
  const swept = sweptNow > 0 ? sweptNow : (prev?.sweptOut ?? 0);
  const income = incomeIn + incomeExpected - swept;

  const isSpending = (t: Transaction) =>
    t.amount < 0 &&
    ['fixed', 'needs', 'surprises', 'slips'].includes(basketOf(t.category, t.amount));
  const recKeys = new Set(recurring.items.map((i) => i.key));
  const recurringSpend = recurring.items.filter(
    (i) => i.basket !== 'invested' && i.basket !== 'transfer',
  );
  const recurringInvest = recurring.items.filter((i) => i.basket === 'invested');

  const billsPaid = sum(recurringSpend.filter((i) => i.paidThisMonth).map((i) => i.paidAmount));
  const billsUpcoming = sum(recurringSpend.filter((i) => !i.paidThisMonth).map((i) => i.monthly));
  const bills = billsPaid + billsUpcoming;
  const investing = sum(recurringInvest.map((i) => (i.paidThisMonth ? i.paidAmount : i.monthly)));
  const goal = Math.max(0, income * SAVINGS_GOAL - investing);

  const allSpent = sum(month.filter(isSpending).map((t) => -t.amount));
  const spent = Math.max(0, allSpent - billsPaid);
  const spendable = income - bills - investing - goal;
  const left = spendable - spent;

  const spentToday = sum(
    month
      .filter((t) => t.date === todayDate && isSpending(t) && !recKeys.has(recurringKeyOf(t)))
      .map((t) => -t.amount),
  );
  const budget = Math.max(0, left + spentToday) / daysLeft;
  const perDayAfter = daysLeft > 1 ? Math.max(0, left) / (daysLeft - 1) : 0;

  // Forecast: everyday spending keeps the pace of the days so far.
  const projectedSpent = d > 0 ? (spent / d) * daysInMonth : spent;
  // Regular investing counts as kept, so it is not subtracted here.
  const forecastKept = income - bills - projectedSpent;

  return {
    income,
    incomeExpected,
    bills,
    billsUpcoming,
    goal: goal + investing,
    goalRate: SAVINGS_GOAL,
    spent,
    left,
    monthName: todayDate ? monthLabel(todayDate.slice(0, 7)).split(' ')[0] : '',
    daysLeft,
    today: { budget, spent: spentToday, left: budget - spentToday },
    perDayAfter,
    forecastKept,
  };
}
