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
import { RecurringCard } from '../components/RecurringCard';
import { ScoreInfo } from '../components/ScoreInfo';
import { Card } from '../components/ui';
import { WhatIf } from '../components/WhatIf';
import { buildHealth, type HealthReport, type Stat, type Tone } from '../orava/health';
import { monthRange } from '../orava/history';
import { Mascot } from '../orava/Mascot';
import { MOODS } from '../orava/moods';
import { colors, radius } from '../theme';

/** Tag colours: green = good, gray = neutral, orange = warning, red = big problem. */
const TONE: Record<Tone, { bg: string; fg: string }> = {
  good: { bg: '#e0f0e4', fg: '#1b6a37' },
  neutral: { bg: '#eceeec', fg: '#4a4f4b' },
  warn: { bg: '#fdebd0', fg: '#7a4a05' },
  bad: { bg: '#fde0dd', fg: '#a3201a' },
};

export function HealthScreen({
  report: latest,
  onBack,
}: {
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
                <Text style={s.score}>{score.score}</Text>
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
              <View style={[s.moodPill, { backgroundColor: mood.bg }]}>
                <Text style={[s.moodText, { color: mood.fg }]}>{mood.name}</Text>
              </View>
              <Text style={s.message}>{orava.message}</Text>
              {report.partial ? (
                <Text style={s.note}>
                  Salary moves to another bank, so this account is scored on spending.
                </Text>
              ) : null}
            </View>
          </View>
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

function Tag({ text, tone }: { text: string; tone: Tone }) {
  return (
    <View style={[s.tag, { backgroundColor: TONE[tone].bg }]}>
      <Text style={[s.tagText, { color: TONE[tone].fg }]}>{text}</Text>
    </View>
  );
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
      <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {stat.value}
      </Text>
      <Text style={s.statSub} numberOfLines={1}>
        {stat.sub}
      </Text>
      <Tag text={stat.tag.text} tone={stat.tag.tone} />
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
  moodPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  moodText: { fontSize: 12.5, fontWeight: '700' },
  message: { fontSize: 15, lineHeight: 21, color: colors.ink },
  note: { fontSize: 12.5, lineHeight: 17, color: colors.ink2 },
  tag: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontSize: 12, fontWeight: '700' },
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
  statSub: { fontSize: 12, lineHeight: 16, color: colors.faint, marginBottom: 6 },
  section: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.green,
    marginHorizontal: 4,
    marginTop: 8,
  },
});
