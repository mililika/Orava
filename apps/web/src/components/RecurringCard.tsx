// "Regular payments" dropdown: the payments that leave every month, found by orava/recurring.ts.

import { StyleSheet, Text, View } from 'react-native';

import { categoryInfo } from '../data/categories';
import type { RecurringSummary } from '@orava/core';
import { colors, eur } from '../theme';
import { CategoryIcon } from './CategoryIcon';
import { Collapsible } from './Collapsible';

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function RecurringCard({ r }: { r: RecurringSummary }) {
  const n = r.items.length;
  return (
    <Collapsible
      icon="repeat"
      title="Regular payments"
      summary={n ? `${n} every month` : 'None found'}
      right={n ? `${eur(r.monthlyTotal, 0)}/mo` : undefined}
    >
      {r.items.map((i) => (
        <View key={i.key} style={s.row}>
          <CategoryIcon category={i.category} size={34} />
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>
              {i.name === i.category ? categoryInfo(i.category).name : i.name}
            </Text>
            <Text style={s.meta}>Around the {ord(i.day)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={s.amt}>{eur(i.monthly)}</Text>
            <Text style={[s.status, !i.paidThisMonth && { color: colors.warn }]}>
              {i.paidThisMonth ? 'Paid' : `Due ~${ord(i.day)}`}
            </Text>
          </View>
        </View>
      ))}
    </Collapsible>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 14, fontWeight: '600', color: colors.ink },
  meta: { fontSize: 12, color: colors.ink2 },
  amt: { fontSize: 14, fontWeight: '700', color: colors.ink },
  status: { fontSize: 11.5, fontWeight: '600', color: colors.green },
});
