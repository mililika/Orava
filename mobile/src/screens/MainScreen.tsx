// Everything after sign-in: Home, New transaction (the Pay tab), Money health, and the floating Orava.
// Holds the transactions the user adds on top of what was loaded, and Orava's reaction to the
// latest one (see src/orava/scenarios.ts).

import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader, BottomNav, type Tab } from '../components/AppChrome';
import { FloatingOrava } from '../components/FloatingOrava';
import { useToast } from '../components/Toast';
import { typeFor } from '../data/categories';
import type { Account, Transaction } from '../data/demoAccount';
import { buildHealth } from '../orava/health';
import { reactTo, type Reaction, type ReactionAction } from '../orava/scenarios';
import { colors, eur } from '../theme';
import { AddTransactionScreen, type NewTx } from './AddTransactionScreen';
import { HealthScreen } from './HealthScreen';
import { HomeScreen } from './HomeScreen';

type Screen = 'home' | 'add' | 'health';

let seq = 0;

export function MainScreen({ account, onLogout }: { account: Account; onLogout: () => void }) {
  const [added, setAdded] = useState<Transaction[]>([]);
  const [screen, setScreen] = useState<Screen>('home');
  const [reaction, setReaction] = useState<Reaction | null>(null);
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
    setReaction(reactTo(tx, [tx, ...txs]));
    setScreen('home');
    show(`Added: ${t.merchant} ${t.amount > 0 ? '+' : ''}${eur(t.amount)}`);
  };

  const act = (id: ReactionAction) => {
    if (!reaction) return;
    const tx = added.find((t) => t.id === reaction.txId);
    const follow = (mood: Reaction['mood'], message: string) =>
      setReaction({ txId: reaction.txId, mood, message });
    switch (id) {
      case 'confirm':
        return follow('okay', 'Got it, marked as safe. I’ll remember this merchant.');
      case 'freeze':
        // Prototype: undo the payment as if the dispute already went through.
        setAdded((prev) => prev.filter((t) => t.id !== reaction.txId));
        return follow(
          'worried',
          `Card frozen. I’ve started a dispute for ${tx ? eur(-tx.amount) : 'the payment'}. Nothing else needed from you right now.`,
        );
      case 'limit':
        return follow('happy', 'Deal! I’ll give you a gentle nudge before the next one.');
      case 'dismiss':
        return follow('okay', 'Fair enough, enjoy it! I’ll keep an eye on the month for you.');
    }
  };

  const remove = (t: Transaction) => {
    if (added.some((a) => a.id === t.id)) setAdded((prev) => prev.filter((a) => a.id !== t.id));
    else setRemoved((prev) => [...prev, t]);
    if (reaction?.txId === t.id) setReaction(null);
    show(`Deleted: ${t.merchant} ${t.amount > 0 ? '+' : ''}${eur(t.amount)}`);
  };

  const openHealth = useCallback(() => setScreen('health'), []);
  const onTab = (t: Tab) => setScreen(t === 'pay' ? 'add' : 'home');

  return (
    <View style={s.screen}>
      <View style={{ flex: 1 }}>
        {screen === 'add' ? (
          <AddTransactionScreen onSave={save} onClose={() => setScreen('home')} />
        ) : screen === 'health' ? (
          <HealthScreen report={report} onBack={() => setScreen('home')} />
        ) : (
          <>
            <AppHeader left={{ icon: 'lock', label: 'Sign out', onPress: onLogout }} />
            <HomeScreen
              username={account.username}
              balance={balance}
              txs={txs}
              month={{
                label: report.period.split(' ')[0],
                income: report.income,
                spending: report.spending,
              }}
              onAdd={() => setScreen('add')}
              onDelete={remove}
            />
          </>
        )}
        <FloatingOrava
          mood={reaction?.mood ?? report.orava.mood}
          who={reaction?.who}
          message={reaction?.message ?? report.orava.message}
          actions={reaction?.actions?.map((a) => ({ ...a, onPress: () => act(a.id) }))}
          greeting={`Hi ${account.username}! I’m Orava.`}
          onOpen={openHealth}
          onQuiet={() => setReaction(null)}
          hidden={screen !== 'home'}
        />
      </View>
      {screen !== 'add' && <BottomNav tab="home" onChange={onTab} />}
      {toast}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mint },
});
