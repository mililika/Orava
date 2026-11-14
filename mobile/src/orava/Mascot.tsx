// Orava the squirrel, ported from the "Orava — animated squirrel demo" SVG.
// Four moods (happy / okay / worried / alert), each with a subtle idle motion:
// happy sways, okay breathes, worried droops with a sweat drop, alert trembles with a red ring.
// The SVG is split into layers (tail, body, head, acorn, effects) so each layer can be
// animated with React Native's Animated API on phone and web alike.
// Change `hop` (e.g. a counter) to make Orava hop once.

import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { Mood } from './types';

const native = Platform.OS !== 'web';
const VB_W = 220;
const VB_H = 230;

const C = {
  fur: '#E07A2E',
  furDark: '#C45A1C',
  furLight: '#E98E45',
  belly: '#F8E1BF',
  ear: '#F2A78A',
  cheek: '#F07C6B',
  eye: '#2B1B12',
  brow: '#5A3420',
  nose: '#3A2418',
  acorn: '#B9773A',
  acornCap: '#7A4A25',
  ink: '#1E2A23',
  alert: '#C8323A',
  gold: '#F2C14E',
  mint: '#7BC89A',
  sweat: '#7CC4EA',
  sweatEdge: '#3E8FBF',
};

/** Motion per mood. `half` is half a cycle in ms; distances are in SVG units. */
const CFG: Record<
  Mood,
  {
    half: number;
    bob: number;
    shake: number;
    rot: number;
    squash: number;
    tail: [number, number];
    tailScale: [number, number];
    shadow: [number, number];
    tilt: number;
    loopMs: number;
  }
> = {
  // Kept deliberately small: a slow breath, a little tail sway. Alert is the only
  // mood that moves noticeably, because it means something needs attention.
  happy: {
    half: 1600,
    bob: -3,
    shake: 0,
    rot: 0,
    squash: 0,
    tail: [-3, 3],
    tailScale: [1, 1],
    shadow: [1, 0.95],
    tilt: 0,
    loopMs: 3200,
  },
  okay: {
    half: 2000,
    bob: -2,
    shake: 0,
    rot: 0,
    squash: 0,
    tail: [-2, 2],
    tailScale: [1, 1],
    shadow: [1, 0.96],
    tilt: 0,
    loopMs: 3200,
  },
  worried: {
    half: 2200,
    bob: -2,
    shake: 0,
    rot: 0,
    squash: 0,
    tail: [14, 16],
    tailScale: [1, 1],
    shadow: [1, 0.96],
    tilt: -7,
    loopMs: 3200,
  },
  alert: {
    half: 450,
    bob: 0,
    shake: 1.5,
    rot: 0.8,
    squash: 0,
    tail: [-1.5, 1.5],
    tailScale: [1.06, 1.08],
    shadow: [1, 1],
    tilt: 0,
    loopMs: 1600,
  },
};

export function Mascot({
  mood,
  size = 150,
  hop = 0,
  ground = true,
}: {
  mood: Mood;
  size?: number;
  hop?: number;
  /** Soft shadow under the feet. Turn off on a white background (it reads as grey). */
  ground?: boolean;
}) {
  const w = size;
  const h = (size * VB_H) / VB_W;
  const k = size / VB_W;
  const cfg = CFG[mood];

  // v: ping-pong 0↔1 driving the idle motion. loop: 0→1 repeating (ring, sweat).
  const [v] = useState(() => new Animated.Value(0));
  const [loop] = useState(() => new Animated.Value(0));
  const [jump] = useState(() => new Animated.Value(1));
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    const { half, loopMs } = CFG[mood];
    v.setValue(0);
    loop.setValue(0);
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: half, easing: ease, useNativeDriver: native }),
        Animated.timing(v, { toValue: 0, duration: half, easing: ease, useNativeDriver: native }),
      ]),
    );
    const b = Animated.loop(
      Animated.timing(loop, {
        toValue: 1,
        duration: loopMs,
        easing: Easing.linear,
        useNativeDriver: native,
      }),
    );
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [mood, v, loop]);

  useEffect(() => {
    if (mood === 'alert') return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      setBlink(true);
      t = setTimeout(() => setBlink(false), 140);
    }, 4200);
    return () => {
      clearInterval(id);
      if (t) clearTimeout(t);
    };
  }, [mood]);

  useEffect(() => {
    if (!hop) return;
    jump.setValue(0);
    Animated.timing(jump, {
      toValue: 1,
      duration: 700,
      easing: Easing.bezier(0.3, 0.7, 0.4, 1),
      useNativeDriver: native,
    }).start();
  }, [hop, jump]);

  // Rotate/scale around a point given in SVG units.
  const around = (px: number, py: number, t: object[]) => {
    const dx = px * k - w / 2;
    const dy = py * k - h / 2;
    return [{ translateX: dx }, { translateY: dy }, ...t, { translateX: -dx }, { translateY: -dy }];
  };
  const range = (a: number, b: number) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  const deg = (a: number, b: number) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [`${a}deg`, `${b}deg`] });

  const hopY = jump.interpolate({
    inputRange: [0, 0.25, 0.55, 0.75, 1],
    outputRange: [0, -34 * k, 0, -7 * k, 0],
  });
  const hopSX = jump.interpolate({
    inputRange: [0, 0.25, 0.55, 0.75, 1],
    outputRange: [1.08, 0.94, 1.1, 1, 1],
  });
  const hopSY = jump.interpolate({
    inputRange: [0, 0.25, 0.55, 0.75, 1],
    outputRange: [0.9, 1.08, 0.88, 1, 1],
  });

  const bob = around(104, 212, [
    { translateX: range(-cfg.shake * k, cfg.shake * k) },
    { translateY: Animated.add(range(0, cfg.bob * k), hopY) },
    { rotate: deg(-cfg.rot, cfg.rot) },
    { scaleX: Animated.multiply(range(1 + cfg.squash, 1 - cfg.squash), hopSX) },
    { scaleY: Animated.multiply(range(1 - cfg.squash, 1 + cfg.squash), hopSY) },
  ]);
  const shadow = around(104, 216, [{ scale: range(...cfg.shadow) }]);
  const tail = around(111, 195, [
    {
      rotate: v.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange:
          mood === 'alert'
            ? ['-1.5deg', '1.5deg', '-1.5deg']
            : [`${cfg.tail[0]}deg`, `${(cfg.tail[0] + cfg.tail[1]) / 2}deg`, `${cfg.tail[1]}deg`],
      }),
    },
    { scale: range(...cfg.tailScale) },
  ]);
  const head = around(95, 127, [{ rotate: `${cfg.tilt}deg` }]);
  const acorn = around(96, 152, [{ rotate: mood === 'happy' ? deg(-3, 3) : '0deg' }]);

  const layer = (children: ReactNode, style?: object) => (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={w} height={h} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        {children}
      </Svg>
    </Animated.View>
  );

  return (
    <View
      style={{ width: w, height: h }}
      accessibilityRole="image"
      accessibilityLabel={`Orava the squirrel, ${mood}`}
    >
      {mood === 'alert' &&
        layer(<Circle cx={110} cy={128} r={96} fill="none" stroke={C.alert} strokeWidth={6} />, {
          opacity: loop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: around(110, 128, [
            { scale: loop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) },
          ]),
        })}
      {ground &&
        layer(<Ellipse cx={104} cy={216} rx={54} ry={7} fill={C.ink} opacity={0.12} />, {
          transform: shadow,
        })}

      <Animated.View style={[StyleSheet.absoluteFill, { transform: bob }]} pointerEvents="none">
        {layer(<Tail />, { transform: tail })}
        {layer(<Body />)}
        {layer(<Head mood={mood} blink={blink} />, { transform: head })}
        {layer(<Acorn />, { transform: acorn })}
      </Animated.View>

      {mood === 'happy' && (
        <>
          {layer(
            <>
              <Path d="M34,62 l4,10 l10,4 l-10,4 l-4,10 l-4,-10 l-10,-4 l10,-4 Z" fill={C.gold} />
              <Path d="M28,150 l3,7 l7,3 l-7,3 l-3,7 l-3,-7 l-7,-3 l7,-3 Z" fill={C.mint} />
            </>,
            { opacity: range(0.6, 1) },
          )}
          {layer(<Path d="M178,30 l3,8 l8,3 l-8,3 l-3,8 l-3,-8 l-8,-3 l8,-3 Z" fill={C.gold} />, {
            opacity: range(1, 0.6),
          })}
        </>
      )}
      {mood === 'worried' &&
        layer(
          <Path
            d="M136,72 C136,72 128,84 128,89 C128,94 132,97 136,97 C140,97 144,94 144,89 C144,84 136,72 136,72 Z"
            fill={C.sweat}
            stroke={C.sweatEdge}
            strokeWidth={1.5}
          />,
          {
            opacity: loop.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
            transform: [
              {
                translateY: loop.interpolate({ inputRange: [0, 1], outputRange: [-2 * k, 8 * k] }),
              },
            ],
          },
        )}
      {mood === 'alert' &&
        layer(
          <G>
            <Circle cx={160} cy={34} r={17} fill={C.alert} />
            <Rect x={157} y={22} width={6} height={16} rx={3} fill="#fff" />
            <Circle cx={160} cy={44} r={3.3} fill="#fff" />
          </G>,
          {
            transform: around(160, 34, [
              { translateY: range(0, -3 * k) },
              { scale: range(1, 1.06) },
            ]),
          },
        )}
    </View>
  );
}

function Tail() {
  return (
    <>
      <Path
        d="M110,192 C150,204 210,168 202,108 C196,58 160,26 128,40 C98,53 100,94 128,94 C143,94 150,80 141,71 C163,82 172,120 152,148 C139,165 116,170 110,192 Z"
        fill={C.furDark}
      />
      <Path
        d="M128,52 C155,46 186,72 188,110 C190,140 170,166 140,176"
        fill="none"
        stroke={C.furLight}
        strokeWidth={7}
        strokeLinecap="round"
        opacity={0.8}
      />
    </>
  );
}

function Body() {
  return (
    <>
      <Ellipse cx={78} cy={204} rx={15} ry={7} fill={C.furDark} />
      <Ellipse cx={116} cy={204} rx={15} ry={7} fill={C.furDark} />
      <Ellipse cx={97} cy={166} rx={40} ry={40} fill={C.fur} />
      <Ellipse cx={96} cy={174} rx={24} ry={28} fill={C.belly} />
    </>
  );
}

function Acorn() {
  return (
    <>
      <Rect x={94} y={133} width={3} height={6} rx={1.5} fill={C.brow} />
      <Ellipse cx={96} cy={153} rx={9.5} ry={11} fill={C.acorn} />
      <Ellipse cx={96} cy={143} rx={12} ry={6} fill={C.acornCap} />
      <Ellipse cx={84} cy={152} rx={7} ry={6} fill={C.fur} stroke={C.furDark} strokeWidth={2} />
      <Ellipse cx={108} cy={152} rx={7} ry={6} fill={C.fur} stroke={C.furDark} strokeWidth={2} />
    </>
  );
}

const line = { fill: 'none', strokeLinecap: 'round' as const };

function Head({ mood, blink }: { mood: Mood; blink: boolean }) {
  const big = mood === 'alert' ? 1.15 : 1;
  return (
    <>
      {/* Ears */}
      <Path d="M64,82 L56,42 L88,68 Z" fill={C.fur} />
      <Path d="M66,74 L61,52 L79,67 Z" fill={C.ear} />
      <Path d="M56,42 L52,32 M56,42 L60,31" stroke={C.furDark} strokeWidth={3} {...line} />
      <Path d="M110,66 L134,38 L128,80 Z" fill={C.fur} />
      <Path d="M114,67 L130,48 L126,74 Z" fill={C.ear} />
      <Path d="M134,38 L134,27 M134,38 L142,30" stroke={C.furDark} strokeWidth={3} {...line} />
      {/* Face */}
      <Circle cx={95} cy={100} r={38} fill={C.fur} />
      <Ellipse cx={95} cy={113} rx={26} ry={19} fill={C.belly} />
      <Circle cx={69} cy={112} r={6.5} fill={C.cheek} opacity={mood === 'happy' ? 0.85 : 0.5} />
      <Circle cx={121} cy={112} r={6.5} fill={C.cheek} opacity={mood === 'happy' ? 0.85 : 0.5} />
      {/* Eyes */}
      {mood === 'happy' ? (
        <G stroke={C.eye} strokeWidth={4} {...line}>
          <Path d="M73,98 Q80,88 87,98" />
          <Path d="M103,98 Q110,88 117,98" />
        </G>
      ) : blink ? (
        <G stroke={C.eye} strokeWidth={3.5} {...line}>
          <Path d="M73,97 L87,97" />
          <Path d="M103,97 L117,97" />
        </G>
      ) : (
        <G x={mood === 'worried' ? -2 : 0} y={mood === 'worried' ? 2 : 0}>
          <Ellipse cx={80} cy={96} rx={7 * big} ry={8.5 * big} fill={C.eye} />
          <Circle cx={82.5} cy={92.5} r={2.4} fill="#fff" />
          <Ellipse cx={110} cy={96} rx={7 * big} ry={8.5 * big} fill={C.eye} />
          <Circle cx={112.5} cy={92.5} r={2.4} fill="#fff" />
        </G>
      )}
      {/* Brows */}
      {mood === 'worried' && (
        <G stroke={C.brow} strokeWidth={3.2} {...line}>
          <Path d="M71,85 L86,80" />
          <Path d="M119,85 L104,80" />
        </G>
      )}
      {mood === 'alert' && (
        <G stroke={C.brow} strokeWidth={3.2} {...line}>
          <Path d="M71,82 Q79,74 87,80" />
          <Path d="M103,80 Q111,74 119,82" />
        </G>
      )}
      {/* Nose and mouth */}
      <Ellipse cx={95} cy={107} rx={5.5} ry={3.8} fill={C.nose} />
      {mood === 'happy' && (
        <Path d="M85,114 Q95,126 105,114" stroke={C.nose} strokeWidth={3} {...line} />
      )}
      {mood === 'okay' && (
        <Path d="M88,116 Q95,120 102,116" stroke={C.nose} strokeWidth={3} {...line} />
      )}
      {mood === 'worried' && (
        <Path d="M86,122 Q95,114 104,122" stroke={C.nose} strokeWidth={3} {...line} />
      )}
      {mood === 'alert' && <Ellipse cx={95} cy={119} rx={4.5} ry={5.5} fill={C.nose} />}
    </>
  );
}
