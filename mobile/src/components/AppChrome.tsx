// The parts of S-mobiili around every screen: top header and the five-tab bottom bar.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { Icon, type IconName } from './Icon';

export function AppHeader({ onLock, onChat }: { onLock: () => void; onChat: () => void }) {
  return (
    <View style={s.header}>
      <Pressable onPress={onLock} style={s.iconBtn} accessibilityLabel="Lock app">
        <Icon name="lock" />
      </Pressable>
      <Pressable onPress={onChat} style={s.iconBtn} accessibilityLabel="Messages">
        <Icon name="chat" />
      </Pressable>
    </View>
  );
}

export type Tab = 'home' | 'etukortti' | 'pay' | 'sbank' | 'me';

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'etukortti', label: 'S-Etukortti', icon: 'card' },
  { key: 'pay', label: 'Pay', icon: 'plus' },
  { key: 'sbank', label: 'S-Bank', icon: 'wallet' },
  { key: 'me', label: 'Me', icon: 'person' },
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
            style={s.navItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ee',
  },
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
