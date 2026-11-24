// Orava's AI overview of a month: one sentence plus the best and the worst thing, from Gemini via
// our server (GET /api/ai/overview). Shown in the Orava card on Home (the newest month) and in the
// Money health hero for whichever month is open.
//
// The server caches overviews until a month's transactions change. Here, a small in-memory cache
// for this session keyed by the month and its signature, so stepping between months doesn't ask
// again, and a changed transaction asks for a new one. The signature includes the transaction
// ids, so two users' entries don't mix.

import type { OverviewDto } from '@orava/contracts';
import { signatureOf, type Transaction } from '@orava/core';
import { useEffect, useMemo, useState } from 'react';

import { getOverview, isExpectedAiError } from '../lib/api';

const cache = new Map<string, OverviewDto>();
/** Requests on their way, so the Home card and Money health asking for the same month share one. */
const inflight = new Map<string, Promise<OverviewDto>>();

function load(month: string, key: string): Promise<OverviewDto> {
  let p = inflight.get(key);
  if (!p) {
    p = getOverview(month)
      .then((overview) => {
        cache.set(key, overview);
        return overview;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

/**
 * The overview for `month` of the account with transactions `txs`: null while it loads, when the
 * server has no AI, at the AI limit (the limit modal says so), or if the request fails. `message`
 * is Gemini's sentence, or `fallback` (Orava's built-in one) once it's clear there won't be one.
 */
export function useOverview(month: string, txs: Transaction[], fallback: string) {
  const key = useMemo(() => `${month}|${signatureOf(txs, month)}`, [month, txs]);
  // The answer to the latest request, tagged with the key it answers.
  const [result, setResult] = useState<{ key: string; overview: OverviewDto | null } | null>(null);

  useEffect(() => {
    if (!month || cache.has(key)) return;
    let live = true;
    load(month, key)
      .then((overview) => live && setResult({ key, overview }))
      .catch((e) => {
        if (!isExpectedAiError(e)) console.warn(e);
        if (live) setResult({ key, overview: null });
      });
    return () => {
      live = false;
    };
  }, [key, month]);

  const answered = result?.key === key;
  const overview = cache.get(key) ?? (answered ? result.overview : null);
  const loading = !!month && !overview && !answered;
  return { overview, loading, message: overview?.summary || (loading ? undefined : fallback) };
}
