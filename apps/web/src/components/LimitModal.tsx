// "You've reached the limit": pops up whenever the server refuses an AI request with 429
// `ai_limit` (lib/api.ts reports it through lib/aiLimit.ts), from an overview or from Ask Orava.

import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { type AiLimitHit, minutesUntil, onLimitReached } from '../lib/aiLimit';
import { Mascot } from '../orava/Mascot';
import { colors, radius } from '../theme';

const CONTACT = 'mykhailokazymyr@gmail.com';

export function LimitModal() {
  const [hit, setHit] = useState<AiLimitHit | null>(null);
  useEffect(() => onLimitReached(setHit), []);

  return (
    <Modal visible={!!hit} transparent animationType="fade" onRequestClose={() => setHit(null)}>
      <View style={s.backdrop}>
        <View style={s.card} accessibilityRole="alert">
          <Mascot mood="worried" size={72} ground={false} />
          <Text style={s.title}>You&apos;ve reached the limit</Text>
          <Text style={s.body}>
            Sorry, we had to protect our Google credentials, so we had to restrict the usage.{' '}
            {hit?.message}
          </Text>
          {hit ? (
            <Text style={s.when}>Orava can answer again in {minutesUntil(hit.retryAt)}.</Text>
          ) : null}
          <Text style={s.body}>
            If this blocks your review, email{' '}
            <Text
              style={s.link}
              role="link"
              onPress={() =>
                Linking.openURL(`mailto:${CONTACT}?subject=${encodeURIComponent('Orava limit')}`)
              }
            >
              {CONTACT}
            </Text>
            . We&apos;ll answer quickly and extend your limit.
          </Text>
          <Pressable
            onPress={() => setHit(null)}
            role="button"
            style={({ pressed }) => [s.btn, pressed && { opacity: 0.8 }]}
          >
            <Text style={s.btnText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,20,20,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 20, color: colors.ink2, textAlign: 'center' },
  link: { color: colors.green, fontWeight: '600', textDecorationLine: 'underline' },
  when: { fontSize: 14, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  btn: {
    alignSelf: 'stretch',
    marginTop: 6,
    backgroundColor: colors.green,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
