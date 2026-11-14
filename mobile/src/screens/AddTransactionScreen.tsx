// "New transaction": expense or income, amount, category grid, optional description.

import { useState } from 'react';
import {
  Keyboard,
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
import { CategoryIcon } from '../components/CategoryIcon';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryInfo } from '../data/categories';
import type { Mood } from '../orava/types';
import { colors, radius } from '../theme';

export interface NewTx {
  category: string;
  merchant: string;
  /** Signed: negative = money out. */
  amount: number;
}

export function AddTransactionScreen({
  onSave,
  onClose,
  orava,
}: {
  onSave: (t: NewTx) => void;
  onClose: () => void;
  orava?: { mood: Mood; onPress: () => void };
}) {
  const [kind, setKind] = useState<'out' | 'in'>('out');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cats = kind === 'out' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const value = Number(amount.replace(',', '.'));

  const switchKind = (k: 'out' | 'in') => {
    setKind(k);
    setCategory(null);
    setError(null);
  };

  const save = () => {
    if (!(value > 0)) return setError('Enter an amount above zero.');
    if (!category) return setError('Choose a category.');
    onSave({
      category,
      merchant: note.trim() || categoryInfo(category).name,
      amount: Math.round((kind === 'out' ? -value : value) * 100) / 100,
    });
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader
        title="New transaction"
        left={{ icon: 'close', label: 'Close', onPress: onClose }}
        orava={orava}
      />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <View style={s.segment}>
          {(['out', 'in'] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => switchKind(k)}
              style={[s.segItem, kind === k && s.segOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: kind === k }}
            >
              <Text style={[s.segText, kind === k && s.segTextOn]}>
                {k === 'out' ? 'Expense' : 'Income'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.label}>Amount</Text>
          <View style={s.amountRow}>
            <Text style={s.sign}>{kind === 'out' ? '−' : '+'}</Text>
            <TextInput
              style={s.amount}
              value={amount}
              onChangeText={(t) => {
                setAmount(t.replace(/[^0-9.,]/g, ''));
                setError(null);
              }}
              placeholder="0.00"
              placeholderTextColor="#b7c0b9"
              keyboardType="decimal-pad"
              autoFocus={Platform.OS === 'web'}
              accessibilityLabel="Amount in euros"
            />
            <Text style={s.euro}>€</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Category</Text>
          <View style={s.grid}>
            {cats.map((c) => {
              const on = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    Keyboard.dismiss();
                    setCategory(c);
                    setError(null);
                  }}
                  style={s.cat}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <View style={[s.catRing, on && s.catRingOn]}>
                    <CategoryIcon category={c} size={46} />
                  </View>
                  <Text style={[s.catName, on && s.catNameOn]} numberOfLines={1}>
                    {categoryInfo(c).name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Description (optional)</Text>
          <TextInput
            style={s.input}
            value={note}
            onChangeText={setNote}
            placeholder={category ? categoryInfo(category).name : 'e.g. S-market'}
            placeholderTextColor="#9aa59d"
            returnKeyType="done"
            onSubmitEditing={save}
          />
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        <Pressable
          onPress={save}
          role="button"
          style={({ pressed }) => [s.save, pressed && { opacity: 0.8 }]}
        >
          <Text style={s.saveText}>Save transaction</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mint },
  body: { padding: 12, gap: 12, paddingBottom: 32 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: radius.pill,
    padding: 4,
  },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: radius.pill, alignItems: 'center' },
  segOn: { backgroundColor: colors.green },
  segText: { fontSize: 15, fontWeight: '600', color: colors.green },
  segTextOn: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: radius.card, padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink2, marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sign: { fontSize: 30, fontWeight: '700', color: colors.ink2 },
  amount: {
    flex: 1,
    fontSize: 34,
    fontWeight: '800',
    color: colors.ink,
    paddingVertical: 2,
    minWidth: 0,
  },
  euro: { fontSize: 26, fontWeight: '700', color: colors.ink2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  cat: { width: '25%', alignItems: 'center', gap: 5 },
  catRing: { borderRadius: 30, padding: 3, borderWidth: 2, borderColor: 'transparent' },
  catRingOn: { borderColor: colors.green },
  catName: { fontSize: 11.5, color: colors.ink2, maxWidth: '96%' },
  catNameOn: { color: colors.green, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.ink,
  },
  error: { color: colors.neg, fontSize: 13.5, marginHorizontal: 4 },
  save: {
    backgroundColor: colors.green,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
