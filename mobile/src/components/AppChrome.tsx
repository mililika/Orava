// The parts of S-mobiili around every screen: top header and the bottom bar.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { Icon, type IconName } from './Icon';

export function AppHeader({
  title,
  left,
  right,
}: {
  title?: string;
  left?: { icon: IconName; label: string; onPress: () => void };
  right?: ReactNode;
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
      {title ? <Text style={s.title}>{title}</Text> : null}
      <View style={[s.side, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export type Tab = 'home' | 'etukortti' | 'pay' | 'sbank' | 'me';

/** S-mobiili's five tabs. Only Home and Pay belong to the challenge; the rest are disabled. */
const TABS: { key: Tab; label: string; icon: IconName; enabled: boolean }[] = [
  { key: 'home', label: 'Home', icon: 'home', enabled: true },
  { key: 'etukortti', label: 'S-Etukortti', icon: 'card', enabled: false },
  { key: 'pay', label: 'Pay', icon: 'plus', enabled: true },
  { key: 'sbank', label: 'S-Bank', icon: 'wallet', enabled: false },
  { key: 'me', label: 'Me', icon: 'person', enabled: false },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={s.nav}>
      {TABS.map((t) => {
        const on = t.key === tab;
        const pay = t.key === 'pay';
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            disabled={!t.enabled}
            style={[s.navItem, !t.enabled && s.navOff]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on, disabled: !t.enabled }}
            accessibilityLabel={pay ? 'Pay: new transaction' : t.label}
          >
            {pay ? (
              <View style={s.fab}>
                <Icon name="plus" color="#fff" size={26} strokeWidth={2.4} />
              </View>
            ) : (
              <Icon name={t.icon} color={on ? colors.green2 : '#5d635f'} />
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
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ee',
  },
  side: { width: 88 },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.ink },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
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
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
