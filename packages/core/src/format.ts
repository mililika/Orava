// Number formatting shared by the engine (coach prompt) and the web app (theme.ts re-exports it).

/** Euro amount, e.g. eur(-12.5) → "−€12.50". */
export function eur(n: number, decimals = 2) {
  const s = Math.abs(n).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${n < 0 ? '−' : ''}€${s}`;
}
