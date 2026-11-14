// "Ask Orava": an input pinned to the bottom of Money health. Answers open in a panel above it.
// Answers come from Gemini (lib/gemini.ts) with the user's report as context (orava/coach.ts).
// Without a Gemini key, or if the call fails, the offline keyword answers (orava/chat.ts) step in.
// Replies stream in: Gemini's chunks arrive as they're written, and the bubble types them out.
// The panel never takes more than half the screen. Minimize hides it and keeps the conversation
// (a slim bar brings it back); close ends it, so the next question starts a new chat.

import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { geminiConfigured, streamGemini, type ChatTurn } from '../lib/gemini';
import { answer, SUGGESTIONS } from '../orava/chat';
import { coachSystem, plainText } from '../orava/coach';
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
  const system = useMemo(() => coachSystem(report), [report]);

  // The reply being written is the last message. `shown` is how many of its characters are on
  // screen (null when no reply is in progress); `target` is what has arrived so far.
  const [shown, setShown] = useState<number | null>(null);
  const target = useRef({ text: '', done: true });
  const busy = shown !== null;
  const [minimized, setMinimized] = useState(false);
  // Bumped when a chat is closed, so a reply still streaming into it is dropped.
  const chatId = useRef(0);
  // Dock (panel + input) stays within half the screen; ~66 px is the input row and padding.
  const { height } = useWindowDimensions();
  const panelMax = Math.max(120, height * 0.5 - 66);

  const close = () => {
    chatId.current += 1;
    target.current = { text: '', done: true };
    setShown(null);
    setMsgs([]);
    setMinimized(false);
  };

  // Typewriter: move `shown` toward what has arrived, a little faster when far behind.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => {
      setShown((n) => {
        if (n === null) return null;
        const { text, done } = target.current;
        if (n >= text.length) return done ? null : n;
        return Math.min(text.length, n + Math.max(2, Math.ceil((text.length - n) / 12)));
      });
    }, 30);
    return () => clearInterval(id);
  }, [busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const history: Msg[] = [...msgs, { from: 'me', text: q }];
    const id = chatId.current;
    const write = (reply: string, done = false) => {
      if (id !== chatId.current) return; // the chat was closed meanwhile
      target.current = { text: reply, done };
      setMsgs([...history, { from: 'orava', text: reply }]);
    };
    write('');
    setShown(0);
    setDraft('');
    setMinimized(false);
    if (!geminiConfigured) return write(answer(q, report), true);
    try {
      const turns: ChatTurn[] = history.map((m) => ({
        role: m.from === 'me' ? 'user' : 'model',
        text: m.text,
      }));
      const reply = await streamGemini(system, turns, (soFar) => write(plainText(soFar)));
      write(plainText(reply), true);
    } catch (e) {
      console.warn(e);
      write(answer(q, report), true);
    }
  };

  return (
    <View style={s.dock}>
      {msgs.length && minimized ? (
        <Pressable
          onPress={() => setMinimized(false)}
          role="button"
          accessibilityLabel="Show chat with Orava"
          style={({ pressed }) => [s.bar, pressed && { opacity: 0.75 }]}
        >
          <Text style={s.panelTitle}>Orava</Text>
          <Text style={s.barText} numberOfLines={1}>
            {busy ? 'is thinking…' : (msgs[msgs.length - 1].text.split('\n')[0] ?? '')}
          </Text>
          <Icon name="up" size={18} color={colors.ink2} strokeWidth={2.2} />
        </Pressable>
      ) : msgs.length ? (
        <View style={[s.panel, { maxHeight: panelMax }]}>
          <View style={s.panelHead}>
            <Text style={s.panelTitle}>Orava</Text>
            <View style={s.headButtons}>
              <Pressable
                onPress={() => setMinimized(true)}
                role="button"
                accessibilityLabel="Minimize chat"
                hitSlop={10}
                style={({ pressed }) => [s.headBtn, pressed && { opacity: 0.6 }]}
              >
                <Icon name="down" size={18} color={colors.ink2} strokeWidth={2.2} />
              </Pressable>
              <Pressable
                onPress={close}
                role="button"
                accessibilityLabel="Close chat and start a new one"
                hitSlop={10}
                style={({ pressed }) => [s.headBtn, pressed && { opacity: 0.6 }]}
              >
                <Icon name="close" size={18} color={colors.ink2} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>
          <ScrollView
            ref={list}
            style={s.list}
            contentContainerStyle={{ gap: 8 }}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          >
            {msgs.map((m, i) => {
              const writing = busy && i === msgs.length - 1;
              const t = writing ? m.text.slice(0, shown ?? undefined) : m.text;
              return writing && !t ? (
                <View key={i} style={[s.bubble, s.orava]} accessibilityLabel="Orava is thinking">
                  <Text style={[s.text, s.typing]}>Orava is thinking…</Text>
                </View>
              ) : (
                <View key={i} style={[s.bubble, m.from === 'me' ? s.me : s.orava]}>
                  <Text style={[s.text, m.from === 'me' && { color: '#fff' }]}>{t}</Text>
                </View>
              );
            })}
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
          disabled={busy}
          role="button"
          accessibilityLabel="Send"
          style={({ pressed }) => [s.send, (pressed || busy) && { opacity: 0.6 }]}
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
  panel: { gap: 6 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headButtons: { flexDirection: 'row', gap: 14 },
  headBtn: { padding: 2 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  barText: { flex: 1, fontSize: 13, color: colors.ink2 },
  panelTitle: { fontSize: 13, fontWeight: '700', color: colors.green },
  list: { flexGrow: 0, flexShrink: 1 },
  bubble: { maxWidth: '85%', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  orava: { alignSelf: 'flex-start', backgroundColor: colors.mint },
  me: { alignSelf: 'flex-end', backgroundColor: colors.green },
  text: { fontSize: 14, lineHeight: 19, color: colors.ink },
  typing: { color: colors.ink2, fontStyle: 'italic' },
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
