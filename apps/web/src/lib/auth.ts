// Sign-in with Supabase Auth: the only place in the web app that uses the Supabase client, and
// only for auth. Supabase checks the password and keeps the session (in localStorage, refreshed
// automatically); our API gets the access token on every request (lib/api.ts) and checks it.
// The publishable key is meant to be public: it can't read our tables (RLS on, API roles revoked).

import { createClient, isAuthError } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase =
  URL && KEY
    ? createClient(URL, KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null;

function client() {
  if (!supabase) {
    throw new Error('Sign-in is not configured. Fill in apps/web/.env and restart Expo.');
  }
  return supabase;
}

/** Signs in with Supabase Auth. Throws an Error with a message safe to show. */
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (!error) return;
  if (isAuthError(error) && error.code === 'invalid_credentials') {
    throw new Error('Wrong email or password.');
  }
  if (isAuthError(error) && error.status === 429) {
    throw new Error('Too many sign-in attempts. Try again in a few minutes.');
  }
  throw new Error('Cannot sign in right now. Check your connection and try again.');
}

/** Ends the session in this browser. Never throws: the local session is cleared either way. */
export async function signOut(): Promise<void> {
  await supabase?.auth.signOut({ scope: 'local' }).catch(() => undefined);
}

/** The current access token (refreshed if needed), or undefined when signed out. */
export async function accessToken(): Promise<string | undefined> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  return data.session?.access_token;
}

/** Calls `handler` when the session ends (signed out here or in another tab, or refresh failed). */
export function onSignedOut(handler: () => void): () => void {
  const sub = supabase?.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') handler();
  });
  return () => sub?.data.subscription.unsubscribe();
}
