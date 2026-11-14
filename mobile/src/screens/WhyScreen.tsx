// "Why Orava is <mood>": the reasons behind the mood, the three baskets, the top insight
// and one what-if change, optionally put next to the user's own savings goal.
// All numbers come from src/orava/analysis.ts and goal.ts; this file only displays.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GoalCard } from '../components/GoalCard';
import { Icon } from '../components/Icon';
import { Card, DemoBadge, Pill } from '../components/ui';
import {
  WHAT_IF_STEPS,
  canReduce,
  illustrate,
  spentOn,
  topInsight,
  type Illustration,
  type Insight,
  type MonthAnalysis,
} from '../orava/analysis';
import { goalLine, type SavingsGoal } from '../orava/goal';
import { monthRange } from '../orava/logic';
import { Mascot } from '../orava/Mascot';
import { MOODS } from '../orava/moods';
import type { OravaState } from '../orava/types';
import { colors, eur } from '../theme';

const whole = (n: number) => eur(n, 0);

export function WhyScreen({
  analysis,
  state,
  isDemo,
  onBack,
  goal,
  onGoalChange,
}: {
  analysis: MonthAnalysis;
  state: OravaState;
  isDemo: boolean;
  onBack: () => void;
  goal: SavingsGoal | null;
  onGoalChange: (g: SavingsGoal | null) => void;
}) {
  const mood = MOODS[state.mood];
  const insight = topInsight(analysis, state);

  return (
    <View style={s.body}>
      <Pressable onPress={onBack} role="button" accessibilityLabel="Back to home" style={s.back}>
        <Icon name="back" color={colors.green} size={22} strokeWidth={2} />
        <Text style={s.backText}>Home</Text>
      </Pressable>

      {isDemo && <DemoBadge />}

      <Card>
        <View style={s.whyTop}>
          <Mascot mood={state.mood} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={s.h1} role="heading">
              Why Orava is {mood.name}
            </Text>
            <Text style={s.period}>{analysis.periodLabel}</Text>
          </View>
        </View>
        <View style={[s.reasons, { backgroundColor: mood.bg }]}>
          {state.reasons.map((r) => (
            <Text key={r} style={[s.reason, { color: mood.fg }]}>
              • {r}
            </Text>
          ))}
        </View>
      </Card>

      <Baskets analysis={analysis} state={state} />
      <InsightCard insight={insight} analysis={analysis} moodName={mood.name} />
      {insight.kind !== 'none' && (
        <WhatIf analysis={analysis} initialCategory={insight.category} goal={goal} />
      )}
      <GoalCard goal={goal} onChange={onGoalChange} />
    </View>
  );
}

// ---------- three baskets ----------

function Baskets({ analysis, state }: { analysis: MonthAnalysis; state: OravaState }) {
  const s0 = analysis.snapshot;
  const everyday = s0.everydayEssential + s0.flexible;
  const rows = [
    { key: 'regular', label: 'Regular essentials', hint: 'Housing, bills', amount: s0.regular },
    {
      key: 'unexpected',
      label: 'Unexpected necessities',
      hint: 'Health, home & tech',
      amount: s0.unexpected,
    },
    {
      key: 'everyday',
      label: 'Everyday spending',
      hint: `Essentials ${whole(s0.everydayEssential)} · Flexible ${whole(s0.flexible)}`,
      amount: everyday,
    },
  ];
  if (s0.otherOut > 0) {
    rows.push({
      key: 'other',
      label: 'Other money out',
      hint: `Not sorted: ${analysis.unknownOut.join(', ')}. Counted as money out.`,
      amount: s0.otherOut,
    });
  }
  const max = Math.max(1, ...rows.map((r) => r.amount));

  return (
    <Card>
      <Text style={s.h2}>Where your money went</Text>
      <Text style={s.muted}>{analysis.periodLabel}</Text>
      <View style={{ gap: 12, marginTop: 12 }}>
        {rows.map((r) => (
          <View key={r.key}>
            <View style={s.rowTop}>
              <Text style={s.rowLabel}>{r.label}</Text>
              <Text style={s.rowAmount}>{whole(r.amount)}</Text>
            </View>
            <View style={s.track}>
              <View
                style={[
                  s.bar,
                  { width: `${Math.max(2, (r.amount / max) * 100)}%` },
                  r.key === 'everyday' && { backgroundColor: colors.green2 },
                  r.key === 'other' && { backgroundColor: colors.faint },
                ]}
              />
            </View>
            <Text style={s.muted}>{r.hint}</Text>
          </View>
        ))}
      </View>

      <View style={s.divider} />
      <View style={s.rowTop}>
        <Text style={s.rowLabel}>Income</Text>
        <Text style={s.rowAmount}>{whole(s0.income)}</Text>
      </View>
      {s0.otherIn > 0 && (
        <Text style={[s.muted, { marginTop: 4 }]}>
          Other money in: {whole(s0.otherIn)} ({analysis.unknownIn.join(', ')}). Not counted as
          income, because it may be a transfer between your own accounts.
        </Text>
      )}
      <View style={[s.rowTop, { marginTop: 6 }]}>
        <Text style={s.rowLabel}>{state.kept >= 0 ? 'Kept this period' : 'Over your income'}</Text>
        <Text style={[s.rowAmount, state.kept < 0 && { color: colors.neg }]}>
          {whole(Math.abs(state.kept))}
        </Text>
      </View>
    </Card>
  );
}

// ---------- top insight ----------

function InsightCard({
  insight,
  analysis,
  moodName,
}: {
  insight: Insight;
  analysis: MonthAnalysis;
  moodName: string;
}) {
  if (insight.kind === 'rise') {
    return (
      <Card>
        <Text style={s.h2}>Biggest rise you control</Text>
        <Text style={s.text}>
          <Text style={s.strong}>{insight.category}</Text>: {whole(insight.current)} on days 1–
          {insight.days}, {whole(insight.current - insight.usual)} more than your average of{' '}
          {whole(insight.usual)} for the same days of {monthRange(insight.months)}.
        </Text>
        {insight.explainsMood && (
          <Text style={[s.text, s.because]}>This is part of why Orava is {moodName}.</Text>
        )}
      </Card>
    );
  }
  if (insight.kind === 'noRise') {
    return (
      <Card>
        <Text style={s.h2}>Where your flexible money went</Text>
        <Text style={s.text}>
          None of your flexible categories rose compared with days 1–{insight.days} of{' '}
          {monthRange(insight.months)}. Largest: <Text style={s.strong}>{insight.category}</Text>{' '}
          {whole(insight.current)} (average {whole(insight.usual)}).
        </Text>
      </Card>
    );
  }
  if (insight.kind === 'noComparison') {
    return (
      <Card>
        <Text style={s.h2}>Your largest flexible spending</Text>
        <Text style={s.text}>
          <Text style={s.strong}>{insight.category}</Text>: {whole(insight.amount)} in{' '}
          {analysis.periodLabel}.
        </Text>
        <Text style={[s.muted, { marginTop: 6 }]}>
          {insight.reason} So Orava can’t say whether this is more or less than usual.
        </Text>
      </Card>
    );
  }
  return (
    <Card>
      <Text style={s.h2}>Flexible spending</Text>
      <Text style={s.text}>
        No flexible spending (restaurants, lifestyle, entertainment, travel) this period.
      </Text>
    </Card>
  );
}

// ---------- what-if ----------

function WhatIf({
  analysis,
  initialCategory,
  goal,
}: {
  analysis: MonthAnalysis;
  initialCategory: string;
  goal: SavingsGoal | null;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [step, setStep] = useState<number | null>(null);
  const result = step === null ? null : illustrate(analysis, category, step);
  const spent = spentOn(analysis, category);
  const someOff = WHAT_IF_STEPS.some((n) => !canReduce(analysis, category, n));

  return (
    <Card>
      <Text style={s.h2}>Try one change</Text>
      <Text style={s.muted}>
        Pick a flexible category and an amount. Essentials stay as they are.
      </Text>

      <View style={s.chips}>
        {analysis.flexible.map((c) => (
          <Pill
            key={c.category}
            title={`${c.category} ${whole(c.amount)}`}
            variant={c.category === category ? 'solid' : 'outline'}
            selected={c.category === category}
            onPress={() => {
              setCategory(c.category);
              if (step !== null && !canReduce(analysis, c.category, step)) setStep(null);
            }}
          />
        ))}
      </View>
      <View style={s.chips}>
        {WHAT_IF_STEPS.map((n) => {
          const ok = canReduce(analysis, category, n);
          return (
            <Pill
              key={n}
              title={`−€${n}`}
              label={`${n} euros less on ${category}`}
              variant={step === n ? 'solid' : 'outline'}
              selected={step === n}
              disabled={!ok}
              onPress={() => setStep(n)}
            />
          );
        })}
      </View>
      {someOff && (
        <Text style={s.muted}>
          Amounts above what you spent on {category} ({whole(spent)}) are turned off.
        </Text>
      )}

      {result ? (
        <Result result={result} analysis={analysis} goal={goal} />
      ) : (
        <Text style={[s.muted, { marginTop: 10 }]}>
          Choose an amount to see the effect in euros.
        </Text>
      )}
    </Card>
  );
}

function Result({
  result: r,
  analysis,
  goal,
}: {
  result: Illustration;
  analysis: MonthAnalysis;
  goal: SavingsGoal | null;
}) {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return (
    <View style={s.result} accessibilityLiveRegion="polite">
      <Text style={s.resultMain}>{resultLine(r, analysis.monthName)}</Text>
      {r.incomeKnown && (
        <Text style={s.text}>
          That’s {pct(r.savingRateAfter)} of your income kept instead of {pct(r.savingRateBefore)}.
        </Text>
      )}
      {goal && <Text style={[s.text, { color: colors.okInk }]}>{goalLine(r.reduceBy, goal)}</Text>}
      <Text style={[s.muted, { marginTop: 6 }]}>
        Illustration on this period’s transactions ({analysis.periodLabel}). Income and all other
        spending stay the same. Not a forecast.
      </Text>
      {r.moodAfter !== r.moodBefore && (
        <Text style={[s.muted, { marginTop: 4 }]}>
          Orava would be {MOODS[r.moodAfter].name} instead of {MOODS[r.moodBefore].name}.
        </Text>
      )}
    </View>
  );
}

function resultLine(r: Illustration, monthName: string) {
  const less = `If ${monthName} had ${whole(r.reduceBy)} less on ${r.category}`;
  if (r.keptBefore >= 0 && r.keptAfter >= 0) {
    return `${less}, you’d have kept ${whole(r.keptAfter)} instead of ${whole(r.keptBefore)}.`;
  }
  if (r.keptBefore < 0 && r.keptAfter < 0) {
    return `${less}, you’d be ${whole(-r.keptAfter)} over your income instead of ${whole(-r.keptBefore)}.`;
  }
  return `${less}, you’d have kept ${whole(r.keptAfter)} instead of being ${whole(-r.keptBefore)} over your income.`;
}

const s = StyleSheet.create({
  body: { padding: 12, paddingBottom: 24, gap: 12 },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backText: { fontSize: 16, color: colors.green, fontWeight: '600' },
  whyTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  h1: { fontSize: 21, fontWeight: '700', color: colors.green },
  h2: { fontSize: 17, fontWeight: '700', color: colors.green, marginBottom: 2 },
  period: { fontSize: 13, color: colors.ink2, marginTop: 2 },
  reasons: { borderRadius: 6, padding: 10, marginTop: 10, gap: 4 },
  reason: { fontSize: 14, lineHeight: 20 },
  text: { fontSize: 14.5, lineHeight: 21, color: colors.ink, marginTop: 4 },
  strong: { fontWeight: '700' },
  because: { color: colors.warnInk, fontWeight: '600' },
  muted: { fontSize: 12.5, lineHeight: 18, color: colors.faint },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowLabel: { fontSize: 14.5, fontWeight: '600', color: colors.ink },
  rowAmount: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
    marginVertical: 4,
    overflow: 'hidden',
  },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.green },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  result: { marginTop: 12, padding: 12, borderRadius: 6, backgroundColor: colors.greenSoft },
  resultMain: { fontSize: 15.5, lineHeight: 22, fontWeight: '700', color: colors.okInk },
});
