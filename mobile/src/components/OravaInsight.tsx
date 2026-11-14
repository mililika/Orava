// Orava's AI overview lines: the best thing ("Good") and the biggest problem ("Watch") of a month.
// From orava/overview.ts; tag colours match the Money health tiles.
// Every tag gets the width of the widest one, so the texts start in one column.

import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import type { Overview } from '../orava/overview';
import { colors } from '../theme';

export function OravaInsight({ overview }: { overview: Overview }) {
  const [tagWidth, setTagWidth] = useState(0);
  const measure = (e: LayoutChangeEvent) => {
    const w = Math.ceil(e.nativeEvent.layout.width);
    setTagWidth((cur) => (w > cur ? w : cur));
  };
  return (
    <View style={s.list}>
      {overview.good ? (
        <Line tag="Good" tone="good" text={overview.good} width={tagWidth} onLayout={measure} />
      ) : null}
      {overview.bad ? (
        <Line tag="Watch" tone="warn" text={overview.bad} width={tagWidth} onLayout={measure} />
      ) : null}
    </View>
  );
}

const TONE = {
  good: { bg: '#e0f0e4', fg: '#1b6a37' },
  warn: { bg: '#fdebd0', fg: '#7a4a05' },
};

function Line({
  tag,
  tone,
  text,
  width,
  onLayout,
}: {
  tag: string;
  tone: 'good' | 'warn';
  text: string;
  /** Width of the widest tag so far (0 until measured). */
  width: number;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  return (
    <View style={s.line} accessible accessibilityLabel={`${tag}: ${text}`}>
      <View
        onLayout={onLayout}
        style={[s.tag, { backgroundColor: TONE[tone].bg }, width ? { minWidth: width } : null]}
      >
        <Text style={[s.tagText, { color: TONE[tone].fg }]}>{tag}</Text>
      </View>
      <Text style={s.text}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  list: { gap: 6 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 1,
    alignItems: 'center',
  },
  tagText: { fontSize: 11.5, fontWeight: '700' },
  text: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.ink },
});
