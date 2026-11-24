// Orava's own section on the home screen: the animated squirrel, its mood, the health score and
// what it has to say. The mood follows the financial score. Tap the card to open Money health.
// What Orava says is Gemini's read of the month (orava/overview.ts), refreshed when transactions
// change.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mascot } from '../orava/Mascot';
import { MOODS } from '../orava/moods';
import type { OverviewDto } from '@orava/contracts';
import type { Mood } from '@orava/core';
import { colors, radius } from '../theme';
import { Icon } from './Icon';
import { OravaInsight } from './OravaInsight';

export function OravaCard({
  mood,
  score,
  message,
  thinking,
  insight,
  onOpen,
}: {
  mood: Mood;
  /** Null when there is no score (not the customer's main bank). */
  score: number | null;
  /** Gemini's summary of the month; empty while it loads. */
  message?: string;
  thinking?: boolean;
  insight?: OverviewDto | null;
  onOpen: () => void;
}) {
  const m = MOODS[mood];
  return (
    <Pressable
      onPress={onOpen}
      role="button"
      accessibilityLabel={`Orava, ${m.name}${score == null ? '' : `, money health score ${score}`}. Tap to open money health.`}
      style={({ pressed }) => [s.card, pressed && { opacity: 0.92 }]}
    >
      <View style={s.mascot}>
        <Mascot mood={mood} size={104} />
      </View>
      <View style={s.text}>
        <View style={s.footer}>
          <View style={[s.score, { backgroundColor: m.bg }]}>
            <Text style={[s.scoreText, { color: m.fg }]}>
              {score == null ? 'Partial view' : `${score}/100`}
            </Text>
          </View>
          <View style={s.hint}>
            <Text style={s.hintText}>Money health</Text>
            <Icon name="chevron" size={16} color={colors.green} />
          </View>
        </View>
        {message ? (
          <Text style={s.message}>{message}</Text>
        ) : thinking ? (
          <Text style={[s.message, s.thinking]}>Orava is thinking…</Text>
        ) : null}
        {insight ? <OravaInsight overview={insight} /> : null}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: 10,
    paddingLeft: 6,
    paddingRight: 14,
  },
  mascot: { width: 104, height: 108, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  score: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  scoreText: { fontSize: 12, fontWeight: '700' },
  message: { fontSize: 14, lineHeight: 19, color: colors.ink },
  thinking: { color: colors.ink2, fontStyle: 'italic' },
  hint: { flexDirection: 'row', alignItems: 'center' },
  hintText: { fontSize: 13, fontWeight: '700', color: colors.green },
});
