// A list row that slides left to reveal a trash button on a soft red background, the usual iOS/Android pattern.
// Drag left past half the button and let go: it stays open. Drag back, tap the row,
// or open another row to close it. Built on PanResponder, so it needs no extra library.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../theme';
import { Icon } from './Icon';

const BUTTON = 80;
const web = Platform.OS === 'web';

export function SwipeRow({
  children,
  open,
  onOpenChange,
  onDelete,
}: {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}) {
  const [x] = useState(() => new Animated.Value(0));
  const cb = useRef({ open, onOpenChange });
  useEffect(() => {
    cb.current = { open, onOpenChange };
  });

  // Follow the `open` prop, e.g. when another row opens and this one should close.
  useEffect(() => {
    Animated.spring(x, {
      toValue: open ? -BUTTON : 0,
      friction: 9,
      tension: 80,
      useNativeDriver: false,
    }).start();
  }, [open, x]);

  // The handlers read the ref only while a gesture runs, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    const start = () => (cb.current.open ? -BUTTON : 0);
    const settle = (dx: number) => {
      // A tap on an open row closes it.
      if (Math.abs(dx) < 4 && cb.current.open) dx = BUTTON;
      const end = Math.min(0, Math.max(-BUTTON * 1.6, start() + dx));
      const shouldOpen = end < -BUTTON / 2;
      // Re-run the spring even if `open` doesn't change.
      Animated.spring(x, {
        toValue: shouldOpen ? -BUTTON : 0,
        friction: 9,
        tension: 80,
        useNativeDriver: false,
      }).start();
      if (shouldOpen !== cb.current.open) cb.current.onOpenChange(shouldOpen);
    };
    const horizontal = (g: { dx: number; dy: number }) =>
      Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
    return PanResponder.create({
      // Phones hand the gesture over mid-drag; React Native Web doesn't, so claim it on press there
      // (page scrolling on web is the browser's own and is not affected).
      onStartShouldSetPanResponder: () => web,
      onMoveShouldSetPanResponder: (_, g) => horizontal(g),
      onPanResponderTerminationRequest: (_, g) => !horizontal(g),
      onPanResponderMove: (_, g) => {
        const v = start() + g.dx;
        // Rubber-band past the button, no movement to the right of closed.
        x.setValue(v > 0 ? 0 : v < -BUTTON ? -BUTTON + (v + BUTTON) * 0.4 : v);
      },
      onPanResponderRelease: (_, g) => settle(g.dx),
      onPanResponderTerminate: (_, g) => settle(g.dx),
    });
  });

  return (
    <View style={s.wrap}>
      <Pressable
        onPress={onDelete}
        style={s.delete}
        role="button"
        accessibilityLabel="Delete transaction"
      >
        <View style={s.trash}>
          <Icon name="trash" size={22} color={colors.neg} strokeWidth={2} />
        </View>
      </Pressable>
      <Animated.View style={[s.row, { transform: [{ translateX: x }] }]} {...pan.panHandlers}>
        <View
          accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  delete: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: BUTTON,
    backgroundColor: 'rgba(179, 38, 30, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trash: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(179, 38, 30, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    backgroundColor: '#fff',
    // On web a mouse drag would select text, and then the row never gets the gesture.
    ...(web ? ({ userSelect: 'none', touchAction: 'pan-y' } as object) : null),
  },
});
