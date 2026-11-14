// Idle money and what it could become. Pure.
//
// Idle money = the lowest balance of the last 3 months (money that never left the account)
// minus a 2-month spending cushion. It stays on a current account that pays ~0.4% a year while
// prices rise ~2.5%, so it quietly loses value.
//
// Projections are in today's euros (after inflation), for three illustrative places:
//   current account   Bank of Finland average overnight-deposit rate
//   savings deposit   Bank of Finland average rate on new time deposits
//   invested          world equities, real return since 2000 (UBS Yearbook 2025); the long-run
//                     figure since 1900 is higher (5.2%), we use the more cautious one.
// Past returns are no promise: investments can fall in value, especially over short periods.

import { BENCH, ref, type IdleStat, type Variant } from '../data/benchmarks';
import { CUSHION_MONTHS, type Score } from './score';

export const YEARS = 10;

export interface GrowthOption {
  key: 'account' | 'deposit' | 'invested';
  label: string;
  /** Nominal yearly rate, before inflation. */
  nominal: number;
  /** Real yearly rate, after inflation. */
  real: number;
  /** Value in today's euros at the end of each year 0..YEARS (lump sum + monthly amount). */
  path: number[];
  source: { name: string; url: string };
}

export interface Growth {
  /** Money above the cushion that never moved in 3 months. */
  idle: number;
  cushion: number;
  floor: number;
  /** Kept each month and not already invested (what could be saved regularly). */
  monthly: number;
  /** Already invested per month. */
  investing: number;
  /** Purchasing power the idle money loses in a year on a current account. */
  lostPerYear: number;
  inflation: number;
  options: GrowthOption[];
  /** How common idle money is among similar customers. */
  peers: IdleStat;
}

const source = (key: string) => ({
  name: BENCH.references[key]?.source ?? '',
  url: BENCH.references[key]?.url ?? '',
});

/** Value after `years` of a lump sum plus a monthly amount, at a real yearly rate. */
export function project(lump: number, monthly: number, realYear: number, years: number) {
  const r = Math.pow(1 + realYear, 1 / 12) - 1;
  const n = years * 12;
  const grow = Math.pow(1 + r, n);
  return lump * grow + (r === 0 ? monthly * n : monthly * ((grow - 1) / r));
}

export function growthOf(score: Score, variant: Variant): Growth {
  const inflation = ref('fi_inflation');
  const real = (nominal: number) => (1 + nominal) / (1 + inflation) - 1;
  const p = score.perMonth;
  const kept = p.income - p.swept - p.spending;
  const investing = Math.max(0, p.invested);
  const monthly = Math.max(0, kept - investing);
  const idle = score.idle;

  const make = (
    key: GrowthOption['key'],
    label: string,
    nominal: number,
    realRate: number,
    src: string,
  ): GrowthOption => ({
    key,
    label,
    nominal,
    real: realRate,
    path: Array.from({ length: YEARS + 1 }, (_, y) => project(idle, monthly, realRate, y)),
    source: source(src),
  });

  const account = ref('fi_account_rate');
  const deposit = ref('fi_deposit_rate');
  const equity = ref('equity_real_2000');

  return {
    idle,
    cushion: CUSHION_MONTHS * p.spending,
    floor: score.floor,
    monthly,
    investing,
    lostPerYear: idle * (inflation - account),
    inflation,
    options: [
      make('account', 'Left on the account', account, real(account), 'fi_account_rate'),
      make('deposit', 'Savings deposit', deposit, real(deposit), 'fi_deposit_rate'),
      make('invested', 'Invested (world equities)', equity + inflation, equity, 'equity_real_2000'),
    ],
    peers: BENCH.idle[variant].all,
  };
}
