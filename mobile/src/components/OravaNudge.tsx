// Orava's speech bubble on the other tabs, pointing down at the Orava tab.
// Tap it to act (open the fraud check or the Orava tab); the × hides it.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ALERT_TONES } from '../orava/moods';
import type { AlertKind, OravaAlert } from '../orava/types';
import { colors } from '../theme';

const ICONS: Record<AlertKind, string> = {
  fraud: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z M12 8v5 M12 16h.01',
  overspend: 'M12 3 2 20h20z M12 10v4 M12 17h.01',
  safe: 'M12 3 2 20h20z M12 10v4 M12 17h.01',
  good: 'M5 12l5 5 9-10',
};

export function OravaNudge({
  alert,
  onOpen,
  onDismiss,
}: {
  alert: OravaAlert;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const tone = ALERT_TONES[alert.kind];
  return (
    <View style={[s.wrap, { borderColor: tone.border }]} role="alert">
      <View style={[s.tip, { borderColor: tone.border }]} />
      <Pressable onPress={onOpen} style={s.body} role="button" accessibilityHint="Opens Orava">
        <View style={[s.icon, { backgroundColor: tone.bg }]}>
          <Svg width={17} height={17} viewBox="0 0 24 24">
            <Path
              d={ICONS[alert.kind]}
              stroke={tone.fg}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[s.title, { color: tone.fg }]}>{alert.title}</Text>
          <Text style={s.text}>{alert.text}</Text>
          <Text style={s.cta}>{alert.cta}</Text>
        </View>
      </Pressable>
      <Pressable onPress={onDismiss} style={s.close} role="button" aria-label="Dismiss">
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path
            d="M6 6l12 12M18 6 6 18"
            stroke={colors.ink2}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </Svg>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 76,
    zIndex: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    boxShadow: '0 12px 30px rgba(23,37,27,0.25)',
  },
  tip: {
    position: 'absolute',
    left: '50%',
    bottom: -10,
    marginLeft: -9,
    width: 18,
    height: 18,
    backgroundColor: '#fff',
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderBottomRightRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  body: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, paddingRight: 44 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800' },
  text: { fontSize: 14, lineHeight: 19, color: colors.ink },
  cta: { fontSize: 13, fontWeight: '700', color: colors.green, marginTop: 2 },
  close: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
