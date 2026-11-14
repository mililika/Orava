import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import type { Account } from './src/data/demoAccount';
import { MainScreen } from './src/screens/MainScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { colors } from './src/theme';

export default function App() {
  const [account, setAccount] = useState<Account | null>(null);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={s.outside} edges={['top', 'bottom']}>
        {/* On a wide browser window, keep the app phone-sized in the middle. */}
        <View style={s.phone}>
          {account ? (
            <MainScreen account={account} onLogout={() => setAccount(null)} />
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
});
