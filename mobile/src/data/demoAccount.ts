// Fake account data for "Continue with demo data", shaped like rows of the S-Bank `transactions`
// table: twelve months (Oct 2025 – Sep 2026) of a customer close to the dataset's median
// (income €3,480, rent 31% of income, Helsinki region).
//
// It is generated, but always the same (fixed random seed), and contains what Money health needs
// to show its features: regular payments (rent, phone, gym, Spotify, monthly investing), seasonal
// moments (holiday pay in June, a summer trip, Black Friday, Christmas) and surprises (a broken
// washing machine in March, a dentist bill in August).

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  category: string; // same values as the `category` column
  type: string; // same values as the `transaction_type` column
  merchant: string;
  amount: number; // negative = money out
}

/** What a signed-in user sees: their transactions (newest first) and current balance. */
export interface Account {
  username: string;
  txs: Transaction[];
  balance: number;
}

/** Balance on 1 October 2025, before any of the transactions below. */
export const OPENING_BALANCE = 1800;

const TYPE: Record<string, string> = {
  Salary: 'salary',
  'Other Income': 'other_income',
  Housing: 'housing_payment',
  Utilities: 'utilities_payment',
  'Invest Deposit': 'investment_deposit',
  'Salary Sweep': 'salary_sweep',
};

let seq = 0;
const tx = (date: string, category: string, merchant: string, amount: number): Transaction => ({
  id: `t${++seq}`,
  date,
  category,
  type: TYPE[category] ?? 'purchase',
  merchant,
  amount: Math.round(amount * 100) / 100,
});

// Small seeded random generator (mulberry32), so the demo is the same on every run.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Helen electricity by calendar month: higher in the dark, cold months. */
const ELECTRICITY = [95, 90, 74, 58, 46, 38, 35, 39, 45, 55, 72, 88];

const GROCERS = ['S-market', 'Prisma', 'Alepa', 'Sale'];
const RESTAURANTS = [
  'Rax Buffet',
  'Hesburger',
  'Pizzeria Dennis',
  'Restaurant Sea Horse',
  'Fafa’s',
];

function month(y: number, m: number, r: () => number): Transaction[] {
  const d = (day: number) => `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const around = (base: number, spread: number) => base + (r() * 2 - 1) * spread;
  const out: Transaction[] = [
    // Regular payments: same payee, same (or nearly the same) amount every month.
    tx(d(1), 'Housing', 'Rent', -1088),
    tx(d(2), 'Utilities', 'HSY water', -61.2),
    tx(d(3), 'Lifestyle', 'Elixia gym', -49),
    tx(d(6), 'Entertainment', 'Spotify', -11.99),
    tx(d(8), 'Transportation', 'HSL travel card', -120),
    tx(d(10), 'Utilities', 'Elisa phone', -54.8),
    tx(d(15), 'Salary', 'Employer Oy', 3480),
    tx(d(16), 'Invest Deposit', 'Nordnet monthly savings', -150),
    tx(d(19), 'Utilities', 'Helen electricity', -ELECTRICITY[m - 1]),
  ];
  // Everyday spending: random days and shops, like real life.
  const day = () => 1 + Math.floor(r() * 28);
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  for (let i = 0; i < 4; i++) out.push(tx(d(day()), 'Groceries', pick(GROCERS), -around(150, 35)));
  for (let i = 0; i < 5; i++)
    out.push(tx(d(day()), 'Restaurants', pick(RESTAURANTS), -around(56, 20)));
  out.push(tx(d(day()), 'Transportation', 'Neste fuel', -around(100, 20)));
  out.push(tx(d(day()), 'Transportation', 'ABC fuel', -around(100, 20)));
  out.push(tx(d(day()), 'Entertainment', 'Finnkino', -around(42, 12)));
  out.push(
    tx(d(day()), 'Entertainment', pick(['Tavastia', 'Linnanmäki', 'HIFK game']), -around(45, 15)),
  );
  out.push(tx(d(day()), 'Lifestyle', pick(['Sokos', 'Stockmann', 'Zalando']), -around(150, 50)));
  if (r() < 0.5) out.push(tx(d(day()), 'Travel', 'VR train', -around(85, 25)));
  if (r() < 0.45) out.push(tx(d(day()), 'Health', 'Pharmacy', -around(45, 20)));
  if (r() < 0.6)
    out.push(tx(d(day()), 'Home & Tech', pick(['Tokmanni', 'Clas Ohlson']), -around(80, 30)));
  return out;
}

/** One-offs that make the year look like a real year. */
const EXTRAS: Transaction[] = [
  // Black Friday
  tx('2025-11-28', 'Home & Tech', 'Gigantti (TV, Black Friday)', -549),
  // Christmas
  tx('2025-12-12', 'Lifestyle', 'Stockmann (presents)', -260),
  tx('2025-12-18', 'Lifestyle', 'Lelukauppa (presents)', -85),
  tx('2025-12-22', 'Groceries', 'Prisma (Christmas food)', -210),
  // The brief's example of a "mandatory and irregular" cost
  tx('2026-03-09', 'Home & Tech', 'Gigantti (washing machine)', -649),
  tx('2026-04-14', 'Health', 'Terveystalo', -95),
  // Holiday pay and the summer trip
  tx('2026-06-12', 'Other Income', 'Holiday pay (lomaraha)', 1650),
  tx('2026-07-02', 'Travel', 'Finnair', -420),
  tx('2026-07-10', 'Travel', 'Viking Line', -180),
  tx('2026-07-11', 'Restaurants', 'Restaurant in Tallinn', -96),
  tx('2026-08-20', 'Health', 'Oral dentist', -180),
  tx('2026-09-25', 'Entertainment', 'Tavastia concert', -57),
];

function build(): Transaction[] {
  const r = rng(2026);
  const all: Transaction[] = [...EXTRAS];
  for (let i = 0; i < 12; i++) {
    const y = i < 3 ? 2025 : 2026;
    const m = ((9 + i) % 12) + 1; // Oct 2025 … Sep 2026
    all.push(...month(y, m, r));
  }
  // Newest first, like the app's list.
  return all.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export const DEMO_TXS = build();

/** Account used by "Continue with demo data" on the sign-in screen. */
export function demoAccount(): Account {
  return { username: 'demo', txs: DEMO_TXS, balance: balanceOf(DEMO_TXS) };
}

export function balanceOf(txs: Transaction[]) {
  return txs.reduce((b, t) => b + t.amount, OPENING_BALANCE);
}
