// When Orava speaks up. Pure functions, like logic.ts: data in, alerts out.
//
// Four kinds, most urgent first (only the first one that isn't dismissed is shown):
//   fraud     — a big payment, today, to a shop you've never paid before
//   overspend — 3+ meals out this week, or everyday slips 30%+ above usual this month
//   safe      — this week's everyday extras went past what's safe to spend
//   good      — keeping 20%+ of income with slips at or under usual

import { eur, weeklyAllowanceOf } from './logic';
import type { MonthSnapshot, OravaAlert, OravaState } from './types';

/** The fields of a transaction the alerts need. */
export interface TxLike {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  merchant: string;
  amount: number; // negative = money out
}

const NOT_SHOPPING = new Set(['Housing', 'Utilities', 'Salary', 'Other Income']);

/**
 * A payment that doesn't look like you: on the latest day, at a merchant that appears
 * nowhere else in your history, at least €200 and 3× your usual purchase.
 * Payments you've confirmed (`trusted`) are skipped.
 */
export function findUnusualPayment(txs: TxLike[], trusted: ReadonlySet<string>): OravaAlert | null {
  const purchases = txs.filter((t) => t.amount < 0 && !NOT_SHOPPING.has(t.category));
  if (purchases.length < 5) return null;
  const usual = median(purchases.map((t) => -t.amount));
  const latest = txs.reduce((d, t) => (t.date > d ? t.date : d), '');
  const seen = new Map<string, number>();
  for (const t of txs) seen.set(t.merchant, (seen.get(t.merchant) ?? 0) + 1);

  const odd = purchases.find(
    (t) =>
      t.date === latest &&
      !trusted.has(t.id) &&
      seen.get(t.merchant) === 1 &&
      -t.amount >= 200 &&
      -t.amount >= usual * 3,
  );
  if (!odd) return null;

  const amount = -odd.amount;
  return {
    id: `fraud:${odd.id}`,
    kind: 'fraud',
    title: 'Was this you?',
    text: `${eur(amount)} to ${odd.merchant}, a shop you’ve never paid before.`,
    cta: 'Tap to check it now ›',
    payment: {
      txId: odd.id,
      merchant: odd.merchant,
      amount,
      date: odd.date,
      category: odd.category,
    },
    reasons: [
      `You’ve never paid ${odd.merchant} before.`,
      `It’s ${Math.round(amount / usual)}× your usual purchase (about ${eur(usual)}).`,
    ],
  };
}

/** Every alert that applies right now, most urgent first. */
export function buildAlerts(
  txs: TxLike[],
  s: MonthSnapshot,
  state: OravaState,
  fraud: OravaAlert | null,
): OravaAlert[] {
  const out: OravaAlert[] = [];
  const latest = txs.reduce((d, t) => (t.date > d ? t.date : d), '');
  const slipRatio = s.everydaySlipsBaseline > 0 ? s.everydaySlips / s.everydaySlipsBaseline : 1;

  if (fraud) out.push(fraud);

  if (s.eatOutThisWeek >= 3 || slipRatio >= 1.3) {
    const usualWeek = weeklyAllowanceOf(s);
    out.push({
      id: `overspend:${latest}:${s.eatOutThisWeek}:${Math.round(slipRatio * 10)}`,
      kind: 'overspend',
      title: s.eatOutThisWeek >= 3 ? 'Psst, restaurants are up' : 'You’re overspending',
      text:
        s.eatOutThisWeek >= 3
          ? `${s.eatOutThisWeek} meals out in the last 7 days. Everyday extras are at ${eur(s.slipsThisWeek)} this week, vs a usual ${eur(usualWeek)}.`
          : `Everyday slips are ${slipRatio.toFixed(1)}× your usual this month (${eur(s.everydaySlips)} vs ${eur(s.everydaySlipsBaseline)}).`,
      cta: 'Tap to talk to Orava ›',
    });
  }

  if (state.safeThisWeek < 0) {
    const last = txs.find((t) => t.date === latest && t.amount < 0 && SLIPS.has(t.category));
    out.push({
      id: `safe:${latest}:${Math.round(state.safeThisWeek)}`,
      kind: 'safe',
      title: last ? `${last.merchant} pushed you over` : 'Over this week’s safe amount',
      text: `You’re ${eur(state.safeThisWeek)} past what’s safe to spend on extras this week.`,
      cta: 'Tap to see your options ›',
    });
  }

  if (!fraud && state.savingRate >= 0.2 && slipRatio <= 1 && state.safeThisWeek >= 0) {
    const spare = Math.floor((state.kept - s.income * 0.2) / 10) * 10;
    out.push({
      id: `good:${latest}:${Math.round(state.savingRate * 100)}`,
      kind: 'good',
      title: 'Nice one!',
      text:
        spare >= 10
          ? `You’re keeping ${Math.round(state.savingRate * 100)}% of your income. Want to move ${eur(spare)} to savings before it slips away?`
          : `You’re keeping ${Math.round(state.savingRate * 100)}% of your income this month.`,
      cta: 'Tap to see how you’re doing ›',
    });
  }

  return out;
}

const SLIPS = new Set(['Travel', 'Restaurants', 'Lifestyle', 'Entertainment']);

function median(xs: number[]) {
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
