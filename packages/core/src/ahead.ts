// Coming up: what each of the next 3 months will leave you, and so what you can and can't spend.
// Pure.
//
// A usual month: usual income (minus money moved to another bank), minus usual spending, minus
// regular saving (investing). Usual spending is the average of the last 12 full months with the
// seasonal bumps taken out, so one-off surprises (a broken washing machine) still count a little
// in every month, as they do in real life.
//
// Seasonal bumps come from the same month last year: a category that cost clearly more than its
// usual (presents at Christmas, a Black Friday TV, a summer trip) is expected again. Health and
// home costs only count when they fit the season (a Black Friday TV yes, a dentist in August no),
// so a one-off repair isn't predicted to break again next year. Extra income the same way
// (holiday pay).
//
// Then the plan: calm months pay for the big ones. What a big month can't cover itself is kept
// aside from the calm months before it, or comes from the balance when nothing comes before it;
// whatever is left is free to spend.

import { categoryInfo } from './categories';
import { basketOf, SPENDING_BASKETS } from './baskets';
import { avg, median, monthLabel, sum, type MonthTotals } from './months';

/** Monthly savings goal used by Safe to spend: 10% of income. */
export const SAVINGS_GOAL = 0.1;
/** How far ahead we look. */
const HORIZON = 3;
/** Months of history behind "usual". */
const WINDOW = 12;
/** Full months needed before a usual month means anything. */
const MIN_MONTHS = 3;

const EVENT: Record<number, string> = {
  6: 'Summer',
  7: 'Summer',
  8: 'Summer',
  11: 'Black Friday',
  12: 'Christmas',
};

/** Health and home costs that fit a season; every other surprise is a one-off. */
const SEASONAL_SURPRISE: Record<string, string[]> = {
  'Black Friday': ['Home & Tech'],
  Christmas: ['Home & Tech'],
};

export interface AheadPart {
  category: string;
  /** e.g. "presents", "travel". */
  label: string;
  /** Above the category's usual, same month last year. */
  extra: number;
}

export interface AheadMonth {
  /** YYYY-MM. */
  month: string;
  /** e.g. "December". */
  monthName: string;
  /** e.g. "Christmas", "Summer trip", "Holiday pay"; null for a usual month. */
  title: string | null;
  /** Category for the icon: the biggest bump, or null for a usual month. */
  category: string | null;
  /** What last year's same month cost on top of usual, biggest first. */
  parts: AheadPart[];
  /** Sum of parts. */
  extra: number;
  /** Income above usual last year in this month (holiday pay), 0 if none. */
  extraIncome: number;
  /** Expected to spare (+) or be short (−): usual left over + extra income − extra costs. */
  net: number;
}

export interface Ahead {
  /** Enough history for a usual month. */
  ready: boolean;
  /** Last year's data reaches at least one of the coming months. */
  hasHistory: boolean;
  /** The next 3 months, in order. */
  months: AheadMonth[];
  /** The usual month the forecast starts from. */
  usual: { income: number; spending: number; saving: number; left: number };
  /** Big months that cost more than a usual month leaves (sum of the shortfalls). */
  short: number;
  /** Of `short`: kept aside from calm months before the big ones. */
  aside: number;
  /** Calm months that should keep `aside`, e.g. ["October"]. */
  asideFrom: string[];
  /**
   * Of `short`: has to come from the balance, because a big month comes before any calm one or
   * the 3 months don't cover it.
   */
  fromBalance: number;
  /** Free to spend over the 3 months, on top of usual spending, once `aside` is kept. */
  free: number;
  /** Sum of the months' nets: below 0 means the 3 months cost more than they bring in. */
  total: number;
  balance: number;
}

/** Event name for the month, only when its biggest bump fits the event. */
function titleOf(event: string | undefined, category: string) {
  const name = categoryInfo(category).name;
  switch (event) {
    case 'Summer':
      if (category === 'Travel') return 'Summer trip';
      if (['Restaurants', 'Entertainment', 'Coffee'].includes(category)) return 'Summer outings';
      return name;
    case 'Black Friday':
      return ['Home & Tech', 'Lifestyle'].includes(category) ? 'Black Friday' : name;
    case 'Christmas':
      return ['Lifestyle', 'Home & Tech', 'Groceries', 'Restaurants'].includes(category)
        ? 'Christmas'
        : name;
    default:
      return name;
  }
}

/** Short name for one bump, e.g. Christmas groceries → "food". */
function labelOf(event: string | undefined, category: string) {
  if (event === 'Christmas') {
    if (['Lifestyle', 'Home & Tech'].includes(category)) return 'presents';
    if (category === 'Groceries') return 'food';
  }
  if (category === 'Restaurants') return 'eating out';
  return categoryInfo(category).name.toLowerCase();
}

/** Categories in `m` clearly above usual: at least €60 and 30% over. */
function bumpsOf(m: MonthTotals, usual: Record<string, number>): AheadPart[] {
  const event = EVENT[Number(m.month.slice(5))];
  return Object.keys(usual)
    .map((c) => ({
      category: c,
      label: labelOf(event, c),
      extra: (m.byCategory[c] ?? 0) - usual[c],
    }))
    .filter((x) => x.extra >= Math.max(60, usual[x.category] * 0.3))
    .filter(
      (x) =>
        basketOf(x.category, -1) !== 'surprises' ||
        (SEASONAL_SURPRISE[event] ?? []).includes(x.category),
    )
    .sort((a, b) => b.extra - a.extra);
}

const netIncome = (m: MonthTotals) => m.income - m.sweptOut;
const spendingOf = (m: MonthTotals, cats: string[]) => sum(cats.map((c) => m.byCategory[c] ?? 0));

export function aheadOf(all: MonthTotals[], balance: number): Ahead {
  const full = all.slice(0, -1).slice(-WINDOW); // the current month is still running
  const cats = [...new Set(full.flatMap((m) => Object.keys(m.byCategory)))].filter((c) =>
    SPENDING_BASKETS.includes(basketOf(c, -1)),
  );
  const median_: Record<string, number> = {};
  for (const c of cats) median_[c] = median(full.map((m) => m.byCategory[c] ?? 0));

  const income = median(full.map(netIncome));
  const big = Math.max(150, income * 0.075);
  // A month's seasonal bump, only when it's big enough to plan for.
  const bumpOf = (m: MonthTotals) => {
    const parts = bumpsOf(m, median_);
    const extra = sum(parts.map((p) => p.extra));
    return extra >= big ? { parts, extra } : { parts: [], extra: 0 };
  };
  const spending = avg(full.map((m) => spendingOf(m, cats) - bumpOf(m).extra));
  const saving = Math.max(0, median(full.map((m) => m.invested)));
  const left = income - spending - saving;

  const [cy, cm] = (all[all.length - 1]?.month ?? '2026-01').split('-').map(Number);
  const byMonth = new Map(full.map((m) => [m.month, m]));
  let hasHistory = false;
  const months: AheadMonth[] = [];
  for (let k = 1; k <= HORIZON; k++) {
    const d = new Date(cy, cm - 1 + k, 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const month = `${d.getFullYear()}-${mm}`;
    const then = byMonth.get(`${d.getFullYear() - 1}-${mm}`);
    if (then) hasHistory = true;
    const { parts, extra } = then ? bumpOf(then) : { parts: [], extra: 0 };
    const moreIn = then ? netIncome(then) - income : 0;
    const extraIncome = moreIn >= big ? moreIn : 0;
    const event = EVENT[d.getMonth() + 1];
    months.push({
      month,
      monthName: monthLabel(month).split(' ')[0],
      title: parts.length
        ? titleOf(event, parts[0].category)
        : extraIncome
          ? event === 'Summer'
            ? 'Holiday pay'
            : 'Extra income'
          : null,
      category: parts[0]?.category ?? null,
      parts,
      extra,
      extraIncome,
      net: left + extraIncome - extra,
    });
  }

  // Walk the months: calm months build up money, big ones draw it down. Running out means the
  // balance has to step in.
  let pot = 0;
  let fromBalance = 0;
  let short = 0;
  const asideFrom: string[] = [];
  const lastShort = months.reduce((j, m, i) => (m.net < 0 ? i : j), -1);
  months.forEach((m, i) => {
    if (m.net < 0) short -= m.net;
    else if (i < lastShort && m.net >= 1) asideFrom.push(m.monthName);
    pot += m.net;
    if (pot < 0) {
      fromBalance -= pot;
      pot = 0;
    }
  });

  return {
    ready: full.length >= MIN_MONTHS,
    hasHistory,
    months,
    usual: { income, spending, saving, left },
    short,
    aside: short - fromBalance,
    asideFrom,
    fromBalance,
    // Money borrowed from the balance for timing is put back from the later calm months.
    free: Math.max(0, sum(months.map((m) => m.net))),
    total: sum(months.map((m) => m.net)),
    balance,
  };
}

/** Forecasts are rough: show them to the nearest €10. */
export const round10 = (n: number) => Math.round(n / 10) * 10;
const money = (n: number) => `€${round10(Math.abs(n)).toLocaleString('en-GB')}`;
const list = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

export interface AheadVerdict {
  /** The one thing to do, e.g. "Keep €300 aside in October". */
  title: string;
  /** Why, and what that leaves free to spend. */
  body: string;
  /** ok: the 3 months pay for themselves; warn: they don't. */
  tone: 'ok' | 'warn';
}

/** What the next 3 months mean for spending, in words. */
export function aheadVerdict(a: Ahead): AheadVerdict {
  const last = a.months[a.months.length - 1]?.monthName ?? '';
  const big = a.months.filter((m) => m.net < 0 && m.title).map((m) => m.title!);
  const what = big.length ? list(big) : 'The coming months';
  const freeLine =
    round10(a.free) > 0
      ? `On top of your usual spending, about ${money(a.free)} is free until the end of ${last}.`
      : `Nothing extra is free to spend until the end of ${last}.`;

  if (a.total < 0) {
    const cut = -a.total / Math.max(1, a.months.length);
    return {
      tone: 'warn',
      title: `Negative end balance of ${money(a.total)} by the end of ${last}`,
      body: `${what} will cost more than you bring in. Spend about ${money(cut)} a month less on flexible spending, or it comes out of your savings.`,
    };
  }
  if (a.short > 0 && round10(a.aside) > 0) {
    return {
      tone: 'ok',
      title: `Keep ${money(a.aside)} aside in ${list(a.asideFrom)}`,
      body: `${what} will cost more than ${big.length === 1 ? 'that month leaves' : 'those months leave'}, so this money is already spoken for.${
        round10(a.fromBalance) > 0 ? ` ${money(a.fromBalance)} more comes from your balance.` : ''
      } ${freeLine}`,
    };
  }
  if (a.short > 0) {
    return {
      tone: 'ok',
      title: `${list(big)} comes first: use ${money(a.fromBalance)} of your balance`,
      body: `Put it back from the calmer months after. ${freeLine}`,
    };
  }
  const income = a.months
    .filter((m) => m.extraIncome > 0)
    .map((m) => `${m.title} in ${m.monthName}`);
  return {
    tone: 'ok',
    title: `About ${money(a.free / Math.max(1, a.months.length))} a month to spend freely`,
    body: `${
      income.length
        ? `${list(income)} helps, if it comes again like last year.`
        : big.length || a.months.some((m) => m.title)
          ? 'The big months fit in what they leave.'
          : 'Nothing big coming up.'
    } That's on top of your usual spending${a.usual.saving > 0 ? `, after your ${money(a.usual.saving)} monthly saving` : ''}.${
      a.hasHistory
        ? ''
        : ' After a year with S-Bank, Orava also warns about big months like Christmas.'
    }`,
  };
}
