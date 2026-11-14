// Orava's brain. This is the ONE file to change to make the mood smarter.
//
// It is a pure function: MonthSnapshot in, OravaState out. No UI, no network,
// no React. That makes it easy to unit test, and easy to move to the backend
// later without touching any screen.
//
// Rules are checked top to bottom; the first match wins. Orava is never angry
// or shaming: even the worst state reads as concern, not blame.

import type { MonthSnapshot, OravaState, ScoreBreakdown } from './types';

/**
 * The score, out of 100. Built so that 100 is out of reach: there is always a next step.
 *   base     40
 *   saving   up to +55, with diminishing returns: 10% kept ≈ +22, 20% ≈ +35, 30% ≈ +43,
 *            50% ≈ +50. Spending more than you earn costs 2.5 points per % over.
 *   slips    −0.4 points per % that everyday slips are above your usual (spending less
 *            than usual doesn't add points; it already shows up as money kept)
 * The best possible score is about 95.
 */
export const SCORE_BASE = 40;
export const SCORE_SAVING_MAX = 55;

export function scoreBreakdown(savingRate: number, slipRatio: number): ScoreBreakdown {
  const saving =
    savingRate >= 0 ? SCORE_SAVING_MAX * (1 - Math.exp(-savingRate / 0.2)) : savingRate * 250;
  const slipsOverPct = Math.round((slipRatio - 1) * 100);
  const slips = -Math.max(0, slipsOverPct) * 0.4;
  return { base: SCORE_BASE, saving: Math.round(saving), slips: Math.round(slips), slipsOverPct };
}

const eur = (n: number) => `€${Math.round(Math.abs(n)).toLocaleString('en-US')}`;

export function evaluateOrava(s: MonthSnapshot): OravaState {
  const spending = s.mustPayRegular + s.mustPaySurprises + s.needs + s.everydaySlips;
  const kept = s.income - spending;
  const savingRate = s.income > 0 ? kept / s.income : 0;
  const slipRatio = s.everydaySlipsBaseline > 0 ? s.everydaySlips / s.everydaySlipsBaseline : 1;
  const slipsOverPct = Math.round((slipRatio - 1) * 100);
  const ratePct = Math.round(savingRate * 100);

  const breakdown = scoreBreakdown(savingRate, slipRatio);
  const score = clamp(breakdown.base + breakdown.saving + breakdown.slips, 0, 100);
  const base = { score, savingRate, breakdown };

  if (s.balance < 0) {
    return {
      ...base,
      mood: 'alert',
      message: `Your balance is ${eur(s.balance)} below zero. Let’s look at it before payday.`,
      reasons: ['Balance went below zero.'],
    };
  }
  if (kept < 0) {
    return {
      ...base,
      mood: 'alert',
      message: `You’re spending ${eur(kept)} more than you earn this month.`,
      reasons: ['Spending is higher than income this month.'],
    };
  }
  if (savingRate < 0.05 || slipRatio > 1.4) {
    return {
      ...base,
      mood: 'worried',
      message:
        savingRate < 0.05
          ? `Only ${eur(kept)} is left after this month’s spending. Let’s find room together.`
          : `Everyday spending is ${slipsOverPct}% above your usual. That adds up fast.`,
      reasons: [
        savingRate < 0.05 ? `Saving rate is ${ratePct}%, under 5%.` : '',
        slipRatio > 1.4 ? `Everyday slips are ${slipsOverPct}% above your usual.` : '',
      ].filter(Boolean),
    };
  }
  if (slipRatio >= 1.15) {
    return {
      ...base,
      mood: 'worried',
      message: `Something changed: everyday spending is ${slipsOverPct}% above your usual. Want to look?`,
      reasons: [`Everyday slips are ${slipsOverPct}% above your usual (15–40% range).`],
    };
  }
  if (savingRate >= 0.2) {
    return {
      ...base,
      mood: 'happy',
      message: `You’re keeping ${ratePct}% of your income. Your nut stash is growing nicely.`,
      reasons: [`Saving rate is ${ratePct}%, at least 20%.`, 'Everyday slips are within usual.'],
    };
  }
  return {
    ...base,
    mood: 'okay',
    message: `You’re on track. About ${eur(kept)} stays with you this month.`,
    reasons: [`Saving rate is ${ratePct}% (between 5% and 20%).`, 'No big changes in spending.'],
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
