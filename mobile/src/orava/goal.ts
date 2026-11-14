// The user's own, optional savings goal (e.g. "Emergency buffer", €500).
// Pure functions: input validation and how a what-if amount relates to the goal.
//
// The goal is only used to put a what-if into perspective. It never changes the balance,
// Orava's mood or score, and a what-if is never shown as money already saved.

export interface SavingsGoal {
  name: string;
  amount: number; // euros, > 0
}

export const GOAL_NAME_MAX = 40;
export const GOAL_AMOUNT_MAX = 1_000_000;
const DEFAULT_NAME = 'Savings goal';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** Accepts "500", "500.50", "500,50", "1 000", "€500". Up to 2 decimals. */
export function parseGoalAmount(text: string): Parsed<number> {
  const cleaned = text.replace(/[\s €]/g, '');
  if (cleaned === '') return { ok: false, error: 'Enter an amount in euros.' };
  if (!/^\d+([.,]\d{1,2})?$/.test(cleaned)) {
    return { ok: false, error: 'Use numbers only, like 500 or 500.50.' };
  }
  const value = Number(cleaned.replace(',', '.'));
  if (!(value > 0)) return { ok: false, error: 'The goal must be more than €0.' };
  if (value > GOAL_AMOUNT_MAX) return { ok: false, error: 'Keep the goal at €1,000,000 or less.' };
  return { ok: true, value };
}

/** Name is optional; blank becomes "Savings goal". */
export function parseGoalName(text: string): Parsed<string> {
  const name = text.trim().replace(/\s+/g, ' ');
  if (name.length > GOAL_NAME_MAX) {
    return { ok: false, error: `Keep the name to ${GOAL_NAME_MAX} characters or less.` };
  }
  return { ok: true, value: name || DEFAULT_NAME };
}

export function parseGoal(name: string, amount: string): Parsed<SavingsGoal> {
  const n = parseGoalName(name);
  if (!n.ok) return n;
  const a = parseGoalAmount(amount);
  if (!a.ok) return a;
  return { ok: true, value: { name: n.value, amount: a.value } };
}

/** Share of the goal a freed-up amount would cover, in whole percent (0–100, capped). */
export function goalShare(freed: number, goal: SavingsGoal) {
  if (!(freed > 0) || !(goal.amount > 0)) return 0;
  const pct = Math.min(100, Math.round((freed / goal.amount) * 100));
  // Never round up to 100% unless the goal is really fully covered.
  return pct === 100 && freed < goal.amount ? 99 : pct;
}

const euros = (n: number) =>
  `€${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/**
 * "Spending €50 less would free up €50. If you saved it, that would cover 10% of your
 * €500 “Emergency buffer” goal." Conditional wording on purpose: nothing has been saved.
 */
export function goalLine(freed: number, goal: SavingsGoal) {
  const first = `Spending ${euros(freed)} less would free up ${euros(freed)}.`;
  const of = `your ${euros(goal.amount)} “${goal.name}” goal`;
  const ratio = freed / goal.amount;
  if (ratio >= 1) return `${first} If you saved it, that would cover all of ${of}.`;
  if (ratio < 0.005) return `${first} If you saved it, that would cover less than 1% of ${of}.`;
  return `${first} If you saved it, that would cover ${goalShare(freed, goal)}% of ${of}.`;
}
