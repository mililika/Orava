import { colors } from '../theme';
import type { Mood } from './types';

/**
 * Display info for each mood, colors from the squirrel design.
 * `color` tints the speech bubble's name line; the label is always shown,
 * so color is never the only signal.
 */
export const MOODS: Record<
  Mood,
  { name: string; who: string; color: string; fg: string; bg: string }
> = {
  happy: {
    name: 'Doing great',
    who: 'Orava · doing great',
    color: '#2E9B5F',
    fg: colors.okInk,
    bg: colors.okBg,
  },
  okay: { name: 'Steady', who: 'Orava · steady', color: '#C98A2B', fg: '#5c420c', bg: '#fbf1dc' },
  worried: {
    name: 'Heads up',
    who: 'Orava · heads up',
    color: '#D2652A',
    fg: colors.warnInk,
    bg: colors.warnBg,
  },
  alert: {
    name: 'Needs attention',
    who: 'Orava · needs attention',
    color: '#C8323A',
    fg: colors.neg,
    bg: colors.negBg,
  },
};
