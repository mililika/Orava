// The Money health score, each pillar with a cited anchor (see db/benchmarks.sql and the
// bench_score_pillar table). Measured over the last 3 months so one payday or one big
// purchase does not swing it. Pure: monthly totals in, score out.
//
//   points = maxPoints × clamp((value − zeroAt) / (fullAt − zeroAt), 0, 1)
//
// Two variants:
//   main    S-Bank is the main bank: fixed costs, kept, flexible spending, savings buffer, never below zero.
//   pocket  The salary moves on to another bank and no rent is paid here, so this is a spending
//           account: within what stays, never below zero, cushion, money at work.

import { BENCH, betterThan, type PillarDef, type Variant } from '../data/benchmarks';
import { basketSums, sum, type MonthTotals, type Multipliers } from './months';
import type { Mood } from './types';

export const WINDOW = 3;

export interface Pillar extends PillarDef {
  value: number;
  points: number;
  /** The value, formatted for people: "14%", "1.6 months", "1 month". */
  shown: string;
  /** The anchor, formatted: "Full points at 20% or more, none at 0% or less". */
  rule: string;
  source?: { name: string; url: string };
}

export interface Score {
  variant: Variant;
  score: number;
  mood: Mood;
  pillars: Pillar[];
  /** % of S-Bank customer-months with a lower score. */
  betterThan: number;
  /** The months measured, oldest first. */
  months: string[];
  income: number;
  spending: number;
  invested: number;
  /** Lowest balance over the window: money that never left the account. */
  floor: number;
  /** Floor above a 2-month spending cushion: money that just lies there. */
  idle: number;
  /** Monthly averages over the window. */
  perMonth: {
    income: number;
    /** Moved on to another bank (Salary Sweep). */
    swept: number;
    spending: number;
    fixed: number;
    needs: number;
    surprises: number;
    slips: number;
    invested: number;
  };
}

const pct = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(Math.round(n * 100))}%`;

export function format(unit: PillarDef['unit'], v: number) {
  if (unit === 'share') return pct(v);
  if (unit === 'months') {
    const rounded = Math.round(v * 10) / 10;
    if (Number.isInteger(rounded)) return `${rounded} ${rounded === 1 ? 'month' : 'months'}`;
    return `${rounded.toFixed(1)} months`;
  }
  return `${v} ${v === 1 ? 'month' : 'months'}`;
}

function ruleOf(p: PillarDef) {
  if (p.unit === 'count') {
    return `Full points with no dips, none with ${p.zeroAt} or more months below zero.`;
  }
  const anchor = (v: number) =>
    p.unit === 'months' ? `${v} ${v === 1 ? 'month' : 'months'}` : format(p.unit, v);
  const better = p.fullAt > p.zeroAt ? 'or more' : 'or less';
  const worse = p.fullAt > p.zeroAt ? 'or less' : 'or more';
  const none = p.unit === 'months' && p.zeroAt === 0 ? '' : ` ${worse}`;
  return `Full points at ${anchor(p.fullAt)} ${better}, none at ${anchor(p.zeroAt)}${none}.`;
}

export function pointsFor(p: PillarDef, value: number) {
  const t = (value - p.zeroAt) / (p.fullAt - p.zeroAt);
  return p.maxPoints * Math.max(0, Math.min(1, t));
}

export function moodFor(score: number, balance: number): Mood {
  if (balance < 0) return 'alert';
  return BENCH.moods.find((m) => score >= m.minScore)?.mood ?? 'alert';
}

/** Months of spending kept as a cushion before money counts as idle. */
export const CUSHION_MONTHS = 2;

/**
 * Score of the last `WINDOW` months. With `mult`, spending per category is scaled
 * ("what if I spent 20% less on restaurants") and the money saved is added to the balance
 * month by month, as it would have stayed on the account.
 */
export function scoreOf(
  all: MonthTotals[],
  balance: number,
  mult: Multipliers = {},
  variant: Variant = 'main',
): Score {
  const months = all.slice(-WINDOW);
  let saved = 0;
  const rows = months.map((m) => {
    const base = basketSums(m.byCategory);
    const now = basketSums(m.byCategory, mult);
    saved += base.spending - now.spending;
    return { m, b: now, end: m.endBalance + saved, low: m.lowBalance + saved };
  });

  const income = sum(months.map((m) => m.income));
  const spending = sum(rows.map((r) => r.b.spending));
  const invested = sum(months.map((m) => m.invested));
  const n = Math.max(1, months.length);
  const avgSpend = spending / n;

  const swept = sum(months.map((m) => m.sweptOut));
  const stays = income - swept;
  const floor = rows.length ? Math.min(...rows.map((r) => r.low)) : balance;
  const idle = Math.max(0, floor - CUSHION_MONTHS * avgSpend);
  const buffer = avgSpend > 0 ? sum(rows.map((r) => r.end)) / n / avgSpend : 0;

  const values: Record<PillarDef['key'], number> = {
    kept: income > 0 ? (income - spending) / income : spending > 0 ? -1 : 0,
    buffer,
    overdraft: rows.filter((r) => r.low < 0).length,
    slips: income > 0 ? sum(rows.map((r) => r.b.slips)) / income : 1,
    fixed: income > 0 ? sum(rows.map((r) => r.b.fixed)) / income : 1,
    within: stays > 0 ? (stays - spending) / stays : spending > 0 ? -1 : 0,
    cushion: buffer,
    idle: avgSpend > 0 ? idle / avgSpend : 0,
  };

  const defs = variant === 'pocket' ? BENCH.pocketPillars : BENCH.pillars;
  const pillars: Pillar[] = defs.map((p) => {
    const ref = p.sourceKey ? BENCH.references[p.sourceKey] : undefined;
    return {
      ...p,
      value: values[p.key],
      points: pointsFor(p, values[p.key]),
      shown: format(p.unit, values[p.key]),
      rule: ruleOf(p),
      source: ref ? { name: ref.source, url: ref.url } : undefined,
    };
  });
  const score = Math.round(sum(pillars.map((p) => p.points)));
  const per = (k: 'fixed' | 'needs' | 'surprises' | 'slips') => sum(rows.map((r) => r.b[k])) / n;

  return {
    variant,
    score,
    mood: moodFor(score, balance + saved),
    pillars,
    betterThan: betterThan(score, variant),
    months: months.map((m) => m.month),
    income,
    spending,
    invested,
    floor,
    idle,
    perMonth: {
      income: income / n,
      swept: swept / n,
      spending: avgSpend,
      fixed: per('fixed'),
      needs: per('needs'),
      surprises: per('surprises'),
      slips: per('slips'),
      invested: invested / n,
    },
  };
}

/** Salary moved to another bank and no rent paid here: this is not the customer's main account. */
export function isSecondaryAccount(all: MonthTotals[]) {
  const recent = all.slice(-WINDOW);
  const swept = recent.some((m) => m.sweptOut > 0);
  const rent = recent.some((m) => (m.byCategory.Housing ?? 0) > 0);
  return swept && !rent;
}
