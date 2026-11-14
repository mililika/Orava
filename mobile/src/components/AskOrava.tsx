// "Ask Orava": one question about the current insight. Only rendered when the AI server is
// reachable and has a key (see src/lib/ai.ts); otherwise part A is unchanged.
// A what-if answer is handed to the existing what-if calculation (onWhatIf), so every number
// on screen still comes from analysis.ts. AI text is labelled as AI wording.

import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import type { MonthAnalysis } from '../orava/analysis';
import { QUESTION_MAX } from '../orava/ai/ask';
import { AiError, askOrava, type AiTransport, type AskResult } from '../orava/ai/flow';
import type { SavingsGoal } from '../orava/goal';
import { colors, eur, radius } from '../theme';
import { Pill } from './ui';

const whole = (n: number) => eur(n, 0);
const purchases = (n: number) => {
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${shown} purchase${n === 1 ? '' : 's'}`;
};

export function AskOrava({
  ai,
  analysis,
  goal,
  onWhatIf,
}: {
  ai: AiTransport;
  analysis: MonthAnalysis;
  goal: SavingsGoal | null;
  onWhatIf: (category: string, reduceBy: number) => void;
}) {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const r = await askOrava(q, analysis, goal, ai);
      setAnswer(r);
      if (r.kind === 'whatIf') onWhatIf(r.category, r.reduceBy);
    } catch (e) {
      setError(
        e instanceof AiError ? e.userMessage : 'Orava couldn’t answer right now. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={s.divider} />
      <Text style={s.h3}>Ask Orava</Text>
      <Text style={s.muted}>
        For example “Why did restaurants go up?” or “What if I spent €50 less on restaurants?”
      </Text>
      <View style={s.row}>
        <TextInput
          style={s.input}
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask about your spending"
          placeholderTextColor={colors.faint}
          maxLength={QUESTION_MAX}
          returnKeyType="send"
          onSubmitEditing={submit}
          editable={!busy}
          accessibilityLabel="Question for Orava"
        />
        <Pill title="Ask" onPress={submit} disabled={busy || !question.trim()} />
      </View>

      {busy && (
        <View style={s.busy}>
          <ActivityIndicator color={colors.green} />
          <Text style={s.muted}>Orava is thinking…</Text>
        </View>
      )}
      {error && (
        <Text style={s.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      {answer?.kind === 'unsupported' && (
        <Text style={[s.text, { color: colors.ink2 }]} accessibilityLiveRegion="polite">
          {answer.message}
        </Text>
      )}
      {answer && answer.kind !== 'unsupported' && (
        <View style={s.bubble} accessibilityLiveRegion="polite">
          {answer.text ? (
            <>
              <Text style={s.label}>ORAVA · AI WORDING</Text>
              <Text style={s.text}>{answer.text}</Text>
            </>
          ) : (
            <Text style={s.muted}>{answer.textError}</Text>
          )}
          {answer.kind === 'explain' && (
            <Text style={s.facts}>
              {answer.category}: {purchases(answer.facts.countCurrent)},{' '}
              {whole(answer.facts.current)} on days 1–{answer.facts.days} · usual{' '}
              {purchases(answer.facts.countUsual)}, {whole(answer.facts.usual)} (
              {answer.facts.months})
            </Text>
          )}
          {answer.kind === 'whatIf' && (
            <Text style={s.facts}>
              The result below is calculated from your transactions, not by AI.
            </Text>
          )}
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 14 },
  h3: { fontSize: 15.5, fontWeight: '700', color: colors.green, marginBottom: 2 },
  muted: { fontSize: 12.5, lineHeight: 18, color: colors.faint },
  text: { fontSize: 14.5, lineHeight: 21, color: colors.ink, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
  },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  error: { color: colors.neg, fontSize: 13.5, marginTop: 8 },
  bubble: {
    marginTop: 10,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fafcfa',
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: colors.faint },
  facts: { fontSize: 12.5, lineHeight: 18, color: colors.ink2, marginTop: 6 },
});
