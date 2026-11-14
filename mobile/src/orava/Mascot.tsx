// Orava the squirrel, drawn with SVG so it stays sharp at any size.
// It floats gently and does a little bounce whenever its mood changes.

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { colors as c } from '../theme';
import type { Mood } from './types';

const native = Platform.OS !== 'web';

export function Mascot({ mood, size = 150 }: { mood: Mood; size?: number }) {
  // Animated values live in state (created once) so React never reads a ref during render.
  const [float] = useState(() => new Animated.Value(0));
  const [bounce] = useState(() => new Animated.Value(0));
  const first = useRef(true);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: native,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: native,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    bounce.setValue(0);
    Animated.sequence([
      Animated.timing(bounce, { toValue: -14, duration: 160, useNativeDriver: native }),
      Animated.spring(bounce, { toValue: 0, friction: 4, useNativeDriver: native }),
    ]).start();
  }, [mood, bounce]);

  const translateY = Animated.add(
    float.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }),
    bounce,
  );

  return (
    <Animated.View
      style={{ width: size, height: size, transform: [{ translateY }] }}
      accessibilityRole="image"
      accessibilityLabel={`Orava the squirrel, ${mood}`}
    >
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <G y={mood === 'thriving' ? -6 : 0}>
          {/* Tail */}
          <Path
            d="M118 168 C178 160 196 98 168 62 C150 38 116 46 122 74 C127 96 150 112 130 140 Z"
            fill={c.tail}
          />
          <Path
            d="M140 70 C150 66 160 74 158 86"
            stroke={c.brown}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            opacity={0.5}
          />
          {/* Body and feet */}
          <Ellipse cx={90} cy={146} rx={40} ry={40} fill={c.brown} />
          <Ellipse cx={88} cy={152} rx={23} ry={27} fill={c.belly} />
          <Ellipse cx={70} cy={184} rx={13} ry={7} fill={c.brown} />
          <Ellipse cx={108} cy={184} rx={13} ry={7} fill={c.brown} />
          {/* Head */}
          <G transform={mood === 'curious' ? 'rotate(-8 88 82)' : undefined}>
            <Path d="M58 64 L60 30 L80 54 Z" fill={c.brown} />
            <Path d="M118 64 L118 28 L98 52 Z" fill={c.brown} />
            <Path d="M63 56 L64 40 L74 52 Z" fill={c.belly} />
            <Path d="M113 56 L113 40 L103 52 Z" fill={c.belly} />
            <Circle cx={88} cy={84} r={35} fill={c.brown} />
            <Ellipse cx={88} cy={96} rx={20} ry={15} fill={c.belly} />
            <Circle cx={64} cy={94} r={6} fill={c.cheek} opacity={0.55} />
            <Circle cx={112} cy={94} r={6} fill={c.cheek} opacity={0.55} />
            <Eyes mood={mood} />
            <Ellipse cx={88} cy={91} rx={4} ry={3} fill={c.eye} />
            <Mouth mood={mood} />
          </G>
          {/* Green scarf */}
          <Path d="M60 116 q28 14 58 0 l-3 10 q-26 12 -52 0z" fill={c.green2} />
          <Path d="M100 120 l10 18 l-12 -2z" fill={c.green2} />
          <Extra mood={mood} />
        </G>
      </Svg>
    </Animated.View>
  );
}

const stroke = { stroke: c.eye, strokeWidth: 3, strokeLinecap: 'round' as const, fill: 'none' };

function Eyes({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'thriving':
      return (
        <>
          <Path d="M70 80 q6 -7 12 0" {...stroke} strokeWidth={3.5} />
          <Path d="M94 80 q6 -7 12 0" {...stroke} strokeWidth={3.5} />
        </>
      );
    case 'content':
      return (
        <>
          <Circle cx={76} cy={80} r={4.5} fill={c.eye} />
          <Circle cx={100} cy={80} r={4.5} fill={c.eye} />
          <Circle cx={77.5} cy={78.5} r={1.4} fill="#fff" />
          <Circle cx={101.5} cy={78.5} r={1.4} fill="#fff" />
        </>
      );
    case 'curious':
      return (
        <>
          <Circle cx={76} cy={80} r={5} fill={c.eye} />
          <Circle cx={100} cy={79} r={6} fill={c.eye} />
          <Circle cx={77.5} cy={78.5} r={1.5} fill="#fff" />
          <Circle cx={102} cy={77} r={1.8} fill="#fff" />
          <Path d="M94 68 q6 -5 13 -1" {...stroke} />
        </>
      );
    case 'worried':
      return (
        <>
          <Circle cx={76} cy={81} r={4.5} fill={c.eye} />
          <Circle cx={100} cy={81} r={4.5} fill={c.eye} />
          <Path d="M69 72 l12 -4" {...stroke} />
          <Path d="M107 72 l-12 -4" {...stroke} />
        </>
      );
    case 'alarmed':
      return (
        <>
          <Circle cx={76} cy={80} r={6.5} fill="#fff" stroke={c.eye} strokeWidth={2.5} />
          <Circle cx={100} cy={80} r={6.5} fill="#fff" stroke={c.eye} strokeWidth={2.5} />
          <Circle cx={76} cy={81} r={2.6} fill={c.eye} />
          <Circle cx={100} cy={81} r={2.6} fill={c.eye} />
          <Path d="M68 68 l13 -3" {...stroke} />
          <Path d="M108 68 l-13 -3" {...stroke} />
        </>
      );
  }
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'thriving':
      return <Path d="M78 97 q10 12 20 0 z" fill={c.mouth} />;
    case 'content':
      return <Path d="M80 97 q8 7 16 0" {...stroke} />;
    case 'curious':
      return <Circle cx={89} cy={99} r={3.2} fill={c.mouth} />;
    case 'worried':
      return <Path d="M80 101 q4 -4 8 0 q4 4 8 0" {...stroke} />;
    case 'alarmed':
      return <Ellipse cx={88} cy={101} rx={6} ry={7} fill={c.mouth} />;
  }
}

function Extra({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'thriving':
      return (
        <G fill={c.green2}>
          <Path d="M150 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z" />
          <Path d="M38 52 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z" />
          <Path d="M168 98 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z" />
        </G>
      );
    case 'curious':
      return (
        <SvgText x={138} y={52} fontSize={38} fontWeight="800" fill={c.green2}>
          ?
        </SvgText>
      );
    case 'worried':
      return (
        <G x={76} y={132}>
          <Ellipse cx={12} cy={16} rx={11} ry={13} fill={c.acorn} />
          <Path d="M0 8 q12 -12 24 0 v3 h-24z" fill={c.acornCap} />
          <Rect x={11} y={-3} width={3} height={7} rx={1.5} fill={c.acornCap} />
        </G>
      );
    case 'alarmed':
      return (
        <>
          <Path d="M122 62 q6 10 0 14 q-6 -4 0 -14z" fill={c.sweat} />
          <Path d="M48 70 q5 8 0 11 q-5 -3 0 -11z" fill={c.sweat} />
        </>
      );
    default:
      return null;
  }
}
