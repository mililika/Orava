// "Where money goes" this month: income at the top, one bar showing how much of it is spent and
// on what, then a row per group with its categories. Labels are always shown, so colour is never
// the only signal. Numbers from thisMonthOf() in orava/health.ts.

import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { categoryInfo } from '../data/categories';
import type { MonthGroup, ThisMonth } from '@orava/core';
import { colors, eur } from '../theme';
import { Card } from './ui';

export const GROUP_COLOR: Record<MonthGroup['key'], string> = {
  moved: '#8d99a6',
  bills: '#2a78d6',
  essentials: '#e87ba4',
  surprises: '#8a63d2',
  extras: '#eda100',
};
const INVESTED = '#1baf7a';
const LEFT = '#e3ebe4';

const ord = (n: number) =>
  `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th'}`;

const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : '–');

/** `past`: a finished month from the month stepper ("Spent", not "Spent so far"). */
export function MonthSplit({ m, past }: { m: ThisMonth; past?: boolean }) {
  const out = m.groups.reduce((a, g) => a + g.amount, 0);
  const base = Math.max(m.income, out) || 1;
  const over = m.left < 0;
  if (!m.groups.length && !m.income) {
    return (
      <Card>
        <Text style={s.label}>Nothing spent on {m.name}.</Text>
      </Card>
    );
  }

  return (
    <Card style={{ gap: 12 }}>
      <View style={s.head}>
        <View>
          <Text style={s.label}>
            Income in {m.name}
            {m.expected ? ' (expected)' : ''}
          </Text>
          <Text style={s.income}>{eur(m.income, 0)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.label}>{past ? 'Spent' : 'Spent so far'}</Text>
          <Text style={s.spent}>
            {eur(m.spent, 0)} <Text style={s.share}>{pct(m.spent, m.income)}</Text>
          </Text>
        </View>
      </View>

      <View
        style={s.bar}
        accessibilityLabel={`${m.groups.map((g) => `${g.label} ${Math.round(g.amount)} euros`).join(', ')}, ${over ? 'over by' : 'left'} ${Math.round(Math.abs(m.left))} euros`}
      >
        {m.groups.map((g) => (
          <Fragment key={g.key}>
            {g.amount - g.upcoming > 0 ? (
              <View
                style={{
                  flex: (g.amount - g.upcoming) / base,
                  backgroundColor: GROUP_COLOR[g.key],
                }}
              />
            ) : null}
            {g.upcoming > 0 ? (
              <View
                style={[s.dotted, { flex: g.upcoming / base, borderColor: GROUP_COLOR[g.key] }]}
              />
            ) : null}
          </Fragment>
        ))}
        {m.invested > 0 ? (
          <View style={{ flex: m.invested / base, backgroundColor: INVESTED }} />
        ) : null}
        {m.left - m.invested > 0 ? (
          <View style={{ flex: (m.left - m.invested) / base, backgroundColor: LEFT }} />
        ) : null}
      </View>

      {m.groups.map((g) => (
        <View key={g.key} style={s.row}>
          <View style={[s.swatch, { backgroundColor: GROUP_COLOR[g.key] }]} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.line}>
              <Text style={s.name}>{g.label}</Text>
              <Text style={s.amount}>{eur(g.amount, 0)}</Text>
              <Text style={s.of}>{pct(g.amount, m.income)}</Text>
            </View>
            {g.items.length ? (
              <Text style={s.items} numberOfLines={2}>
                {g.items
                  .map((i) =>
                    i.due
                      ? `${i.due.name} ${eur(i.amount, 0)}, due ~${ord(i.due.day)}`
                      : `${categoryInfo(i.category).name} ${eur(i.amount, 0)}`,
                  )
                  .join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>
      ))}

      <View style={[s.row, s.leftRow]}>
        <View style={[s.swatch, { backgroundColor: over ? colors.neg : LEFT }]} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.line}>
            <Text style={[s.name, over && { color: colors.neg }]}>
              {over ? 'Over income' : 'Left over'}
            </Text>
            <Text style={[s.amount, over && { color: colors.neg }]}>
              {eur(Math.abs(m.left), 0)}
            </Text>
            <Text style={s.of}>{pct(Math.abs(m.left), m.income)}</Text>
          </View>
          {m.invested > 0 ? (
            <Text style={s.items}>
              <Text style={{ color: INVESTED, fontWeight: '700' }}>■</Text> Invested{' '}
              {eur(m.invested, 0)} · On account {eur(m.left - m.invested, 0)}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { fontSize: 12.5, color: colors.ink2 },
  income: { fontSize: 26, fontWeight: '800', color: colors.ink },
  spent: { fontSize: 18, fontWeight: '800', color: colors.ink },
  share: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  dotted: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  bar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  swatch: { width: 12, height: 12, borderRadius: 3, marginTop: 4 },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { flex: 1, fontSize: 14.5, fontWeight: '600', color: colors.ink },
  amount: { fontSize: 14.5, fontWeight: '800', color: colors.ink },
  of: { width: 38, textAlign: 'right', fontSize: 12.5, color: colors.ink2 },
  items: { fontSize: 12, color: colors.faint, lineHeight: 16, marginTop: 1 },
  leftRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
});
