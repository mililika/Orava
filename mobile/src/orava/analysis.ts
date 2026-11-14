// Turns a list of transactions into everything the Orava screens show:
// the month snapshot (for the mood), per-category totals, a fair comparison with earlier
// months, the top insight and what-if illustrations.
//
// Pure functions only: no React, no network. Checked by scripts/check-orava.ts.
//
// Comparison rules (see .plans/financial-health-spec.md):
// - Months are only compared when the data's coverage is KNOWN (a verified start and end date).
//   The last transaction date does not prove coverage, so without known coverage there is
//   no comparison and nothing is described as "usual".
// - Every month in a comparison (current and earlier) uses the SAME day range 1..days.
// - Unknown money in is shown separately and never counted as income.

import { basketOf, isFlexible } from './categories';
import { evaluateOrava } from './logic';
import type { FlexibleComparison, Mood, MonthSnapshot, OravaState } from './types';

/** Minimal transaction shape the analysis needs. Negative amount = money out. */
export interface Tx {
  date: string; // YYYY-MM-DD
  category: string;
  amount: number;
}

/** Inclusive date range the data is known to fully cover. */
export interface Coverage {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export interface CategoryTotal {
  category: string;
  /** Net euros out for spending categories (refunds reduce it); net euros in for income. */
  amount: number;
  /** Purchases (money-out transactions) recorded this period. */
  count: number;
}

export interface CategoryComparison {
  category: string;
  /** Spending on days 1..days of the current month. */
  current: number;
  /** Average spending on days 1..days of the comparison months. */
  usual: number;
  /** Purchases on days 1..days of the current month. */
  countCurrent: number;
  /** Average purchases per month on days 1..days of the comparison months. */
  countUsual: number;
}

export interface MonthAnalysis {
  month: string; // YYYY-MM
  /** "1–30 Sep 2026", or "Sep 2026 (transactions available so far)" when coverage is unknown. */
  periodLabel: string;
  /** "September". */
  monthName: string;
  snapshot: MonthSnapshot;
  /** Spending per category this period, biggest first. Flexible only. */
  flexible: CategoryTotal[];
  /** Category names that were not recognised, by direction. */
  unknownOut: string[];
  unknownIn: string[];
  /** How many transactions were recorded per basket this period (0 = none recorded). */
  counts: Record<'regular' | 'unexpected' | 'everydayEssential' | 'flexible' | 'otherOut', number>;
  /** Per-category comparison of flexible spending, or null. */
  comparison: { days: number; months: string[]; categories: CategoryComparison[] } | null;
  /** Why there is no comparison, in plain words. Null when there is one. */
  noComparisonReason: string | null;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MAX_COMPARISON_MONTHS = 3;

// ---------- date helpers (string based, no time zones) ----------

const monthOf = (date: string) => date.slice(0, 7);
const dayOf = (date: string) => Number(date.slice(8, 10));

function daysInMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function prevMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

const firstDay = (month: string) => `${month}-01`;
const lastDay = (month: string) => `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
const monthName = (month: string) => MONTH_NAMES[Number(month.slice(5, 7)) - 1];

/** True when the coverage includes every day of the month. */
function fullyCovered(month: string, c: Coverage) {
  return c.start <= firstDay(month) && c.end >= lastDay(month);
}

// ---------- sums ----------

/** Net spending for a set of transactions: money out minus refunds. */
function netOut(txs: Tx[]) {
  return -txs.reduce((sum, t) => sum + t.amount, 0);
}

function byCategory(txs: Tx[]) {
  const map = new Map<string, Tx[]>();
  for (const t of txs) {
    const list = map.get(t.category);
    if (list) list.push(t);
    else map.set(t.category, [t]);
  }
  return map;
}

/** Sums one period of transactions into a snapshot (comparison is added separately). */
export function snapshotOf(txs: Tx[], balance: number): MonthSnapshot {
  const s: MonthSnapshot = {
    balance,
    income: 0,
    regular: 0,
    unexpected: 0,
    everydayEssential: 0,
    flexible: 0,
    otherOut: 0,
    otherIn: 0,
    flexibleComparison: null,
  };
  for (const t of txs) {
    const basket = basketOf(t.category);
    if (basket === 'income') s.income += t.amount;
    else if (basket)
      s[basket] -= t.amount; // money out is negative; refunds reduce spending
    else if (t.amount < 0) s.otherOut -= t.amount;
    else s.otherIn += t.amount;
  }
  return s;
}

// ---------- the main analysis ----------

/**
 * Analyses the current month.
 * @param coverage the verified date range of the data, or null when it is not known.
 */
export function analyzeMonth(txs: Tx[], balance: number, coverage: Coverage | null): MonthAnalysis {
  const latestTx = txs.reduce((m, t) => (t.date > m ? t.date : m), '');
  const month = coverage ? monthOf(coverage.end) : monthOf(latestTx || '1970-01-01');
  const inMonth = (t: Tx) =>
    monthOf(t.date) === month &&
    (!coverage || (t.date >= coverage.start && t.date <= coverage.end));
  const monthTxs = txs.filter(inMonth);

  const snapshot = snapshotOf(monthTxs, balance);

  const flexible = [...byCategory(monthTxs.filter((t) => isFlexible(t.category)))]
    .map(([category, list]) => ({
      category,
      amount: round2(netOut(list)),
      count: list.filter((t) => t.amount < 0).length,
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const unknown = monthTxs.filter((t) => !basketOf(t.category));
  const counts = { regular: 0, unexpected: 0, everydayEssential: 0, flexible: 0, otherOut: 0 };
  for (const t of monthTxs) {
    const b = basketOf(t.category);
    if (b && b !== 'income') counts[b]++;
    else if (!b && t.amount < 0) counts.otherOut++;
  }
  const unknownOut = unique(unknown.filter((t) => t.amount < 0).map((t) => t.category));
  const unknownIn = unique(unknown.filter((t) => t.amount > 0).map((t) => t.category));

  // Period label: exact only when coverage is known.
  let periodLabel: string;
  if (coverage) {
    const start = coverage.start > firstDay(month) ? dayOf(coverage.start) : 1;
    const end = coverage.end < lastDay(month) ? dayOf(coverage.end) : daysInMonth(month);
    periodLabel = `${start}–${end} ${monthName(month).slice(0, 3)} ${month.slice(0, 4)}`;
  } else {
    periodLabel = `${monthName(month).slice(0, 3)} ${month.slice(0, 4)} (transactions available so far)`;
  }

  const { comparison, reason } = compare(txs, month, coverage);
  if (comparison) {
    const current = comparison.categories.reduce((s, c) => s + c.current, 0);
    const usual = comparison.categories.reduce((s, c) => s + c.usual, 0);
    const fc: FlexibleComparison = {
      current: round2(current),
      usual: round2(usual),
      days: comparison.days,
      months: comparison.months,
    };
    snapshot.flexibleComparison = fc;
  }

  return {
    month,
    periodLabel,
    monthName: monthName(month),
    snapshot,
    flexible,
    unknownOut,
    unknownIn,
    counts,
    comparison,
    noComparisonReason: reason,
  };
}

/** Builds the same-day-range comparison of flexible spending, or explains why there is none. */
function compare(
  txs: Tx[],
  month: string,
  coverage: Coverage | null,
): { comparison: MonthAnalysis['comparison']; reason: string | null } {
  if (!coverage) {
    return {
      comparison: null,
      reason:
        "We can't confirm which months your data fully covers, so Orava doesn't compare with earlier months.",
    };
  }
  if (coverage.start > firstDay(month)) {
    return { comparison: null, reason: 'Your data starts in the middle of this month.' };
  }
  // Current month: days 1..D are covered.
  const currentDays = coverage.end < lastDay(month) ? dayOf(coverage.end) : daysInMonth(month);

  const months: string[] = [];
  for (let m = prevMonth(month); months.length < MAX_COMPARISON_MONTHS; m = prevMonth(m)) {
    if (!fullyCovered(m, coverage)) break; // coverage is one continuous range
    months.unshift(m);
  }
  if (months.length === 0) {
    return { comparison: null, reason: 'There are no earlier months to compare with yet.' };
  }

  // One day range for every month in the comparison.
  const days = Math.min(currentDays, ...months.map(daysInMonth));
  const within = (t: Tx, m: string) => monthOf(t.date) === m && dayOf(t.date) <= days;

  const flexTxs = txs.filter((t) => isFlexible(t.category));
  const categories = unique(
    flexTxs
      .filter((t) => t.date <= coverage.end && t.date >= coverage.start)
      .map((t) => t.category),
  )
    .map((category) => {
      const own = flexTxs.filter((t) => t.category === category);
      const current = netOut(own.filter((t) => within(t, month)));
      const usual =
        months.reduce((sum, m) => sum + netOut(own.filter((t) => within(t, m))), 0) / months.length;
      const purchases = (m: string) => own.filter((t) => within(t, m) && t.amount < 0).length;
      const countUsual = months.reduce((sum, m) => sum + purchases(m), 0) / months.length;
      return {
        category,
        current: round2(current),
        usual: round2(usual),
        countCurrent: purchases(month),
        countUsual: Math.round(countUsual * 10) / 10,
      };
    })
    .filter((c) => c.current > 0 || c.usual > 0);

  return { comparison: { days, months, categories }, reason: null };
}

// ---------- top insight ----------

export type Insight =
  | {
      kind: 'rise';
      category: string;
      current: number;
      usual: number;
      days: number;
      months: string[];
      /** True only when the mood was produced by the flexible-spending rule. */
      explainsMood: boolean;
    }
  | {
      kind: 'noRise';
      category: string;
      current: number;
      usual: number;
      days: number;
      months: string[];
    }
  | { kind: 'noComparison'; category: string; amount: number; reason: string }
  | { kind: 'none' };

/** Rises smaller than this are treated as no change. */
const MIN_RISE = 1;

export function topInsight(a: MonthAnalysis, state: OravaState): Insight {
  if (a.comparison) {
    const { days, months, categories } = a.comparison;
    const rises = categories
      .map((c) => ({ ...c, rise: c.current - c.usual }))
      .sort((x, y) => y.rise - x.rise);
    const top = rises[0];
    if (top && top.rise >= MIN_RISE) {
      const moodFromFlexible =
        state.basis.includes('flexibleUp') || state.basis.includes('flexibleHigh');
      return {
        kind: 'rise',
        category: top.category,
        current: top.current,
        usual: top.usual,
        days,
        months,
        explainsMood: moodFromFlexible,
      };
    }
    const biggest = [...categories].sort((x, y) => y.current - x.current)[0];
    if (biggest && biggest.current > 0) {
      return {
        kind: 'noRise',
        category: biggest.category,
        current: biggest.current,
        usual: biggest.usual,
        days,
        months,
      };
    }
  }
  const largest = a.flexible[0];
  if (!largest) return { kind: 'none' };
  return {
    kind: 'noComparison',
    category: largest.category,
    amount: largest.amount,
    reason: a.noComparisonReason ?? 'No change compared with earlier months.',
  };
}

// ---------- what-if ----------

export const WHAT_IF_STEPS = [25, 50, 100] as const;

export interface Illustration {
  category: string;
  reduceBy: number;
  keptBefore: number;
  keptAfter: number;
  savingRateBefore: number;
  savingRateAfter: number;
  incomeKnown: boolean;
  moodBefore: Mood;
  moodAfter: Mood;
}

/** How much of a flexible category was spent this period (0 if not flexible or not spent). */
export function spentOn(a: MonthAnalysis, category: string) {
  return a.flexible.find((c) => c.category === category)?.amount ?? 0;
}

/** Is this reduction allowed? Flexible only, never more than was spent. */
export function canReduce(a: MonthAnalysis, category: string, reduceBy: number) {
  return isFlexible(category) && reduceBy > 0 && reduceBy <= spentOn(a, category);
}

/**
 * "What if this month had €X less on <category>?" Recomputes the CURRENT month only.
 * Not a forecast: income and all other spending stay exactly as they were.
 * Returns null for a reduction that is not allowed.
 */
export function illustrate(
  a: MonthAnalysis,
  category: string,
  reduceBy: number,
): Illustration | null {
  if (!canReduce(a, category, reduceBy)) return null;
  const before = evaluateOrava(a.snapshot);

  const cmp = a.snapshot.flexibleComparison;
  let flexibleComparison = cmp;
  if (cmp && a.comparison) {
    // Only the part of the reduction that falls inside the compared days can lower that number.
    const inWindow = a.comparison.categories.find((c) => c.category === category)?.current ?? 0;
    flexibleComparison = { ...cmp, current: round2(cmp.current - Math.min(reduceBy, inWindow)) };
  }
  const after = evaluateOrava({
    ...a.snapshot,
    balance: a.snapshot.balance + reduceBy,
    flexible: a.snapshot.flexible - reduceBy,
    flexibleComparison,
  });

  return {
    category,
    reduceBy,
    keptBefore: round2(before.kept),
    keptAfter: round2(after.kept),
    savingRateBefore: before.savingRate,
    savingRateAfter: after.savingRate,
    incomeKnown: a.snapshot.income > 0,
    moodBefore: before.mood,
    moodAfter: after.mood,
  };
}

// ---------- small utils ----------

function unique(xs: string[]) {
  return [...new Set(xs)];
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
