// The Orava card on the home screen. It only displays an OravaState;
// it never decides the mood itself (that lives in src/orava/logic.ts).

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mascot } from '../orava/Mascot';
import { MOODS } from '../orava/moods';
import type { OravaState } from '../orava/types';
import { colors } from '../theme';
import { Card, Pill } from './ui';

export interface DemoActions {
  eatOut: () => void;
  jacket: () => void;
  sideGig: () => void;
  reset: () => void;
}

export function OravaCard({ state, demo }: { state: OravaState; demo: DemoActions }) {
  const [open, setOpen] = useState(false);
  const mood = MOODS[state.mood];

  return (
    <Card>
      <View style={s.top}>
        <Text style={s.title}>Orava</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>NEW</Text>
        </View>
        <Text style={s.score}>
          {state.score}
          <Text style={s.scoreOf}> / 100</Text>
        </Text>
      </View>

      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={s.hero}
        role="button"
        accessibilityHint="Shows why Orava feels this way"
      >
        <Mascot mood={state.mood} size={140} />
        <View style={[s.moodTag, { backgroundColor: mood.bg }]}>
          <Text style={[s.moodText, { color: mood.fg }]}>{mood.name}</Text>
        </View>
        <Text style={s.message}>{state.message}</Text>
        <Text style={s.hint}>{open ? 'Hide reasons' : 'Tap Orava to see why'}</Text>
      </Pressable>

      {open && (
        <View style={[s.reasons, { backgroundColor: mood.bg }]}>
          {state.reasons.map((r) => (
            <Text key={r} style={[s.reason, { color: mood.fg }]}>
              • {r}
            </Text>
          ))}
        </View>
      )}

      <Text style={s.demoLabel}>Try it: add a transaction</Text>
      <View style={s.demoRow}>
        <Pill title="Eat out −€45" onPress={demo.eatOut} variant="outline" />
        <Pill title="New jacket −€120" onPress={demo.jacket} variant="outline" />
        <Pill title="Side gig +€400" onPress={demo.sideGig} variant="outline" />
        <Pill title="Reset" onPress={demo.reset} />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 19, fontWeight: '700', color: colors.green },
  badge: {
    backgroundColor: colors.greenSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.green, letterSpacing: 0.4 },
  score: { marginLeft: 'auto', fontSize: 22, fontWeight: '700', color: colors.ink },
  scoreOf: { fontSize: 13, fontWeight: '500', color: colors.ink2 },
  hero: { alignItems: 'center', paddingTop: 4 },
  moodTag: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3, marginTop: 2 },
  moodText: { fontWeight: '700', fontSize: 14 },
  message: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink,
    textAlign: 'center',
    marginTop: 8,
    minHeight: 42,
  },
  hint: { fontSize: 12, color: colors.faint, marginTop: 4 },
  reasons: { borderRadius: 6, padding: 10, marginTop: 10, gap: 4 },
  reason: { fontSize: 13.5, lineHeight: 19 },
  demoLabel: {
    fontSize: 12,
    color: colors.faint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 8,
  },
  demoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
