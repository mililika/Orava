// Orava's brain. This is the ONE file to change to make the mood smarter.
//
// It is a pure function: MonthSnapshot in, OravaState out. No UI, no network,
// no React. That makes it easy to unit test, and easy to move to the backend
// later without touching any screen.
//
// Rules are checked top to bottom; the first match wins. Orava is never angry
// or shaming: even the worst state reads as concern, not blame.
//
// Flexible spending is only compared with "usual" when a reliable comparison exists
// (same day range, fully covered earlier months). Without one, those rules are skipped.

import type { MonthSnapshot, MoodBasis, OravaState } from './types';

/** Shown when there is no reliable comparison. Exported so screens can avoid repeating it. */
export const NO_COMPARISON_REASON =
  'No reliable earlier months to compare with, so Orava only looks at this month.';

const eur = (n: number) => `€${Math.round(Math.abs(n)).toLocaleString('en-US')}`;

export function spendingOf(s: MonthSnapshot) {
  return s.regular + s.unexpected + s.everydayEssential + s.flexible + s.otherOut;
}

/** Flexible spending vs. usual, or null when there is no reliable comparison. */
export function flexibleRatio(s: MonthSnapshot): number | null {
  const c = s.flexibleComparison;
  if (!c || c.usual <= 0) return null;
  return c.current / c.usual;
}

export function evaluateOrava(s: MonthSnapshot): OravaState {
  const kept = s.income - spendingOf(s);
  const savingRate = s.income > 0 ? kept / s.income : 0;
  const ratio = flexibleRatio(s);
  const overPct = ratio === null ? 0 : Math.round((ratio - 1) * 100);
  const ratePct = Math.round(savingRate * 100);
  const vsUsual = s.flexibleComparison ? comparedWith(s.flexibleComparison) : '';

  const score = clamp(
    Math.round(40 + savingRate * 250 - Math.max(0, (ratio ?? 1) - 1) * 40),
    0,
    100,
  );
  const noComparison = s.flexibleComparison === null ? [NO_COMPARISON_REASON] : [];
  const base = { score, savingRate, kept };

  if (s.balance < 0) {
    return {
      ...base,
      mood: 'alarmed',
      basis: ['balance'],
      message: `Your balance is ${eur(s.balance)} below zero. Let’s look at it before payday.`,
      reasons: ['Balance went below zero.'],
    };
  }
  if (kept < 0) {
    return {
      ...base,
      mood: 'alarmed',
      basis: ['overspend'],
      message: `You’re spending ${eur(kept)} more than you earn this month.`,
      reasons: ['Spending is higher than income this month.'],
    };
  }
  const low = savingRate < 0.05;
  const high = ratio !== null && ratio > 1.4;
  if (low || high) {
    const basis: MoodBasis[] = [];
    if (low) basis.push('lowSaving');
    if (high) basis.push('flexibleHigh');
    return {
      ...base,
      mood: 'worried',
      basis,
      message: low
        ? `Only ${eur(kept)} is left after this month’s spending. Let’s find room together.`
        : `Flexible spending is ${overPct}% above your usual. That adds up fast.`,
      reasons: [
        low ? `You kept ${ratePct}% of your income, under 5%.` : '',
        high ? `Flexible spending is ${overPct}% above your usual (${vsUsual}).` : '',
        ...noComparison,
      ].filter(Boolean),
    };
  }
  if (ratio !== null && ratio >= 1.15) {
    return {
      ...base,
      mood: 'curious',
      basis: ['flexibleUp'],
      message: `Something changed: flexible spending is ${overPct}% above your usual. Want to look?`,
      reasons: [`Flexible spending is ${overPct}% above your usual (${vsUsual}).`],
    };
  }
  const steady =
    ratio === null
      ? noComparison
      : [`Flexible spending is close to or below your usual (${vsUsual}).`];
  if (savingRate >= 0.2) {
    return {
      ...base,
      mood: 'thriving',
      basis: ['saving'],
      message: `You’re keeping ${ratePct}% of your income. Your nut stash is growing nicely.`,
      reasons: [`You kept ${ratePct}% of your income, at least 20%.`, ...steady],
    };
  }
  return {
    ...base,
    mood: 'content',
    basis: ['ok'],
    message: `You’re on track. About ${eur(kept)} stays with you this month.`,
    reasons: [`You kept ${ratePct}% of your income (between 5% and 20%).`, ...steady],
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jun–Aug" or "Aug" from YYYY-MM keys. */
export function monthRange(months: string[]) {
  const name = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1];
  if (months.length === 0) return '';
  if (months.length === 1) return name(months[0]);
  return `${name(months[0])}–${name(months[months.length - 1])}`;
}

/** "vs. days 1–30 of Jun–Aug" — the exact comparison, shown to the user. */
export function comparedWith(c: { days: number; months: string[] }) {
  return `vs. days 1–${c.days} of ${monthRange(c.months)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
