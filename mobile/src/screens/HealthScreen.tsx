// Money health: Orava's verdict and score (with an ⓘ dropdown explaining it), three key numbers,
// where money goes with a what-if, regular payments, surprises and plan ahead. Ask Orava is
// pinned to the bottom.
// Display only; every number comes from buildHealth() in src/orava/health.ts.

import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '../components/AppChrome';
import { MonthStepper } from '../components/History';
import { Icon } from '../components/Icon';
import { MonthSplit } from '../components/MonthSplit';
import { OravaChat } from '../components/OravaChat';
import { OravaInsight } from '../components/OravaInsight';
import { RecurringCard } from '../components/RecurringCard';
import { ScoreInfo } from '../components/ScoreInfo';
import { Card } from '../components/ui';
import { WhatIf } from '../components/WhatIf';
import { buildHealth, type HealthReport, type Stat, type Tone } from '../orava/health';
import { monthRange } from '../orava/history';
import { Mascot } from '../orava/Mascot';
import { MOODS } from '../orava/moods';
import type { Mood } from '../orava/types';
import { useOverview } from '../orava/overview';
import { colors, radius } from '../theme';

/**
 * Colour of the big number on the three key-number cards (white cards): green = good,
 * ink = neutral, orange = warning, red = big problem. Dark enough to read on white; the verdict
 * is also read out, so colour isn't the only signal.
 */
const VALUE_COLOR: Record<Tone, string> = {
  good: '#1f7a43',
  neutral: colors.ink,
  warn: '#b45f12',
  bad: '#c0322b',
};

/** Score number colour per mood: the squirrel design colours, a touch darker where needed to read on white. */
const SCORE_COLOR: Record<Mood, string> = {
  happy: '#2E9B5F',
  okay: '#B07818',
  worried: '#C4561D',
  alert: '#C8323A',
};

export function HealthScreen({
  user,
  report: latest,
  onBack,
}: {
  /** Username: the AI overview cache is per user. */
  user: string;
  report: HealthReport;
  onBack: () => void;
}) {
  const [info, setInfo] = useState(false);
  const { first, last } = useMemo(() => monthRange(latest.txs), [latest]);
  const [month, setMonth] = useState(last);
  // The whole screen, score included, as it was at the end of the chosen month: the score looks
  // at the 3 months up to then, and the balance is what it was then.
  const report = useMemo(() => {
    if (month >= last) return latest;
    const txs = latest.txs.filter((t) => t.date.slice(0, 7) <= month);
    const after = latest.txs
      .filter((t) => t.date.slice(0, 7) > month)
      .reduce((a, t) => a + t.amount, 0);
    return buildHealth(txs, latest.balance - after, { finished: true });
  }, [latest, month, last]);
  const { orava, score } = report;
  const { overview, loading } = useOverview(user, month, report, month >= last);
  const mood = MOODS[orava.mood];

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Money health" left={{ icon: 'back', label: 'Back', onPress: onBack }} />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <MonthStepper month={month} first={first} last={last} onChange={setMonth} />

        <Card>
          <Text style={s.period}>{report.period}</Text>
          <View style={s.hero}>
            <Mascot mood={orava.mood} size={110} />
            <View style={s.heroText}>
              {report.partial ? <Text style={s.variant}>Spending account score</Text> : null}
              <View style={s.scoreRow}>
                <Text
                  style={[s.score, { color: SCORE_COLOR[orava.mood] }]}
                  accessibilityLabel={`Score ${score.score} out of 100, ${mood.name}`}
                >
                  {score.score}
                </Text>
                <Text style={s.scoreOf}>/ 100</Text>
                <Pressable
                  onPress={() => setInfo((v) => !v)}
                  role="button"
                  aria-expanded={info}
                  accessibilityLabel={info ? 'Hide how the score works' : 'How the score works'}
                  hitSlop={10}
                  style={({ pressed }) => [
                    s.infoBtn,
                    info && s.infoOn,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Icon
                    name="info"
                    size={20}
                    color={info ? '#fff' : colors.green}
                    strokeWidth={2}
                  />
                </Pressable>
              </View>
              {overview?.summary ? <Text style={s.message}>{overview.summary}</Text> : null}
              {report.partial ? (
                <Text style={s.note}>
                  Salary moves to another bank, so this account is scored on spending.
                </Text>
              ) : null}
            </View>
          </View>
          {overview ? (
            <View style={s.insight}>
              <OravaInsight overview={overview} />
            </View>
          ) : loading ? (
            <Text style={s.loading}>Orava is thinking…</Text>
          ) : null}
          {info ? <ScoreInfo score={score} /> : null}
        </Card>

        <View style={s.grid}>
          {report.stats.map((x) => (
            <StatCard key={x.key} stat={x} />
          ))}
        </View>

        <Section title={report.partial ? 'Where your salary goes' : 'Where money goes'} />
        <MonthSplit m={report.thisMonth} past={month < last} />
        {report.partial ? null : (
          <WhatIf
            months={report.months}
            balance={report.balance}
            regular={regularByCategory(report)}
          />
        )}

        <RecurringCard r={report.recurring} />
      </ScrollView>
      <OravaChat report={report} />
    </KeyboardAvoidingView>
  );
}

/** Typical monthly amount of the regular payments, per category. */
function regularByCategory(r: HealthReport) {
  const by: Record<string, number> = {};
  for (const i of r.recurring.items) by[i.category] = (by[i.category] ?? 0) + i.monthly;
  return by;
}

function Section({ title }: { title: string }) {
  return <Text style={s.section}>{title}</Text>;
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <View
      style={s.stat}
      accessible
      accessibilityLabel={`${stat.label}: ${stat.value} ${stat.sub}. ${stat.tag.text}`}
    >
      <Text style={s.statLabel} numberOfLines={1}>
        {stat.label}
      </Text>
      <Text
        style={[s.statValue, { color: VALUE_COLOR[stat.tag.tone] }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {stat.value}
      </Text>
      <Text style={s.statSub} numberOfLines={1}>
        {stat.sub}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mint },
  body: { padding: 12, gap: 10, paddingBottom: 24 },
  period: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  variant: { fontSize: 12, fontWeight: '700', color: colors.green, letterSpacing: 0.3 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  heroText: { flex: 1, gap: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  score: { fontSize: 44, fontWeight: '800', color: colors.ink },
  scoreOf: { fontSize: 15, color: colors.ink2, marginRight: 2, marginTop: 14 },
  infoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  infoOn: { backgroundColor: colors.green },
  message: { fontSize: 15, lineHeight: 21, color: colors.ink },
  note: { fontSize: 12.5, lineHeight: 17, color: colors.ink2 },
  insight: { marginTop: 10 },
  loading: { marginTop: 8, fontSize: 12.5, fontStyle: 'italic', color: colors.ink2 },
  grid: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: 10,
    gap: 2,
  },
  statLabel: { fontSize: 12.5, lineHeight: 16, color: colors.ink2 },
  statValue: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: colors.ink },
  statSub: { fontSize: 12, lineHeight: 16, color: colors.faint },
  section: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.green,
    marginHorizontal: 4,
    marginTop: 8,
  },
});
