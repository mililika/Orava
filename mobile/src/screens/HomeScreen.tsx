// S-mobiili home with Orava on it, plus the "Why Orava is …" screen it opens.
// Data flow: transactions → analyzeMonth() → evaluateOrava() → OravaCard / WhyScreen.

import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccountsSection, ApprovalsCard, TransactionsSection } from '../components/AccountCards';
import { AppHeader, BottomNav, type Tab } from '../components/AppChrome';
import { BonusCard } from '../components/BonusCard';
import { OravaCard } from '../components/OravaCard';
import { useToast } from '../components/Toast';
import { Card, DemoBadge } from '../components/ui';
import { DEMO_ACTIONS, type Account, type Transaction } from '../data/demoAccount';
import { analyzeMonth } from '../orava/analysis';
import type { SavingsGoal } from '../orava/goal';
import { evaluateOrava } from '../orava/logic';
import { colors } from '../theme';
import { WhyScreen } from './WhyScreen';

const TAB_NAMES: Record<Tab, string> = {
  home: 'Home',
  etukortti: 'S-Etukortti',
  pay: 'Pay',
  sbank: 'S-Bank',
  me: 'Me',
};

export function HomeScreen({ account, onLogout }: { account: Account; onLogout: () => void }) {
  // Demo buttons add transactions on top of what was loaded.
  const [added, setAdded] = useState<Transaction[]>([]);
  const txs = useMemo(() => [...added, ...account.txs], [added, account.txs]);
  const [tab, setTab] = useState<Tab>('home');
  const [view, setView] = useState<'home' | 'why'>('home');
  // The optional savings goal lives in memory like the rest of the app state:
  // it survives moving between screens, and is cleared on sign-out or reload.
  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const { show, toast } = useToast();

  const balance = account.balance + added.reduce((sum, t) => sum + t.amount, 0);
  const analysis = useMemo(
    () => analyzeMonth(txs, balance, account.coverage),
    [txs, balance, account.coverage],
  );
  const orava = useMemo(() => evaluateOrava(analysis.snapshot), [analysis]);

  const add = (t: Transaction, msg: string) => {
    setAdded((prev) => [t, ...prev]);
    show(msg);
  };
  const soon = (what: string) => () => show(`${what} is not part of the prototype yet`);

  let content;
  if (tab !== 'home') {
    content = (
      <View style={s.body}>
        <Card>
          <Text style={s.stubTitle}>{TAB_NAMES[tab]}</Text>
          <Text style={s.stubText}>This tab is a placeholder. Orava lives on Home for now.</Text>
        </Card>
      </View>
    );
  } else if (view === 'why') {
    content = (
      <WhyScreen
        analysis={analysis}
        state={orava}
        isDemo={account.isDemo}
        onBack={() => setView('home')}
        goal={goal}
        onGoalChange={setGoal}
      />
    );
  } else {
    content = (
      <>
        <BonusCard onPress={soon('Bonus details')} />
        <View style={s.body}>
          {account.isDemo && <DemoBadge />}
          <OravaCard
            state={orava}
            onOpenWhy={() => setView('why')}
            demo={{
              eatOut: () => add(DEMO_ACTIONS.eatOut(), 'Added: takeaway −€45'),
              jacket: () => add(DEMO_ACTIONS.jacket(), 'Added: new jacket −€120'),
              sideGig: () => add(DEMO_ACTIONS.sideGig(), 'Added: side gig +€400'),
              reset: () => {
                setAdded([]);
                show('Back to the start of the demo');
              },
            }}
          />
          <ApprovalsCard onPress={soon('Payments to approve')} />
          <AccountsSection balance={balance} onPress={soon('Account details')} />
          <TransactionsSection txs={txs} />
          <Text style={s.foot}>
            {account.isDemo
              ? 'Demo mode: synthetic sample data (1 Jun – 30 Sep 2026). No real account is used.'
              : `Signed in as ${account.username}. Data from the S-Bank Junction 2026 dataset.`}
          </Text>
        </View>
      </>
    );
  }

  return (
    <View style={s.screen}>
      <AppHeader onLock={onLogout} onChat={soon('Messages')} />

      {/* key: a new screen starts scrolled to the top */}
      <ScrollView key={`${tab}-${view}`} style={s.scroll} contentContainerStyle={{ flexGrow: 1 }}>
        {content}
      </ScrollView>

      <BottomNav
        tab={tab}
        onChange={(t) => {
          setTab(t);
          setView('home');
        }}
      />
      {toast}
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
