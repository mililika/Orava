// Small building blocks shared by every card.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radius } from '../theme';
import { Icon } from './Icon';

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
}: {
  title: string;
  onPress: () => void;
  variant?: 'solid' | 'outline';
}) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      role="button"
      style={({ pressed }) => [s.pill, outline && s.pillOutline, pressed && { opacity: 0.75 }]}
    >
      <Text style={[s.pillText, outline && { color: colors.green }]}>{title}</Text>
    </Pressable>
  );
}

export function SectionHead({
  title,
  right,
  action,
}: {
  title: string;
  right?: string;
  /** A round plus button at the top right of the section. */
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={s.secHead}>
      <Text style={s.secTitle}>{title}</Text>
      {right ? <Text style={s.secTitle}>{right}</Text> : null}
      {action ? (
        <Pressable
          onPress={action.onPress}
          role="button"
          accessibilityLabel={action.label}
          hitSlop={8}
          style={({ pressed }) => [s.plus, pressed && { opacity: 0.75 }]}
        >
          <Icon name="plus" color="#fff" size={20} strokeWidth={2.4} />
        </Pressable>
      ) : null}
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
  secHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  plus: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secTitle: { fontSize: 19, fontWeight: '700', color: colors.green },
});
