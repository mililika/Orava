// History: stepping through the months of an account. Pure.

import type { Transaction } from './types';

/** Oldest and newest month in the data (YYYY-MM). "Now" is the newest month, as elsewhere. */
export function monthRange(txs: Transaction[]): { first: string; last: string } {
  let first = '';
  let last = '';
  for (const t of txs) {
    const m = t.date.slice(0, 7);
    if (!first || m < first) first = m;
    if (!last || m > last) last = m;
  }
  return { first, last };
}

/** The previous (-1) or next (+1) month, YYYY-MM. */
export function stepMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const x = new Date(y, m - 1 + delta, 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
}

/** e.g. "September 2026". */
export function monthName(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}
