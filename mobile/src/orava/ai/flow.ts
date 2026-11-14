// "Ask Orava" on the app side: question → server classifies → app validates and calculates →
// server words an explanation from the calculated facts. Pure: the transport is injected.
//
// Numbers always come from analysis.ts. If the wording fails, the calculated result is still
// returned (with textError), so the user never sees an invented answer.

import { illustrate, type Illustration, type MonthAnalysis } from '../analysis';
import { isFlexible } from '../categories';
import { goalShare, type SavingsGoal } from '../goal';
import { monthRange } from '../logic';
import { validateInterpretation, type AskContext, type Facts, type Interpretation } from './ask';

/** What the app needs from the server. Implemented by src/lib/ai.ts (and fakes in tests). */
export interface AiTransport {
  interpret(question: string, context: AskContext): Promise<Interpretation>;
  explain(question: string, facts: Facts): Promise<string>;
}

/** Error with a message that is safe to show to the user. */
export class AiError extends Error {
  readonly userMessage: string;
  constructor(userMessage: string) {
    super(userMessage);
    this.userMessage = userMessage;
  }
}

export type AskResult =
  | {
      kind: 'whatIf';
      category: string;
      reduceBy: number;
      illustration: Illustration;
      text: string | null;
      textError: string | null;
    }
  | {
      kind: 'explain';
      category: string;
      facts: Extract<Facts, { kind: 'explain' }>;
      text: string | null;
      textError: string | null;
    }
  | { kind: 'unsupported'; message: string };

export function buildAskContext(a: MonthAnalysis): AskContext {
  return {
    categories: a.flexible.map((c) => ({ category: c.category, spent: c.amount, count: c.count })),
    hasComparison: a.comparison !== null,
  };
}

export function whatIfFacts(
  r: Illustration,
  monthName: string,
  goal: SavingsGoal | null,
): Extract<Facts, { kind: 'whatIf' }> {
  const pct = (x: number) => Math.round(x * 100);
  return {
    kind: 'whatIf',
    category: r.category,
    month: monthName,
    reduceBy: r.reduceBy,
    leftBefore: r.keptBefore,
    leftAfter: r.keptAfter,
    keptPctBefore: r.incomeKnown ? pct(r.savingRateBefore) : null,
    keptPctAfter: r.incomeKnown ? pct(r.savingRateAfter) : null,
    goal: goal
      ? { name: goal.name, amount: goal.amount, sharePct: goalShare(r.reduceBy, goal) }
      : null,
  };
}

export function explainFacts(
  a: MonthAnalysis,
  category: string,
): Extract<Facts, { kind: 'explain' }> | null {
  const c = a.comparison?.categories.find((x) => x.category === category);
  if (!a.comparison || !c) return null;
  const per = (sum: number, n: number) => (n > 0 ? Math.round(sum / n) : null);
  return {
    kind: 'explain',
    category,
    days: a.comparison.days,
    months: monthRange(a.comparison.months),
    current: c.current,
    usual: c.usual,
    countCurrent: c.countCurrent,
    countUsual: c.countUsual,
    perPurchaseCurrent: per(c.current, c.countCurrent),
    perPurchaseUsual: per(c.usual, c.countUsual),
  };
}

const WORDING_FAILED =
  'Orava couldn’t put this into words right now. The numbers are calculated from your transactions.';

export async function askOrava(
  question: string,
  a: MonthAnalysis,
  goal: SavingsGoal | null,
  ai: AiTransport,
): Promise<AskResult> {
  const context = buildAskContext(a);
  if (context.categories.length === 0) {
    return {
      kind: 'unsupported',
      message: 'There is no flexible spending to ask about this period.',
    };
  }
  const fromServer = await ai.interpret(question, context);
  if (fromServer.kind === 'unsupported') return fromServer;

  // Validate again on the device, against this device's own numbers.
  const raw =
    fromServer.kind === 'whatIf'
      ? { intent: 'what_if', category: fromServer.category, amount: fromServer.reduceBy }
      : { intent: 'explain', category: fromServer.category, amount: 0 };
  const v = validateInterpretation(raw, context);
  if (v.kind === 'unsupported') return v;

  if (v.kind === 'whatIf') {
    const illustration = isFlexible(v.category) ? illustrate(a, v.category, v.reduceBy) : null;
    if (!illustration) return { kind: 'unsupported', message: 'Orava can’t try that change.' };
    let text: string | null = null;
    let textError: string | null = null;
    try {
      text = await ai.explain(question, whatIfFacts(illustration, a.monthName, goal));
    } catch {
      textError = WORDING_FAILED;
    }
    return {
      kind: 'whatIf',
      category: v.category,
      reduceBy: v.reduceBy,
      illustration,
      text,
      textError,
    };
  }

  const facts = explainFacts(a, v.category);
  if (!facts) {
    return {
      kind: 'unsupported',
      message:
        'There are no reliable earlier months to compare with, so Orava can’t explain a change yet.',
    };
  }
  let text: string | null = null;
  let textError: string | null = null;
  try {
    text = await ai.explain(question, facts);
  } catch {
    textError = WORDING_FAILED;
  }
  return { kind: 'explain', category: v.category, facts, text, textError };
}
