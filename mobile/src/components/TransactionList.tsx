// Transactions grouped by day, newest first, in the S-mobiili list style.
// Swipe a row left to reveal Delete.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryInfo } from '../data/categories';
import type { Transaction } from '../data/demoAccount';
import { colors, eur } from '../theme';
import { CategoryIcon } from './CategoryIcon';
import { SwipeRow } from './SwipeRow';
import { Card } from './ui';

const PAGE = 12;

export function TransactionList({
  txs,
  onDelete,
}: {
  txs: Transaction[];
  onDelete: (t: Transaction) => void;
}) {
  const [count, setCount] = useState(PAGE);
  // Only one row is swiped open at a time.
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = txs.slice(0, count);

  const days: { date: string; items: Transaction[] }[] = [];
  for (const t of shown) {
    const last = days[days.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else days.push({ date: t.date, items: [t] });
  }

  if (txs.length === 0) {
    return (
      <Card>
        <Text style={s.empty}>No transactions yet.</Text>
      </Card>
    );
  }

  return (
    <Card style={{ paddingVertical: 4, paddingHorizontal: 0, overflow: 'hidden' }}>
      {days.map((d, di) => (
        <View key={d.date}>
          <Text style={[s.day, di > 0 && s.dayGap]}>{dayLabel(d.date)}</Text>
          {d.items.map((t) => (
            <SwipeRow
              key={t.id}
              open={openId === t.id}
              onOpenChange={(o) => setOpenId(o ? t.id : null)}
              onDelete={() => {
                setOpenId(null);
                onDelete(t);
              }}
            >
              <View style={s.tx}>
                <CategoryIcon category={t.category} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>
                    {t.merchant}
                  </Text>
                  <Text style={s.cat}>{categoryInfo(t.category).name}</Text>
                </View>
                <Text style={[s.amt, t.amount > 0 && { color: colors.green }]}>
                  {t.amount > 0 ? '+' : ''}
                  {eur(t.amount)}
                </Text>
              </View>
            </SwipeRow>
          ))}
        </View>
      ))}
      {txs.length > PAGE && (
        <Pressable
          onPress={() => setCount((c) => (c >= txs.length ? PAGE : c + PAGE * 2))}
          style={s.more}
          role="button"
        >
          <Text style={s.moreText}>{count >= txs.length ? 'Show less' : 'Show more'}</Text>
        </Pressable>
      )}
    </Card>
  );
}

function dayLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const wd = new Date(y, m - 1, d).toLocaleString('en-GB', { weekday: 'short' });
  return `${wd} ${d}.${m}.${y}`;
}

const s = StyleSheet.create({
  day: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.faint,
    paddingTop: 10,
    paddingBottom: 2,
    paddingHorizontal: 16,
  },
  dayGap: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 4,
    marginHorizontal: 16,
    paddingHorizontal: 0,
  },
  tx: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  name: { fontSize: 15, color: colors.ink },
  cat: { fontSize: 12, color: colors.ink2, marginTop: 1 },
  amt: { fontSize: 15, fontWeight: '600', color: colors.ink },
  more: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 4,
    marginHorizontal: 16,
  },
  moreText: { color: colors.green, fontWeight: '600', fontSize: 14 },
  empty: { color: colors.ink2, fontSize: 14 },
});
