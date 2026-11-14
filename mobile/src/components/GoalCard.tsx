// Optional savings goal: add, edit or remove. Validation lives in src/orava/goal.ts.
// The goal only puts what-if amounts into perspective; it never changes balance or mood.

import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { GOAL_NAME_MAX, parseGoal, type SavingsGoal } from '../orava/goal';
import { colors, eur, radius } from '../theme';
import { Card, Pill } from './ui';

export function GoalCard({
  goal,
  onChange,
}: {
  goal: SavingsGoal | null;
  onChange: (g: SavingsGoal | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setName(goal?.name ?? '');
    setAmount(goal ? String(goal.amount) : '');
    setError(null);
    setEditing(true);
  };
  const save = () => {
    const parsed = parseGoal(name, amount);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    onChange(parsed.value);
    setEditing(false);
  };

  if (editing) {
    return (
      <Card>
        <Text style={s.h2}>{goal ? 'Edit your savings goal' : 'Add a savings goal'}</Text>
        <Text style={s.label}>Name (optional)</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Emergency buffer"
          placeholderTextColor={colors.faint}
          maxLength={GOAL_NAME_MAX + 10}
          accessibilityLabel="Goal name"
          returnKeyType="next"
        />
        <Text style={s.label}>Goal amount (€)</Text>
        <TextInput
          style={s.input}
          value={amount}
          onChangeText={(t) => {
            setAmount(t);
            if (error) setError(null);
          }}
          placeholder="500"
          placeholderTextColor={colors.faint}
          keyboardType="decimal-pad"
          accessibilityLabel="Goal amount in euros"
          onSubmitEditing={save}
        />
        {error && (
          <Text style={s.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <View style={s.row}>
          <Pill title="Save goal" onPress={save} />
          <Pill title="Cancel" variant="outline" onPress={() => setEditing(false)} />
        </View>
      </Card>
    );
  }

  if (!goal) {
    return (
      <Card>
        <Text style={s.h2}>Your savings goal</Text>
        <Text style={s.muted}>
          Optional. Add a goal to see what a change above could cover. Nothing is moved or saved for
          you.
        </Text>
        <View style={s.row}>
          <Pill title="Add a goal" variant="outline" onPress={startEdit} />
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={s.h2}>Your savings goal</Text>
      <Text style={s.goal}>
        {goal.name} · {eur(goal.amount, goal.amount % 1 ? 2 : 0)}
      </Text>
      <Text style={s.muted}>Used only to put the change above into perspective.</Text>
      <View style={s.row}>
        <Pill title="Edit" variant="outline" onPress={startEdit} label="Edit savings goal" />
        <Pill
          title="Remove"
          variant="outline"
          onPress={() => onChange(null)}
          label="Remove savings goal"
        />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  h2: { fontSize: 17, fontWeight: '700', color: colors.green, marginBottom: 4 },
  goal: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  muted: { fontSize: 12.5, lineHeight: 18, color: colors.faint },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink2, marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.ink,
  },
  error: { color: colors.neg, fontSize: 13.5, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
});
