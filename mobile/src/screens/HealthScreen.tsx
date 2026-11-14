// Money health: Orava's verdict, four key numbers, and where the money goes.
// Display only; every number comes from buildHealth() in src/orava/health.ts.

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '../components/AppChrome';
import { Icon, type IconName } from '../components/Icon';
import { SpeechBubble } from '../components/SpeechBubble';
import { SpendingChart } from '../components/SpendingChart';
import { Card } from '../components/ui';
import { categoryInfo } from '../data/categories';
import type { HealthReport, Metric, Status } from '../orava/health';
import { Mascot } from '../orava/Mascot';
import { MOODS } from '../orava/moods';
import { colors, eur, radius } from '../theme';

const STATUS: Record<Status, { label: string; icon: IconName; fg: string; bg: string }> = {
  good: { label: 'Healthy', icon: 'check', fg: colors.okInk, bg: colors.okBg },
  watch: { label: 'Keep an eye', icon: 'pulse', fg: colors.warnInk, bg: colors.warnBg },
  alert: { label: 'Needs care', icon: 'bolt', fg: colors.neg, bg: colors.negBg },
};

export function HealthScreen({ report, onBack }: { report: HealthReport; onBack: () => void }) {
  const { orava } = report;
  const mood = MOODS[orava.mood];
  const top = report.breakdown[0];

  return (
    <View style={s.screen}>
      <AppHeader title="Money health" left={{ icon: 'back', label: 'Back', onPress: onBack }} />
      <ScrollView contentContainerStyle={s.body}>
        <Card>
          <View style={s.heroTop}>
            <Text style={s.period}>{report.period}</Text>
            <Text style={s.score}>
              {orava.score}
              <Text style={s.scoreOf}> / 100</Text>
            </Text>
          </View>
          <View style={s.hero}>
            <View style={{ alignItems: 'center' }}>
              <Mascot mood={orava.mood} size={120} />
              <View style={[s.moodTag, { backgroundColor: mood.bg }]}>
                <Text style={[s.moodText, { color: mood.fg }]}>{mood.name}</Text>
              </View>
            </View>
            <SpeechBubble
              tail="left"
              who={mood.who}
              color={mood.color}
              text={orava.message}
              style={{ flex: 1, marginLeft: 12, marginRight: 4 }}
            />
          </View>
          <View style={s.scoreTrack}>
            <View style={[s.scoreBar, { width: `${orava.score}%` }]} />
          </View>
          <Text style={s.scoreLabel}>Health score</Text>
        </Card>

        <Text style={s.section}>Key numbers</Text>
        <View style={s.grid}>
          {report.metrics.map((m) => (
            <MetricTile key={m.key} m={m} />
          ))}
        </View>

        <Text style={s.section}>Where your money goes</Text>
        <Card>
          {top ? (
            <Text style={s.headline}>
              {categoryInfo(top.category).name} takes{' '}
              <Text style={s.headlineStrong}>€{Math.round(top.share * 100)}</Text> of every €100 you
              spend.
            </Text>
          ) : null}
          <SpendingChart slices={report.breakdown} />
          <View style={s.totals}>
            <Text style={s.total}>Spent {eur(report.spending, 0)}</Text>
            <Text style={s.total}>Income {eur(report.income, 0)}</Text>
          </View>
        </Card>
        <Text style={s.foot}>
          Shares of all money out in {report.period}. Tap a bar to see the amount.
        </Text>
      </ScrollView>
    </View>
  );
}

function MetricTile({ m }: { m: Metric }) {
  const st = STATUS[m.status];
  return (
    <View style={s.tile}>
      <Text style={s.tileLabel}>{m.label}</Text>
      <Text style={s.tileValue}>{m.value}</Text>
      <View style={[s.chip, { backgroundColor: st.bg }]}>
        <Icon name={st.icon} size={13} color={st.fg} strokeWidth={2.2} />
        <Text style={[s.chipText, { color: st.fg }]}>{st.label}</Text>
      </View>
      <Text style={s.tileNote}>{m.note}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mint },
  body: { padding: 12, gap: 10, paddingBottom: 32 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  period: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  score: { fontSize: 24, fontWeight: '800', color: colors.ink },
  scoreOf: { fontSize: 13, fontWeight: '500', color: colors.ink2 },
  hero: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  moodTag: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3, marginTop: 2 },
  moodText: { fontWeight: '700', fontSize: 13 },
  scoreTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#edf2ee',
    marginTop: 14,
    overflow: 'hidden',
  },
  scoreBar: { height: 8, borderRadius: 4, backgroundColor: colors.green2 },
  scoreLabel: { fontSize: 11.5, color: colors.faint, marginTop: 4 },
  section: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.green,
    marginHorizontal: 4,
    marginTop: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: 14,
    flexGrow: 1,
    flexBasis: '45%',
    gap: 4,
  },
  tileLabel: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  tileValue: { fontSize: 28, fontWeight: '800', color: colors.ink },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  tileNote: { fontSize: 12, lineHeight: 16, color: colors.ink2, marginTop: 4 },
  headline: { fontSize: 15, lineHeight: 21, color: colors.ink, marginBottom: 10 },
  headlineStrong: { fontWeight: '800', color: colors.green },
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 8,
    paddingTop: 10,
  },
  total: { fontSize: 13, color: colors.ink2, fontWeight: '600' },
  foot: { fontSize: 11.5, color: colors.faint, marginHorizontal: 4, lineHeight: 16 },
});
