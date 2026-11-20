// The words for each of Orava's moods. The colours live in the web app.

import type { Mood } from './types';

/**
 * The words for each mood. `name` is the short label, `who` the speech bubble's name line.
 * The colours for each mood live in the web app (`src/orava/moods.ts`).
 */
export const MOOD_LABELS: Record<Mood, { name: string; who: string }> = {
  happy: { name: 'Doing great', who: 'Orava · doing great' },
  okay: { name: 'Steady', who: 'Orava · steady' },
  worried: { name: 'Heads up', who: 'Orava · heads up' },
  alert: { name: 'Needs attention', who: 'Orava · needs attention' },
};
