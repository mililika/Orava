// Money health: Orava's verdict, three score cards with status tags, and where the money goes.
// Display only; every number comes from buildHealth() in src/orava/health.ts.

import { useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';

import { AppHeader } from '../components/AppChrome';
import { ChatInput, ChatMessages, useOravaChat } from '../components/OravaChat';
import { SplitChart } from '../components/SplitChart';
import { Card } from '../components/ui';
import type { HealthReport, Stat, Tone } from '../orava/health';
import { Mascot } from '../orava/Mascot';
import type { Mood } from '../orava/types';
import { colors, radius } from '../theme';

/** Tag colours: green = good, gray = neutral, orange = warning, red = big problem. */
const TONE: Record<Tone, { bg: string; fg: string }> = {
  good: { bg: '#e0f0e4', fg: '#1b6a37' },
  neutral: { bg: '#eceeec', fg: '#4a4f4b' },
  warn: { bg: '#fdebd0', fg: '#7a4a05' },
  bad: { bg: '#fde0dd', fg: '#a3201a' },
};

export function HealthScreen({
  report,
  onBack,
  mood,
}: {
  report: HealthReport;
  onBack: () => void;
  /** The mood the squirrel shows. Defaults to the report's; the demo panel can override it. */
  mood?: Mood;
}) {
  const { orava } = report;
  const scroll = useRef<ScrollViewInstance>(null);
  // After a new message, scroll so the latest answer sits just above the input bar.
  const chat = useOravaChat(report, () =>
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50),
  );

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Money health" left={{ icon: 'back', label: 'Back', onPress: onBack }} />
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Text style={s.period}>{report.period}</Text>
          <View style={s.hero}>
            <Mascot mood={mood ?? orava.mood} size={110} />
            <View style={s.heroText}>
              <View style={s.scoreRow}>
                <Text style={s.score}>{orava.score}</Text>
                <Text style={s.scoreOf}>/ 100</Text>
              </View>
              <Text style={s.message}>{orava.message}</Text>
            </View>
          </View>
        </Card>

        <View style={s.grid}>
          {report.stats.map((x) => (
            <StatCard key={x.key} stat={x} />
          ))}
        </View>

        <Text style={s.section}>Where money goes</Text>
        <SplitChart parts={report.split} income={report.income} />

        <Text style={s.section}>Ask Orava</Text>
        <ChatMessages chat={chat} />
      </ScrollView>
      <ChatInput chat={chat} />
    </KeyboardAvoidingView>
  );
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
      <Text style={s.statLabel}>{stat.label}</Text>
      <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {stat.value}
      </Text>
      <Text style={s.statSub}>{stat.sub}</Text>
      <Tag text={stat.tag.text} tone={stat.tag.tone} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mint },
  body: { padding: 12, gap: 10, paddingBottom: 16 },
  period: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  heroText: { flex: 1, gap: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 },
  score: { fontSize: 44, fontWeight: '800', color: colors.ink },
  scoreOf: { fontSize: 15, color: colors.ink2, marginRight: 4 },
  message: { fontSize: 15, lineHeight: 21, color: colors.ink },
  tag: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  tagText: { fontSize: 13, fontWeight: '700' },
  grid: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: 12,
    gap: 3,
  },
  statLabel: { fontSize: 12.5, color: colors.ink2 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.ink },
  statSub: { fontSize: 12, color: colors.ink2, marginBottom: 6 },
  section: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.green,
    marginHorizontal: 4,
    marginTop: 8,
  },
});
