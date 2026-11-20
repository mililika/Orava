// A card with a tappable header that opens and closes its content (a dropdown).

import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../theme';
import { Icon, type IconName } from './Icon';

export function Collapsible({
  icon,
  title,
  summary,
  right,
  initiallyOpen = false,
  children,
}: {
  icon?: IconName;
  title: string;
  /** One line under the title, visible while closed. */
  summary?: string;
  /** Short value on the right of the header, e.g. a total. */
  right?: string;
  initiallyOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={s.card}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
        accessibilityLabel={`${title}. ${summary ?? ''} ${open ? 'Collapse' : 'Expand'}`}
        style={({ pressed }) => [s.head, pressed && { opacity: 0.8 }]}
      >
        {icon ? (
          <View style={s.badge}>
            <Icon name={icon} size={20} color={colors.green} strokeWidth={1.9} />
          </View>
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.title}>{title}</Text>
          {summary ? <Text style={s.summary}>{summary}</Text> : null}
        </View>
        {right ? <Text style={s.right}>{right}</Text> : null}
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Icon name="down" size={20} color={colors.green} strokeWidth={2.2} />
        </View>
      </Pressable>
      {open ? <View style={s.body}>{children}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  summary: { fontSize: 12.5, color: colors.ink2, lineHeight: 17 },
  right: { fontSize: 15, fontWeight: '800', color: colors.ink },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
});
