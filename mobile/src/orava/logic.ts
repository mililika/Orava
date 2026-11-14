// Orava's brain. This is the ONE file to change to make the mood smarter.
//
// It is a pure function: MonthSnapshot in, OravaState out. No UI, no network,
// no React. That makes it easy to unit test, and easy to move to the backend
// later without touching any screen.
//
// Score (0–100), from clear rules on the baskets:
//   40 + 1.2 × % of income kept
//      + 10 if still within this week's safe-to-spend, −10 if over
//      − 0.4 × every % that everyday slips are more than 15% above usual
// Mood: 75+ happy, 55–74 calm, 40–54 worried, under 40 alert.
// An unusual payment or a balance below zero always means alert.
// Orava is never angry or shaming: even the worst state reads as concern, not blame.

import type { Mood, MonthSnapshot, OravaAlert, OravaState } from './types';

export const eur = (n: number) => `€${Math.round(Math.abs(n)).toLocaleString('en-US')}`;

/** Map a 0–100 financial health score to a mood. */
export function moodFromScore(score: number): Mood {
  if (score >= 75) return 'happy';
  if (score >= 55) return 'calm';
  if (score >= 40) return 'worried';
  return 'alert';
}

/** Usual everyday slips per week, from the monthly usual. */
export function weeklyAllowanceOf(s: MonthSnapshot) {
  return (s.everydaySlipsBaseline / s.daysInMonth) * 7;
}

export function evaluateOrava(s: MonthSnapshot, unusualPayment?: OravaAlert | null): OravaState {
  const spending = s.mustPayRegular + s.mustPaySurprises + s.needs + s.everydaySlips;
  const kept = s.income - spending;
  const savingRate = s.income > 0 ? kept / s.income : 0;
  const keptPct = Math.round(savingRate * 100);
  const slipRatio = s.everydaySlipsBaseline > 0 ? s.everydaySlips / s.everydaySlipsBaseline : 1;
  const slipsDeltaPct = Math.round((slipRatio - 1) * 100);
  const weeklyAllowance = weeklyAllowanceOf(s);
  const safeThisWeek = weeklyAllowance - s.slipsThisWeek;
  const withinSafe = safeThisWeek >= 0;

  const score = clamp(
    Math.round(
      40 + keptPct * 1.2 + (withinSafe ? 10 : -10) - Math.max(0, slipsDeltaPct - 15) * 0.4,
    ),
    0,
    100,
  );
  const base = { score, savingRate, kept, safeThisWeek, weeklyAllowance, slipsDeltaPct };
  const scoreLine = `Health score is ${score} / 100.`;
  const parts = [
    `You’ve kept ${keptPct}% of your income this month.`,
    withinSafe
      ? `You’re within this week’s safe-to-spend (${eur(safeThisWeek)} left).`
      : `You’re ${eur(safeThisWeek)} past this week’s safe-to-spend.`,
    slipsDeltaPct > 15
      ? `Everyday slips are ${slipsDeltaPct}% above your usual.`
      : 'Everyday slips are close to your usual.',
  ];

  // Alert no matter the score.
  if (unusualPayment?.payment) {
    const p = unusualPayment.payment;
    return {
      ...base,
      mood: 'alert',
      message: `Something doesn’t look like you. Please check the ${eur(p.amount)} payment to ${p.merchant}.`,
      reasons: [
        'A payment looks unusual for you. That always puts Orava on alert.',
        ...(unusualPayment.reasons ?? []),
      ],
    };
  }
  if (s.balance < 0) {
    return {
      ...base,
      mood: 'alert',
      message: `Your balance is ${eur(s.balance)} below zero. Let’s look at it before payday.`,
      reasons: ['Your balance went below zero. That always puts Orava on alert.', scoreLine],
    };
  }

  const mood = moodFromScore(score);
  const reasons = [`${scoreLine} ${RANGE[mood]}`, ...parts];

  let message: string;
  if (kept < 0) {
    message = `You’re spending ${eur(kept)} more than you earn this month. Want a plan for the rest of it?`;
  } else if (mood === 'happy') {
    message = `You’re keeping ${keptPct}% of your income. Your nut stash is growing nicely.`;
  } else if (mood === 'calm') {
    message =
      slipsDeltaPct > 15
        ? `Everyday spending is up ${slipsDeltaPct}% on your usual. Still fine, just keep an eye on it.`
        : `Things look steady. ${eur(safeThisWeek)} is safe to spend this week.`;
  } else if (mood === 'worried') {
    message = !withinSafe
      ? `You’ve gone ${eur(safeThisWeek)} past this week’s safe amount.`
      : slipsDeltaPct > 15
        ? `Everyday slips are ${slipRatio.toFixed(1)}× your usual this month.`
        : `Only ${keptPct}% of your income is left over so far. Let’s find some room.`;
  } else {
    message =
      kept < 0
        ? `You’re spending ${eur(kept)} more than you earn this month. Want a plan for the rest of it?`
        : `Money is tight this month. Let’s make a plan for the rest of it together.`;
  }

  return { ...base, mood, message, reasons };
}

const RANGE: Record<Mood, string> = {
  happy: '75 or more is Happy.',
  calm: '55–74 is Calm.',
  worried: '40–54 is Worried.',
  alert: 'Under 40 is Alert.',
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
