// Orava's AI overview of a month: one sentence plus the best and the worst thing, from Gemini.
// Shown in the Orava card on Home (the newest month, requested right after login) and in the
// Money health hero for whichever month is open.
//
// Cached per user and month (AsyncStorage, so it survives restarts). A month is asked again only
// when its transactions change (new, removed or edited ones up to that month's end). At most
// MAX_MONTHS months are saved; the oldest month goes first, so recent months always stay.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';

import type { Transaction } from '../data/demoAccount';
import { askGemini, geminiConfigured } from '../lib/gemini';
import { coachSystem, plainText } from './coach';
import type { HealthReport } from './health';
import { monthName } from './history';

export interface Overview {
  /** One short sentence: how the month looks. */
  summary: string;
  /** The best thing, with a number. */
  good: string;
  /** The biggest problem or risk, with a fix. */
  bad: string;
}

interface Entry {
  sig: string;
  overview: Overview;
  at: number;
}
type Store = Record<string, Entry>;

const MAX_MONTHS = 10;
/** Bump when the prompt changes, so cached overviews are asked again. */
const VERSION = 4;
const storageKey = (user: string) => `orava.overview.v${VERSION}.${user}`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    good: { type: 'STRING' },
    bad: { type: 'STRING' },
  },
  required: ['summary', 'good', 'bad'],
  propertyOrdering: ['summary', 'good', 'bad'],
};

function prompt(month: string, latest: boolean) {
  return `Check-in on ${monthName(month)}${latest ? ' so far' : ' (it is over, so use the past tense)'} for the tiny Orava card. Pick what matters most. As few words as possible, simple words, round numbers.
Reply as JSON:
- summary: the verdict, max 7 words (e.g. "Solid month, but eating out ran high.").
- good: the one thing going well, max 6 words, with a number (e.g. "Rent only 31% of income").
- bad: the one thing to change, max 8 words, with a number and the fix (e.g. "Eating out €300: cook twice weekly").
Plain text, no markdown, no emoji.`;
}

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

// In memory: each user's store (loaded once) and requests on their way, so the Home card and the
// Money health screen asking for the same month share one request.
const stores = new Map<string, Promise<Store>>();
const inflight = new Map<string, Promise<Overview>>();
const loaded = new Map<string, Store>();

function storeOf(user: string): Promise<Store> {
  let p = stores.get(user);
  if (!p) {
    p = AsyncStorage.getItem(storageKey(user))
      .then((raw) => (raw ? (JSON.parse(raw) as Store) : {}))
      .catch(() => ({}))
      .then((s) => {
        loaded.set(user, s);
        return s;
      });
    stores.set(user, p);
  }
  return p;
}

/** A cached overview, without waiting or asking. */
export function peekOverview(user: string, month: string, sig: string): Overview | null {
  const hit = loaded.get(user)?.[month];
  return hit && hit.sig === sig ? hit.overview : null;
}

function parse(raw: string): Overview {
  try {
    const j = JSON.parse(raw);
    return {
      summary: plainText(j.summary ?? ''),
      good: plainText(j.good ?? ''),
      bad: plainText(j.bad ?? ''),
    };
  } catch {
    return { summary: plainText(raw), good: '', bad: '' };
  }
}

/** The month's overview: from the cache if its transactions haven't changed, else from Gemini. */
export async function getOverview(
  user: string,
  month: string,
  sig: string,
  report: HealthReport,
  latest: boolean,
): Promise<Overview> {
  const store = await storeOf(user);
  const hit = store[month];
  if (hit && hit.sig === sig) return hit.overview;

  const key = `${user}|${month}|${sig}`;
  const pending = inflight.get(key);
  if (pending) return pending;

  const p = (async () => {
    const raw = await askGemini(
      coachSystem(report),
      [{ role: 'user', text: prompt(month, latest) }],
      { schema: SCHEMA, user },
    );
    const overview = parse(raw);
    store[month] = { sig, overview, at: Date.now() };
    // Saved: the MAX_MONTHS newest months (the oldest go first). Older months stay in memory for
    // this session, so stepping back and forth doesn't ask Gemini again.
    const kept = Object.keys(store).sort().slice(-MAX_MONTHS);
    const saved = Object.fromEntries(kept.map((m) => [m, store[m]]));
    await AsyncStorage.setItem(storageKey(user), JSON.stringify(saved)).catch(() => {});
    return overview;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/**
 * The overview for `month` of `report`, or null while it loads, without a Gemini key, or if the
 * request fails (the screen then keeps Orava's built-in sentence).
 */
export function useOverview(user: string, month: string, report: HealthReport, latest: boolean) {
  const sig = useMemo(() => signatureOf(report.txs, month), [report.txs, month]);
  const key = `${user}|${month}|${sig}`;
  // Results that arrived from getOverview, tagged with the request they answer.
  const [result, setResult] = useState<{ key: string; overview: Overview | null } | null>(null);

  useEffect(() => {
    if (!geminiConfigured || !month || peekOverview(user, month, sig)) return;
    let live = true;
    getOverview(user, month, sig, report, latest)
      .then((overview) => live && setResult({ key, overview }))
      .catch((e) => {
        console.warn(e);
        if (live) setResult({ key, overview: null });
      });
    return () => {
      live = false;
    };
  }, [key, user, month, sig, report, latest]);

  const answered = result?.key === key;
  const overview = peekOverview(user, month, sig) ?? (answered ? result.overview : null);
  return { overview, loading: geminiConfigured && !!month && !overview && !answered };
}
