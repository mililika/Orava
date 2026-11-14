// "Payments to approve", "Accounts and cards" and "Latest transactions" on the home screen.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Transaction } from '../data/demoAccount';
import { colors, eur } from '../theme';
import { Icon } from './Icon';
import { Card, SectionHead } from './ui';

export function ApprovalsCard({ onPress }: { onPress: () => void }) {
  return (
    <Card onPress={onPress} label="Payments to approve">
      <View style={s.row}>
        <Icon name="check" size={28} color={colors.green} />
        <View>
          <Text style={s.rowTitle}>Payments to approve</Text>
          <Text style={s.rowSub}>Nothing waiting right now</Text>
        </View>
      </View>
    </Card>
  );
}

export function AccountsSection({ balance, onPress }: { balance: number; onPress: () => void }) {
  return (
    <>
      <SectionHead title="Accounts and cards" right={eur(balance)} />
      <Card style={{ paddingVertical: 4 }}>
        <Pressable onPress={onPress} style={s.acc} role="button">
          <Icon name="doc" size={30} color={colors.green} strokeWidth={1.5} />
          <Text style={s.accName}>Current account</Text>
          <Text style={[s.accAmt, balance < 0 && { color: colors.neg }]}>{eur(balance)}</Text>
        </Pressable>
        <View style={s.divider} />
        <Pressable onPress={onPress} style={s.acc} role="button">
          <Icon name="card" size={30} color={colors.green} strokeWidth={1.5} />
          <View style={{ flex: 1 }}>
            <Text style={s.accName}>S-Etukortti Visa Credit/Debit</Text>
            <Text style={s.small}>Credit •••• 0000 (fictional)</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.accAmt}>€2,000.00</Text>
            <Text style={s.small}>Credit available</Text>
          </View>
        </Pressable>
      </Card>
    </>
  );
}

export function TransactionsSection({ txs }: { txs: Transaction[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? txs : txs.slice(0, 5);
  return (
    <>
      <SectionHead title="Latest transactions" />
      <Card style={{ paddingVertical: 4 }}>
        {shown.map((t, i) => (
          <View key={t.id} style={[s.tx, i > 0 && s.txBorder]}>
            <Text style={s.txDate}>
              {t.date.slice(8)}.{t.date.slice(5, 7)}.
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={s.txName}>{t.merchant}</Text>
              <Text style={s.small}>{t.category}</Text>
            </View>
            <Text style={[s.txAmt, t.amount > 0 && { color: colors.green }]}>
              {t.amount > 0 ? '+' : ''}
              {eur(t.amount)}
            </Text>
          </View>
        ))}
        <Pressable onPress={() => setAll((a) => !a)} style={s.more} role="button">
          <Text style={s.moreText}>{all ? 'Show less' : `Show all (${txs.length})`}</Text>
        </Pressable>
      </Card>
    </>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 15, fontWeight: '500', color: colors.ink },
  rowSub: { fontSize: 12.5, color: colors.ink2 },
  acc: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  accName: { flex: 1, fontSize: 15, color: colors.ink },
  accAmt: { fontSize: 16, fontWeight: '700', color: colors.green },
  small: { fontSize: 11.5, color: colors.ink2 },
  divider: { height: 1, backgroundColor: colors.line },
  tx: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  txBorder: { borderTopWidth: 1, borderTopColor: '#f0f3f0' },
  txDate: { width: 44, fontSize: 12.5, color: colors.ink2 },
  txName: { fontSize: 14, color: colors.ink },
  txAmt: { fontSize: 14, fontWeight: '600', color: colors.ink },
  more: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  moreText: { color: colors.green, fontWeight: '600', fontSize: 14 },
});
