// What if: planned costs you type in (a category, an amount per month). Orava shows the new score and how the balance
// trajectory would look over the next 6 months. The score is recomputed with the same function as the real
// one (orava/score.ts).

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { categoryInfo } from '../data/categories';
import { Mascot } from '../orava/Mascot';
import { averageByCategory, type MonthTotals, type Score, scoreOf, WINDOW } from '@orava/core';
import { MOODS } from '../orava/moods';
import { colors, eur, radius } from '../theme';
import { CategoryIcon } from './CategoryIcon';
import { Icon } from './Icon';

const HORIZON = 6;
/** Months behind the averages shown in the category dropdown. */
const AVG_MONTHS = 6;
/** No spending in this many latest months (the running one included) = stopped, shown as €0. */
const STALE_MONTHS = 2;
/** Big one-off purchases first. */
const PLAN_CATEGORIES = [
  'Home & Tech',
  'Travel',
  'Lifestyle',
  'Entertainment',
  'Restaurants',
  'Groceries',
  'Health',
  'Transportation',
  'Housing',
  'Utilities',
  'Coffee',
];

interface Planned {
  id: number;
  category: string;
  /** The new planned amount per month for the category. */
  amount: number;
  /** The 6-month average it replaces, for display. */
  was: number;
}

/**
 * The months as if the plans had happened: a monthly plan sets the category to its new amount in
 * each month of the score window. Balances move by the difference paid up to that month (up when
 * you spend less).
 */
function withPlans(months: MonthTotals[], plans: Planned[]): MonthTotals[] {
  if (!plans.length) return months;
  const start = Math.max(0, months.length - WINDOW);
  return months.map((m, i) => {
    if (i < start) return m;
    const byCategory = { ...m.byCategory };
    let paid = 0;
    for (const p of plans) {
      // Difference in each window month so far, as a running total.
      for (let j = start; j <= i; j++) paid += p.amount - (months[j].byCategory[p.category] ?? 0);
      byCategory[p.category] = p.amount;
    }
    return { ...m, byCategory, endBalance: m.endBalance - paid, lowBalance: m.lowBalance - paid };
  });
}

/** Balance now and at the end of each of the next 12 months, at the usual monthly pace. */
function projection(score: Score, balance: number, monthly: number) {
  const p = score.perMonth;
  const net = p.income - p.swept - p.spending - p.invested - monthly;
  return Array.from({ length: HORIZON + 1 }, (_, k) => balance + net * k);
}

const parseAmount = (s: string) => Number(s.replace(/[€\s]/g, '').replace(',', '.'));

export function WhatIf({
  months,
  balance,
  regular = {},
}: {
  months: MonthTotals[];
  balance: number;
  /** Regular payments' typical monthly amount per category (e.g. rent): shown as the usual. */
  regular?: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<Planned[]>([]);
  const [category, setCategory] = useState('Home & Tech');
  const [amount, setAmount] = useState('');

  const before = useMemo(() => scoreOf(months, balance), [months, balance]);
  const averages = useMemo(() => {
    const avgs = averageByCategory(months.slice(-AVG_MONTHS));
    // A category with nothing spent in the latest months has stopped (e.g. rent paid elsewhere
    // now): its old payments must not make up an average of what you spend today.
    for (const c of Object.keys(avgs)) {
      if (months.slice(-STALE_MONTHS).every((m) => !m.byCategory[c])) avgs[c] = 0;
    }
    // A regular payment (rent) is its typical amount, not diluted by a missed month.
    for (const [c, v] of Object.entries(regular)) if (v > (avgs[c] ?? 0)) avgs[c] = v;
    return avgs;
  }, [months, regular]);
  const recent = useMemo(() => averageByCategory(months.slice(-WINDOW)), [months]);
  // Monthly change against the score window's average (negative = you spend less).
  const perMonth = plans.reduce((a, p) => a + p.amount - (recent[p.category] ?? 0), 0);
  const after = useMemo(() => {
    const planned = withPlans(months, plans);
    const last = planned[planned.length - 1];
    const shift = last ? months[months.length - 1].endBalance - last.endBalance : 0;
    return scoreOf(planned, balance - shift);
  }, [months, balance, plans]);
  const base = useMemo(() => projection(before, balance, 0), [before, balance]);
  const planned = projection(before, balance, perMonth);
  const diff = after.score - before.score;

  const value = parseAmount(amount);
  const valid = Number.isFinite(value) && value >= 0 && amount.trim() !== '';
  const add = () => {
    if (!valid) return;
    const plan = { id: Date.now(), category, amount: value, was: averages[category] ?? 0 };
    // One monthly amount per category: a new one replaces the old.
    setPlans((ps) => [...ps.filter((p) => p.category !== category), plan]);
    setAmount('');
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={s.card}>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          role="button"
          aria-expanded={open}
          style={({ pressed }) => [s.toggle, pressed && { opacity: 0.8 }]}
        >
          <Icon name="sliders" size={20} color={colors.green} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={s.title}>What if…</Text>
            <Text style={s.sub}>Adjust monthly spending to see how it affects your account</Text>
          </View>
          <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
            <Icon name="down" size={20} color={colors.green} strokeWidth={2.2} />
          </View>
        </Pressable>

        {open ? (
          <View style={s.body}>
            <View style={[s.result, { backgroundColor: MOODS[after.mood].bg }]}>
              <View style={s.resultTop}>
                <Mascot mood={after.mood} size={56} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.scoreLine}>
                    <Text style={s.scoreOld}>{before.score}</Text>
                    {'  →  '}
                    <Text style={s.scoreNew}>{after.score}</Text>
                    {diff !== 0 ? (
                      <Text style={{ color: diff > 0 ? colors.okInk : colors.neg }}>
                        {'  '}
                        {diff > 0 ? '+' : ''}
                        {diff}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={[s.moodName, { color: MOODS[after.mood].fg }]}>
                    {MOODS[after.mood].name}
                  </Text>
                </View>
              </View>
              <Projection base={base} planned={plans.length ? planned : null} />
            </View>

            <CategoryPicker value={category} onChange={setCategory} averages={averages} />

            <View style={s.form}>
              <View style={s.amountBox}>
                <Text style={s.euro}>€</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  onSubmitEditing={add}
                  placeholder="Plan per month"
                  placeholderTextColor={colors.faint}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  style={s.amountInput}
                  accessibilityLabel={`Planned monthly amount for ${categoryInfo(category).name}`}
                />
                <Text style={s.perMo}>/ mo</Text>
              </View>
              <Pressable
                onPress={add}
                disabled={!valid}
                role="button"
                accessibilityLabel="Add planned cost"
                style={({ pressed }) => [
                  s.add,
                  !valid && { opacity: 0.35 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Icon name="plus" size={20} color="#fff" strokeWidth={2.4} />
              </Pressable>
            </View>

            {plans.map((p) => (
              <View key={p.id} style={s.row}>
                <CategoryIcon category={p.category} size={32} />
                <Text style={s.cat}>{categoryInfo(p.category).name}</Text>
                <Text style={s.amt}>
                  <Text style={s.freq}>{eur(p.was, 0)} → </Text>
                  {eur(p.amount, 0)}
                  <Text style={s.freq}> / mo</Text>
                </Text>
                <Pressable
                  onPress={() => setPlans((ps) => ps.filter((x) => x.id !== p.id))}
                  role="button"
                  accessibilityLabel={`Remove ${categoryInfo(p.category).name}`}
                  hitSlop={8}
                >
                  <Icon name="close" size={18} color={colors.ink2} strokeWidth={2.2} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Dropdown of spending categories, each with its icon and your average of the last 6 months. */
function CategoryPicker({
  value,
  onChange,
  averages,
}: {
  value: string;
  onChange: (c: string) => void;
  averages: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const avg = (c: string) => `${eur(averages[c] ?? 0, 0)} / mo`;
  return (
    <View style={s.picker}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
        accessibilityLabel={`Category: ${categoryInfo(value).name}, current average ${avg(value)}`}
        style={({ pressed }) => [s.pickRow, pressed && { opacity: 0.8 }]}
      >
        <CategoryIcon category={value} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={s.pickName}>{categoryInfo(value).name}</Text>
          <Text style={s.pickAvg}>
            Current average: <Text style={s.pickAvgVal}>{avg(value)}</Text>
          </Text>
        </View>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Icon name="down" size={20} color={colors.green} strokeWidth={2.2} />
        </View>
      </Pressable>
      {open
        ? PLAN_CATEGORIES.filter((c) => c !== value).map((c) => (
            <Pressable
              key={c}
              onPress={() => {
                onChange(c);
                setOpen(false);
              }}
              role="button"
              style={({ pressed }) => [s.option, pressed && { backgroundColor: colors.mint }]}
            >
              <CategoryIcon category={c} size={32} />
              <Text style={s.optName}>{categoryInfo(c).name}</Text>
              <Text style={s.optAvg}>{avg(c)}</Text>
            </Pressable>
          ))
        : null}
    </View>
  );
}

/** Balance over the next 6 months: today's pace (gray, dashed) and with the plans. */
function Projection({ base, planned }: { base: number[]; planned: number[] | null }) {
  const [w, setW] = useState(0);
  const H = 56;
  const all = [...base, ...(planned ?? [])];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || 1;
  const x = (i: number) => 4 + ((w - 8) * i) / HORIZON;
  const y = (v: number) => 4 + (H - 8) * (1 - (v - lo) / span);
  const path = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const end = (planned ?? base)[HORIZON];
  const dips = (planned ?? base).some((v) => v < 0);

  return (
    <View style={{ gap: 4 }}>
      <View style={s.projHead}>
        <Text style={s.projLabel}>{HORIZON}-month projection (fixed income/spent)</Text>
        <Text style={[s.projValue, end < 0 && { color: colors.neg }]}>
          {eur(end, 0)}
          {planned ? <Text style={s.projWas}> (was {eur(base[HORIZON], 0)})</Text> : null}
        </Text>
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H }}>
        {w > 0 ? (
          <Svg width={w} height={H}>
            {lo < 0 ? (
              <Line
                x1={0}
                x2={w}
                y1={y(0)}
                y2={y(0)}
                stroke={colors.neg}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            ) : null}
            <Path
              d={path(base)}
              stroke={planned ? '#9aa39c' : colors.green}
              strokeWidth={2}
              strokeDasharray={planned ? '4 3' : undefined}
              fill="none"
            />
            {planned ? (
              <Path
                d={path(planned)}
                stroke={dips ? colors.neg : colors.green}
                strokeWidth={2.5}
                fill="none"
              />
            ) : null}
          </Svg>
        ) : null}
      </View>
      {dips ? <Text style={s.warn}>Goes below zero</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  title: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  sub: { fontSize: 12.5, color: colors.ink2 },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    padding: 14,
    gap: 12,
  },
  result: { borderRadius: radius.card, padding: 10, gap: 8 },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreLine: { fontSize: 16, fontWeight: '700', color: colors.ink2 },
  scoreOld: { color: colors.faint },
  scoreNew: { fontSize: 24, fontWeight: '800', color: colors.ink },
  moodName: { fontSize: 13, fontWeight: '700' },
  projHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  projLabel: { fontSize: 12, color: colors.ink2 },
  projValue: { fontSize: 14, fontWeight: '800', color: colors.ink },
  projWas: { fontSize: 12, fontWeight: '500', color: colors.faint },
  warn: { fontSize: 12, fontWeight: '700', color: colors.neg },
  picker: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  pickName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  pickAvg: { fontSize: 12.5, color: colors.ink2 },
  pickAvgVal: { fontWeight: '700', color: colors.ink },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  optName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  optAvg: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  form: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountBox: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: radius.card,
    backgroundColor: colors.mint,
    paddingHorizontal: 12,
    gap: 4,
  },
  euro: { fontSize: 16, fontWeight: '700', color: colors.ink2 },
  amountInput: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '700', color: colors.ink },
  perMo: { fontSize: 13, fontWeight: '600', color: colors.ink2, marginRight: 2 },
  add: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cat: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  amt: { fontSize: 14, fontWeight: '700', color: colors.ink },
  freq: { fontSize: 12, fontWeight: '500', color: colors.ink2 },
});
