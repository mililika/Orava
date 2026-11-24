// Everything after sign-in: Home (with Orava's section), New transaction (the + in the transactions list) and Money health.
// Holds the account's transactions. Adding and deleting show right away, are saved through the
// API, and are undone if the server says no. Orava's card on Home is Gemini's read of the month
// (orava/overview.ts), asked again whenever the transactions change.

import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CreateTransactionRequest } from '@orava/contracts';
import { type Account, buildHealth, monthRange, type Transaction, typeFor } from '@orava/core';

import { AppHeader, BottomNav } from '../components/AppChrome';
import { LimitModal } from '../components/LimitModal';
import { useToast } from '../components/Toast';
import { ApiError, createTransaction, deleteTransaction } from '../lib/api';
import { useOverview } from '../orava/overview';
import { colors, eur } from '../theme';
import { AddTransactionScreen } from './AddTransactionScreen';
import { HealthScreen } from './HealthScreen';
import { HomeScreen } from './HomeScreen';

type Screen = 'home' | 'add' | 'health';

/** Prefix of the ids of transactions shown before the server has saved them. */
const TEMP_ID_PREFIX = 'temp:';
let seq = 0;

const isTemp = (t: Transaction) => t.id.startsWith(TEMP_ID_PREFIX);

/** As the server lists them: newest date first, then newest id (temporary ones on top). */
function newestFirst(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const n = (t: Transaction) => (isTemp(t) ? Infinity : Number(t.id));
  return n(b) - n(a);
}

/** Sum of the amounts in whole cents, so adding many of them never picks up float errors. */
const cents = (txs: Transaction[]) => txs.reduce((sum, t) => sum + Math.round(t.amount * 100), 0);

const label = (t: { merchant: string; amount: number }) =>
  `${t.merchant} ${t.amount > 0 ? '+' : ''}${eur(t.amount)}`;

const errorMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : 'Something went wrong. Try again.';

export function MainScreen({ account, onLogout }: { account: Account; onLogout: () => void }) {
  const [txs, setTxs] = useState(account.txs);
  const [screen, setScreen] = useState<Screen>('home');
  const { show, toast } = useToast();

  // The server's balance is the opening balance + every transaction that isn't deleted, and `txs`
  // holds all of those, so the balance follows the list. That keeps it right while adds and
  // deletes overlap or get undone, without tracking the balance separately.
  const openingCents = useMemo(
    () => Math.round(account.balance * 100) - cents(account.txs),
    [account],
  );
  const balance = useMemo(() => (openingCents + cents(txs)) / 100, [openingCents, txs]);
  const report = useMemo(() => buildHealth(txs, balance), [txs, balance]);
  // Gemini's overview of the newest month: asked once after login, then again each time a
  // transaction is added or removed (cached per month, see orava/overview.ts).
  const lastMonth = useMemo(() => monthRange(txs).last, [txs]);
  const { overview, loading } = useOverview(account.username, lastMonth, report, true);

  // The server dates new transactions with the newest day in the data ("today"); this guess
  // only places the row until the server answers.
  const today = account.txs[0]?.date ?? new Date().toISOString().slice(0, 10);

  const save = async (body: CreateTransactionRequest) => {
    const temp: Transaction = {
      ...body,
      id: `${TEMP_ID_PREFIX}${++seq}`,
      date: today,
      type: typeFor(body.category),
    };
    setTxs((prev) => [temp, ...prev]);
    setScreen('home');
    show(`Added: ${label(body)}`);
    try {
      const { tx } = await createTransaction(body);
      setTxs((prev) => prev.map((t) => (t.id === temp.id ? tx : t)).sort(newestFirst));
    } catch (e) {
      setTxs((prev) => prev.filter((t) => t.id !== temp.id));
      show(`Not saved: ${errorMessage(e)}`);
    }
  };

  const remove = async (t: Transaction) => {
    // Its id only exists once the server has saved it.
    if (isTemp(t)) return show('Still saving. Try again in a moment.');
    setTxs((prev) => prev.filter((x) => x.id !== t.id));
    show(`Deleted: ${label(t)}`);
    try {
      await deleteTransaction(t.id);
    } catch (e) {
      // Already gone on the server (deleted in another tab): the list is right as it is.
      if (e instanceof ApiError && e.code === 'not_found') return;
      setTxs((prev) => [...prev, t].sort(newestFirst));
      show(`Not deleted: ${errorMessage(e)}`);
    }
  };

  const openHealth = useCallback(() => setScreen('health'), []);
  const headerOrava = { mood: report.orava.mood, onPress: openHealth };
  const onTab = () => setScreen('home');

  return (
    <View style={s.screen}>
      <View style={{ flex: 1 }}>
        {screen === 'add' ? (
          <AddTransactionScreen
            onSave={save}
            onClose={() => setScreen('home')}
            orava={headerOrava}
          />
        ) : screen === 'health' ? (
          <HealthScreen user={account.username} report={report} onBack={() => setScreen('home')} />
        ) : (
          <>
            <AppHeader
              left={{ icon: 'lock', label: 'Sign out', onPress: onLogout }}
              orava={headerOrava}
            />
            <HomeScreen
              username={account.username}
              balance={balance}
              txs={txs}
              orava={{
                mood: report.orava.mood,
                score: report.orava.score,
                message: overview?.summary,
                thinking: loading,
                insight: overview,
              }}
              onOpenHealth={openHealth}
              onAdd={() => setScreen('add')}
              onDelete={remove}
            />
          </>
        )}
      </View>
      {screen !== 'add' && <BottomNav tab="home" onChange={onTab} />}
      {toast}
      <LimitModal />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mint },
});
