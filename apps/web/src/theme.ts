// Shared colors and sizes, matched to the S-mobiili look:
// mint canvas, white rounded cards, bold dark-green titles, thin green line icons.
export const colors = {
  mint: '#ebf7ec',
  card: '#ffffff',
  green: '#007843', // titles, pills, Pay button
  green2: '#00aa46', // active tab icon, positive accents
  greenSoft: '#d9f2df',
  ink: '#141414',
  ink2: '#4a4f4b',
  faint: '#6b746d',
  line: '#e2e9e3',
  warn: '#a8510a',
  warnBg: '#fff3e4',
  warnInk: '#5c3006',
  okBg: '#e6f6ea',
  okInk: '#0f3d22',
  neg: '#b3261e',
  negBg: '#fde8e6',
  outside: '#dfe7e0', // around the phone frame on web
  night: '#1d2a21', // toasts and tooltips (white text)

  // Mascot
  brown: '#b5733a',
  tail: '#cf9150',
  belly: '#f6e4c9',
  eye: '#2a1a0e',
  mouth: '#7a2e22',
  cheek: '#f2a08a',
  sweat: '#6ec6ff',
  acorn: '#9a5a26',
  acornCap: '#5e3816',
};

export const radius = { card: 8, pill: 999 };

/** Euro amount, e.g. eur(-12.5) → "−€12.50". Lives in @orava/core, so the engine formats the same way. */
export { eur } from '@orava/core';
