// How each mood looks: colours on top of the words in @orava/core.

import { MOOD_LABELS, type Mood } from '@orava/core';

import { colors } from '../theme';

/**
 * Display info for each mood: the words from @orava/core plus colors from the squirrel design.
 * `color` tints the speech bubble's name line; the label is always shown,
 * so color is never the only signal.
 */
export const MOODS: Record<
  Mood,
  { name: string; who: string; color: string; fg: string; bg: string }
> = {
  happy: { ...MOOD_LABELS.happy, color: '#2E9B5F', fg: colors.okInk, bg: colors.okBg },
  okay: { ...MOOD_LABELS.okay, color: '#C98A2B', fg: '#5c420c', bg: '#fbf1dc' },
  worried: { ...MOOD_LABELS.worried, color: '#D2652A', fg: colors.warnInk, bg: colors.warnBg },
  alert: { ...MOOD_LABELS.alert, color: '#C8323A', fg: colors.neg, bg: colors.negBg },
};
