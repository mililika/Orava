// S-mobiili-style home: account balance and the transaction list.

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { OravaCard, type OravaAction } from '../components/OravaCard';
import { Card } from '../components/ui';
import { Icon } from '../components/Icon';
import type { Mood } from '../orava/types';
import { TransactionList } from '../components/TransactionList';
import { SectionHead } from '../components/ui';
import type { Transaction } from '../data/demoAccount';
import { colors, eur, radius } from '../theme';

interface Props {
  username: string;
  balance: number;
  txs: Transaction[];
  orava: { mood: Mood; score: number; message: string; actions?: OravaAction[] };
  onOpenHealth: () => void;
  onOpenAnalyst: () => void;
  analystEnabled: boolean;
  onAdd: () => void;
  onDelete: (t: Transaction) => void;
}

export function HomeScreen({
  username,
  balance,
  txs,
  orava,
  onOpenHealth,
  onOpenAnalyst,
  analystEnabled,
  onAdd,
  onDelete,
}: Props) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
      <View style={s.body}>
        <SectionHead title="Balance" />
        <View style={s.hero}>
          <Text style={s.account}>Current account</Text>
          <Text style={[s.balance, balance < 0 && { color: colors.neg }]}>{eur(balance)}</Text>
          <Text style={s.available}>Available balance</Text>
        </View>
        <SectionHead title="Orava" />
        <OravaCard {...orava} onOpen={onOpenHealth} />
        {analystEnabled && (
          <Card
            onPress={onOpenAnalyst}
            label="Open historical data analyst"
            style={s.analystCard}
          >
            <View style={s.analystIcon}>
              <Icon name="pulse" color={colors.green} size={21} />
            </View>
            <View style={s.analystCopy}>
              <Text style={s.analystTitle}>Historical analyst</Text>
              <Text style={s.analystSub}>Explore Junction spending and mortgage history</Text>
            </View>
            <Icon name="chevron" color={colors.green} size={19} />
          </Card>
        )}
        <SectionHead title="Transactions" action={{ label: 'New transaction', onPress: onAdd }} />
        <TransactionList txs={txs} onDelete={onDelete} />
        <Text style={s.foot}>
          Signed in as {username}. Data from the S-Bank Junction 2026 dataset.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 110 },
  hero: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 14,
  },
  account: { fontSize: 14, fontWeight: '600', color: colors.ink2 },
  balance: { fontSize: 38, fontWeight: '800', color: colors.green, marginTop: 2 },
  available: { fontSize: 12, color: colors.faint },
  body: { padding: 12, gap: 10 },
  foot: { fontSize: 11.5, color: colors.faint, marginHorizontal: 4, lineHeight: 16 },
  analystCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  analystIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analystCopy: { flex: 1, gap: 3 },
  analystTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  analystSub: { color: colors.ink2, fontSize: 11.5, lineHeight: 16 },
});
