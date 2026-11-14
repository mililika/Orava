import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { HomeScreen } from './src/screens/HomeScreen';
import { colors } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={s.outside} edges={['top', 'bottom']}>
        {/* On a wide browser window, keep the app phone-sized in the middle. */}
        <View style={s.phone}>
          <HomeScreen />
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
