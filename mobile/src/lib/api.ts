// Talks to Supabase over plain REST (PostgREST RPC). The two functions it calls
// (`login`, `my_transactions`) are defined in db/auth.sql.

import type { Account, Transaction } from '../data/demoAccount';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

interface TxRow {
  tx_id: number | string;
  tx_date: string;
  category: string;
  tx_amount_eur: number | string;
  balance_after_eur: number | string;
  transaction_type: string;
  merchant_id: string | null;
}

async function rpc<T>(fn: string, body: Record<string, string>): Promise<T> {
  if (!URL || !KEY) {
    throw new Error('Supabase is not configured. Fill in mobile/.env and restart Expo.');
  }
  let res: Response;
  try {
    res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the server. Check your connection.');
  }
  if (!res.ok) throw new Error(`Server error (${res.status}) calling ${fn}.`);
  return (await res.json()) as T;
}

/** Checks the credentials and loads that user's transactions. Throws a readable Error. */
export async function login(username: string, password: string): Promise<Account> {
  const creds = { p_username: username.trim(), p_password: password };
  const users = await rpc<{ user_id: number; username: string; customer_id: string | null }[]>(
    'login',
    creds,
  );
  if (users.length === 0) throw new Error('Wrong username or password.');

  const rows = await rpc<TxRow[]>('my_transactions', creds); // newest first
  const txs: Transaction[] = rows.map((r) => ({
    id: String(r.tx_id),
    date: r.tx_date,
    category: r.category,
    type: r.transaction_type,
    merchant: r.merchant_id ?? r.category,
    amount: Number(r.tx_amount_eur),
  }));
  return {
    username: users[0].username,
    txs,
    balance: rows.length ? Number(rows[0].balance_after_eur) : 0,
    isDemo: false,
    coverage: REAL_DATA_COVERAGE,
  };
}

/**
 * The date range the real dataset fully covers. The README says "Oct 2024 – Sep 2026", but the
 * exact first and last covered days have not been verified, and the last transaction date does
 * not prove coverage. Until the data owner confirms them, this stays null and Orava does not
 * compare months on real data.
 */
const REAL_DATA_COVERAGE: Account['coverage'] = null;
