// A short fingerprint of a month's data, used as the key for cached AI overviews: the web app's
// overview cache today, the server's from section 06. Pure.

import type { Transaction } from './types';

/** Changes whenever a transaction up to the end of `month` is added, removed or edited. */
export function signatureOf(txs: Transaction[], month: string) {
  let n = 0;
  let total = 0;
  let last = '';
  let ids = 0;
  for (const t of txs) {
    if (t.date.slice(0, 7) > month) continue;
    n += 1;
    total += t.amount;
    if (t.date > last) last = t.date;
    for (let i = 0; i < t.id.length; i++) ids = (ids * 31 + t.id.charCodeAt(i)) | 0;
  }
  return `${n}:${total.toFixed(2)}:${last}:${ids}`;
}
