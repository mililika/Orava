// The Orava tab: financial health score, the three baskets, and Ask Orava.
// Display only: every number comes from the OravaState and MonthSnapshot passed in.

import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Card } from '../components/ui';
import { basketOf, type Transaction } from '../data/demoAccount';
import { answer, DEMO_REPLY, QUESTIONS, type Answer, type QuestionId } from '../orava/chat';
import { eur } from '../orava/logic';
import { Mascot } from '../orava/Mascot';
import { ALERT_TONES, MOODS } from '../orava/moods';
import type { Mood, MonthSnapshot, OravaAlert, OravaState } from '../orava/types';
import { colors } from '../theme';

type Msg = { mine: true; text: string } | ({ mine: false } & Answer);

export function OravaTab({
  state,
  snapshot,
  monthTxs,
  alert,
  onOpenAlert,
  displayMood,
  lively,
}: {
  state: OravaState;
  snapshot: MonthSnapshot;
  monthTxs: Transaction[];
  /** Orava's current alert, if any, shown at the top. */
  alert: OravaAlert | null;
  onOpenAlert: () => void;
  /** The mood the squirrel shows. Defaults to the real one; the demo panel can override it. */
  displayMood?: Mood;
  /** Full squirrel animation. Defaults to: there's an alert. */
  lively?: boolean;
}) {
  const shown = displayMood ?? state.mood;
  const mood = MOODS[shown];
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);
  // After a new message, show the latest one just above the input.
  const toEnd = () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);

  const baskets = useMemo(() => summarize(monthTxs), [monthTxs]);

  const ask = (id: QuestionId, q: string) => {
    setMsgs((m) => [
      ...m,
      { mine: true, text: q },
      { mine: false, ...answer(id, snapshot, state, baskets.topSlip, monthTxs.length) },
    ]);
    toEnd();
  };
  const send = () => {
    const q = draft.trim();
    if (!q) return;
    setDraft('');
    setMsgs((m) => [...m, { mine: true, text: q }, { mine: false, ...DEMO_REPLY }]);
    toEnd();
  };

  const slipsMax = Math.max(snapshot.everydaySlips, snapshot.everydaySlipsBaseline) * 1.15 || 1;
  const income = snapshot.income || 1;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        keyboardShouldPersistTaps="handled"
      >
        {alert && <AlertCard alert={alert} onPress={onOpenAlert} />}

        <Card style={[s.hero, shown === 'alert' && s.heroAlert]}>
          <Mascot mood={shown} size={112} lively={lively ?? !!alert} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={s.scoreRow}>
              <Text style={s.score}>{state.score}</Text>
              <Text style={s.scoreOf}>/ 100</Text>
              <View style={[s.moodTag, { backgroundColor: mood.bg }]}>
                <Text style={[s.moodText, { color: mood.fg }]}>{mood.name}</Text>
              </View>
            </View>
            <Text style={s.message}>{state.message}</Text>
          </View>
        </Card>

        <View style={s.stats}>
          <Stat
            label="Safe to spend"
            value={(state.safeThisWeek < 0 ? '−' : '') + eur(state.safeThisWeek)}
            sub="this week"
            status={state.safeThisWeek >= 50 ? 'ok' : state.safeThisWeek >= 0 ? 'warn' : 'bad'}
            statusText={
              state.safeThisWeek >= 50 ? 'On track' : state.safeThisWeek >= 0 ? 'Tight' : 'Over'
            }
          />
          <Stat
            label="Kept"
            value={`${Math.round(state.savingRate * 100)}%`}
            sub="of income"
            status={state.savingRate >= 0.2 ? 'ok' : state.savingRate >= 0.1 ? 'warn' : 'bad'}
            statusText={
              state.savingRate >= 0.2 ? 'On track' : state.savingRate >= 0.1 ? 'Low' : 'Very low'
            }
          />
          <Stat
            label="Everyday slips"
            value={eur(snapshot.everydaySlips)}
            sub={`${state.slipsDeltaPct >= 0 ? '+' : '−'}${Math.abs(state.slipsDeltaPct)}% vs usual`}
            status={state.slipsDeltaPct <= 15 ? 'ok' : state.slipsDeltaPct <= 60 ? 'warn' : 'bad'}
            statusText={
              state.slipsDeltaPct <= 15
                ? 'Usual'
                : state.slipsDeltaPct <= 60
                  ? 'Above usual'
                  : 'Way up'
            }
          />
        </View>

        <Text style={s.h2}>YOUR THREE BASKETS · THIS MONTH</Text>
        <Card style={{ paddingVertical: 4 }}>
          <BasketRow
            name="Regular must-pays"
            amount={snapshot.mustPayRegular}
            fill={snapshot.mustPayRegular / income}
            color={colors.green}
            note={`${baskets.regularCount} payments: rent, utilities · ${Math.round((snapshot.mustPayRegular / income) * 100)}% of income`}
          />
          <BasketRow
            name="Surprise costs"
            amount={snapshot.mustPaySurprises}
            fill={snapshot.mustPaySurprises / income}
            color="#6E9B7A"
            note={
              baskets.biggestSurprise
                ? `${baskets.surpriseCount} this month · biggest: ${baskets.biggestSurprise.merchant} ${eur(baskets.biggestSurprise.amount)}`
                : 'None this month'
            }
          />
          <BasketRow
            name="Everyday slips"
            amount={snapshot.everydaySlips}
            fill={snapshot.everydaySlips / slipsMax}
            marker={snapshot.everydaySlipsBaseline / slipsMax}
            color={state.slipsDeltaPct > 15 ? '#D99A2B' : '#6E9B7A'}
            note={`${state.slipsDeltaPct >= 0 ? '+' : '−'}${Math.abs(state.slipsDeltaPct)}% vs your usual ${eur(snapshot.everydaySlipsBaseline)}${baskets.topSlip ? ` · mostly ${baskets.topSlip.category.toLowerCase()}` : ''}`}
            last
          />
        </Card>

        <Text style={s.h2}>ASK ORAVA</Text>
        <View style={{ gap: 8 }} role="log" aria-live="polite">
          {msgs.slice(-6).map((m, i) =>
            m.mine ? (
              <View key={i} style={s.mine}>
                <Text style={s.mineText}>{m.text}</Text>
              </View>
            ) : (
              <View key={i} style={s.theirsRow}>
                <Mascot mood={shown} size={32} />
                <View style={s.theirs}>
                  <Text style={s.theirsText}>{m.text}</Text>
                  <Text style={s.basis}>{m.basis}</Text>
                </View>
              </View>
            ),
          )}
        </View>
        <View style={s.chips}>
          {QUESTIONS.map((q) => (
            <Pressable key={q.id} onPress={() => ask(q.id, q.q)} style={s.chip} role="button">
              <Text style={s.chipText}>{q.q}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={s.inputBar}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
          placeholder="Ask about your money…"
          placeholderTextColor={colors.faint}
          aria-label="Ask Orava a question"
          returnKeyType="send"
          style={s.input}
        />
        <Pressable onPress={send} style={s.send} role="button" aria-label="Send">
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="#fff"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function AlertCard({ alert, onPress }: { alert: OravaAlert; onPress: () => void }) {
  const tone = ALERT_TONES[alert.kind];
  return (
    <Pressable
      onPress={onPress}
      role="button"
      style={[s.alert, { backgroundColor: tone.bg, borderColor: tone.border }]}
    >
      <Text style={[s.alertTitle, { color: tone.fg }]}>{alert.title}</Text>
      <Text style={s.alertText}>{alert.text}</Text>
      {alert.kind === 'fraud' && (
        <Text style={[s.alertCta, { color: tone.fg }]}>Check the payment ›</Text>
      )}
    </Pressable>
  );
}

const STATUS = {
  ok: { bg: '#E2F0E4', fg: '#1E6A38' },
  warn: { bg: '#FCEBCF', fg: '#7A4A00' },
  bad: { bg: '#FBE0DC', fg: '#A3261A' },
};

function Stat(p: {
  label: string;
  value: string;
  sub: string;
  status: keyof typeof STATUS;
  statusText: string;
}) {
  const c = STATUS[p.status];
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{p.label}</Text>
      <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {p.value}
      </Text>
      <Text style={s.statSub}>{p.sub}</Text>
      <View style={[s.status, { backgroundColor: c.bg }]}>
        <Text style={[s.statusText, { color: c.fg }]}>{p.statusText}</Text>
      </View>
    </View>
  );
}

function BasketRow(p: {
  name: string;
  amount: number;
  fill: number;
  marker?: number;
  color: string;
  note: string;
  last?: boolean;
}) {
  return (
    <View style={[s.basket, !p.last && s.basketBorder]}>
      <View style={s.basketTop}>
        <Text style={s.basketName}>{p.name}</Text>
        <Text style={s.basketAmt}>{eur(p.amount)}</Text>
      </View>
      <View style={s.track}>
        <View
          style={[s.bar, { width: `${Math.min(100, p.fill * 100)}%`, backgroundColor: p.color }]}
        />
        {p.marker !== undefined && (
          <View style={[s.marker, { left: `${Math.min(100, p.marker * 100)}%` }]} />
        )}
      </View>
      <Text style={s.basketNote}>{p.note}</Text>
    </View>
  );
}

/** Counts and biggest items per basket, for the notes under each bar. */
function summarize(txs: Transaction[]) {
  let regularCount = 0;
  let surpriseCount = 0;
  let biggestSurprise: { merchant: string; amount: number } | null = null;
  const slipsByCat = new Map<string, number>();
  for (const t of txs) {
    if (t.amount >= 0) continue;
    const b = basketOf(t.category);
    if (b === 'mustPayRegular') regularCount++;
    if (b === 'mustPaySurprises') {
      surpriseCount++;
      if (!biggestSurprise || -t.amount > biggestSurprise.amount)
        biggestSurprise = { merchant: t.merchant, amount: -t.amount };
    }
    if (b === 'everydaySlips')
      slipsByCat.set(t.category, (slipsByCat.get(t.category) ?? 0) + -t.amount);
  }
  let topSlip: { category: string; amount: number } | null = null;
  for (const [category, amount] of slipsByCat)
    if (!topSlip || amount > topSlip.amount) topSlip = { category, amount };
  return { regularCount, surpriseCount, biggestSurprise, topSlip };
}

const s = StyleSheet.create({
  body: { padding: 12, paddingBottom: 16, gap: 12 },
  alert: { borderWidth: 2, borderRadius: 16, padding: 14, gap: 4 },
  alertTitle: { fontSize: 16, fontWeight: '800' },
  alertText: { fontSize: 14.5, lineHeight: 20, color: colors.ink },
  alertCta: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18 },
  heroAlert: { borderWidth: 2, borderColor: '#C4321F' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  score: { fontSize: 30, fontWeight: '800', color: colors.ink },
  scoreOf: { fontSize: 14, color: colors.ink2 },
  moodTag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 4 },
  moodText: { fontWeight: '700', fontSize: 13 },
  message: { fontSize: 15, lineHeight: 21, color: colors.ink },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minWidth: 0, backgroundColor: '#fff', borderRadius: 14, padding: 10, gap: 2 },
  statLabel: { fontSize: 12, color: colors.ink2, fontWeight: '500' },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
  statSub: { fontSize: 11, color: colors.ink2 },
  status: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  h2: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.ink2,
    marginTop: 6,
    marginHorizontal: 4,
  },
  basket: { paddingVertical: 10, gap: 6 },
  basketBorder: { borderBottomWidth: 1, borderBottomColor: '#EEF2EE' },
  basketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  basketName: { fontSize: 15, fontWeight: '600', color: colors.ink },
  basketAmt: { fontSize: 15, fontWeight: '700', color: colors.ink },
  track: { height: 6, borderRadius: 3, backgroundColor: '#E7EEE8' },
  bar: { height: 6, borderRadius: 3 },
  marker: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 12,
    marginLeft: -1,
    backgroundColor: '#36483A',
  },
  basketNote: { fontSize: 12, color: colors.ink2 },
  mine: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    backgroundColor: colors.green,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  mineText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  theirsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '90%' },
  theirs: {
    flexShrink: 1,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    gap: 6,
  },
  theirsText: { fontSize: 15, lineHeight: 21, color: colors.ink },
  basis: { fontSize: 12, color: colors.ink2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: '#fff',
    borderRadius: 999,
  },
  chipText: { color: colors.green, fontSize: 14, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E3EAE4',
  },
  input: {
    flex: 1,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#C9D6CC',
    borderRadius: 999,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: '#fff',
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
