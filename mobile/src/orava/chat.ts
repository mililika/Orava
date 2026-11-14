// Ask Orava: answers to the suggested questions, computed from the same numbers
// the mood uses. Pure functions, no network. Free-typed questions get a demo reply
// until a real model is wired in.

import { eur } from './logic';
import { MOODS } from './moods';
import type { MonthSnapshot, OravaState } from './types';

export interface Answer {
  text: string;
  /** What the answer is based on, shown under it. */
  basis: string;
}

export const QUESTIONS = [
  { id: 'safe', q: 'What’s safe to spend this week?' },
  { id: 'where', q: 'Where did my money go?' },
  { id: 'track', q: 'Am I on track this month?' },
  { id: 'why', q: 'Why does Orava feel this way?' },
] as const;

export type QuestionId = (typeof QUESTIONS)[number]['id'];

export function answer(
  id: QuestionId,
  s: MonthSnapshot,
  state: OravaState,
  topSlip: { category: string; amount: number } | null,
  txCount: number,
): Answer {
  switch (id) {
    case 'safe':
      return state.safeThisWeek >= 0
        ? {
            text: `${eur(state.safeThisWeek)}. You usually spend about ${eur(state.weeklyAllowance)} a week on extras like eating out and shopping, and ${eur(s.slipsThisWeek)} of that is used in the last 7 days.`,
            basis: 'Based on your usual everyday slips',
          }
        : {
            text: `Nothing more this week. You’ve spent ${eur(s.slipsThisWeek)} on extras in the last 7 days, ${eur(state.safeThisWeek)} more than your usual ${eur(state.weeklyAllowance)}. Groceries and bills are not counted here.`,
            basis: 'Based on your usual everyday slips',
          };
    case 'where':
      return {
        text: `Regular must-pays ${eur(s.mustPayRegular)}, surprise costs ${eur(s.mustPaySurprises)}, groceries and transport ${eur(s.needs)}, and everyday slips ${eur(s.everydaySlips)}.${topSlip ? ` ${topSlip.category} is your biggest everyday slip (${eur(topSlip.amount)}).` : ''}`,
        basis: `Based on ${txCount} transactions this month`,
      };
    case 'track': {
      const pct = Math.round(state.savingRate * 100);
      const missing = s.income * 0.2 - state.kept;
      return pct >= 20
        ? {
            text: `Yes. You’ve kept ${pct}% of your income so far, above the 20% goal.${state.slipsDeltaPct > 15 ? ' Everyday slips are the one thing creeping up.' : ''}`,
            basis: 'Based on your income and a 20% goal',
          }
        : {
            text: `Not quite yet. You’ve kept ${pct}% of your income so far. Keeping ${eur(missing)} more would reach the 20% goal.`,
            basis: 'Based on your income and a 20% goal',
          };
    }
    case 'why':
      return {
        text: `I’m ${MOODS[state.mood].name.toLowerCase()}. ${state.reasons.join(' ')}`,
        basis: `Health score ${state.score} / 100`,
      };
  }
}

export const DEMO_REPLY: Answer = {
  text: 'In this demo I can answer the suggested questions. In the real app I’d answer from your own transactions.',
  basis: 'Demo answer',
};
