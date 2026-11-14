// Prototype-only demo controls, opened from the "Demo" pill in the header.
// One tap shows a feature: an alert scenario, a squirrel mood, or the lively animation.

import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SCENARIOS } from '../data/demoScenarios';
import { Mascot } from '../orava/Mascot';
import { ALERT_TONES, MOODS } from '../orava/moods';
import type { AlertKind, Mood } from '../orava/types';
import { colors } from '../theme';

const MOOD_KEYS: Mood[] = ['happy', 'calm', 'worried', 'alert'];

export function DemoSheet({
  onScenario,
  mood,
  onMood,
  lively,
  onLively,
  onReset,
  onClose,
}: {
  onScenario: (kind: AlertKind) => void;
  /** null = Auto (the real mood). */
  mood: Mood | null;
  onMood: (m: Mood | null) => void;
  lively: boolean;
  onLively: (on: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <View style={s.overlay}>
      <Pressable style={s.backdrop} onPress={onClose} aria-label="Close demo controls" />
      <View style={s.sheet} role="dialog" aria-label="Demo controls">
        <View style={s.head}>
          <Text style={s.title}>Demo</Text>
          <Pressable onPress={onClose} style={s.done} role="button">
            <Text style={s.doneText}>Done</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.body}>
          <Text style={s.h2}>SHOW AN ALERT</Text>
          {SCENARIOS.map((sc) => {
            const tone = ALERT_TONES[sc.kind];
            return (
              <Pressable
                key={sc.kind}
                onPress={() => onScenario(sc.kind)}
                role="button"
                style={({ pressed }) => [s.row, pressed && { backgroundColor: '#f6faf6' }]}
              >
                <View style={[s.dot, { backgroundColor: tone.border }]} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.rowTitle}>{sc.title}</Text>
                  <Text style={s.rowNote}>{sc.note}</Text>
                </View>
                <Text style={s.go}>›</Text>
              </Pressable>
            );
          })}

          <Text style={s.h2}>SQUIRREL MOOD · LOOK ONLY</Text>
          <View style={s.moods}>
            <Choice label="Auto" on={mood === null} onPress={() => onMood(null)} />
            {MOOD_KEYS.map((m) => (
              <Choice key={m} label={MOODS[m].name} on={mood === m} onPress={() => onMood(m)}>
                <Mascot mood={m} size={34} />
              </Choice>
            ))}
          </View>

          <Text style={s.h2}>ANIMATION</Text>
          <View style={s.moods}>
            <Choice label="Calm unless alert" on={!lively} onPress={() => onLively(false)} />
            <Choice label="Always lively" on={lively} onPress={() => onLively(true)} />
          </View>

          <Pressable onPress={onReset} role="button" style={s.reset}>
            <Text style={s.resetText}>Reset demo</Text>
          </Pressable>
          <Text style={s.foot}>
            Alerts add example transactions on top of your data. Reset removes them.
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

function Choice({
  label,
  on,
  onPress,
  children,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  children?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      role="radio"
      aria-checked={on}
      style={[s.choice, on && s.choiceOn]}
    >
      {children}
      <Text style={[s.choiceText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,30,23,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '85%',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 8,
    paddingTop: 8,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  done: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  doneText: { color: colors.green, fontSize: 16, fontWeight: '700' },
  body: { paddingHorizontal: 16, paddingBottom: 28, gap: 8 },
  h2: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.ink2,
    marginTop: 10,
    marginHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowTitle: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  rowNote: { fontSize: 13, color: colors.ink2, lineHeight: 18 },
  go: { fontSize: 24, color: colors.green, fontWeight: '600' },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: '#fff',
  },
  choiceOn: { backgroundColor: colors.green },
  choiceText: { color: colors.green, fontSize: 14, fontWeight: '600' },
  reset: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  foot: { fontSize: 12, color: colors.faint, textAlign: 'center', marginTop: 4 },
});
