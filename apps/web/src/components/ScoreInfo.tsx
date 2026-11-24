import { StyleSheet, Text, View } from 'react-native';

import type { Score } from '@orava/core';
import { colors } from '../theme';

const barColor = (share: number) =>
  share >= 0.8 ? '#2E9B5F' : share >= 0.4 ? '#C98A2B' : '#D2652A';

export function ScoreInfo({ score }: { score: Score }) {
  return (
    <View style={s.wrap}>
      <Text style={s.h}>How it’s calculated</Text>
      <Text style={s.lead}>Values are averaged over the last 3 months.</Text>
      {score.pillars.map((p) => {
        const share = p.points / p.maxPoints;
        return (
          <View key={p.key} style={s.pillar}>
            <View style={s.row}>
              <Text style={s.name}>{p.label}</Text>
              <Text style={s.value}>{p.shown}</Text>
              <Text style={s.points}>
                {Math.round(p.points)}/{p.maxPoints}
              </Text>
            </View>
            <View
              style={s.track}
              accessibilityLabel={`${Math.round(p.points)} of ${p.maxPoints} points`}
            >
              <View
                style={[
                  s.fill,
                  { width: `${Math.max(2, share * 100)}%`, backgroundColor: barColor(share) },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 4, marginTop: 12 },
  h: { fontSize: 14, fontWeight: '700', color: colors.green },
  lead: { fontSize: 12.5, color: colors.ink2, marginBottom: 4 },
  pillar: {
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink },
  value: { fontSize: 14, fontWeight: '700', color: colors.ink },
  points: { fontSize: 12.5, color: colors.ink2, minWidth: 42, textAlign: 'right' },
  track: { height: 6, borderRadius: 3, backgroundColor: '#edf2ee', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
