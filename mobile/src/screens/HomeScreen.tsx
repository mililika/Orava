// The one screen of the prototype: S-mobiili home with Orava on it.
// Data flow: transactions → buildSnapshot() → evaluateOrava() → OravaCard.

import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccountsSection, ApprovalsCard, TransactionsSection } from '../components/AccountCards';
import { AppHeader, BottomNav, type Tab } from '../components/AppChrome';
import { BonusCard } from '../components/BonusCard';
import { OravaCard } from '../components/OravaCard';
import { useToast } from '../components/Toast';
import { Card } from '../components/ui';
import {
  DEMO_ACTIONS,
  SEPTEMBER,
  balanceOf,
  buildSnapshot,
  type Transaction,
} from '../data/demoAccount';
import { evaluateOrava } from '../orava/logic';
import { colors } from '../theme';

const TAB_NAMES: Record<Tab, string> = {
  home: 'Home',
  etukortti: 'S-Etukortti',
  pay: 'Pay',
  sbank: 'S-Bank',
  me: 'Me',
};

export function HomeScreen() {
  const [txs, setTxs] = useState<Transaction[]>(SEPTEMBER);
  const [tab, setTab] = useState<Tab>('home');
  const { show, toast } = useToast();

  const orava = useMemo(() => evaluateOrava(buildSnapshot(txs)), [txs]);
  const balance = balanceOf(txs);

  const add = (t: Transaction, msg: string) => {
    setTxs((prev) => [t, ...prev]);
    show(msg);
  };
  const soon = (what: string) => () => show(`${what} is not part of the prototype yet`);

  return (
    <View style={s.screen}>
      <AppHeader onLock={soon('Lock')} onChat={soon('Messages')} />

      <ScrollView style={s.scroll} contentContainerStyle={{ flexGrow: 1 }}>
        {tab === 'home' ? (
          <>
            <BonusCard onPress={soon('Bonus details')} />
            <View style={s.body}>
              <OravaCard
                state={orava}
                demo={{
                  eatOut: () => add(DEMO_ACTIONS.eatOut(), 'Added: takeaway −€45'),
                  jacket: () => add(DEMO_ACTIONS.jacket(), 'Added: new jacket −€120'),
                  sideGig: () => add(DEMO_ACTIONS.sideGig(), 'Added: side gig +€400'),
                  reset: () => {
                    setTxs(SEPTEMBER);
                    show('Back to the start of the demo');
                  },
                }}
              />
              <ApprovalsCard onPress={soon('Payments to approve')} />
              <AccountsSection balance={balance} onPress={soon('Account details')} />
              <TransactionsSection txs={txs} />
              <Text style={s.foot}>
                Prototype with demo data shaped like the S-Bank Junction 2026 dataset.
              </Text>
            </View>
          </>
        ) : (
          <View style={s.body}>
            <Card>
              <Text style={s.stubTitle}>{TAB_NAMES[tab]}</Text>
              <Text style={s.stubText}>
                This tab is a placeholder. Orava lives on Home for now.
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>

      <BottomNav tab={tab} onChange={setTab} />
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
