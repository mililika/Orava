// S-mobiili-style home: account balance, this month in/out, and the transaction list.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../components/Icon';
import { TransactionList } from '../components/TransactionList';
import { SectionHead } from '../components/ui';
import type { Transaction } from '../data/demoAccount';
import { colors, eur, radius } from '../theme';

interface Props {
  username: string;
  balance: number;
  txs: Transaction[];
  /** Money in and out during the newest month in the data. */
  month: { label: string; income: number; spending: number };
  onAdd: () => void;
  onDelete: (t: Transaction) => void;
}

export function HomeScreen({ username, balance, txs, month, onAdd, onDelete }: Props) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
      <View style={s.hero}>
        <Text style={s.account}>Current account</Text>
        <Text style={[s.balance, balance < 0 && { color: colors.neg }]}>{eur(balance)}</Text>
        <Text style={s.available}>Available balance</Text>

        <View style={s.flowRow}>
          <View style={s.flow}>
            <Text style={s.flowLabel}>In · {month.label}</Text>
            <Text style={[s.flowValue, { color: colors.green }]}>+{eur(month.income, 0)}</Text>
          </View>
          <View style={s.flowDivider} />
          <View style={s.flow}>
            <Text style={s.flowLabel}>Out · {month.label}</Text>
            <Text style={s.flowValue}>{eur(-month.spending, 0)}</Text>
          </View>
        </View>

        <Pressable
          onPress={onAdd}
          role="button"
          style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.8 }]}
        >
          <Icon name="plus" color="#fff" size={20} strokeWidth={2.4} />
          <Text style={s.addText}>New transaction</Text>
        </Pressable>
      </View>

      <View style={s.body}>
        <SectionHead title="Transactions" />
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
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  account: { fontSize: 14, fontWeight: '600', color: colors.ink2 },
  balance: { fontSize: 38, fontWeight: '800', color: colors.green, marginTop: 2 },
  available: { fontSize: 12, color: colors.faint },
  flowRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 16,
    backgroundColor: colors.mint,
    borderRadius: radius.card,
    paddingVertical: 10,
  },
  flow: { flex: 1, alignItems: 'center' },
  flowDivider: { width: 1, backgroundColor: colors.line },
  flowLabel: { fontSize: 12, color: colors.ink2 },
  flowValue: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: colors.green,
    borderRadius: radius.pill,
    paddingVertical: 11,
    paddingHorizontal: 22,
  },
  addText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  body: { padding: 12, gap: 10 },
  foot: { fontSize: 11.5, color: colors.faint, marginHorizontal: 4, lineHeight: 16 },
});
