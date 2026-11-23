import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import type { Account } from '@orava/core';

import { getAccount, setUnauthorizedHandler } from './src/lib/api';
import { accessToken, onSignedOut, signOut } from './src/lib/auth';
import { MainScreen } from './src/screens/MainScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { colors } from './src/theme';

export default function App() {
  // undefined = still checking for a session (after a reload), null = signed out.
  const [account, setAccount] = useState<Account | null | undefined>(undefined);

  useEffect(() => {
    // Signed out here, in another tab, or the session couldn't be refreshed: back to login.
    const unsubscribe = onSignedOut(() => setAccount(null));
    // Our API refused the token (e.g. no Orava user is linked to it): end the session too.
    setUnauthorizedHandler(() => void signOut());
    // After a reload, Supabase restores the session from localStorage; then load the account.
    (async () => {
      try {
        setAccount((await accessToken()) ? await getAccount() : null);
      } catch {
        setAccount(null); // e.g. the server is down: the login screen says so on the next try
      }
    })();
    return () => {
      unsubscribe();
      setUnauthorizedHandler(undefined);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={s.outside} edges={['top', 'bottom']}>
        {/* On a wide browser window, keep the app phone-sized in the middle. */}
        <View style={s.phone}>
          {account === undefined ? (
            <View style={s.loading}>
              <ActivityIndicator color={colors.green} size="large" />
            </View>
          ) : account ? (
            <MainScreen account={account} onLogout={signOut} />
          ) : (
            <LoginScreen onLoggedIn={setAccount} />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const web = Platform.OS === 'web';

const s = StyleSheet.create({
  outside: { flex: 1, backgroundColor: web ? colors.outside : '#fff', alignItems: 'center' },
  phone: { flex: 1, width: '100%', maxWidth: web ? 420 : undefined, overflow: 'hidden' },
  loading: { flex: 1, backgroundColor: colors.mint, justifyContent: 'center' },
});
