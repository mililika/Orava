// Orava's voice: turns the score into a mood and one sentence.
//
// The mood follows the Money health score (score.ts): 85+ doing great, 60–84 steady,
// 35–59 heads up, under 35 needs attention, and a balance below zero always needs attention.
// Orava talks about the pillar that costs the most points, because that is where a change
// helps most. Orava is never angry or shaming: even the worst state reads as concern.

import type { Pillar, Score } from './score';
import type { OravaState } from './types';

const eur = (n: number) => `€${Math.round(Math.abs(n)).toLocaleString('en-GB')}`;

/** What to say about one pillar when it is the weakest. */
function tip(p: Pillar, s: Score): string {
  switch (p.key) {
    case 'kept':
      return p.value < 0
        ? `you’re spending more than comes in (${p.shown} left over in 3 months)`
        : `${p.shown} of your income is left over; 10% is a great first goal, 20% is the target`;
    case 'buffer':
    case 'cushion':
      return `your savings buffer covers ${p.shown} of spending; 2 months is the safe zone`;
    case 'overdraft':
      return `your balance dipped below zero in ${p.shown} of the last 3`;
    case 'slips':
      return `flexible spending takes ${p.shown} of your income; under 20% leaves room to save`;
    case 'fixed':
      return `rent and bills take ${p.shown} of your income, so keep flexible spending lean`;
    case 'within':
      return `you spend ${eur(s.perMonth.spending)} a month here but only ${eur(s.perMonth.income - s.perMonth.swept)} stays after the transfer`;
    case 'idle':
      return `${eur(s.idle)} has sat untouched here for 3 months; it could be working for you`;
  }
}

export function evaluateOrava(s: Score, balance: number): OravaState {
  const reasons = s.pillars.map(
    (p) => `${p.label}: ${p.shown} → ${Math.round(p.points)}/${p.maxPoints} points.`,
  );
  const weakest = [...s.pillars].sort(
    (a, b) => b.maxPoints - b.points - (a.maxPoints - a.points),
  )[0];
  const base = { score: s.score, reasons };

  if (balance < 0) {
    return {
      ...base,
      mood: 'alert',
      message: `Your balance is ${eur(balance)} below zero. Let’s look at it before payday.`,
    };
  }
  const t = tip(weakest, s);
  const happy =
    s.variant === 'pocket'
      ? `Your spending account is in great shape: you spend within what stays here and nothing just sits idle.`
      : `${s.pillars.find((p) => p.key === 'kept')!.shown} of your income is left over, with ${s.pillars.find((p) => p.key === 'buffer')!.shown} in your savings buffer.`;
  switch (s.mood) {
    case 'happy':
      return { ...base, mood: 'happy', message: happy };
    case 'okay':
      return { ...base, mood: 'okay', message: `Steady! One thing to grow: ${t}.` };
    case 'worried':
      return { ...base, mood: 'worried', message: `Heads up: ${t}. Want to look together?` };
    default:
      return {
        ...base,
        mood: 'alert',
        message: `Money is tight right now: ${t}. Small steps help most.`,
      };
  }
}
