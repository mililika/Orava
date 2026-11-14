// Orava's own section on the home screen: the animated squirrel, its mood, the health score and
// what it has to say. The mood follows the financial score. Tap the card to open Money health.
// A reaction with action buttons (e.g. after a suspicious payment) shows its buttons here too.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mascot } from '../orava/Mascot';
import { MOODS } from '../orava/moods';
import type { Mood } from '../orava/types';
import { colors, radius } from '../theme';
import { Icon } from './Icon';

export interface OravaAction {
  label: string;
  primary?: boolean;
  onPress: () => void;
}

export function OravaCard({
  mood,
  score,
  message,
  actions,
  onOpen,
}: {
  mood: Mood;
  /** Null when there is no score (not the customer's main bank). */
  score: number | null;
  message: string;
  actions?: OravaAction[];
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
          {!actions?.length && (
            <View style={s.hint}>
              <Text style={s.hintText}>Money health</Text>
              <Icon name="chevron" size={16} color={colors.green} />
            </View>
          )}
        </View>
        <Text style={s.message}>{message}</Text>
        {actions?.length ? (
          <View style={s.actions}>
            {actions.map((a) => (
              <Pressable
                key={a.label}
                onPress={a.onPress}
                role="button"
                style={({ pressed }) => [
                  s.btn,
                  a.primary && s.btnPrimary,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text style={[s.btnText, a.primary && { color: '#fff' }]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
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
  hint: { flexDirection: 'row', alignItems: 'center' },
  hintText: { fontSize: 13, fontWeight: '700', color: colors.green },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  btnPrimary: { backgroundColor: colors.green },
  btnText: { fontSize: 13, fontWeight: '600', color: colors.green },
});
