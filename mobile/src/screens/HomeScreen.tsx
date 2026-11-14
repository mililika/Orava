// S-mobiili-style home: account balance and the transaction list.

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { OravaCard } from '../components/OravaCard';
import type { Overview } from '../orava/overview';
import type { Mood } from '../orava/types';
import { TransactionList } from '../components/TransactionList';
import { SectionHead } from '../components/ui';
import type { Transaction } from '../data/demoAccount';
import { colors, eur, radius } from '../theme';

interface Props {
  username: string;
  balance: number;
  txs: Transaction[];
  orava: {
    mood: Mood;
    score: number | null;
    message?: string;
    thinking?: boolean;
    insight?: Overview | null;
  };
  onOpenHealth: () => void;
  onAdd: () => void;
  onDelete: (t: Transaction) => void;
}

export function HomeScreen({
  username,
  balance,
  txs,
  orava,
  onOpenHealth,
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
});
