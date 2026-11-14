// Orava the squirrel, ported from ORAVA-AGENT-BRIEF.md to React Native.
//
// The shapes and colours are the brief's SVG, unchanged. The brief animates with
// CSS keyframes, which don't exist on iOS/Android, so here every moving part is
// its own full-size <Svg> layer inside an Animated.View, and the keyframes are
// rebuilt with Animated loops. All layers share the same 220×230 viewBox, so a
// pivot point in SVG units becomes a percentage transformOrigin on its layer.
//
//   <Mascot mood="happy" size={220} onPress={() => ...} />

import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { Mood } from './types';

const native = Platform.OS !== 'web';
const W = 220;
const H = 230;

/** A pivot in SVG units, as a transformOrigin on a full-size layer. */
const at = (x: number, y: number) => `${(x / W) * 100}% ${(y / H) * 100}%`;

const PARTS = [
  'body',
  'tail',
  'earL',
  'earR',
  'blink',
  'look',
  'acorn',
  's1',
  's2',
  's3',
  'sweat',
  'exclaim',
  'ring',
  'hop',
] as const;
type Values = Record<(typeof PARTS)[number], Animated.Value>;

export interface MascotProps {
  mood: Mood;
  /** Width in px; height scales to match. */
  size?: number;
  /** Hop when tapped. Defaults to true when onPress is given. */
  hopOnClick?: boolean;
  onPress?: () => void;
  /**
   * Full mood animation: bouncing, shaking, sparkles, pulsing ring.
   * Use it only when Orava has a notification; otherwise it just breathes and blinks.
   */
  lively?: boolean;
  style?: StyleProp<ViewStyle>;
  title?: string;
}

export function Mascot({
  mood,
  size = 220,
  hopOnClick,
  onPress,
  lively = false,
  style,
  title = 'Orava',
}: MascotProps) {
  const [v] = useState<Values>(() => {
    const out = {} as Values;
    for (const p of PARTS) out[p] = new Animated.Value(0);
    out.hop.setValue(1); // 1 = hop finished, at rest
    return out;
  });
  const still = useReducedMotion();
  useMoodLoops(v, mood, still, lively);

  const k = size / W; // SVG units → px, for translations
  const hops = hopOnClick ?? !!onPress;

  const hop = () => {
    if (still) return;
    v.hop.setValue(0);
    Animated.timing(v.hop, {
      toValue: 1,
      duration: 700,
      easing: Easing.bezier(0.3, 0.7, 0.4, 1),
      useNativeDriver: native,
    }).start();
  };

  const t = transforms(v, mood, k, lively);

  const art = (
    <View style={{ width: size, height: (size * H) / W, pointerEvents: 'none' }}>
      {mood === 'alert' && lively && (
        <Layer style={t.ring}>
          <Circle cx={110} cy={128} r={96} fill="none" stroke="#C8323A" strokeWidth={6} />
        </Layer>
      )}

      <Layer style={t.hopShadow}>
        <Layer style={t.shadow}>
          <Ellipse cx={104} cy={216} rx={54} ry={7} fill="#1E2A23" opacity={0.12} />
        </Layer>
      </Layer>

      <Group style={t.hop}>
        <Group style={t.bob}>
          <Layer style={t.tail}>
            <Path
              d="M110,192 C150,204 210,168 202,108 C196,58 160,26 128,40 C98,53 100,94 128,94 C143,94 150,80 141,71 C163,82 172,120 152,148 C139,165 116,170 110,192 Z"
              fill="#C45A1C"
            />
            <Path
              d="M128,52 C155,46 186,72 188,110 C190,140 170,166 140,176"
              fill="none"
              stroke="#E98E45"
              strokeWidth={7}
              strokeLinecap="round"
              opacity={0.8}
            />
          </Layer>

          <Layer>
            <Ellipse cx={78} cy={204} rx={15} ry={7} fill="#C45A1C" />
            <Ellipse cx={116} cy={204} rx={15} ry={7} fill="#C45A1C" />
            <Ellipse cx={97} cy={166} rx={40} ry={40} fill="#E07A2E" />
            <Ellipse cx={96} cy={174} rx={24} ry={28} fill="#F8E1BF" />
          </Layer>

          <Group style={t.head}>
            <Layer style={t.earL}>
              <Path d="M64,82 L56,42 L88,68 Z" fill="#E07A2E" />
              <Path d="M66,74 L61,52 L79,67 Z" fill="#F2A78A" />
              <Path
                d="M56,42 L52,32 M56,42 L60,31"
                stroke="#C45A1C"
                strokeWidth={3}
                strokeLinecap="round"
              />
            </Layer>
            <Layer style={t.earR}>
              <Path d="M110,66 L134,38 L128,80 Z" fill="#E07A2E" />
              <Path d="M114,67 L130,48 L126,74 Z" fill="#F2A78A" />
              <Path
                d="M134,38 L134,27 M134,38 L142,30"
                stroke="#C45A1C"
                strokeWidth={3}
                strokeLinecap="round"
              />
            </Layer>

            <Layer>
              <Circle cx={95} cy={100} r={38} fill="#E07A2E" />
              <Ellipse cx={95} cy={113} rx={26} ry={19} fill="#F8E1BF" />
              <Circle
                cx={69}
                cy={112}
                r={6.5}
                fill="#F07C6B"
                opacity={mood === 'happy' ? 0.85 : 0.5}
              />
              <Circle
                cx={121}
                cy={112}
                r={6.5}
                fill="#F07C6B"
                opacity={mood === 'happy' ? 0.85 : 0.5}
              />
            </Layer>

            {mood !== 'happy' && (
              <Group style={t.look}>
                <Layer style={t.blink}>
                  <Ellipse cx={80} cy={96} rx={7} ry={8.5} fill="#2B1B12" />
                  <Circle cx={82.5} cy={92.5} r={2.4} fill="#fff" />
                  <Ellipse cx={110} cy={96} rx={7} ry={8.5} fill="#2B1B12" />
                  <Circle cx={112.5} cy={92.5} r={2.4} fill="#fff" />
                </Layer>
              </Group>
            )}

            <Layer>
              <Face mood={mood} />
            </Layer>
          </Group>

          <Layer style={t.acorn}>
            <Rect x={94} y={133} width={3} height={6} rx={1.5} fill="#5A3420" />
            <Ellipse cx={96} cy={153} rx={9.5} ry={11} fill="#B9773A" />
            <Ellipse cx={96} cy={143} rx={12} ry={6} fill="#7A4A25" />
            <Ellipse
              cx={84}
              cy={152}
              rx={7}
              ry={6}
              fill="#E07A2E"
              stroke="#C45A1C"
              strokeWidth={2}
            />
            <Ellipse
              cx={108}
              cy={152}
              rx={7}
              ry={6}
              fill="#E07A2E"
              stroke="#C45A1C"
              strokeWidth={2}
            />
          </Layer>
        </Group>
      </Group>

      {mood === 'happy' && (
        <>
          <Layer style={t.spark(v.s1, 34, 76)}>
            <Path d="M34,62 l4,10 l10,4 l-10,4 l-4,10 l-4,-10 l-10,-4 l10,-4 Z" fill="#F2C14E" />
          </Layer>
          <Layer style={t.spark(v.s2, 178, 41)}>
            <Path d="M178,30 l3,8 l8,3 l-8,3 l-3,8 l-3,-8 l-8,-3 l8,-3 Z" fill="#F2C14E" />
          </Layer>
          <Layer style={t.spark(v.s3, 28, 160)}>
            <Path d="M28,150 l3,7 l7,3 l-7,3 l-3,7 l-3,-7 l-7,-3 l7,-3 Z" fill="#7BC89A" />
          </Layer>
        </>
      )}
      {mood === 'worried' && (
        <Layer style={t.sweat}>
          <Path
            d="M136,72 C136,72 128,84 128,89 C128,94 132,97 136,97 C140,97 144,94 144,89 C144,84 136,72 136,72 Z"
            fill="#7CC4EA"
            stroke="#3E8FBF"
            strokeWidth={1.5}
          />
        </Layer>
      )}
      {mood === 'alert' && (
        <Layer style={t.exclaim}>
          <Circle cx={160} cy={34} r={17} fill="#C8323A" />
          <Rect x={157} y={22} width={6} height={16} rx={3} fill="#fff" />
          <Circle cx={160} cy={44} r={3.3} fill="#fff" />
        </Layer>
      )}
    </View>
  );

  if (!onPress && !hops) {
    return (
      <View style={style} role="img" aria-label={title}>
        {art}
      </View>
    );
  }
  return (
    <Pressable
      style={style}
      role="button"
      aria-label={title}
      onPress={() => {
        if (hops) hop();
        onPress?.();
      }}
    >
      {art}
    </Pressable>
  );
}

/** Eyes (happy only), brows, nose and mouth. These change with the mood but don't move on their own. */
function Face({ mood }: { mood: Mood }) {
  const line = { fill: 'none', strokeLinecap: 'round' as const };
  return (
    <>
      {mood === 'happy' && (
        <G {...line} stroke="#2B1B12" strokeWidth={4}>
          <Path d="M73,98 Q80,88 87,98" />
          <Path d="M103,98 Q110,88 117,98" />
        </G>
      )}
      {mood === 'worried' && (
        <G {...line} stroke="#5A3420" strokeWidth={3.2}>
          <Path d="M71,85 L86,80" />
          <Path d="M119,85 L104,80" />
        </G>
      )}
      {mood === 'alert' && (
        <G {...line} stroke="#5A3420" strokeWidth={3.2}>
          <Path d="M71,82 Q79,74 87,80" />
          <Path d="M103,80 Q111,74 119,82" />
        </G>
      )}

      <Ellipse cx={95} cy={107} rx={5.5} ry={3.8} fill="#3A2418" />

      <G {...line} stroke="#3A2418" strokeWidth={3}>
        {mood === 'happy' && <Path d="M85,114 Q95,126 105,114" />}
        {mood === 'calm' && <Path d="M88,116 Q95,120 102,116" />}
        {mood === 'worried' && <Path d="M86,122 Q95,114 104,122" />}
      </G>
      {mood === 'alert' && <Ellipse cx={95} cy={119} rx={4.5} ry={5.5} fill="#3A2418" />}
    </>
  );
}

type AnimatedStyle = Animated.WithAnimatedValue<StyleProp<ViewStyle>>;

/** A full-size SVG layer that can move on its own. */
function Layer({ style, children }: { style?: AnimatedStyle; children: ReactNode }) {
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        {children}
      </Svg>
    </Animated.View>
  );
}

/** A full-size group of layers that move together. */
function Group({ style, children }: { style?: AnimatedStyle; children: ReactNode }) {
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

/** Map 0..1 drivers to the brief's keyframes, per mood. */
function transforms(v: Values, mood: Mood, k: number, lively: boolean) {
  const i = (x: Animated.Value, input: number[], output: number[] | string[]) =>
    x.interpolate({ inputRange: input, outputRange: output as number[] });
  const deg = (...d: number[]) => d.map((n) => `${n}deg`);
  const px = (...p: number[]) => p.map((n) => n * k);
  const pp = [0, 1]; // ping-pong drivers go 0 → 1 → 0

  // Not lively: one slow breath for every mood, and the tail barely sways.
  const breathe: AnimatedStyle = { transform: [{ translateY: i(v.body, pp, px(0, -2)) }] };
  const subtleTail: Record<Mood, AnimatedStyle> = {
    calm: { transform: [{ rotate: i(v.tail, pp, deg(-2, 2)) }] },
    happy: { transform: [{ rotate: i(v.tail, pp, deg(-3, 3)) }] },
    worried: { transform: [{ rotate: i(v.tail, pp, deg(14, 16)) }] },
    alert: { transform: [{ rotate: i(v.tail, pp, deg(-1, 1)) }, { scale: 1.08 }] },
  };

  const bob: Record<Mood, AnimatedStyle> = {
    calm: { transform: [{ translateY: i(v.body, pp, px(0, -5)) }] },
    worried: { transform: [{ translateY: i(v.body, pp, px(0, -5)) }] },
    happy: {
      transform: [
        { translateY: i(v.body, pp, px(0, -11)) },
        { scaleX: i(v.body, pp, [1.02, 0.98]) },
        { scaleY: i(v.body, pp, [0.98, 1.02]) },
      ],
    },
    alert: {
      transform: [
        { translateX: i(v.body, [0, 0.25, 0.75, 1], px(0, -3, 3, 0)) },
        { rotate: i(v.body, [0, 0.25, 0.75, 1], deg(0, -1.5, 1.5, 0)) },
      ],
    },
  };

  const tail: Record<Mood, AnimatedStyle> = {
    calm: { transform: [{ rotate: i(v.tail, pp, deg(-3, 4)) }] },
    happy: { transform: [{ rotate: i(v.tail, pp, deg(-8, 9)) }] },
    worried: { transform: [{ rotate: i(v.tail, pp, deg(14, 18)) }] },
    alert: {
      transform: [{ rotate: i(v.tail, pp, deg(-2, 2)) }, { scale: i(v.tail, pp, [1.08, 1.12]) }],
    },
  };

  const twitch = (x: Animated.Value) => ({
    transform: [{ rotate: i(x, [0, 0.86, 0.89, 0.92, 0.95, 1], deg(0, 0, -14, 4, 0, 0)) }],
  });
  const perk = {
    transform: [{ rotate: i(v.earL, pp, deg(-4, 4)) }, { translateY: i(v.earL, pp, px(-2, -4)) }],
  };

  const lookKeys = [0, 0.25, 0.32, 0.48, 0.56, 0.72, 0.8, 1];
  const look =
    mood === 'worried'
      ? { transform: [{ translateX: i(v.look, pp, px(-3, 2)) }, { translateY: 2 * k }] }
      : {
          transform: [
            { translateX: i(v.look, lookKeys, px(0, 0, 3, 3, -3, -3, 0, 0)) },
            { translateY: i(v.look, lookKeys, px(0, 0, -1, -1, 1, 1, 0, 0)) },
          ],
        };

  const hopKeys = [0, 0.25, 0.55, 0.75, 1];

  return {
    bob: [{ transformOrigin: at(110, 211) }, lively ? bob[mood] : breathe],
    hop: {
      transformOrigin: at(110, 211),
      transform: [
        { translateY: i(v.hop, hopKeys, px(0, -34, 0, -7, 0)) },
        { scaleX: i(v.hop, hopKeys, [1.08, 0.94, 1.1, 1, 1]) },
        { scaleY: i(v.hop, hopKeys, [0.9, 1.08, 0.88, 1, 1]) },
      ],
    },
    shadow: {
      transformOrigin: at(104, 216),
      transform: [{ scale: mood === 'alert' ? 1 : i(v.body, pp, [1, 0.86]) }],
    },
    hopShadow: {
      transformOrigin: at(104, 216),
      transform: [{ scale: i(v.hop, [0, 0.25, 0.55, 1], [1, 0.55, 1, 1]) }],
    },
    tail: [{ transformOrigin: at(111, 195) }, lively ? tail[mood] : subtleTail[mood]],
    earL: [{ transformOrigin: at(74, 82) }, mood === 'alert' && lively ? perk : twitch(v.earL)],
    earR: [{ transformOrigin: at(123, 80) }, mood === 'alert' && lively ? perk : twitch(v.earR)],
    head: {
      transformOrigin: at(97, 127),
      transform: [{ rotate: mood === 'worried' ? '-7deg' : '0deg' }],
    },
    look,
    blink: {
      transformOrigin: at(95, 96),
      transform:
        mood === 'alert'
          ? [{ scale: 1.15 }]
          : [{ scaleY: i(v.blink, [0, 0.93, 0.95, 1], [1, 1, 0.1, 1]) }],
    },
    acorn: {
      transformOrigin: at(96, 158),
      transform:
        mood === 'happy'
          ? [
              { rotate: i(v.acorn, [0, 0.25, 0.75, 1], deg(0, -8, 8, 0)) },
              { translateY: i(v.acorn, [0, 0.25, 0.75, 1], px(0, -2, -2, 0)) },
            ]
          : [],
    },
    spark: (x: Animated.Value, cx: number, cy: number): AnimatedStyle => ({
      transformOrigin: at(cx, cy),
      opacity: i(x, [0, 0.5, 1], [0.2, 1, 0.2]),
      transform: [
        { scale: i(x, [0, 0.5, 1], [0.4, 1.1, 0.4]) },
        { rotate: i(x, [0, 0.5, 1], deg(0, 45, 0)) },
      ],
    }),
    sweat: {
      opacity: i(v.sweat, [0, 0.2, 1], [0, 1, 0]),
      transform: [{ translateY: i(v.sweat, pp, px(-4, 16)) }],
    },
    exclaim: {
      transformOrigin: at(160, 34),
      transform: [
        { translateY: i(v.exclaim, pp, px(0, -6)) },
        { scale: i(v.exclaim, pp, [1, 1.12]) },
      ],
    },
    ring: {
      transformOrigin: at(110, 128),
      opacity: i(v.ring, pp, [0.6, 0]),
      transform: [{ scale: i(v.ring, pp, [0.7, 1.15]) }],
    },
  };
}

/** Start the looping animations for a mood; stop them when the mood changes. */
function useMoodLoops(v: Values, mood: Mood, still: boolean, lively: boolean) {
  useEffect(() => {
    for (const p of PARTS) if (p !== 'hop') v[p].setValue(0);
    if (!lively || still) {
      // Hold the mood's extras in a visible pose instead of animating them.
      for (const p of ['s1', 's2', 's3'] as const) v[p].setValue(0.35);
      v.sweat.setValue(0.2);
    }
    if (still) return;

    const timing = (
      x: Animated.Value,
      toValue: number,
      duration: number,
      easing: (n: number) => number,
    ) => Animated.timing(x, { toValue, duration, easing, useNativeDriver: native });
    /** 0 → 1 → 0, eased both ways (CSS ease-in-out between two keyframes). */
    const pingPong = (x: Animated.Value, period: number) => {
      const e = Easing.inOut(Easing.sin);
      return Animated.loop(
        Animated.sequence([timing(x, 1, period / 2, e), timing(x, 0, period / 2, e)]),
      );
    };
    /** 0 → 1, restarting (for multi-step keyframes). */
    const cycle = (x: Animated.Value, period: number, delay = 0, easing = Easing.linear) => {
      const loop = Animated.loop(timing(x, 1, period, easing));
      return delay ? Animated.sequence([Animated.delay(delay), loop]) : loop;
    };

    const run: Animated.CompositeAnimation[] = [];
    if (!lively) {
      // Subtle: a slow breath, a gentle tail sway and an occasional blink.
      run.push(pingPong(v.body, 4000), pingPong(v.tail, 4000));
      if (mood !== 'happy' && mood !== 'alert') run.push(cycle(v.blink, 5000));
      run.forEach((a) => a.start());
      return () => run.forEach((a) => a.stop());
    }
    switch (mood) {
      case 'happy':
        run.push(
          pingPong(v.body, 900),
          pingPong(v.tail, 1000),
          cycle(v.earL, 5000),
          cycle(v.earR, 5000, 1300),
          cycle(v.acorn, 900),
          cycle(v.s1, 1600),
          cycle(v.s2, 1600, 500),
          cycle(v.s3, 1600, 1000),
        );
        break;
      case 'calm':
        run.push(
          pingPong(v.body, 2600),
          pingPong(v.tail, 2600),
          cycle(v.earL, 5000),
          cycle(v.earR, 5000, 1300),
          cycle(v.blink, 4200),
          cycle(v.look, 7000),
        );
        break;
      case 'worried':
        run.push(
          pingPong(v.body, 3800),
          pingPong(v.tail, 3800),
          cycle(v.earL, 5000),
          cycle(v.earR, 5000, 1300),
          cycle(v.blink, 4200),
          pingPong(v.look, 3000),
          cycle(v.sweat, 2200, 0, Easing.in(Easing.quad)),
        );
        break;
      case 'alert':
        run.push(
          cycle(v.body, 500),
          pingPong(v.tail, 250),
          pingPong(v.earL, 1000),
          cycle(v.look, 7000),
          pingPong(v.exclaim, 1200),
          cycle(v.ring, 1200, 0, Easing.out(Easing.quad)),
        );
        break;
    }
    run.forEach((a) => a.start());
    return () => run.forEach((a) => a.stop());
  }, [v, mood, still, lively]);
}

/** Respect the system "reduce motion" setting, like the brief's prefers-reduced-motion rule. */
function useReducedMotion() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill, () => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setStill);
    return () => sub.remove();
  }, []);
  return still;
}
