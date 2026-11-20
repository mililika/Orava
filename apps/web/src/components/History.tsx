// Month stepper at the top of Money health: ‹ September 2026 ›. The whole screen shows that
// month; the newest month in the data is "now". Months from orava/history.ts.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { monthName, stepMonth } from '@orava/core';
import { colors, radius } from '../theme';
import { Icon } from './Icon';

export function MonthStepper({
  month,
  first,
  last,
  onChange,
}: {
  month: string;
  first: string;
  last: string;
  onChange: (month: string) => void;
}) {
  return (
    <View style={s.bar}>
      <Step dir="back" disabled={month <= first} onPress={() => onChange(stepMonth(month, -1))} />
      <Text style={s.label} numberOfLines={1} accessibilityLiveRegion="polite">
        {monthName(month)}
      </Text>
      <Step dir="next" disabled={month >= last} onPress={() => onChange(stepMonth(month, 1))} />
    </View>
  );
}

function Step({
  dir,
  disabled,
  onPress,
}: {
  dir: 'back' | 'next';
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      role="button"
      accessibilityLabel={dir === 'back' ? 'Previous month' : 'Next month'}
      hitSlop={8}
      style={({ pressed }) => [s.step, disabled && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}
    >
      <View style={dir === 'next' ? undefined : { transform: [{ scaleX: -1 }] }}>
        <Icon name="chevron" size={20} color={colors.green} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: 8,
  },
  step: {
    width: 40,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.ink },
});
