// Regular payments: money that leaves every month to the same payee for the same amount.
//
// A payee is recurring when, in each of the 3 full months before the current one, it was paid
// about the same amount (±5% of its usual) on about the same day (±4 days). Bills (rent,
// utilities) and monthly investing only need to show up in 4 of the last 6 months, because their
// amount moves with the season and one missed month shouldn't end them. The current month is left out of the test because a bill may not have
// arrived yet; it tells us what is still to come instead.

import type { Transaction, Basket } from './types';
import { basketOf } from './baskets';
import { median, sum } from './months';

export const AMOUNT_TOLERANCE = 0.05;
export const DAY_TOLERANCE = 4;
const LOOKBACK = 3;
/** Bills (rent, utilities) and monthly investing: looked for over 6 months, and a missed month or
 * two doesn't end them (a payment can be late, or skipped once), so they need 4 of the 6. */
const BILL_LOOKBACK = 6;
const BILL_MIN_MONTHS = 4;

export interface RecurringPayment {
  key: string;
  name: string;
  category: string;
  basket: Basket;
  /** Typical monthly amount (median of the last 3 full months). */
  monthly: number;
  /** Largest gap from the typical amount, 0–1. 0 = the same amount every month. */
  spread: number;
  /** Typical day of the month it leaves. */
  day: number;
  /** Already paid in the current month. */
  paidThisMonth: boolean;
  paidAmount: number;
}

export interface RecurringSummary {
  items: RecurringPayment[];
  /** Sum of typical monthly amounts. */
  monthlyTotal: number;
  /** Still expected this month (not paid yet). */
  upcoming: number;
  /** Over the 3 full months: share of outgoing transactions and of spent euros that were recurring. */
  txShare: number;
  spendShare: number;
  txCount: number;
  recurringTxCount: number;
  currentMonth: string;
}

const CATEGORY_KEYED = new Set(['Housing', 'Utilities', 'Invest Deposit', 'Salary Sweep']);

/** Payee of a transaction. The dataset has no merchant for bills, so those group by category. */
function payeeOf(t: Transaction) {
  if (CATEGORY_KEYED.has(t.category) && (!t.merchant || t.merchant === t.category)) {
    return t.category;
  }
  return t.merchant || t.category;
}

/** Grouping key of a payment: category + payee. */
export function recurringKeyOf(t: Transaction) {
  return `${t.category}|${payeeOf(t)}`;
}

export function findRecurring(txs: Transaction[]): RecurringSummary {
  const out = txs.filter((t) => t.amount < 0 && basketOf(t.category, t.amount) !== 'income');
  const currentMonth = txs.reduce((m, t) => (t.date.slice(0, 7) > m ? t.date.slice(0, 7) : m), '');
  const full = previousMonths(currentMonth, LOOKBACK);
  const wide = previousMonths(currentMonth, BILL_LOOKBACK);
  const inFull = out.filter((t) => full.includes(t.date.slice(0, 7)));

  const groups = new Map<string, Transaction[]>();
  for (const t of out.filter((t) => wide.includes(t.date.slice(0, 7)))) {
    const k = recurringKeyOf(t);
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }

  const totals = (list: Transaction[], months: string[]) =>
    months.map((m) => sum(list.filter((t) => t.date.startsWith(m)).map((t) => -t.amount)));

  const items: RecurringPayment[] = [];
  for (const [key, all] of groups) {
    const { category } = all[0];
    const basket = basketOf(category, -1);
    const isBill = basket === 'fixed' || basket === 'invested';
    const list = isBill ? all : all.filter((t) => full.includes(t.date.slice(0, 7)));
    const months = isBill ? wide : full;
    const perMonth = totals(list, months);
    const paid = perMonth.filter((v) => v > 0);
    if (isBill ? paid.length < BILL_MIN_MONTHS : paid.length < months.length) continue;
    const typical = median(paid);
    const spread = Math.max(...paid.map((v) => Math.abs(v - typical) / typical));
    const days = list.map((t) => Number(t.date.slice(8, 10)));
    const day = Math.round(median(days));
    const steady =
      perMonth.every((v, i) => list.filter((t) => t.date.startsWith(months[i])).length <= 2) &&
      spread <= AMOUNT_TOLERANCE &&
      days.every((x) => Math.abs(x - day) <= DAY_TOLERANCE);
    if (!(isBill || steady)) continue;

    const now = out.filter((t) => t.date.startsWith(currentMonth) && recurringKeyOf(t) === key);
    items.push({
      key,
      name: payeeOf(list[0]),
      category,
      basket,
      monthly: typical,
      spread,
      day,
      paidThisMonth: now.length > 0,
      paidAmount: sum(now.map((t) => -t.amount)),
    });
  }
  items.sort((a, b) => b.monthly - a.monthly);

  const keys = new Set(items.map((i) => i.key));
  const isRec = (t: Transaction) => keys.has(recurringKeyOf(t));
  const spentAll = sum(inFull.map((t) => -t.amount));
  return {
    items,
    monthlyTotal: sum(items.map((i) => i.monthly)),
    upcoming: sum(items.filter((i) => !i.paidThisMonth).map((i) => i.monthly)),
    txShare: inFull.length ? inFull.filter(isRec).length / inFull.length : 0,
    spendShare: spentAll ? sum(inFull.filter(isRec).map((t) => -t.amount)) / spentAll : 0,
    txCount: inFull.length,
    recurringTxCount: inFull.filter(isRec).length,
    currentMonth,
  };
}

export function previousMonths(month: string, n: number) {
  if (!month) return [];
  const [y, m] = month.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(y, m - 1 - (n - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}
