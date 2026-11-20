// Typed access to benchmarks.json: population baselines from the S-Bank dataset and cited
// external anchors. The JSON is static aggregate data from the Junction 2026 S-Bank dataset
// analysis, kept as is: there is no script to regenerate it.

import raw from './benchmarks.json';

/** A cited reference value; read with ref('fi_inflation'). */
export function ref(key: string) {
  return BENCH.references[key]?.value ?? 0;
}

export interface Reference {
  label: string;
  value: number;
  unit: string;
  source: string;
  url: string;
  year: number | null;
}

/** main = S-Bank is the main bank; pocket = salary moves on to another bank (spending account). */
export type Variant = 'main' | 'pocket';

export interface PillarDef {
  key: 'kept' | 'buffer' | 'overdraft' | 'slips' | 'fixed' | 'within' | 'cushion' | 'idle';
  label: string;
  maxPoints: number;
  fullAt: number;
  zeroAt: number;
  unit: 'share' | 'months' | 'count';
  measures: string;
  why: string;
  sourceKey: string | null;
}

export interface MoodLevel {
  mood: 'happy' | 'okay' | 'worried' | 'alert';
  label: string;
  minScore: number;
  meaning: string;
  shareOfMonths: number;
  shareOfMonthsPocket: number;
}

export interface IdleStat {
  customers: number;
  /** Share of customers with money above the 2-month cushion all quarter. */
  shareWithIdle: number;
  avgIdleEur: number;
  medianIdleIfAny: number;
  shareIdleNotInvesting: number;
}

export interface PeerStat {
  p25: number;
  p50: number;
  p75: number;
  meanEur: number;
  customers: number;
}

export interface Benchmarks {
  source: { customers: number; secondaryAccounts: number; from: string; to: string };
  references: Record<string, Reference>;
  pillars: PillarDef[];
  /** Spending-account score (salary moves on to another bank). */
  pocketPillars: PillarDef[];
  moods: MoodLevel[];
  /** Score at percentile 0..100 over all scored customer-months. */
  scoreDistribution: number[];
  pocketScoreDistribution: number[];
  /** Idle money in the latest quarter, per variant, per age band ("all" = everyone). */
  idle: Record<Variant, Record<string, IdleStat>>;
  incomeQuintiles: { quintile: number; from: number; to: number; customers: number }[];
  /** Keyed by quintile ("0" = everyone), then by category or basket. Shares are of income. */
  peers: Record<string, Record<string, PeerStat>>;
  peerHealth: Record<string, { kept: number[]; buffer: number[] }>;
  /** Per category: index (1 = average month) and average € for Jan..Dec. */
  seasonal: Record<string, { index: number[]; avgEur: number[] }>;
}

export const BENCH = raw as unknown as Benchmarks;

/** Income quintile (1–5) for an average monthly income. */
export function quintileOf(income: number) {
  const q = BENCH.incomeQuintiles.find((x) => income <= x.to);
  return q?.quintile ?? 5;
}

/** Share of scored customer-months with a lower score. */
export function betterThan(score: number, variant: Variant = 'main') {
  const d = variant === 'pocket' ? BENCH.pocketScoreDistribution : BENCH.scoreDistribution;
  let p = 0;
  for (let i = 0; i < d.length; i++) if (d[i] < score) p = i;
  return p;
}
