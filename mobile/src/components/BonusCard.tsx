// The S-Group bonus banner at the top of the home screen. Fictional numbers.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { colors } from '../theme';
import { Icon } from './Icon';

export function BonusCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={s.wrap}>
      <Text style={s.next}>Next bonus level in €42.10</Text>
      <Text style={s.sub}>Fictional example figures</Text>
      <View style={s.tag}>
        <Svg width={200} height={74} style={StyleSheet.absoluteFill}>
          <Polygon points="0,13 200,0 200,74 0,74" fill={colors.green} />
        </Svg>
        <Text style={s.tagLabel}>Bonus coming</Text>
        <Text style={s.tagAmount}>€14.62</Text>
      </View>
      <Pressable onPress={onPress} style={s.link} accessibilityRole="link">
        <Text style={s.linkText}>See your total benefit</Text>
        <Icon name="chevron" size={16} color={colors.green} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: '#fff', alignItems: 'center', paddingTop: 14, paddingBottom: 6 },
  next: { color: colors.green, fontWeight: '700', fontSize: 16 },
  sub: { fontSize: 11, color: colors.faint, marginBottom: 8 },
  tag: {
    width: 200,
    height: 74,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  tagLabel: { color: '#fff', fontSize: 14 },
  tagAmount: { color: '#fff', fontSize: 32, fontWeight: '700' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: 8 },
  linkText: { color: colors.green, fontWeight: '600', fontSize: 14 },
});
