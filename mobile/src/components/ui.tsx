// Small building blocks shared by every card.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radius } from '../theme';

export function Card({
  children,
  onPress,
  style,
  label,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  label?: string;
}) {
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      role="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.card, pressed && s.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

export function Pill({
  title,
  onPress,
  variant = 'solid',
  disabled = false,
  selected,
  label,
}: {
  title: string;
  onPress: () => void;
  variant?: 'solid' | 'outline';
  disabled?: boolean;
  /** For toggle-style pills: announced to screen readers. */
  selected?: boolean;
  label?: string;
}) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      style={({ pressed }) => [
        s.pill,
        outline && s.pillOutline,
        pressed && !disabled && { opacity: 0.85, transform: [{ scale: 0.96 }] },
        disabled && s.pillDisabled,
      ]}
    >
      <Text
        style={[s.pillText, outline && { color: colors.green }, disabled && s.pillTextDisabled]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

/** Clear label that the app is showing invented demo data, not a real account. */
export function DemoBadge() {
  return (
    <View style={s.demo} accessibilityLabel="Demo mode. Synthetic sample data, not a real account.">
      <Text style={s.demoText}>DEMO · Synthetic sample data, not a real account</Text>
    </View>
  );
}

export function SectionHead({ title, right }: { title: string; right?: string }) {
  return (
    <View style={s.secHead}>
      <Text style={s.secTitle}>{title}</Text>
      {right ? <Text style={s.secTitle}>{right}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 16 },
  pressed: { backgroundColor: '#f6faf6' },
  pill: {
    backgroundColor: colors.green,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.green,
  },
  pillOutline: { backgroundColor: '#fff' },
  pillText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pillDisabled: { backgroundColor: '#fff', borderColor: colors.line },
  pillTextDisabled: { color: colors.faint },
  demo: {
    backgroundColor: colors.warnBg,
    borderRadius: radius.card,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#f1d3ad',
  },
  demoText: { color: colors.warnInk, fontSize: 12.5, fontWeight: '700', letterSpacing: 0.2 },
  secHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  secTitle: { fontSize: 19, fontWeight: '700', color: colors.green },
});
