// Orava floating over the home screen.
// Drag it anywhere; let go and it snaps to the nearest side. Tap it to hop and open Money health.
// It greets the user when the app opens and speaks up whenever its message changes.
// A message with action buttons stays up until one is pressed.

import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Mascot } from '../orava/Mascot';
import { MOODS } from '../orava/moods';
import type { Mood } from '../orava/types';
import { SpeechBubble, type BubbleAction } from './SpeechBubble';

const W = 116;
const H = Math.round((W * 230) / 220);
const MARGIN = 4;
const BUBBLE_W = 260;
const TAP_SLOP = 6;
/** Keep clear of the header bar. */
const TOP = 56;

interface Props {
  mood: Mood;
  /** What Orava says. A new value pops the bubble up again. */
  message: string;
  /** Speaker line; defaults to the mood's. */
  who?: string;
  actions?: BubbleAction[];
  /** Shown once, above the first message. */
  greeting?: string;
  onOpen: () => void;
  /** Called when a message without buttons has been shown long enough. */
  onQuiet?: () => void;
  /** Keeps position and greeting state while another screen is showing. */
  hidden?: boolean;
}

export function FloatingOrava(p: Props) {
  const { mood, message, actions, greeting, hidden } = p;
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [pos] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const at = useRef({ x: 0, y: 0 });
  const areaRef = useRef(area);
  const props = useRef(p);
  const [dragging, setDragging] = useState(false);
  const [side, setSide] = useState({ right: true, below: false });
  const [hop, setHop] = useState(0);

  // The bubble shows until its timer marks the current message as said; said messages don't repeat.
  const [said, setSaid] = useState<string[]>([]);
  const [greeted, setGreeted] = useState(!greeting);
  const bubble = !said.includes(message);
  const sticky = Boolean(actions?.length);

  useEffect(() => {
    props.current = p;
  });

  useEffect(() => {
    const id = pos.addListener((v) => (at.current = v));
    return () => pos.removeListener(id);
  }, [pos]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    const first = !areaRef.current;
    areaRef.current = { w, h };
    setArea({ w, h });
    if (first) pos.setValue({ x: w - W - MARGIN, y: h - H - 16 });
  };

  // Each new message stays up for a while (the greeting longer); messages with buttons stay.
  useEffect(() => {
    if (sticky) return;
    const t = setTimeout(
      () => {
        setSaid((prev) => [...prev, message]);
        setGreeted(true);
        props.current.onQuiet?.();
      },
      greeted ? 7000 : 9000,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, sticky]);

  // The handlers read the refs only while a gesture runs, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    let moved = false;
    const snap = () => {
      const a = areaRef.current;
      if (!a) return;
      const { x, y } = at.current;
      const right = x + W / 2 > a.w / 2;
      const ty = Math.min(Math.max(y, TOP), a.h - H - MARGIN);
      setSide({ right, below: ty < 200 });
      Animated.spring(pos, {
        toValue: { x: right ? a.w - W - MARGIN : MARGIN, y: ty },
        friction: 7,
        useNativeDriver: false,
      }).start();
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > TAP_SLOP,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        moved = false;
        pos.setOffset({ ...at.current });
        pos.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, g) => {
        if (!moved && Math.abs(g.dx) + Math.abs(g.dy) > TAP_SLOP) {
          moved = true;
          setDragging(true);
        }
        pos.setValue({ x: g.dx, y: g.dy });
      },
      onPanResponderRelease: () => {
        pos.flattenOffset();
        setDragging(false);
        if (moved) return snap();
        setHop((n) => n + 1);
        setTimeout(() => props.current.onOpen(), 450);
      },
      onPanResponderTerminate: () => {
        pos.flattenOffset();
        setDragging(false);
        snap();
      },
    });
  });

  const tail = `${side.below ? 'top' : 'bottom'}-${side.right ? 'right' : 'left'}` as const;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={onLayout}>
      {area && !hidden && (
        <Animated.View
          style={[s.wrap, { transform: pos.getTranslateTransform() }]}
          pointerEvents="box-none"
        >
          {bubble && !dragging && (
            <SpeechBubble
              who={p.who ?? MOODS[mood].who}
              color={MOODS[mood].color}
              heading={!greeted ? greeting : undefined}
              text={message}
              hint={sticky ? undefined : 'Tap me for your money health →'}
              actions={actions}
              tail={tail}
              onPress={sticky ? undefined : p.onOpen}
              style={{
                ...s.bubble,
                ...(side.below ? { top: H + 12 } : { bottom: H + 6 }),
                ...(side.right ? { right: 6 } : { left: 6 }),
              }}
            />
          )}
          <View
            {...pan.panHandlers}
            style={[s.head, dragging && s.lifted]}
            accessibilityRole="button"
            accessibilityLabel="Orava. Tap to open money health, drag to move."
          >
            <Mascot mood={mood} size={W} hop={hop} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, top: 0, width: W, height: H },
  head: {
    width: W,
    height: H,
    ...(Platform.OS === 'web' ? ({ cursor: 'grab', userSelect: 'none' } as object) : null),
  },
  lifted: { transform: [{ scale: 1.1 }] },
  bubble: { position: 'absolute', width: BUBBLE_W },
});
