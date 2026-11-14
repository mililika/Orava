// The parts of S-mobiili around every screen: top header and the five-tab bottom bar.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mascot } from '../orava/Mascot';
import { MOODS } from '../orava/moods';
import type { Mood } from '../orava/types';
import { colors } from '../theme';
import { Icon, type IconName } from './Icon';

export function AppHeader({
  onLock,
  onChat,
  onDemo,
}: {
  onLock: () => void;
  onChat: () => void;
  /** Opens the demo panel (prototype only). */
  onDemo: () => void;
}) {
  return (
    <View style={s.header}>
      <Pressable onPress={onLock} style={s.iconBtn} accessibilityLabel="Lock app">
        <Icon name="lock" />
      </Pressable>
      <Pressable
        onPress={onDemo}
        style={({ pressed }) => [s.demo, pressed && { opacity: 0.7 }]}
        role="button"
        accessibilityLabel="Open demo controls"
      >
        <Text style={s.demoText}>Demo</Text>
      </Pressable>
      <Pressable onPress={onChat} style={s.iconBtn} accessibilityLabel="Messages">
        <Icon name="chat" />
      </Pressable>
    </View>
  );
}

export type Tab = 'home' | 'etukortti' | 'orava' | 'sbank' | 'me';

const TABS: { key: Tab; label: string; icon?: IconName }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'etukortti', label: 'S-Etukortti', icon: 'card' },
  { key: 'orava', label: 'Orava' },
  { key: 'sbank', label: 'S-Bank', icon: 'wallet' },
  { key: 'me', label: 'Me', icon: 'person' },
];

/** The five-tab bar. The middle tab is Orava: a round button with the squirrel in its current mood. */
export function BottomNav({
  tab,
  onChange,
  mood,
  badge,
  lively = badge,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  mood: Mood;
  /** Show a red "1" on the Orava tab: Orava has something to tell you. */
  badge: boolean;
  /** Full animation on the tab squirrel. Defaults to `badge`. */
  lively?: boolean;
}) {
  return (
    <View style={s.nav}>
      {TABS.map((t) => {
        const on = t.key === tab;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={s.navItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={
              t.key === 'orava'
                ? `Orava, ${MOODS[mood].name}${badge ? ', 1 new message' : ''}`
                : undefined
            }
          >
            {t.icon ? (
              <Icon name={t.icon} color={on ? colors.green2 : '#5d635f'} />
            ) : (
              <View style={[s.fab, { borderColor: MOODS[mood].ring }]}>
                <Mascot mood={mood} size={48} lively={lively} />
                {badge && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>1</Text>
                  </View>
                )}
              </View>
            )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ee',
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
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
  navLabel: { fontSize: 11, color: '#5d635f' },
  navLabelOn: { color: colors.ink, fontWeight: '600' },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    boxShadow: '0 4px 14px rgba(23,37,27,0.2)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C4321F',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
