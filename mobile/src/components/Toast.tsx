// A small message at the bottom of the screen. Works the same on phone and web
// (React Native's Alert does nothing in the browser).

import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function useToast() {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((t: string) => {
    if (timer.current) clearTimeout(timer.current);
    setText(t);
    timer.current = setTimeout(() => setText(null), 2200);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const toast = text ? (
    <View style={s.wrap} pointerEvents="none">
      <Text style={s.text}>{text}</Text>
    </View>
  ) : null;

  return { show, toast };
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 84,
    backgroundColor: '#1d2a21',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  text: { color: '#fff', fontSize: 14, textAlign: 'center' },
});
