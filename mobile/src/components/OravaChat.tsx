// "Ask Orava": an input pinned to the bottom of Money health. Answers open in a panel above it.
// Answers come from orava/chat.ts.

import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { answer, SUGGESTIONS } from '../orava/chat';
import type { HealthReport } from '../orava/health';
import { colors, radius } from '../theme';
import { Icon } from './Icon';

interface Msg {
  from: 'me' | 'orava';
  text: string;
}

export function OravaChat({ report }: { report: HealthReport }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const list = useRef<ComponentRef<typeof ScrollView>>(null);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMsgs((prev) => [
      ...prev,
      { from: 'me', text: q },
      { from: 'orava', text: answer(q, report) },
    ]);
    setDraft('');
  };

  return (
    <View style={s.dock}>
      {msgs.length ? (
        <View style={s.panel}>
          <View style={s.panelHead}>
            <Text style={s.panelTitle}>Orava</Text>
            <Pressable
              onPress={() => setMsgs([])}
              role="button"
              accessibilityLabel="Close chat"
              hitSlop={10}
            >
              <Icon name="close" size={18} color={colors.ink2} strokeWidth={2.2} />
            </Pressable>
          </View>
          <ScrollView
            ref={list}
            style={s.list}
            contentContainerStyle={{ gap: 8 }}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          >
            {msgs.map((m, i) => (
              <View key={i} style={[s.bubble, m.from === 'me' ? s.me : s.orava]}>
                <Text style={[s.text, m.from === 'me' && { color: '#fff' }]}>{m.text}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : focused ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
          keyboardShouldPersistTaps="always"
        >
          {SUGGESTIONS.map((q) => (
            <Pressable
              key={q}
              onPress={() => send(q)}
              role="button"
              style={({ pressed }) => [s.chip, pressed && { opacity: 0.75 }]}
            >
              <Text style={s.chipText}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={s.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => send(draft)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Ask Orava…"
          placeholderTextColor={colors.faint}
          returnKeyType="send"
          style={s.input}
          accessibilityLabel="Ask Orava a question"
        />
        <Pressable
          onPress={() => send(draft)}
          role="button"
          accessibilityLabel="Send"
          style={({ pressed }) => [s.send, pressed && { opacity: 0.75 }]}
        >
          <Icon name="chevron" color="#fff" size={20} strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  dock: {
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  panel: { maxHeight: 280, gap: 6 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { fontSize: 13, fontWeight: '700', color: colors.green },
  list: { flexGrow: 0 },
  bubble: { maxWidth: '85%', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  orava: { alignSelf: 'flex-start', backgroundColor: colors.mint },
  me: { alignSelf: 'flex-end', backgroundColor: colors.green },
  text: { fontSize: 14, lineHeight: 19, color: colors.ink },
  chips: { gap: 8 },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.green,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.green },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.ink,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
