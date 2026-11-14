// "Where your money goes": ranked horizontal bars, one per category, as share of spending.
// One measure, so one hue (green); the category name and icon carry identity, never the color.
// Tap a row to see the euro amount.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryInfo } from '../data/categories';
import type { SpendSlice } from '../orava/health';
import { colors, eur } from '../theme';
import { CategoryIcon } from './CategoryIcon';

export function SpendingChart({ slices }: { slices: SpendSlice[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const max = Math.max(...slices.map((x) => x.share), 0.0001);

  if (slices.length === 0) return <Text style={s.empty}>No spending this month yet.</Text>;

  return (
    <View style={s.list} accessibilityRole="list">
      {slices.map((x) => {
        const on = sel === x.category;
        const pct = Math.round(x.share * 100);
        return (
          <Pressable
            key={x.category}
            onPress={() => setSel(on ? null : x.category)}
            style={[s.row, on && s.rowOn]}
            accessibilityLabel={`${categoryInfo(x.category).name}: ${pct}% of spending, ${eur(x.amount, 0)}`}
          >
            <CategoryIcon category={x.category} size={30} />
            <View style={{ flex: 1, gap: 5 }}>
              <View style={s.labels}>
                <Text style={s.name}>{categoryInfo(x.category).name}</Text>
                <Text style={s.value}>
                  {on ? <Text style={s.amount}>{eur(x.amount, 0)} · </Text> : null}
                  {pct}%
                </Text>
              </View>
              <View style={s.track}>
                <View style={[s.bar, { width: `${(x.share / max) * 100}%` }]} />
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  list: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  rowOn: { backgroundColor: '#f2f8f3' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { fontSize: 14, color: colors.ink },
  value: { fontSize: 14, fontWeight: '700', color: colors.ink },
  amount: { fontWeight: '500', color: colors.ink2 },
  track: { height: 8, borderRadius: 4, backgroundColor: '#edf2ee', overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.green2, minWidth: 4 },
  empty: { color: colors.ink2, fontSize: 14 },
});
