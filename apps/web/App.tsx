import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import type { Account } from '@orava/core';

import { getAccount, logout, me, setUnauthorizedHandler } from './src/lib/api';
import { MainScreen } from './src/screens/MainScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { colors } from './src/theme';

export default function App() {
  // undefined = still checking for a session (after a reload), null = signed out.
  const [account, setAccount] = useState<Account | null | undefined>(undefined);

  useEffect(() => {
    // Any 401 later on (the session expired or was signed out elsewhere) goes back to login.
    setUnauthorizedHandler(() => setAccount(null));
    (async () => {
      try {
        setAccount((await me()) ? await getAccount() : null);
      } catch {
        setAccount(null); // e.g. the server is down: the login screen says so on the next try
      }
    })();
    return () => setUnauthorizedHandler(undefined);
  }, []);

  const signOut = async () => {
    try {
      await logout();
    } catch {
      // Signed out on this screen anyway; the server session expires on its own.
    }
    setAccount(null);
  };

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
