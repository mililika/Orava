// "Where money goes": a donut of the month's income split into Bills / Essentials / Extras / Saved,
// with the legend beside it. Labels are always shown, so color is never the only signal.
// Palette validated (dataviz validate_palette.js, light): all checks pass; contrast WARN → labels always visible.

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { SplitPart } from '../orava/health';
import { colors, eur } from '../theme';
import { Card } from './ui';

const SPLIT_COLOR: Record<SplitPart['key'], string> = {
  bills: '#2a78d6',
  essentials: '#e87ba4',
  extras: '#eda100',
  saved: '#1baf7a',
};

const SIZE = 150;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const GAP = 2;

export function SplitChart({ parts, income }: { parts: SplitPart[]; income: number }) {
  const shown = parts.filter((p) => p.amount > 0);
  const starts = shown.map((_, i) => shown.slice(0, i).reduce((sum, x) => sum + x.share * C, 0));
  return (
    <Card style={s.card}>
      <View style={s.donut}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke="#edf2ee"
            strokeWidth={STROKE}
            fill="none"
          />
          {shown.map((p, i) => {
            const len = Math.max(0, p.share * C - (shown.length > 1 ? GAP : 0));
            return (
              <Circle
                key={p.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={SPLIT_COLOR[p.key]}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-starts[i]}
                rotation={-90}
                origin={`${SIZE / 2}, ${SIZE / 2}`}
              />
            );
          })}
        </Svg>
        <View style={s.center} pointerEvents="none">
          <Text style={s.centerLabel}>Income</Text>
          <Text style={s.centerValue}>{eur(income, 0)}</Text>
        </View>
      </View>
      <View style={s.legend}>
        {parts.map((p) => (
          <View key={p.key} style={s.item}>
            <View style={[s.swatch, { backgroundColor: SPLIT_COLOR[p.key] }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{p.label}</Text>
              <Text style={s.value}>
                {eur(p.amount, 0)} <Text style={s.pct}>· {Math.round(p.share * 100)}%</Text>
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  donut: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  centerLabel: { fontSize: 12, color: colors.ink2 },
  centerValue: { fontSize: 18, fontWeight: '800', color: colors.ink },
  legend: { flex: 1, gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  label: { fontSize: 13, color: colors.ink2 },
  value: { fontSize: 14, fontWeight: '700', color: colors.ink },
  pct: { fontSize: 12, fontWeight: '500', color: colors.faint },
});
