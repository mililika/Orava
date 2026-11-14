// "Why Orava is <mood>" (Financial Health). Order, top to bottom:
// 1. compact summary (Orava, mood, period, short reason)
// 2. top insight + "Try one change" in one card, result led by the euro effect
// 3. the three baskets, 4. the optional savings goal.
// All numbers come from src/orava/analysis.ts and goal.ts; this file only displays.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AskOrava } from '../components/AskOrava';
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
import type { AiTransport } from '../orava/ai/flow';
import { goalLine, type SavingsGoal } from '../orava/goal';
import { NO_COMPARISON_REASON, monthRange } from '../orava/logic';
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
  ai,
}: {
  analysis: MonthAnalysis;
  state: OravaState;
  isDemo: boolean;
  onBack: () => void;
  goal: SavingsGoal | null;
  onGoalChange: (g: SavingsGoal | null) => void;
  /** Set only when the AI server is reachable and has a key; otherwise "Ask Orava" is hidden. */
  ai: AiTransport | null;
}) {
  const mood = MOODS[state.mood];
  const insight = topInsight(analysis, state);
  // What-if selection lives here so an "Ask Orava" what-if can drive the same calculation.
  const [category, setCategory] = useState(insight.kind === 'none' ? '' : insight.category);
  const [step, setStep] = useState<number | null>(null);
  // The insight card explains a missing comparison itself; don't say it twice.
  const reasons =
    insight.kind === 'noComparison'
      ? state.reasons.filter((r) => r !== NO_COMPARISON_REASON)
      : state.reasons;

  return (
    <View style={s.body}>
      <Pressable onPress={onBack} role="button" accessibilityLabel="Back to home" style={s.back}>
        <Icon name="back" color={colors.green} size={22} strokeWidth={2} />
        <Text style={s.backText}>Home</Text>
      </Pressable>

      {isDemo && <DemoBadge />}

      {/* 1. Compact summary */}
      <Card style={s.summary}>
        <Mascot mood={state.mood} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={s.h1} role="heading">
            Why Orava is {mood.name}
          </Text>
          <Text style={s.period}>{analysis.periodLabel}</Text>
          {reasons.map((r) => (
            <Text key={r} style={[s.reason, { color: mood.fg }]}>
              {r}
            </Text>
          ))}
        </View>
      </Card>

      {/* 2. Insight + one change */}
      <Card>
        <InsightBlock insight={insight} moodName={mood.name} />
        {ai && insight.kind !== 'none' && (
          <AskOrava
            ai={ai}
            analysis={analysis}
            goal={goal}
            onWhatIf={(c, n) => {
              setCategory(c);
              setStep(n);
            }}
          />
        )}
        {insight.kind !== 'none' && (
          <WhatIf
            analysis={analysis}
            goal={goal}
            category={category}
            step={step}
            onCategory={setCategory}
            onStep={setStep}
          />
        )}
      </Card>

      {/* 3. Baskets, 4. goal */}
      <Baskets analysis={analysis} state={state} />
      <GoalCard goal={goal} onChange={onGoalChange} />
    </View>
  );
}

// ---------- insight ----------

function InsightBlock({ insight, moodName }: { insight: Insight; moodName: string }) {
  if (insight.kind === 'rise') {
    return (
      <>
        <Text style={s.h2}>Biggest rise you control</Text>
        <Text style={s.text}>
          <Text style={s.strong}>
            {insight.category} {whole(insight.current)}
          </Text>
          , up {whole(insight.current - insight.usual)} from your average {whole(insight.usual)}{' '}
          (days 1–{insight.days}, {monthRange(insight.months)}).
        </Text>
        {insight.explainsMood && (
          <Text style={[s.text, s.because]}>This is part of why Orava is {moodName}.</Text>
        )}
      </>
    );
  }
  if (insight.kind === 'noRise') {
    return (
      <>
        <Text style={s.h2}>Where your flexible money went</Text>
        <Text style={s.text}>
          No flexible category rose (days 1–{insight.days}, {monthRange(insight.months)}). Largest:{' '}
          <Text style={s.strong}>
            {insight.category} {whole(insight.current)}
          </Text>
          , average {whole(insight.usual)}.
        </Text>
      </>
    );
  }
  if (insight.kind === 'noComparison') {
    return (
      <>
        <Text style={s.h2}>Your largest flexible spending</Text>
        <Text style={s.text}>
          <Text style={s.strong}>
            {insight.category} {whole(insight.amount)}
          </Text>{' '}
          this period.
        </Text>
        <Text style={[s.muted, { marginTop: 4 }]}>
          {insight.reason} So Orava can’t say if this is more or less than usual.
        </Text>
      </>
    );
  }
  return (
    <>
      <Text style={s.h2}>Flexible spending</Text>
      <Text style={s.text}>
        No flexible spending (restaurants, lifestyle, entertainment, travel) this period.
      </Text>
    </>
  );
}

// ---------- what-if ----------

function WhatIf({
  analysis,
  goal,
  category,
  step,
  onCategory: setCategory,
  onStep: setStep,
}: {
  analysis: MonthAnalysis;
  goal: SavingsGoal | null;
  category: string;
  step: number | null;
  onCategory: (c: string) => void;
  onStep: (n: number | null) => void;
}) {
  const [showHow, setShowHow] = useState(false);
  const result = step === null ? null : illustrate(analysis, category, step);
  const spent = spentOn(analysis, category);
  const someOff = WHAT_IF_STEPS.some((n) => !canReduce(analysis, category, n));

  return (
    <>
      <View style={s.divider} />
      <Text style={s.h3}>Try one change</Text>
      <Text style={s.muted}>Flexible spending only. Essentials stay as they are.</Text>

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
        {WHAT_IF_STEPS.map((n) => (
          <Pill
            key={n}
            title={`−€${n}`}
            label={`${n} euros less on ${category}`}
            variant={step === n ? 'solid' : 'outline'}
            selected={step === n}
            disabled={!canReduce(analysis, category, n)}
            onPress={() => setStep(n)}
          />
        ))}
      </View>
      {someOff && (
        <Text style={[s.muted, { marginTop: 6 }]}>
          Amounts above what you spent on {category} ({whole(spent)}) are turned off.
        </Text>
      )}

      {result ? (
        <Result result={result} monthName={analysis.monthName} goal={goal} />
      ) : (
        <Text style={[s.text, { marginTop: 12, color: colors.ink2 }]}>
          Choose an amount to see the effect in euros.
        </Text>
      )}

      {/* Assumptions: always visible, one short line. Details on demand. */}
      <Text style={[s.muted, { marginTop: 8 }]}>
        Based on this period’s transactions only. Income and other spending stay the same. Not a
        forecast.
      </Text>
      <Pressable
        onPress={() => setShowHow((v) => !v)}
        role="button"
        accessibilityState={{ expanded: showHow }}
        style={s.howBtn}
      >
        <Text style={s.howText}>How this is calculated</Text>
        <View style={{ transform: [{ rotate: showHow ? '90deg' : '0deg' }] }}>
          <Icon name="chevron" size={16} color={colors.green} strokeWidth={2} />
        </View>
      </Pressable>
      {showHow && <HowCalculated analysis={analysis} />}
    </>
  );
}

function Result({
  result: r,
  monthName,
  goal,
}: {
  result: Illustration;
  monthName: string;
  goal: SavingsGoal | null;
}) {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const moodChanged = r.moodAfter !== r.moodBefore;
  const secondary = [
    r.incomeKnown
      ? `${pct(r.savingRateAfter)} of income kept instead of ${pct(r.savingRateBefore)}.`
      : '',
    moodChanged
      ? `Orava would be ${MOODS[r.moodAfter].name} instead of ${MOODS[r.moodBefore].name}.`
      : '',
  ].filter(Boolean);

  return (
    <View style={s.result} accessibilityLiveRegion="polite">
      <Text style={s.big}>{whole(r.reduceBy)} more left</Text>
      <Text style={s.beforeAfter}>
        {whole(r.keptBefore)} → {whole(r.keptAfter)}{' '}
        <Text style={s.beforeAfterLabel}>
          {r.keptAfter >= 0 ? `left in ${monthName}` : `over your income in ${monthName}`}
        </Text>
      </Text>
      {secondary.map((line) => (
        <Text key={line} style={s.secondary}>
          {line}
        </Text>
      ))}
      {goal && <Text style={s.goalLine}>{goalLine(r.reduceBy, goal)}</Text>}
    </View>
  );
}

function HowCalculated({ analysis }: { analysis: MonthAnalysis }) {
  const c = analysis.comparison;
  const lines = [
    `Period: ${analysis.periodLabel}.`,
    c
      ? `“Usual” is your average for days 1–${c.days} of ${monthRange(c.months)}. Every month is compared on the same days.`
      : (analysis.noComparisonReason ?? 'There is no comparison with earlier months.'),
    'Only flexible spending can be changed here. Housing, bills, health, groceries and transport stay as they are.',
    'A change can’t be larger than what you spent in that category this period.',
    'Money in that Orava can’t classify is not counted as income.',
    'Nothing is moved or saved. Your balance and Orava’s mood stay as they are.',
  ];
  return (
    <View style={s.how}>
      {lines.map((l) => (
        <Text key={l} style={s.muted}>
          • {l}
        </Text>
      ))}
    </View>
  );
}

// ---------- three baskets ----------

function Baskets({ analysis, state }: { analysis: MonthAnalysis; state: OravaState }) {
  const s0 = analysis.snapshot;
  const n = analysis.counts;
  const rows = [
    {
      key: 'regular',
      label: 'Regular essentials',
      hint: 'Housing, bills',
      amount: s0.regular,
      count: n.regular,
    },
    {
      key: 'unexpected',
      label: 'Unexpected necessities',
      hint: 'Health, home & tech',
      amount: s0.unexpected,
      count: n.unexpected,
    },
    {
      key: 'everyday',
      label: 'Everyday spending',
      hint: `Essentials ${whole(s0.everydayEssential)} · Flexible ${whole(s0.flexible)}`,
      amount: s0.everydayEssential + s0.flexible,
      count: n.everydayEssential + n.flexible,
    },
  ];
  if (n.otherOut > 0) {
    rows.push({
      key: 'other',
      label: 'Other money out',
      hint: `Not sorted: ${analysis.unknownOut.join(', ')}. Counted as money out`,
      amount: s0.otherOut,
      count: n.otherOut,
    });
  }
  const max = Math.max(1, ...rows.map((r) => r.amount));
  const txWord = (c: number) => `${c} transaction${c === 1 ? '' : 's'}`;

  return (
    <Card>
      <Text style={s.h2}>Where your money went</Text>
      <View style={{ gap: 12, marginTop: 8 }}>
        {rows.map((r) => (
          <View key={r.key}>
            <View style={s.rowTop}>
              <Text style={s.rowLabel}>{r.label}</Text>
              {r.count > 0 ? (
                <Text style={s.rowAmount}>{whole(r.amount)}</Text>
              ) : (
                <Text style={s.rowNone}>None recorded</Text>
              )}
            </View>
            {r.count > 0 && (
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
            )}
            <Text style={s.muted}>
              {r.hint} · {r.count > 0 ? txWord(r.count) : '0 transactions recorded this period'}
            </Text>
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
        <Text style={s.rowLabel}>
          {state.kept >= 0 ? 'Left after spending' : 'Over your income'}
        </Text>
        <Text style={[s.rowAmount, state.kept < 0 && { color: colors.neg }]}>
          {whole(Math.abs(state.kept))}
        </Text>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  // Extra bottom space: the raised Pay button in the bottom bar overlaps the scroll area.
  body: { padding: 12, paddingBottom: 48, gap: 12 },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backText: { fontSize: 16, color: colors.green, fontWeight: '600' },
  summary: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12 },
  h1: { fontSize: 19, fontWeight: '700', color: colors.green },
  h2: { fontSize: 17, fontWeight: '700', color: colors.green, marginBottom: 2 },
  h3: { fontSize: 15.5, fontWeight: '700', color: colors.green, marginBottom: 2 },
  period: { fontSize: 13, color: colors.ink2, marginTop: 1, marginBottom: 4 },
  reason: { fontSize: 13.5, lineHeight: 19, fontWeight: '500' },
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
  rowNone: { fontSize: 13, color: colors.faint },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
    marginVertical: 4,
    overflow: 'hidden',
  },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.green },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  result: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: colors.greenSoft,
    gap: 4,
  },
  big: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.okInk,
    fontVariant: ['tabular-nums'],
  },
  beforeAfter: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  beforeAfterLabel: { fontSize: 14, fontWeight: '500', color: colors.ink2 },
  secondary: { fontSize: 13, lineHeight: 18, color: colors.ink2 },
  goalLine: { fontSize: 13.5, lineHeight: 19, color: colors.okInk, marginTop: 4 },
  howBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginTop: 2,
  },
  howText: { fontSize: 13.5, fontWeight: '600', color: colors.green },
  how: { gap: 4, paddingBottom: 2 },
});
