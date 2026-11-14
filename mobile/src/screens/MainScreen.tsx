// The signed-in app: header, five tabs, and Orava on top of them.
// Data flow: transactions → buildSnapshot() → evaluateOrava() + buildAlerts()
//   → Orava tab (score, baskets, Ask Orava)
//   → nudge on the other tabs, red badge on the Orava tab, "Was this you?" screen.

import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccountsSection, ApprovalsCard, TransactionsSection } from '../components/AccountCards';
import { AppHeader, BottomNav, type Tab } from '../components/AppChrome';
import { BonusCard } from '../components/BonusCard';
import { DemoSheet } from '../components/DemoSheet';
import { OravaNudge } from '../components/OravaNudge';
import { useToast } from '../components/Toast';
import { Card } from '../components/ui';
import {
  buildSnapshot,
  slipsBaselineOf,
  splitLatestMonth,
  type Account,
  type Transaction,
} from '../data/demoAccount';
import { SCENARIOS, buildScenario } from '../data/demoScenarios';
import { buildAlerts, findUnusualPayment } from '../orava/alerts';
import { evaluateOrava } from '../orava/logic';
import type { AlertKind, Mood, OravaAlert } from '../orava/types';
import { colors } from '../theme';
import { FraudScreen } from './FraudScreen';
import { OravaTab } from './OravaTab';

const STUB: Partial<Record<Tab, string>> = { etukortti: 'S-Etukortti', me: 'Me' };

/** Everything Orava concludes from a list of transactions. */
function analyze(txs: Transaction[], balance: number, cleared: ReadonlySet<string>) {
  const { month, earlier } = splitLatestMonth(txs);
  const snapshot = buildSnapshot(month, balance, slipsBaselineOf(earlier));
  const fraud = findUnusualPayment(txs, cleared);
  const state = evaluateOrava(snapshot, fraud);
  return { month, snapshot, state, alerts: buildAlerts(txs, snapshot, state, fraud) };
}

export function MainScreen({ account, onLogout }: { account: Account; onLogout: () => void }) {
  // Demo buttons add transactions on top of what was loaded from the database.
  const [added, setAdded] = useState<Transaction[]>([]);
  const txs = useMemo(() => [...added, ...account.txs], [added, account.txs]);
  const [tab, setTab] = useState<Tab>('home');
  /** Payments the user has answered "Was this you?" for (it was me, or card frozen). */
  const [cleared, setCleared] = useState<ReadonlySet<string>>(new Set());
  /** Alerts the user has closed or already seen on the Orava tab. */
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const [fraudOpen, setFraudOpen] = useState(false);
  // Demo panel: show a mood or the lively animation regardless of the real numbers.
  const [demoOpen, setDemoOpen] = useState(false);
  const [moodOverride, setMoodOverride] = useState<Mood | null>(null);
  const [livelyOverride, setLivelyOverride] = useState(false);
  const { show, toast } = useToast();

  const balance = account.balance + added.reduce((sum, t) => sum + t.amount, 0);
  const { month, snapshot, state, alerts } = useMemo(
    () => analyze(txs, balance, cleared),
    [txs, balance, cleared],
  );
  const shownMood = moodOverride ?? state.mood;

  const fraud = alerts.find((a) => a.kind === 'fraud') ?? null;
  const nudge = alerts.find((a) => !dismissed.has(a.id)) ?? null;

  const dismiss = (ids: string[]) => setDismissed((d) => new Set([...d, ...ids]));
  const changeTab = (t: Tab) => {
    if (t === 'orava') dismiss(alerts.map((a) => a.id)); // seen
    setTab(t);
  };
  const openAlert = (a: OravaAlert) =>
    a.kind === 'fraud' ? setFraudOpen(true) : changeTab('orava');
  const clearFraud = (msg: string) => {
    if (fraud?.payment) setCleared((c) => new Set([...c, fraud.payment!.txId]));
    setFraudOpen(false);
    show(msg);
  };

  const resetDemo = () => {
    setAdded([]);
    setCleared(new Set());
    setDismissed(new Set());
    setFraudOpen(false);
  };
  /** Start from the account's own data, add the scenario's transactions, land where the pop-up shows. */
  const runScenario = (kind: AlertKind) => {
    const sc = SCENARIOS.find((x) => x.kind === kind)!;
    const base = analyze(account.txs, account.balance, new Set());
    const extra = buildScenario(kind, account.txs, base.state, base.snapshot);
    const after = analyze(
      [...extra, ...account.txs],
      account.balance + extra.reduce((sum, t) => sum + t.amount, 0),
      new Set(),
    );
    resetDemo();
    setAdded(extra);
    setTab(sc.tab); // not changeTab: the alert must stay unseen so the pop-up shows
    setDemoOpen(false);
    show(
      after.alerts[0]?.kind === kind
        ? `Demo: ${sc.title.toLowerCase()}`
        : kind === 'good'
          ? 'Good news needs everyday slips at or under usual, and this account is above it'
          : `Demo: ${sc.title.toLowerCase()} added, but another alert comes first`,
    );
  };
  const soon = (what: string) => () => show(`${what} is not part of the prototype yet`);

  return (
    <View style={s.screen}>
      <AppHeader onLock={onLogout} onChat={soon('Messages')} onDemo={() => setDemoOpen(true)} />

      {tab === 'orava' ? (
        <OravaTab
          state={state}
          snapshot={snapshot}
          monthTxs={month}
          alert={alerts[0] ?? null}
          onOpenAlert={() => alerts[0] && openAlert(alerts[0])}
          displayMood={shownMood}
          lively={!!alerts[0] || livelyOverride}
        />
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={{ flexGrow: 1 }}>
          {tab === 'home' && (
            <>
              <BonusCard onPress={soon('Bonus details')} />
              <View style={s.body}>
                <ApprovalsCard onPress={soon('Payments to approve')} />
                <AccountsSection balance={balance} onPress={soon('Account details')} />
                <TransactionsSection txs={txs} />
                <Text style={s.foot}>
                  Signed in as {account.username}. Data from the S-Bank Junction 2026 dataset.
                </Text>
              </View>
            </>
          )}
          {tab === 'sbank' && (
            <View style={s.body}>
              <AccountsSection balance={balance} onPress={soon('Account details')} />
              <TransactionsSection txs={txs} />
            </View>
          )}
          {STUB[tab] && (
            <View style={s.body}>
              {tab === 'etukortti' && <BonusCard onPress={soon('Bonus details')} />}
              <Card>
                <Text style={s.stubTitle}>{STUB[tab]}</Text>
                <Text style={s.stubText}>This tab is a placeholder in the prototype.</Text>
              </Card>
            </View>
          )}
        </ScrollView>
      )}

      {tab !== 'orava' && nudge && !fraudOpen && (
        <OravaNudge
          alert={nudge}
          onOpen={() => openAlert(nudge)}
          onDismiss={() => dismiss([nudge.id])}
        />
      )}
      <BottomNav
        tab={tab}
        onChange={changeTab}
        mood={shownMood}
        badge={tab !== 'orava' && !!nudge}
        lively={(tab !== 'orava' && !!nudge) || livelyOverride}
      />
      {toast}

      {demoOpen && (
        <DemoSheet
          onScenario={runScenario}
          mood={moodOverride}
          onMood={setMoodOverride}
          lively={livelyOverride}
          onLively={setLivelyOverride}
          onReset={() => {
            resetDemo();
            setMoodOverride(null);
            setLivelyOverride(false);
            setDemoOpen(false);
            show('Back to the start of the demo');
          }}
          onClose={() => setDemoOpen(false)}
        />
      )}

      {fraudOpen && fraud && (
        <FraudScreen
          alert={fraud}
          onClose={() => setFraudOpen(false)}
          onFreeze={() => clearFraud('Card frozen. (Demo: nothing really happened.)')}
          onItWasMe={() => clearFraud('Thanks! Orava will remember this payment.')}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mint },
  scroll: { flex: 1 },
  body: { padding: 12, paddingBottom: 24, gap: 12 },
  foot: { fontSize: 11.5, color: colors.faint, marginHorizontal: 4, lineHeight: 16 },
  stubTitle: { fontSize: 19, fontWeight: '700', color: colors.green, marginBottom: 6 },
  stubText: { fontSize: 14, color: colors.ink2 },
});
