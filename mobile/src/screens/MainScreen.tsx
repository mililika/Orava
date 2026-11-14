// Everything after sign-in: Home (with Orava's section), New transaction (the + in the transactions list) and Money health.
// Holds the transactions the user adds on top of what was loaded. Orava's card on Home is Gemini's
// read of the month (orava/overview.ts), asked again whenever the transactions change.

import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader, BottomNav } from '../components/AppChrome';
import { useToast } from '../components/Toast';
import { typeFor } from '../data/categories';
import type { Account, Transaction } from '../data/demoAccount';
import { buildHealth } from '../orava/health';
import { monthRange } from '../orava/history';
import { useOverview } from '../orava/overview';
import { colors, eur } from '../theme';
import { AddTransactionScreen, type NewTx } from './AddTransactionScreen';
import { HealthScreen } from './HealthScreen';
import { HomeScreen } from './HomeScreen';

type Screen = 'home' | 'add' | 'health';

let seq = 0;

export function MainScreen({ account, onLogout }: { account: Account; onLogout: () => void }) {
  const [added, setAdded] = useState<Transaction[]>([]);
  const [screen, setScreen] = useState<Screen>('home');
  const { show, toast } = useToast();

  // Loaded transactions the user swiped away (prototype: hidden here, not deleted in the database).
  const [removed, setRemoved] = useState<Transaction[]>([]);

  const txs = useMemo(() => {
    const gone = new Set(removed.map((t) => t.id));
    return [...added, ...account.txs.filter((t) => !gone.has(t.id))];
  }, [added, removed, account.txs]);
  const balance =
    account.balance +
    added.reduce((sum, t) => sum + t.amount, 0) -
    removed.reduce((sum, t) => sum + t.amount, 0);
  const report = useMemo(() => buildHealth(txs, balance), [txs, balance]);
  // Gemini's overview of the newest month: asked once after login, then again each time a
  // transaction is added or removed (cached per month, see orava/overview.ts).
  const lastMonth = useMemo(() => monthRange(txs).last, [txs]);
  const { overview, loading } = useOverview(account.username, lastMonth, report, true);

  // The dataset ends in the past, so "today" is the newest day in the data.
  // That keeps new transactions in the same month Orava is looking at.
  const today = account.txs[0]?.date ?? new Date().toISOString().slice(0, 10);

  const save = (t: NewTx) => {
    const tx: Transaction = {
      id: `new${++seq}`,
      date: today,
      category: t.category,
      type: typeFor(t.category),
      merchant: t.merchant,
      amount: t.amount,
    };
    setAdded((prev) => [tx, ...prev]);
    setScreen('home');
    show(`Added: ${t.merchant} ${t.amount > 0 ? '+' : ''}${eur(t.amount)}`);
  };

  const remove = (t: Transaction) => {
    if (added.some((a) => a.id === t.id)) setAdded((prev) => prev.filter((a) => a.id !== t.id));
    else setRemoved((prev) => [...prev, t]);
    show(`Deleted: ${t.merchant} ${t.amount > 0 ? '+' : ''}${eur(t.amount)}`);
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
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mint },
});
