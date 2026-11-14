import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Transaction } from '../data/demoAccount';
import { colors, eur } from '../theme';
import { Icon } from '../components/Icon';
import { Card } from '../components/ui';

const STARTERS = ['What’s safe to spend this week?', 'Why are my bills higher?', 'Show me a small win'];

function answerFor(question: string, txs: Transaction[], balance: number) {
  const lower = question.toLowerCase();
  const restaurants = txs.filter((t) => t.category === 'Restaurants').reduce((n, t) => n + Math.abs(t.amount), 0);
  const bills = txs.filter((t) => ['Housing', 'Utilities'].includes(t.category)).reduce((n, t) => n + Math.abs(t.amount), 0);
  if (lower.includes('safe') || lower.includes('spend')) {
    const safe = Math.max(0, Math.round(Math.min(balance * 0.35, 275)));
    return `I’d keep this week’s flexible spending under ${eur(safe)}. That leaves room for your regular payments and a small buffer. Your current balance is ${eur(balance)}.`;
  }
  if (lower.includes('bill')) return `Your regular bills are ${eur(bills)} this month. The change is mostly from housing and utilities, not everyday spending. I’d treat ${eur(Math.round(bills * 0.1))} as your bill buffer.`;
  if (lower.includes('win')) return `A small win: you have ${eur(Math.round(restaurants))} in restaurant spending visible here. One home-cooked meal this week would keep about ${eur(25)} in your pocket.`;
  return `Here’s what I can see in your recent transactions: ${eur(restaurants)} on restaurants and ${eur(bills)} on regular bills. Ask me about safe spending, bills, or a small win.`;
}

export function FinancialHealthScreen({ txs, balance, onBack }: { txs: Transaction[]; balance: number; onBack: () => void }) {
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState<string[]>([]);
  const latestAnswer = useMemo(() => (asked.length ? answerFor(asked[asked.length - 1], txs, balance) : null), [asked, txs, balance]);
  const ask = (value = question) => {
    if (!value.trim()) return;
    setAsked((items) => [...items, value.trim()]);
    setQuestion('');
  };
  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={onBack} style={s.back} accessibilityLabel="Back"><Icon name="chevron" color={colors.green} /></Pressable>
        <View><Text style={s.eyebrow}>ORAVA / FINANCIAL HEALTH</Text><Text style={s.title}>Talk to your money</Text></View>
        <View style={s.dot} />
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.intro}><Text style={s.introTitle}>No jargon. Just your numbers.</Text><Text style={s.introText}>Ask anything about this month and I’ll show you what changed, why it matters, and what you can do next.</Text></View>
        <Text style={s.section}>TRY ASKING</Text>
        <View style={s.chips}>{STARTERS.map((item) => <Pressable key={item} onPress={() => ask(item)} style={s.chip}><Text style={s.chipText}>{item}</Text></Pressable>)}</View>
        {asked.map((item, i) => <View key={`${item}-${i}`}><View style={s.userBubble}><Text style={s.userText}>{item}</Text></View>{i === asked.length - 1 && latestAnswer ? <Card style={s.answer}><View style={s.answerHead}><View style={s.avatar}><Text style={s.avatarText}>O</Text></View><Text style={s.answerLabel}>ORAVA · BASED ON YOUR TRANSACTIONS</Text></View><Text style={s.answerText}>{latestAnswer}</Text><Pressable style={s.learn}><Text style={s.learnText}>See how I worked that out  →</Text></Pressable></Card> : null}</View>)}
        <View style={s.inputRow}><TextInput value={question} onChangeText={setQuestion} onSubmitEditing={() => ask()} placeholder="Ask in your own words…" placeholderTextColor={colors.faint} style={s.input} returnKeyType="send"/><Pressable onPress={() => ask()} style={s.send} accessibilityLabel="Ask Orava"><Text style={s.sendText}>↑</Text></Pressable></View>
        <Text style={s.disclaimer}>Orava explains patterns, not financial advice. Your data stays in S-mobiili.</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mint },
  header: { backgroundColor: colors.card, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  back: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  dot: { marginLeft: 'auto', width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green2 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, fontWeight: '700', color: colors.green2 },
  title: { fontSize: 22, fontWeight: '700', color: colors.green, marginTop: 2 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  intro: { backgroundColor: colors.green, padding: 18, borderRadius: 18 },
  introTitle: { color: '#fff', fontSize: 19, fontWeight: '700', marginBottom: 5 },
  introText: { color: '#e6f2eb', fontSize: 14, lineHeight: 21 },
  section: { fontSize: 11, letterSpacing: 1.1, color: colors.faint, fontWeight: '700', marginTop: 2 },
  chips: { gap: 8 }, chip: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 13 }, chipText: { color: colors.green, fontSize: 13, fontWeight: '600' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.warnBg, borderRadius: 16, borderBottomRightRadius: 4, padding: 12, maxWidth: '86%', marginTop: 5 }, userText: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  answer: { marginTop: 8, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line }, answerHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }, avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center' }, avatarText: { color: '#fff', fontWeight: '700' }, answerLabel: { fontSize: 9, letterSpacing: 0.7, fontWeight: '700', color: colors.green2 }, answerText: { fontSize: 15, lineHeight: 22, color: colors.ink }, learn: { marginTop: 12 }, learnText: { color: colors.warn, fontWeight: '700', fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }, input: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, fontSize: 14, color: colors.ink }, send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.warn, justifyContent: 'center', alignItems: 'center' }, sendText: { color: '#fff', fontSize: 22, fontWeight: '700' }, disclaimer: { color: colors.faint, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 2 },
});
