// Email + password sign-in with Supabase Auth (lib/auth.ts), then loads the account from our API.

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Account } from '@orava/core';

import { getAccount } from '../lib/api';
import { signIn } from '../lib/auth';
import { colors, radius } from '../theme';

export function LoginScreen({ onLoggedIn }: { onLoggedIn: (a: Account) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      onLoggedIn(await getAccount());
    } catch (e) {
      // signIn and lib/api.ts both throw messages safe to show (e.g. a login with no Orava user).
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>
        <Text style={s.title}>Orava</Text>
        <Text style={s.sub}>Sign in to see your money coach</Text>

        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
          editable={!busy}
        />

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={!busy}
        />

        {error && <Text style={s.error}>{error}</Text>}

        <Pressable
          onPress={submit}
          disabled={busy}
          style={[s.btn, busy && { opacity: 0.7 }]}
          role="button"
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign in</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mint, justifyContent: 'center', padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: colors.green },
  sub: { fontSize: 14, color: colors.ink2, marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink2, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 14,
  },
  error: { color: colors.neg, fontSize: 13.5, marginBottom: 12 },
  btn: {
    backgroundColor: colors.green,
    borderRadius: radius.pill,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
