import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppHeader } from '../components/AppChrome';
import { Card } from '../components/ui';
import { askAnalyst, getAnalystStatus, type AnalystMessage, type AnalystStatus } from '../lib/analyst';
import { colors, radius } from '../theme';
import { Icon } from '../components/Icon';

interface Message extends AnalystMessage {
  id: string;
}

interface PendingQuestion {
  question: string;
  history: AnalystMessage[];
}

const SUGGESTIONS = [
  'How did grocery spending change in February 2026?',
  'Which categories had the highest spending in 2026?',
  'Summarize historical mortgage outcomes.',
];

export function AnalystScreen({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Ask about spending patterns or historical mortgage application events.',
    },
  ]);
  const [status, setStatus] = useState<AnalystStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusRetry, setStatusRetry] = useState(0);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<PendingQuestion | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    const statusController = new AbortController();
    setStatusLoading(true);
    setStatusError(null);
    getAnalystStatus(statusController.signal)
      .then((result) => {
        if (!mounted.current || !active) return;
        setStatus(result);
        setStatusError(null);
      })
      .catch((reason: unknown) => {
        if (!mounted.current || !active || (reason instanceof Error && reason.name === 'AbortError')) return;
        setStatusError(reason instanceof Error ? reason.message : 'Could not check data availability.');
      })
      .finally(() => {
        if (mounted.current && active) setStatusLoading(false);
      });
    return () => {
      active = false;
      mounted.current = false;
      statusController.abort();
      controller.current?.abort();
    };
  }, [statusRetry]);

  const submit = async (question: string, history: AnalystMessage[]) => {
    if (busyRef.current) return;
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    busyRef.current = true;
    const requestController = new AbortController();
    controller.current = requestController;
    const timeout = setTimeout(() => requestController.abort(), 90_000);
    setBusy(true);
    setError(null);
    try {
      const response = await askAnalyst(cleanQuestion, history, requestController.signal);
      if (!mounted.current) return;
      setStatus((previous) =>
        previous ? { ...previous, data: response.data_status } : previous,
      );
      setMessages((previous) => [
        ...previous,
        { id: `answer-${Date.now()}`, role: 'assistant', content: response.answer },
      ]);
      setPending(null);
    } catch (reason) {
      if (!mounted.current) return;
      setError(
        reason instanceof Error && reason.name === 'AbortError'
          ? 'This request timed out. Retry it when the service is ready.'
          : reason instanceof Error
            ? reason.message
            : 'The analyst request could not be completed.',
      );
    } finally {
      clearTimeout(timeout);
      if (controller.current === requestController) controller.current = null;
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const send = (question: string) => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || busyRef.current) return;
    const history = messages
      .filter((message) => message.id !== 'welcome')
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));
    setMessages((previous) => [
      ...previous,
      { id: `question-${Date.now()}`, role: 'user', content: cleanQuestion },
    ]);
    setPending({ question: cleanQuestion, history });
    setDraft('');
    void submit(cleanQuestion, history);
  };

  const readyCount = status
    ? Object.values(status.data).filter((value) => value === 'present' || value === 'synthetic_fixture').length
    : 0;
  const isFixture = status && Object.values(status.data).length > 0 && Object.values(status.data).every((value) => value === 'synthetic_fixture');
  const chatReady = status?.chat_configured === true;

  return (
    <View style={s.screen}>
      <AppHeader title="Historical analyst" left={{ icon: 'back', label: 'Back', onPress: onBack }} />
      <KeyboardAvoidingView
        style={s.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          style={s.scroll}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        >
          <View style={s.intro}>
            <View style={s.introTop}>
              <View style={s.chartMark}>
                <Icon name="pulse" color={colors.green} size={21} />
              </View>
              <View style={s.introCopy}>
                <Text style={s.title}>Junction data</Text>
                <Text style={s.subtitle}>Historical patterns, queried locally</Text>
              </View>
              <View style={s.internalBadge}>
                <Text style={s.internalText}>INTERNAL</Text>
              </View>
            </View>
            <Text style={s.description}>
              Ask about spending by date, merchant, or category, or review a mortgage application timeline.
            </Text>
            <Text style={s.notice}>Historical dataset only · No live bank access · Avoid personal details</Text>
          </View>

          <View style={s.statusRow} accessibilityRole="text">
            {statusLoading ? (
              <>
                <ActivityIndicator size="small" color={colors.green} />
                <Text style={s.statusText}>Checking data service…</Text>
              </>
            ) : statusError ? (
              <Text style={s.statusError}>{statusError}</Text>
            ) : (
              <>
                <View style={[s.statusDot, (isFixture || readyCount < 4) && s.statusDotWarn]} />
                <Text style={s.statusText}>
                  {isFixture ? 'Synthetic example data' : `${readyCount} of 4 datasets available`}
                  {!chatReady ? ' · Gemini key not configured' : ''}
                </Text>
              </>
            )}
          </View>
          {statusError && (
            <Pressable
              onPress={() => setStatusRetry((previous) => previous + 1)}
              accessibilityRole="button"
              style={({ pressed }) => [s.retryConnection, pressed && s.pressed]}
            >
              <Text style={s.retryText}>Retry connection</Text>
            </Pressable>
          )}

          {messages.length === 1 && !statusError && (
            <View style={s.suggestions}>
              <Text style={s.suggestionLabel}>Try a question</Text>
              {SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => send(suggestion)}
                  disabled={busy || !chatReady}
                  accessibilityRole="button"
                  style={({ pressed }) => [s.suggestion, pressed && s.pressed]}
                >
                  <Text style={s.suggestionText}>{suggestion}</Text>
                  <Icon name="chevron" color={colors.green} size={17} />
                </Pressable>
              ))}
            </View>
          )}

          <View style={s.transcript} accessibilityLiveRegion="polite">
            {messages.map((message) => (
              <View
                key={message.id}
                style={[s.bubble, message.role === 'user' ? s.userBubble : s.assistantBubble]}
                accessible
                accessibilityLabel={`${message.role === 'user' ? 'You' : 'Analyst'}: ${message.content}`}
              >
                <Text style={[s.bubbleText, message.role === 'user' && s.userText]}>
                  {message.content}
                </Text>
              </View>
            ))}
            {busy && (
              <View style={[s.bubble, s.assistantBubble, s.loadingBubble]}>
                <ActivityIndicator size="small" color={colors.green} />
                <Text style={s.bubbleText}>Checking the dataset…</Text>
              </View>
            )}
          </View>

          {error && pending && (
            <Card style={s.errorCard}>
              <Text style={s.errorText} accessibilityRole="alert">{error}</Text>
              <Pressable
                onPress={() => void submit(pending.question, pending.history)}
                disabled={busy}
                accessibilityRole="button"
                style={({ pressed }) => [s.retry, pressed && s.pressed]}
              >
                <Text style={s.retryText}>Retry question</Text>
              </Pressable>
            </Card>
          )}

          <Text style={s.footer}>Mortgage outcomes are historical summaries, not lending advice.</Text>
        </ScrollView>

        <View style={s.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => send(draft)}
            placeholder="Ask about the historical data"
            placeholderTextColor={colors.faint}
            returnKeyType="send"
            style={s.input}
            accessibilityLabel="Ask the historical analyst a question"
            maxLength={2000}
            editable={!busy && chatReady && !statusError}
          />
          <Pressable
            onPress={() => send(draft)}
            disabled={!draft.trim() || busy || !chatReady || Boolean(statusError)}
            accessibilityRole="button"
            accessibilityLabel={busy ? 'Sending question' : 'Send question'}
            accessibilityState={{ disabled: !draft.trim() || busy || !chatReady || Boolean(statusError) }}
            style={({ pressed }) => [
              s.send,
              (!draft.trim() || busy || !chatReady || Boolean(statusError)) && s.sendDisabled,
              pressed && s.pressed,
            ]}
          >
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="chevron" color="#fff" size={20} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mint },
  body: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 12, gap: 12, paddingBottom: 18 },
  intro: { backgroundColor: colors.card, borderRadius: radius.card, padding: 16, gap: 12 },
  introTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chartMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: { flex: 1, gap: 2 },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 12, color: colors.ink2 },
  internalBadge: { borderRadius: radius.pill, backgroundColor: colors.greenSoft, paddingHorizontal: 8, paddingVertical: 5 },
  internalText: { color: colors.green, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  description: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  notice: { color: colors.faint, fontSize: 11.5, lineHeight: 16 },
  statusRow: {
    minHeight: 38,
    backgroundColor: '#fff',
    borderRadius: radius.card,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green2 },
  statusDotWarn: { backgroundColor: colors.warn },
  statusText: { flex: 1, color: colors.ink2, fontSize: 12 },
  statusError: { flex: 1, color: colors.neg, fontSize: 12 },
  retryConnection: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 2 },
  suggestions: { gap: 7 },
  suggestionLabel: { color: colors.ink2, fontSize: 12, fontWeight: '700', marginHorizontal: 2 },
  suggestion: {
    minHeight: 44,
    backgroundColor: '#fff',
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionText: { flex: 1, color: colors.ink, fontSize: 13 },
  transcript: { gap: 8 },
  bubble: { maxWidth: '90%', borderRadius: 15, paddingHorizontal: 13, paddingVertical: 10 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.green },
  bubbleText: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorCard: { borderWidth: 1, borderColor: colors.negBg, gap: 10 },
  errorText: { color: colors.neg, fontSize: 13, lineHeight: 18 },
  retry: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 2 },
  retryText: { color: colors.green, fontSize: 13, fontWeight: '700' },
  footer: { color: colors.faint, fontSize: 11, lineHeight: 15, marginHorizontal: 2 },
  composer: {
    backgroundColor: '#fff',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 14,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: colors.faint },
  pressed: { opacity: 0.75 },
});
