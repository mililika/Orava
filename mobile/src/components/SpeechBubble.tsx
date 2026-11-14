// What Orava says, in the style of the squirrel design: white bubble, thick ink outline,
// a hard offset shadow, the speaker line in the mood color, and text that types itself out.
// Optional action buttons appear when the typing is done.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

export const INK = '#1E2A23';
const GREEN = '#1F6B47';

export type Tail = 'bottom' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'left';

export interface BubbleAction {
  label: string;
  primary?: boolean;
  onPress: () => void;
}

export function SpeechBubble({
  who = 'Orava',
  color = '#C98A2B',
  heading,
  text,
  hint,
  actions,
  tail = 'bottom',
  onPress,
  style,
}: {
  who?: string;
  color?: string;
  heading?: string;
  text: string;
  hint?: string;
  actions?: BubbleAction[];
  tail?: Tail;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  // Hint and buttons wait until this text has finished typing.
  const [doneFor, setDoneFor] = useState<string | null>(null);
  const done = doneFor === text;
  const body = (
    <>
      <Text style={[s.who, { color }]}>{who}</Text>
      {heading ? <Text style={s.heading}>{heading}</Text> : null}
      <Typed key={text} text={text} onDone={() => setDoneFor(text)} />
      {done && hint ? <Text style={s.hint}>{hint}</Text> : null}
      {done && actions?.length ? (
        <View style={s.actions}>
          {actions.map((a) => (
            <SmallButton key={a.label} {...a} />
          ))}
        </View>
      ) : null}
      <View style={[s.tail, TAIL[tail]]} />
    </>
  );
  return (
    <View style={style}>
      <View style={s.shadow} />
      {onPress ? (
        <Pressable onPress={onPress} role="button" style={s.bubble}>
          {body}
        </Pressable>
      ) : (
        <View style={s.bubble}>{body}</View>
      )}
    </View>
  );
}

/** Reveals the text a letter at a time. The rest is laid out but invisible, so the size never jumps. */
function Typed({ text, onDone }: { text: string; onDone: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((i) => Math.min(i + 1, text.length)), 18);
    return () => clearInterval(id);
  }, [text]);
  useEffect(() => {
    if (n >= text.length) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n >= text.length]);
  const typing = n < text.length;
  return (
    <Text style={s.text} accessibilityLabel={text}>
      {text.slice(0, n)}
      {typing ? <Text style={s.caret}>|</Text> : null}
      <Text style={s.rest}>{text.slice(n)}</Text>
    </Text>
  );
}

export function SmallButton({ label, primary, onPress }: BubbleAction) {
  return (
    <Pressable onPress={onPress} role="button" style={s.btnWrap}>
      {({ pressed }) => (
        <>
          <View style={s.btnShadow} />
          <View
            style={[
              s.btn,
              primary && { backgroundColor: GREEN },
              pressed && { transform: [{ translateX: 1 }, { translateY: 1 }] },
            ]}
          >
            <Text style={[s.btnText, primary && { color: '#fff' }]}>{label}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

const TAIL: Record<Tail, ViewStyle> = {
  bottom: { bottom: -11, left: '50%', marginLeft: -10, borderTopWidth: 0, borderLeftWidth: 0 },
  'bottom-left': { bottom: -11, left: 26, borderTopWidth: 0, borderLeftWidth: 0 },
  'bottom-right': { bottom: -11, right: 30, borderTopWidth: 0, borderLeftWidth: 0 },
  'top-left': { top: -11, left: 26, borderBottomWidth: 0, borderRightWidth: 0 },
  'top-right': { top: -11, right: 30, borderBottomWidth: 0, borderRightWidth: 0 },
  left: { left: -11, top: 24, borderTopWidth: 0, borderRightWidth: 0 },
};

const s = StyleSheet.create({
  shadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    backgroundColor: INK,
  },
  bubble: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 72,
  },
  who: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  heading: { fontSize: 16, fontWeight: '800', color: INK, marginBottom: 2 },
  text: { fontSize: 15, lineHeight: 22, color: INK },
  caret: { color: INK, fontWeight: '300' },
  rest: { color: 'transparent' },
  hint: { fontSize: 13, color: GREEN, fontWeight: '700', marginTop: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tail: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: '#fff',
    borderColor: INK,
    borderWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  btnWrap: { paddingRight: 2, paddingBottom: 2 },
  btnShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: INK,
  },
  btn: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  btnText: { fontSize: 14, fontWeight: '700', color: INK },
});
