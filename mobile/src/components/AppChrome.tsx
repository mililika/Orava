// The parts of S-mobiili around every screen: top header and the bottom bar.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mascot } from '../orava/Mascot';
import { MOODS } from '../orava/moods';
import type { Mood } from '../orava/types';
import { colors } from '../theme';
import { Icon, type IconName } from './Icon';

export function AppHeader({
  title,
  left,
  right,
  orava,
  onDemo,
}: {
  title?: string;
  left?: { icon: IconName; label: string; onPress: () => void };
  right?: ReactNode;
  /** Small squirrel button that opens Money health from any screen. */
  orava?: { mood: Mood; onPress: () => void };
  /** Shows a "Demo" pill in the middle (prototype only) that opens the demo panel. */
  onDemo?: () => void;
}) {
  return (
    <View style={s.header}>
      <View style={s.side}>
        {left && (
          <Pressable onPress={left.onPress} style={s.iconBtn} accessibilityLabel={left.label}>
            <Icon name={left.icon} />
          </Pressable>
        )}
      </View>
      {title ? (
        <Text style={s.title}>{title}</Text>
      ) : (
        <View style={s.center}>
          {onDemo && (
            <Pressable
              onPress={onDemo}
              style={({ pressed }) => [s.demo, pressed && { opacity: 0.7 }]}
              role="button"
              accessibilityLabel="Open demo controls"
            >
              <Text style={s.demoText}>Demo</Text>
            </Pressable>
          )}
        </View>
      )}
      <View style={[s.side, { alignItems: 'flex-end' }]}>
        {right}
        {orava && (
          <Pressable
            onPress={orava.onPress}
            style={s.oravaBtn}
            accessibilityRole="button"
            accessibilityLabel={`Open Money health. Orava: ${MOODS[orava.mood].name}`}
          >
            <View style={[s.oravaRing, { borderColor: MOODS[orava.mood].color }]}>
              <Mascot mood={orava.mood} size={30} ground={false} />
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export type Tab = 'home' | 'etukortti' | 'sbank' | 'me';

/** S-mobiili's four tabs. Only Home belongs to the challenge; the rest are disabled. */
const TABS: { key: Tab; label: string; icon: IconName; enabled: boolean }[] = [
  { key: 'home', label: 'Home', icon: 'home', enabled: true },
  { key: 'etukortti', label: 'S-Etukortti', icon: 'card', enabled: false },
  { key: 'sbank', label: 'S-Bank', icon: 'wallet', enabled: false },
  { key: 'me', label: 'Me', icon: 'person', enabled: false },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={s.nav}>
      {TABS.map((t) => {
        const on = t.key === tab;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            disabled={!t.enabled}
            style={[s.navItem, !t.enabled && s.navOff]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on, disabled: !t.enabled }}
            accessibilityLabel={t.label}
          >
            <Icon name={t.icon} color={on ? colors.green2 : '#5d635f'} />
            <Text style={[s.navLabel, on && s.navLabelOn]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    height: 52,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ee',
  },
  side: { width: 88 },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.ink },
  oravaBtn: { height: 44, paddingRight: 10, alignItems: 'flex-end', justifyContent: 'center' },
  /** Border in the mood's colour: green = doing great … red = needs attention. */
  oravaRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  demo: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoText: { color: colors.green, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  nav: {
    height: 66,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e6ece7',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 8,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navOff: { opacity: 0.35 },
  navLabel: { fontSize: 11, color: '#5d635f' },
  navLabelOn: { color: colors.ink, fontWeight: '600' },
});
