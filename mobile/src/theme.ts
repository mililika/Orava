// Shared colors and sizes, matched to the S-mobiili look:
// mint canvas, white rounded cards, bold dark-green titles, thin green line icons.
export const colors = {
  mint: '#fdf9f1',
  card: '#ffffff',
  green: '#1b4332',
  green2: '#3f6653',
  greenSoft: '#c1ecd4',
  ink: '#1c1c17',
  ink2: '#53433b',
  faint: '#766b63',
  line: '#d9c2b7',
  warn: '#8c4a20',
  warnBg: '#ffdbc9',
  warnInk: '#673d00',
  okBg: '#c1ecd4',
  okInk: '#274e3d',
  neg: '#ba1a1a',
  negBg: '#ffdad6',
  outside: '#dddad2',
  amber: '#dda15e',
  paper: '#f5f1e9',

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

export const radius = { card: 14, pill: 999 };

/** Euro amount, e.g. eur(-12.5) → "−€12.50". */
export function eur(n: number, decimals = 2) {
  const s = Math.abs(n).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${n < 0 ? '−' : ''}€${s}`;
}
