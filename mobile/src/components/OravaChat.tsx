// "Ask Orava": the chat on Money health. Answers come from orava/chat.ts.
// Split in two so the screen can scroll the messages with the page while the
// input bar stays pinned to the bottom:
//   const chat = useOravaChat(report);
//   <ChatMessages chat={chat} />   (inside the ScrollView)
//   <ChatInput chat={chat} />      (below it, outside the ScrollView)

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { answer, SUGGESTIONS } from '../orava/chat';
import type { HealthReport } from '../orava/health';
import { colors, radius } from '../theme';
import { Icon } from './Icon';
import { Card } from './ui';

interface Msg {
  from: 'me' | 'orava';
  text: string;
}

export function useOravaChat(report: HealthReport, onSent?: () => void) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 'orava', text: 'Hi! Ask me anything about your money this month.' },
  ]);
  const [draft, setDraft] = useState('');

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMsgs((prev) => [
      ...prev,
      { from: 'me', text: q },
      { from: 'orava', text: answer(q, report) },
    ]);
    setDraft('');
    onSent?.();
  };

  return { msgs, draft, setDraft, send };
}

export type OravaChatState = ReturnType<typeof useOravaChat>;

export function ChatMessages({ chat }: { chat: OravaChatState }) {
  return (
    <Card style={s.card}>
      <View style={s.list} role="log" aria-live="polite">
        {chat.msgs.map((m, i) => (
          <View key={i} style={[s.bubble, m.from === 'me' ? s.me : s.orava]}>
            <Text style={[s.text, m.from === 'me' && { color: '#fff' }]}>{m.text}</Text>
          </View>
        ))}
      </View>

      {chat.msgs.length === 1 && (
        <View style={s.chips}>
          {SUGGESTIONS.map((q) => (
            <Pressable
              key={q}
              onPress={() => chat.send(q)}
              role="button"
              style={({ pressed }) => [s.chip, pressed && { opacity: 0.75 }]}
            >
              <Text style={s.chipText}>{q}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}

/** The text box and send button, pinned to the bottom of the screen. */
export function ChatInput({ chat }: { chat: OravaChatState }) {
  return (
    <View style={s.bar}>
      <TextInput
        value={chat.draft}
        onChangeText={chat.setDraft}
        onSubmitEditing={() => chat.send(chat.draft)}
        placeholder="Ask Orava about your money…"
        placeholderTextColor={colors.faint}
        returnKeyType="send"
        style={s.input}
        accessibilityLabel="Ask Orava a question"
      />
      <Pressable
        onPress={() => chat.send(chat.draft)}
        role="button"
        accessibilityLabel="Send"
        style={({ pressed }) => [s.send, pressed && { opacity: 0.75 }]}
      >
        <Icon name="chevron" color="#fff" size={20} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: { gap: 12 },
  list: { gap: 8 },
  bubble: { maxWidth: '85%', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  orava: { alignSelf: 'flex-start', backgroundColor: colors.mint },
  me: { alignSelf: 'flex-end', backgroundColor: colors.green },
  text: { fontSize: 14, lineHeight: 19, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.green,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.green },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.ink,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
