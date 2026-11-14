import { colors } from '../theme';
import type { Mood } from './types';

/** Display info for each mood. The label is always shown, so color is never the only signal. */
export const MOODS: Record<Mood, { name: string; fg: string; bg: string }> = {
  thriving: { name: 'Thriving', fg: colors.okInk, bg: colors.okBg },
  content: { name: 'Content', fg: colors.okInk, bg: colors.okBg },
  curious: { name: 'Curious', fg: colors.warnInk, bg: colors.warnBg },
  worried: { name: 'Worried', fg: colors.warnInk, bg: colors.warnBg },
  alarmed: { name: 'Alarmed', fg: colors.neg, bg: colors.negBg },
};
