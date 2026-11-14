// Synthetic demo account: invented transactions shaped like rows of the S-Bank
// `transactions` table. Used by "Try demo" on the login screen, so the app works
// without Supabase or a network. It is NOT real customer data.
//
// Because the data is made up, its coverage is known exactly: every day from
// 1 Jun 2026 to 30 Sep 2026. That lets Orava compare September with Jun–Aug fairly.

import type { Coverage } from '../orava/analysis';

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
  /** True for the synthetic demo account. Shown clearly in the UI. */
  isDemo: boolean;
  /** Verified date range the data fully covers, or null when unknown. */
  coverage: Coverage | null;
}

export const DEMO_COVERAGE: Coverage = { start: '2026-06-01', end: '2026-09-30' };

/** Balance on 1 Sep 2026, before September's transactions. */
const BALANCE_1_SEP = 1200;

let seq = 0;
const tx = (
  date: string,
  category: string,
  merchant: string,
  amount: number,
  type = 'purchase',
): Transaction => ({ id: `t${++seq}`, date, category, type, merchant, amount });

/** The same bills and essentials every month, plus that month's flexible spending. */
function month(m: string, flexible: Transaction[]): Transaction[] {
  return [
    tx(`${m}-01`, 'Housing', 'Rent', -1088.0, 'housing_payment'),
    tx(`${m}-02`, 'Utilities', 'HSY water', -61.2, 'utilities_payment'),
    tx(`${m}-04`, 'Groceries', 'S-market', -176.3),
    tx(`${m}-08`, 'Transportation', 'HSL travel card', -120.0),
    tx(`${m}-10`, 'Utilities', 'Elisa phone', -54.8, 'utilities_payment'),
    tx(`${m}-12`, 'Groceries', 'Alepa', -151.2),
    tx(`${m}-15`, 'Salary', 'Employer Oy', 3480.0, 'salary'),
    tx(`${m}-18`, 'Transportation', 'Neste fuel', -104.0),
    tx(`${m}-19`, 'Utilities', 'Helen electricity', -45.0, 'utilities_payment'),
    tx(`${m}-21`, 'Groceries', 'Prisma', -148.9),
    tx(`${m}-27`, 'Groceries', 'S-market', -139.4),
    ...flexible,
  ];
}

// Earlier months: restaurants ~€130, entertainment ~€110, lifestyle ~€170, travel ~€40 a month.
// No flexible spending on the 31st, so the day-1–30 comparison sees all of it.
const JUNE = month('2026-06', [
  tx('2026-06-06', 'Restaurants', 'Rax Buffet', -58.0),
  tx('2026-06-20', 'Restaurants', 'Pizzeria', -67.0),
  tx('2026-06-13', 'Entertainment', 'Finnkino', -45.0),
  tx('2026-06-25', 'Entertainment', 'Spotify & concerts', -60.0),
  tx('2026-06-16', 'Lifestyle', 'Sokos', -165.0),
  tx('2026-06-26', 'Travel', 'VR train', -40.0),
]);
const JULY = month('2026-07', [
  tx('2026-07-05', 'Restaurants', 'Hesburger', -62.0),
  tx('2026-07-24', 'Restaurants', 'Restaurant Sea Horse', -73.0),
  tx('2026-07-11', 'Entertainment', 'Ruisrock ticket', -115.0),
  tx('2026-07-17', 'Lifestyle', 'Stockmann', -180.0),
  tx('2026-07-09', 'Travel', 'Matkahuolto bus', -45.0),
]);
const AUGUST = month('2026-08', [
  tx('2026-08-08', 'Restaurants', 'Rax Buffet', -60.0),
  tx('2026-08-22', 'Restaurants', 'Pizzeria', -70.0),
  tx('2026-08-14', 'Entertainment', 'Finnkino', -50.0),
  tx('2026-08-28', 'Entertainment', 'Spotify & concerts', -60.0),
  tx('2026-08-19', 'Lifestyle', 'Sokos', -165.0),
  tx('2026-08-29', 'Travel', 'VR train', -35.0),
]);

/** September 2026: restaurants are clearly up, the rest is near usual. Travel is small (€38),
 * so the larger what-if amounts are turned off for it. */
const SEPTEMBER: Transaction[] = [
  tx('2026-09-01', 'Housing', 'Rent', -1088.0, 'housing_payment'),
  tx('2026-09-02', 'Utilities', 'HSY water', -61.2, 'utilities_payment'),
  tx('2026-09-03', 'Transportation', 'ABC fuel', -110.5),
  tx('2026-09-04', 'Groceries', 'S-market', -182.4),
  tx('2026-09-05', 'Restaurants', 'Restaurant Sea Horse', -72.3),
  tx('2026-09-06', 'Entertainment', 'Spotify & concerts', -69.0),
  tx('2026-09-08', 'Transportation', 'HSL travel card', -120.0),
  tx('2026-09-10', 'Utilities', 'Elisa phone', -54.8, 'utilities_payment'),
  tx('2026-09-11', 'Health', 'Pharmacy', -112.0),
  tx('2026-09-12', 'Restaurants', 'Hesburger', -64.2),
  tx('2026-09-13', 'Groceries', 'Alepa', -155.1),
  tx('2026-09-15', 'Salary', 'Employer Oy', 3480.0, 'salary'),
  tx('2026-09-16', 'Lifestyle', 'Sokos', -150.0),
  tx('2026-09-18', 'Home & Tech', 'Tokmanni', -205.0),
  tx('2026-09-19', 'Utilities', 'Helen electricity', -45.0, 'utilities_payment'),
  tx('2026-09-20', 'Restaurants', 'Rax Buffet', -58.9),
  tx('2026-09-22', 'Groceries', 'Prisma', -141.75),
  tx('2026-09-24', 'Transportation', 'Neste fuel', -99.5),
  tx('2026-09-25', 'Entertainment', 'Finnkino', -51.0),
  tx('2026-09-26', 'Travel', 'VR train', -38.0),
  tx('2026-09-27', 'Restaurants', 'Pizzeria', -54.6),
  tx('2026-09-28', 'Groceries', 'S-market', -140.75),
];

const newestFirst = (a: Transaction, b: Transaction) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : 0;

/** The synthetic demo account. Built fresh each time so demo buttons start clean. */
export function demoAccount(): Account {
  const txs = [...JUNE, ...JULY, ...AUGUST, ...SEPTEMBER].sort(newestFirst);
  const balance = SEPTEMBER.reduce((b, t) => b + t.amount, BALANCE_1_SEP);
  return { username: 'Demo', txs, balance, isDemo: true, coverage: DEMO_COVERAGE };
}

/** Buttons in the demo add these transactions on top of the list (inside the covered range). */
export const DEMO_ACTIONS = {
  eatOut: () => tx('2026-09-29', 'Restaurants', 'Takeaway', -45),
  jacket: () => tx('2026-09-29', 'Lifestyle', 'New jacket', -120),
  sideGig: () => tx('2026-09-29', 'Other Income', 'Side gig', 400, 'other_income'),
};
