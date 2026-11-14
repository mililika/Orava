import { colors } from '../theme';
import type { AlertKind, Mood } from './types';

/** Display info for each mood. The label is always shown, so color is never the only signal. */
export const MOODS: Record<Mood, { name: string; fg: string; bg: string; ring: string }> = {
  happy: { name: 'Happy', fg: '#1E6A38', bg: '#E2F0E4', ring: '#C99A3B' },
  calm: { name: 'Calm', fg: '#36483A', bg: '#EDF1EC', ring: '#9FB4A3' },
  worried: { name: 'Worried', fg: '#7A4A00', bg: '#FCEBCF', ring: '#D99A2B' },
  alert: { name: 'Alert', fg: colors.neg, bg: colors.negBg, ring: '#C4321F' },
};

/** Colors for a nudge, by kind: red for fraud/overspending, amber for over safe-to-spend, green for good news. */
export const ALERT_TONES: Record<AlertKind, { fg: string; bg: string; border: string }> = {
  fraud: { fg: '#A3261A', bg: '#FBE0DC', border: '#C4321F' },
  overspend: { fg: '#A3261A', bg: '#FBE0DC', border: '#C4321F' },
  safe: { fg: '#7A4A00', bg: '#FCEBCF', border: '#D99A2B' },
  good: { fg: '#1E6A38', bg: '#E2F0E4', border: '#1F6B3B' },
};
