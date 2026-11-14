// "Where money goes" – TEMPORARY variant picker so the team can compare options on the device.
// Once one is chosen: keep that component, drop the picker and the others (and SpendingChart if unused).

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryInfo } from '../data/categories';
import type { HealthReport, SplitPart } from '../orava/health';
import { colors, eur } from '../theme';
import { CategoryIcon } from './CategoryIcon';
import { SpendingChart } from './SpendingChart';
import { Card } from './ui';

type Variant = 'split' | 'top3' | 'list' | 'off';

const VARIANTS: { key: Variant; label: string }[] = [
  { key: 'split', label: 'A · Split bar' },
  { key: 'top3', label: 'B · Top 3' },
  { key: 'list', label: 'C · Folded list' },
  { key: 'off', label: 'D · None' },
];

export function MoneyFlowVariants({ report }: { report: HealthReport }) {
  const [v, setV] = useState<Variant>('split');

  return (
    <View style={{ gap: 10 }}>
      <View style={s.picker}>
        <Text style={s.pickerTitle}>Variant (prototype only)</Text>
        <View style={s.pickerRow}>
          {VARIANTS.map((x) => (
            <Pressable
              key={x.key}
              onPress={() => setV(x.key)}
              style={[s.opt, v === x.key && s.optOn]}
              role="button"
              accessibilityState={{ selected: v === x.key }}
            >
              <Text style={[s.optText, v === x.key && s.optTextOn]}>{x.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {v !== 'off' && <Text style={s.section}>Where money goes</Text>}
      {v === 'split' && <SplitBar parts={report.split} />}
      {v === 'top3' && <TopThree report={report} />}
      {v === 'list' && <FoldedList report={report} />}
    </View>
  );
}

// A — one bar: the month's income split into Bills / Essentials / Extras / Saved.
// Palette validated (dataviz validate_palette.js, light): all checks pass; contrast WARN → labels always visible.
const SPLIT_COLOR: Record<SplitPart['key'], string> = {
  bills: '#2a78d6',
  essentials: '#e87ba4',
  extras: '#eda100',
  saved: '#1baf7a',
};

function SplitBar({ parts }: { parts: SplitPart[] }) {
  const shown = parts.filter((p) => p.amount > 0);
  return (
    <Card>
      <View style={s.bar}>
        {shown.map((p) => (
          <View
            key={p.key}
            style={{ flex: p.share, backgroundColor: SPLIT_COLOR[p.key], minWidth: 4 }}
          />
        ))}
      </View>
      <View style={s.legend}>
        {parts.map((p) => (
          <View key={p.key} style={s.legendItem}>
            <View style={[s.swatch, { backgroundColor: SPLIT_COLOR[p.key] }]} />
            <Text style={s.legendLabel}>{p.label}</Text>
            <Text style={s.legendValue}>{eur(p.amount, 0)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

// B — just the three biggest categories, no bars.
function TopThree({ report }: { report: HealthReport }) {
  const top = report.breakdown.slice(0, 3);
  return (
    <Card style={{ gap: 12 }}>
      {top.map((x) => (
        <View key={x.category} style={s.topRow}>
          <CategoryIcon category={x.category} size={32} />
          <Text style={s.topName}>{categoryInfo(x.category).name}</Text>
          <Text style={s.topAmount}>{eur(x.amount, 0)}</Text>
        </View>
      ))}
    </Card>
  );
}

// C — the old full chart, folded behind one tap.
function FoldedList({ report }: { report: HealthReport }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Pressable onPress={() => setOpen(!open)} style={s.foldHead} role="button">
        <Text style={s.foldTitle}>Spent {eur(report.spending, 0)}</Text>
        <Text style={s.foldLink}>{open ? 'Hide' : 'Show categories'}</Text>
      </Pressable>
      {open && (
        <View style={{ marginTop: 8 }}>
          <SpendingChart slices={report.breakdown} />
        </View>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  picker: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#b9c9bd',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginTop: 8,
  },
  pickerTitle: { fontSize: 12, fontWeight: '700', color: colors.faint },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  opt: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  optOn: { backgroundColor: colors.green, borderColor: colors.green },
  optText: { fontSize: 12, fontWeight: '600', color: colors.ink2 },
  optTextOn: { color: '#fff' },
  section: { fontSize: 19, fontWeight: '700', color: colors.green, marginHorizontal: 4 },
  bar: { flexDirection: 'row', height: 14, borderRadius: 4, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, rowGap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flexBasis: '50%' },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { fontSize: 13, color: colors.ink2 },
  legendValue: { fontSize: 13, fontWeight: '700', color: colors.ink },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topName: { flex: 1, fontSize: 15, color: colors.ink },
  topAmount: { fontSize: 15, fontWeight: '700', color: colors.ink },
  foldHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  foldTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  foldLink: { fontSize: 14, fontWeight: '600', color: colors.green },
});
