// "Was this you?" — full screen over the app when Orava spots an unusual payment.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Mascot } from '../orava/Mascot';
import type { OravaAlert } from '../orava/types';
import { colors, eur } from '../theme';

const RED = '#C4321F';

export function FraudScreen({
  alert,
  onFreeze,
  onItWasMe,
  onClose,
}: {
  alert: OravaAlert;
  onFreeze: () => void;
  onItWasMe: () => void;
  onClose: () => void;
}) {
  const p = alert.payment!;
  const [, mm, dd] = p.date.split('-');

  return (
    <View style={s.screen}>
      <View style={s.top} role="alert">
        <View style={s.topRow}>
          <Pressable onPress={onClose} style={s.close} role="button" aria-label="Close">
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M6 6l12 12M18 6 6 18"
                stroke="#fff"
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
          <Text style={s.kicker}>ORAVA · UNUSUAL PAYMENT</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={s.mascot}>
          <Mascot mood="alert" size={104} lively />
        </View>
        <Text style={s.h1}>Was this you?</Text>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={s.payment}>
          <Text style={s.amount}>{eur(-p.amount)}</Text>
          <Text style={s.merchant}>{p.merchant}</Text>
          <Text style={s.meta}>
            {p.category} · {dd}.{mm}.
          </Text>
        </View>

        <Text style={s.h2}>Why Orava noticed it</Text>
        {(alert.reasons ?? []).map((r) => (
          <View key={r} style={s.reason}>
            <View style={s.dot}>
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path
                  d="M12 7v6M12 17h.01"
                  stroke="#A3261A"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <Text style={s.reasonText}>{r}</Text>
          </View>
        ))}

        <View style={s.actions}>
          <Pressable onPress={onFreeze} style={[s.btn, s.btnRed]} role="button">
            <Text style={[s.btnText, { color: '#fff' }]}>No, it wasn’t me — freeze card</Text>
          </Pressable>
          <Pressable onPress={onItWasMe} style={[s.btn, s.btnOutline]} role="button">
            <Text style={s.btnText}>Yes, it was me</Text>
          </Pressable>
          <Text style={s.note}>
            Freezing is instant and you can undo it in the app. Not sure? Call S-Bank’s customer
            service.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: '#fff',
  },
  top: { backgroundColor: RED, alignItems: 'center', paddingBottom: 20, gap: 6 },
  topRow: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  kicker: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  mascot: { backgroundColor: '#fff', borderRadius: 999, padding: 6 },
  h1: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 4 },
  body: { padding: 20, gap: 14, flexGrow: 1 },
  payment: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, gap: 4 },
  amount: { fontSize: 34, fontWeight: '800', color: colors.ink },
  merchant: { fontSize: 17, fontWeight: '600', color: colors.ink },
  meta: { fontSize: 15, color: colors.ink2 },
  h2: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 4 },
  reason: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FBE0DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: { flex: 1, fontSize: 16, lineHeight: 22, color: colors.ink },
  actions: { gap: 10, marginTop: 'auto', paddingTop: 12 },
  btn: {
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnRed: { backgroundColor: RED },
  btnOutline: { borderWidth: 2, borderColor: colors.ink, backgroundColor: '#fff' },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  note: { fontSize: 14, lineHeight: 20, color: colors.ink2, textAlign: 'center', marginTop: 4 },
});
