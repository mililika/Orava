// Money health: Orava's verdict, four glanceable tiles, what's safe to spend, and where money goes.
// Display only; every number comes from buildHealth() in src/orava/health.ts.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '../components/AppChrome';
import { Icon } from '../components/Icon';
import { MoneyFlowVariants } from '../components/MoneyFlowVariants';
import { SpeechBubble } from '../components/SpeechBubble';
import { Card } from '../components/ui';
import type { HealthReport, SafeToSpend, Status, Tile } from '../orava/health';
import { Mascot } from '../orava/Mascot';
import { MOODS } from '../orava/moods';
import { colors, eur, radius } from '../theme';

const STATUS_COLOR: Record<Status, string> = {
  good: colors.green2,
  watch: '#e08a1e',
  alert: colors.neg,
};
const STATUS_WORD: Record<Status, string> = {
  good: 'healthy',
  watch: 'keep an eye',
  alert: 'needs care',
};

export function HealthScreen({ report, onBack }: { report: HealthReport; onBack: () => void }) {
  const { orava } = report;
  const mood = MOODS[orava.mood];
  const [openTile, setOpenTile] = useState<Tile['key'] | null>(null);
  const note = report.tiles.find((t) => t.key === openTile)?.note;

  return (
    <View style={s.screen}>
      <AppHeader title="Money health" left={{ icon: 'back', label: 'Back', onPress: onBack }} />
      <ScrollView contentContainerStyle={s.body}>
        <Card>
          <Text style={s.period}>{report.period}</Text>
          <View style={s.hero}>
            <View style={{ alignItems: 'center' }}>
              <Mascot mood={orava.mood} size={104} />
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
        </Card>

        <View style={s.grid}>
          {report.tiles.map((t) => (
            <TileView
              key={t.key}
              t={t}
              on={openTile === t.key}
              onPress={() => setOpenTile(openTile === t.key ? null : t.key)}
            />
          ))}
        </View>
        {note ? <Text style={s.tileNote}>{note}</Text> : null}

        <Text style={s.section}>Safe to spend</Text>
        <SafeCard safe={report.safe} />

        <MoneyFlowVariants report={report} />
      </ScrollView>
    </View>
  );
}

function TileView({ t, on, onPress }: { t: Tile; on: boolean; onPress: () => void }) {
  const color = STATUS_COLOR[t.status];
  return (
    <Pressable
      onPress={onPress}
      role="button"
      accessibilityLabel={`${t.label}: ${t.value} ${t.unit ?? ''}, ${STATUS_WORD[t.status]}. ${t.note}`}
      style={({ pressed }) => [s.tile, on && s.tileOn, pressed && { opacity: 0.85 }]}
    >
      <View style={s.tileHead}>
        <Text style={s.tileLabel}>{t.label}</Text>
        <View style={[s.dot, { backgroundColor: color }]} />
      </View>
      <Text style={s.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {t.value}
        {t.unit ? <Text style={s.tileUnit}> {t.unit}</Text> : null}
      </Text>
      <View style={s.track}>
        <View
          style={[s.fill, { width: `${Math.max(3, t.progress * 100)}%`, backgroundColor: color }]}
        />
      </View>
    </Pressable>
  );
}

function SafeCard({ safe }: { safe: SafeToSpend }) {
  const [open, setOpen] = useState(false);
  const over = safe.today.left < 0;
  const lastDay = safe.daysLeft <= 1;
  const short = safe.goal - safe.forecastKept;

  const forecast =
    safe.forecastKept < 0
      ? `At this pace you’ll spend ${eur(-safe.forecastKept, 0)} more than comes in this month.`
      : short > 0
        ? `At this pace you’ll keep ${eur(safe.forecastKept, 0)} this month, ${eur(short, 0)} short of your ${eur(safe.goal, 0)} goal.`
        : `At this pace you’ll keep ${eur(safe.forecastKept, 0)} this month, above your ${eur(safe.goal, 0)} goal.`;

  return (
    <Card style={{ gap: 14 }}>
      <View style={s.safeRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.safeLabel}>Today</Text>
          <Text style={[s.safeBig, over && { color: colors.neg }]}>
            {eur(Math.max(0, safe.today.left), 0)}
          </Text>
          <Text style={s.safeSub}>
            {over
              ? `${eur(-safe.today.left, 0)} over today’s ${eur(safe.today.budget, 0)}`
              : `of ${eur(safe.today.budget, 0)} left`}
          </Text>
        </View>
        <View style={s.safeDivider} />
        <View style={{ flex: 1 }}>
          <Text style={s.safeLabel}>Rest of {safe.monthName}</Text>
          <Text style={[s.safeBig, safe.left < 0 && { color: colors.neg }]}>
            {lastDay ? eur(safe.left, 0) : `${eur(safe.perDayAfter, 0)}`}
            {!lastDay && <Text style={s.safeUnit}> /day</Text>}
          </Text>
          <Text style={s.safeSub}>
            {lastDay
              ? 'last day of the month'
              : `${eur(safe.left, 0)} for ${safe.daysLeft - 1} ${safe.daysLeft - 1 === 1 ? 'day' : 'days'}`}
          </Text>
        </View>
      </View>

      <View style={[s.forecast, short > 0 && { backgroundColor: colors.warnBg }]}>
        <Icon name="acorn" size={18} color={short > 0 ? colors.warn : colors.green} />
        <Text style={[s.forecastText, short > 0 && { color: colors.warnInk }]}>{forecast}</Text>
      </View>

      <Pressable onPress={() => setOpen(!open)} role="button" style={s.howHead}>
        <Text style={s.howLink}>How is this worked out?</Text>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <Icon name="chevron" size={16} color={colors.green} strokeWidth={2.2} />
        </View>
      </Pressable>
      {open && (
        <View style={s.how}>
          <Line
            label={safe.incomeExpected > 0 ? 'Income (salary expected)' : 'Income'}
            value={safe.income}
          />
          <Line
            label={safe.billsUpcoming > 0 ? 'Bills (incl. still coming)' : 'Rent & bills'}
            value={-safe.bills}
          />
          <Line label={`Savings goal (${Math.round(safe.goalRate * 100)}%)`} value={-safe.goal} />
          <Line label="Spent so far" value={-safe.spent} />
          <View style={s.howRule} />
          <Line label="Safe to spend" value={safe.left} strong />
          <Text style={s.howFoot}>
            {lastDay
              ? 'Today is the last day of the month.'
              : `Split evenly over the ${safe.daysLeft} days left, today included.`}
          </Text>
        </View>
      )}
    </Card>
  );
}

function Line({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <View style={s.line}>
      <Text style={[s.lineLabel, strong && s.lineStrong]}>{label}</Text>
      <Text style={[s.lineValue, strong && s.lineStrong]}>
        {value < 0 ? '− ' : ''}
        {eur(Math.abs(value), 0)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mint },
  body: { padding: 12, gap: 10, paddingBottom: 32 },
  period: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  hero: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  moodTag: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3, marginTop: 2 },
  moodText: { fontWeight: '700', fontSize: 13 },
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
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  tileOn: { borderColor: colors.green2 },
  tileHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileLabel: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tileValue: { fontSize: 28, fontWeight: '800', color: colors.ink },
  tileUnit: { fontSize: 13, fontWeight: '600', color: colors.faint },
  track: { height: 6, borderRadius: 3, backgroundColor: '#edf2ee', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  tileNote: { fontSize: 13, lineHeight: 18, color: colors.ink2, marginHorizontal: 4 },

  safeRow: { flexDirection: 'row', alignItems: 'stretch' },
  safeDivider: { width: 1, backgroundColor: colors.line, marginHorizontal: 14 },
  safeLabel: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  safeBig: { fontSize: 30, fontWeight: '800', color: colors.ink, marginTop: 2 },
  safeUnit: { fontSize: 14, fontWeight: '600', color: colors.faint },
  safeSub: { fontSize: 12.5, color: colors.faint, marginTop: 2 },
  forecast: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: colors.okBg,
    borderRadius: 8,
    padding: 10,
  },
  forecastText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: colors.okInk },
  howHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  howLink: { fontSize: 14, fontWeight: '600', color: colors.green },
  how: { gap: 8 },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  lineLabel: { fontSize: 14, color: colors.ink2 },
  lineValue: { fontSize: 14, color: colors.ink, fontVariant: ['tabular-nums'] },
  lineStrong: { fontWeight: '800', color: colors.ink },
  howRule: { height: 1, backgroundColor: colors.line },
  howFoot: { fontSize: 12, color: colors.faint, lineHeight: 16 },
});
