// "Ask Orava": Gemini-backed chat with the current money-health summary and historical data tools.

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  askOrava,
  getOravaStatus,
  type OravaChatMessage,
  type OravaMoneySummary,
  type OravaStatus,
} from '../lib/oravaChat';
import type { HealthReport } from '../orava/health';
import { colors, radius } from '../theme';
import { Icon } from './Icon';
import { Card } from './ui';

const SUGGESTIONS = [
  'What can I spend this week?',
  'Why is my score like this?',
  'How has grocery spending changed over time?',
];

export function OravaChat({ report }: { report: HealthReport }) {
  const [messages, setMessages] = useState<OravaChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! Ask me about your money this month or historical Junction data.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<OravaStatus | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [statusRetry, setStatusRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    question: string;
    history: OravaChatMessage[];
  } | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);

  const summary: OravaMoneySummary = {
    period: report.period,
    income: report.income,
    spending: report.spending,
    score: report.orava.score,
    health_message: report.orava.message,
    health_reasons: report.orava.reasons,
    safe_to_spend_this_week:
      report.stats.find((stat) => stat.key === 'safe')?.value ?? 'Unavailable',
    safe_to_spend_remaining: report.safe.left,
    per_day_after_today: report.safe.perDayAfter,
    everyday_extras:
      report.stats.find((stat) => stat.key === 'slips')?.value ?? 'Unavailable',
    everyday_extras_change:
      report.stats.find((stat) => stat.key === 'slips')?.sub ?? 'Unavailable',
    kept_rate: report.stats.find((stat) => stat.key === 'kept')?.value ?? 'Unavailable',
    breakdown: Object.fromEntries(report.split.map((part) => [part.label, part.amount])),
  };

  useEffect(() => {
    mounted.current = true;
    const statusController = new AbortController();
    setConnectionError(null);
    getOravaStatus(statusController.signal)
      .then((result) => {
        if (!mounted.current) return;
        setStatus(result);
        setConnectionError(null);
      })
      .catch((reason: unknown) => {
        if (!mounted.current || (reason instanceof Error && reason.name === 'AbortError')) return;
        setConnectionError(reason instanceof Error ? reason.message : 'Could not connect to Ask Orava.');
      });
    return () => {
      mounted.current = false;
      statusController.abort();
      controller.current?.abort();
    };
  }, [statusRetry]);

  const submit = async (question: string, history: OravaChatMessage[]) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const requestController = new AbortController();
    controller.current = requestController;
    const timeout = setTimeout(() => requestController.abort(), 90_000);
    setBusy(true);
    setError(null);
    try {
      const response = await askOrava(question, history, summary, requestController.signal);
      if (!mounted.current) return;
      setMessages((previous) => [...previous, { role: 'assistant', content: response.answer }]);
      setStatus((previous) =>
        previous ? { ...previous, data: response.data_status } : previous,
      );
      setPending(null);
    } catch (reason) {
      if (!mounted.current) return;
      setError(
        reason instanceof Error && reason.name === 'AbortError'
          ? 'This request timed out. Retry it when the service is ready.'
          : reason instanceof Error
            ? reason.message
            : 'Ask Orava could not complete the request.',
      );
    } finally {
      clearTimeout(timeout);
      if (controller.current === requestController) controller.current = null;
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const send = (text: string) => {
    const question = text.trim();
    if (!question || busyRef.current || connectionError || status?.chat_configured !== true) return;
    const history = messages.slice(-8);
    setMessages((previous) => [...previous, { role: 'user', content: question }]);
    setPending({ question, history });
    setDraft('');
    void submit(question, history);
  };

  const availableDatasetCount = status
    ? Object.values(status.data).filter(
        (value) => value === 'present' || value === 'synthetic_fixture',
      ).length
    : 0;

  return (
    <Card style={s.card}>
      <View style={s.statusRow} accessibilityRole="text">
        {busy ? (
          <ActivityIndicator size="small" color={colors.green} />
        ) : (
          <View style={s.statusDot} />
        )}
        <Text style={s.statusText}>
          {connectionError
            ? 'Ask Orava is unavailable'
            : status
              ? `${status.chat_configured ? 'Gemini configured' : 'Gemini key not configured'} · ${availableDatasetCount} of 4 historical datasets`
              : 'Connecting to Ask Orava…'}
        </Text>
      </View>
      {connectionError && (
        <Text style={s.errorText} accessibilityRole="alert">
          {connectionError}
        </Text>
      )}
      {connectionError && (
        <Pressable
          onPress={() => setStatusRetry((previous) => previous + 1)}
          role="button"
          style={s.retryButton}
        >
          <Text style={s.retryText}>Retry connection</Text>
        </Pressable>
      )}
      <View style={s.list}>
        {messages.map((message, index) => (
          <View
            key={`${index}-${message.role}`}
            style={[s.bubble, message.role === 'user' ? s.me : s.orava]}
          >
            <Text style={[s.text, message.role === 'user' && { color: '#fff' }]}>
              {message.content}
            </Text>
          </View>
        ))}
        {busy && (
          <View style={[s.bubble, s.orava]}>
            <Text style={s.text}>Thinking…</Text>
          </View>
        )}
      </View>

      {messages.length === 1 && (
        <View style={s.chips}>
          {SUGGESTIONS.map((q) => (
            <Pressable
              key={q}
              onPress={() => send(q)}
              disabled={busy || status?.chat_configured !== true || Boolean(connectionError)}
              role="button"
              style={({ pressed }) => [s.chip, pressed && { opacity: 0.75 }]}
            >
              <Text style={s.chipText}>{q}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {error && pending && (
        <View style={s.errorRow}>
          <Text style={s.errorText} accessibilityRole="alert">
            {error}
          </Text>
          <Pressable
            onPress={() => void submit(pending.question, pending.history)}
            disabled={busy}
            role="button"
          >
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      <View style={s.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => send(draft)}
          placeholder="Ask Orava about your money…"
          placeholderTextColor={colors.faint}
          returnKeyType="send"
          style={s.input}
          accessibilityLabel="Ask Orava a question"
          editable={!busy && status?.chat_configured === true && !connectionError}
        />
        <Pressable
          onPress={() => send(draft)}
          disabled={!draft.trim() || busy || status?.chat_configured !== true || Boolean(connectionError)}
          role="button"
          accessibilityLabel="Send"
          style={({ pressed }) => [
            s.send,
            (!draft.trim() || busy || status?.chat_configured !== true || Boolean(connectionError)) &&
              s.sendDisabled,
            pressed && { opacity: 0.75 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Icon name="chevron" color="#fff" size={20} strokeWidth={2.4} />
          )}
        </Pressable>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { gap: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green2 },
  statusText: { flex: 1, color: colors.ink2, fontSize: 11.5 },
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
  errorRow: { gap: 6 },
  errorText: { color: colors.neg, fontSize: 12, lineHeight: 17 },
  retryText: { color: colors.green, fontWeight: '700', fontSize: 12 },
  retryButton: { alignSelf: 'flex-start', paddingVertical: 3 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  sendDisabled: { backgroundColor: colors.faint },
});
