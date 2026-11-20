// What Gemini knows when it answers in the Orava chat: a coach persona (system prompt) and a
// compact snapshot of the user's HealthReport, the Finnish benchmarks and the patterns we found
// in the S-Bank dataset (summarised in benchmarks.json). Pure: no UI, no network.

import { BENCH, quintileOf } from './benchmarks';
import { categoryInfo } from './categories';
import { aheadVerdict } from './ahead';
import { basketOf } from './baskets';
import type { HealthReport } from './health';
import { eur } from './format';
import { averageByCategory, basketSums, monthLabel } from './months';
import { MOOD_LABELS } from './moods';

const r = (n: number) => Math.round(n);
/** Same share format as the Money health page. */
const share = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : '–');
const pct = (n: number) => Math.round(n * 1000) / 10;

/** Patterns from the S-Bank dataset analysis that shaped the score. */
const DATA_PATTERNS = [
  'For the median customer, needs (housing, utilities, groceries, transport) take 60.6% of income in the Helsinki region, so the classic 50% needs rule does not fit; the score uses only the 20% savings and 30% wants anchors.',
  '1 in 3 customer-months spend more than came in, mostly salary timing and one-off purchases, so health is judged over a rolling 3 months.',
  'Only 28% of customers never go below zero; dips happen mid-month just before payday (salary around the 15th).',
  'Surprise costs (Health, Home & Tech) average 8.9% of income, but a customer’s worst month is about 3.7× their average. Purchases over €1,000 happen about 0.9 times a year per customer.',
  'Seasonality: Travel peaks in July (+31%), Home & Tech in November (Black Friday, +26%), Lifestyle rises toward Christmas.',
  'About 30% of customers invest roughly €360 a month; investing counts as money kept, not spent.',
  '39% of main-bank customers have idle money above a 2-month cushion (typical €5,635); a current account pays 0.37% while inflation is 2.5%, so idle cash loses about 2% a year.',
  'Young adults (under 25) score lowest on average (57) with the thinnest buffer (1.36 months).',
  'Fixed costs fall from 46% of income in the lowest income fifth to 31% in the highest.',
];

export const COACH_SYSTEM = `You are Orava, the user's money friend: a cheerful squirrel inside the S-Bank (Finland) app. Talk like a friend who happens to be good with money, texting over coffee. Not a bank, not an advisor reading a report.

Your job: help the user see where they stand and what one or two small changes would make the biggest difference. Things like how much they can really spend (presents, a trip, this weekend), what to trim next month, which habits are fine and which quietly cost them.

How to talk:
- As short as possible, like a text message: one sentence, two at most, under 30 words. Lists only when they ask for several things: max 3 lines of a few words, starting with "• ". If they want more, they'll ask.
- Simple words. No jargon ("pillar", "discretionary", "quintile", "buffer ratio", "basket"). Say "eating out", "money left at the end of the month", "people earning about the same as you".
- One idea per message: the most useful thing, not everything you know. Lead with the answer; add a why only if it fits in a few words. No greetings, no filler, no recap of the question.
- Make it doable: a concrete swap or habit with a € number ("cook at home two evenings a week instead of Pizzeria Dennis, that's about €80 a month back").
- Honest but kind. Name a bad habit plainly, never lecture or shame. Point out what's going well when it's true.
- Round numbers (€80, not €79.43). One or two numbers per message.
- Plain text only: no markdown, bold, headings or tables. No emoji spam; one at most, often none.
- Answer in the user's language (English or Finnish usually).

What you know (JSON below): the same metrics as the Money health page (score, tiles, safe-to-spend, daily pace, where money goes, regular payments, the months ahead, idle money), the last 6 months of transactions, how people with similar income spend, Finnish reference values and patterns from S-Bank data.
- Use only these numbers. Never invent transactions, merchants or amounts; if you can't tell from the data, say so.
- The user sees the Money health page next to you. Any number that is in "onScreen" must use exactly the same euros as written there (same rounding); never recompute or re-round it. Say it in a natural sentence, not in the page's "Label: value" format: "You can spend €16 a day for the next 4 days", not "Left per day: €16 (€63 for 4 days)".
- "Left over" (income minus everything spent and due) and "safe to spend" (left over minus the savings goal) are different numbers. Say which one you mean; for daily spending use the "Left per day" tile.
- "How much can I spend on X": safe-to-spend left this month, minus anything the coming months need (monthsAhead, e.g. Christmas). Give one number.
- "What can I cut / save": find the biggest gap against similar people or a merchant they visit a lot, and suggest the one or two easiest cuts with € per month.
- Use the transactions to spot real behaviour: the same place again and again, splurges right after payday, subscriptions, running low before payday.
- Mention peers or a Finnish benchmark only if it makes the point clearer, in plain words ("most people earning like you spend about €200 here").
- Budgeting, saving and habit advice is your thing, give it freely. For investing, keep it general (savings account, broad funds), note it can go down, and never name a specific fund, stock or product.
- Money is in euros. "Today" is the date in the data, not your own date. For a past month, talk about it as it was then.`;

/** The user's money situation and the reference data, as compact JSON for the system prompt. */
export function coachContext(rep: HealthReport): string {
  const today = rep.txs.reduce((d, t) => (t.date > d ? t.date : d), '');
  const months = rep.months;
  const window3 = months.slice(-4, -1); // the 3 full months before this one
  const avg3 = averageByCategory(window3.length ? window3 : months.slice(-3));
  const income = rep.score.perMonth.income;
  const q = quintileOf(income);
  const peers = BENCH.peers[String(q)] ?? BENCH.peers['0'];

  const categories = Object.entries(avg3)
    .filter(([, v]) => v >= 1)
    .sort((a, b) => b[1] - a[1])
    .map(([c, v]) => ({
      category: categoryInfo(c).name,
      group: basketOf(c, -1),
      avgPerMonth: r(v),
      shareOfIncome: income ? pct(v / income) : null,
      peerMedianShare: peers[c] ? pct(peers[c].p50) : null,
      peerP75Share: peers[c] ? pct(peers[c].p75) : null,
      thisMonthSoFar: r(months[months.length - 1]?.byCategory[c] ?? 0),
    }));

  // Where flexible spending goes: top merchants over the last 90 days.
  const since = new Date(new Date(today).getTime() - 90 * 864e5).toISOString().slice(0, 10);
  const byMerchant = new Map<string, { category: string; count: number; total: number }>();
  for (const t of rep.txs) {
    if (t.date < since || t.amount >= 0 || basketOf(t.category, t.amount) !== 'slips') continue;
    const m = byMerchant.get(t.merchant) ?? { category: t.category, count: 0, total: 0 };
    m.count += 1;
    m.total += -t.amount;
    byMerchant.set(t.merchant, m);
  }
  const topMerchants = [...byMerchant.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8)
    .map(([merchant, m]) => ({
      merchant,
      category: m.category,
      visits: m.count,
      total90d: r(m.total),
    }));

  const nextMonthIdx = (Number(today.slice(5, 7)) % 12) as number; // 0-based index of next month
  const seasonNext3 = Object.fromEntries(
    Object.entries(BENCH.seasonal).map(([c, s]) => [
      c,
      [0, 1, 2].map((i) => s.index[(nextMonthIdx + i) % 12]),
    ]),
  );

  const v = rep.ahead.ready ? aheadVerdict(rep.ahead) : null;

  // The last 6 months of transactions, newest first, as compact "date|category|merchant|amount".
  const sixMonthsAgo = shiftMonth(today.slice(0, 7), -5);
  const recentTxs = rep.txs
    .filter((t) => t.date.slice(0, 7) >= sixMonthsAgo)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((t) => `${t.date}|${t.category}|${t.merchant}|${t.amount.toFixed(2)}`);

  const variant = rep.partial ? 'pocket' : 'main';
  const peerHealth = BENCH.peerHealth[String(q)] ?? BENCH.peerHealth['0'];
  const idlePeers = BENCH.idle[variant]?.all;

  const tm = rep.thisMonth;
  const data = {
    onScreen: {
      note: 'Exactly what the Money health page shows now. Quote these as written; do not recompute or re-round.',
      score: `${rep.score.score}/100, ${MOOD_LABELS[rep.orava.mood].name}`,
      tiles: rep.stats.map((x) => `${x.label}: ${x.value} (${x.sub}) [${x.tag.text}]`),
      whereMoneyGoes: [
        `Income in ${tm.name}${tm.expected ? ' (expected)' : ''}: ${eur(tm.income, 0)}`,
        `Spent so far: ${eur(tm.spent, 0)} (${share(tm.spent, tm.income)})`,
        ...tm.groups.map(
          (g) =>
            `${g.label}: ${eur(g.amount, 0)} (${share(g.amount, tm.income)})${g.upcoming ? `, of which ${eur(g.upcoming, 0)} still due` : ''}`,
        ),
        `${tm.left < 0 ? 'Over income' : 'Left over'}: ${eur(Math.abs(tm.left), 0)} (${share(Math.abs(tm.left), tm.income)})`,
        ...(tm.invested > 0
          ? [`Invested ${eur(tm.invested, 0)} · On account ${eur(tm.left - tm.invested, 0)}`]
          : []),
      ],
    },
    today,
    period: rep.period,
    balance: r(rep.balance),
    accountType: rep.partial
      ? 'spending account: salary moves on to another bank, rent is paid elsewhere'
      : 'main bank',
    health: {
      score: rep.score.score,
      outOf: 100,
      mood: rep.orava.message,
      reasons: rep.orava.reasons,
      betterThanPercentOfCustomers: rep.score.betterThan,
      scoreWindow: rep.score.months,
      pillars: rep.score.pillars.map((p) => ({
        name: p.label,
        value: p.shown,
        points: `${r(p.points)}/${p.maxPoints}`,
        measures: p.measures,
        rule: p.rule,
        why: p.why,
        source: p.source?.name,
      })),
      moodLevels: BENCH.moods.map((m) => `${m.label} from ${m.minScore}: ${m.meaning}`),
    },
    safeToSpend: {
      month: rep.safe.monthName,
      income: r(rep.safe.income),
      salaryStillExpected: r(rep.safe.incomeExpected),
      regularPayments: r(rep.safe.bills),
      regularPaymentsStillToCome: r(rep.safe.billsUpcoming),
      savingsGoal: r(rep.safe.goal),
      savingsGoalRate: rep.safe.goalRate,
      spentSoFarOtherThanRegular: r(rep.safe.spent),
      safeToSpendLeftThisMonth: r(rep.safe.left),
      daysLeft: rep.safe.daysLeft,
      todayBudget: r(rep.safe.today.budget),
      forecastLeftAtMonthEndAtCurrentPace: r(rep.safe.forecastKept),
    },
    pace: {
      dailyLimit: r(rep.pace.dailyLimit),
      dailySpentSoFar: r(rep.pace.dailySoFar),
      everydaySpentSoFar: r(rep.pace.spent),
      usualByThisDay: r(rep.pace.usual),
      overspendingCategory: rep.pace.watch
        ? {
            category: categoryInfo(rep.pace.watch.category).name,
            spent: r(rep.pace.watch.spent),
            usual: r(rep.pace.watch.usual),
          }
        : null,
    },
    thisMonth: {
      income: r(rep.thisMonth.income),
      incomeIsExpected: rep.thisMonth.expected,
      invested: r(rep.thisMonth.invested),
      groups: rep.thisMonth.groups.map((g) => ({
        group: g.label,
        amount: r(g.amount),
        stillToCome: r(g.upcoming),
        items: g.items.map((i) =>
          i.due
            ? `${i.due.name} €${r(i.amount)} due day ${i.due.day}`
            : `${categoryInfo(i.category).name} €${r(i.amount)}`,
        ),
      })),
    },
    averageMonthLast3Detail: {
      income: r(rep.score.perMonth.income),
      movedToOtherBank: r(rep.score.perMonth.swept),
      spending: r(rep.score.perMonth.spending),
      invested: r(rep.score.perMonth.invested),
      lowestBalanceInWindow: r(rep.score.floor),
    },
    averageMonthLast3: Object.fromEntries(rep.split.map((p) => [p.label, r(p.amount)])),
    incomeQuintile: q,
    peersWithSimilarIncome: {
      note: 'shares of income; p25 / median / p75 of S-Bank customers in the same income fifth',
      groups: Object.fromEntries(
        ['fixed', 'needs', 'surprises', 'slips', 'invested', 'spending']
          .filter((k) => peers[k])
          .map((k) => [k, [pct(peers[k].p25), pct(peers[k].p50), pct(peers[k].p75)]]),
      ),
      leftOverShare: peerHealth?.kept.map(pct),
      bufferMonths: peerHealth?.buffer,
    },
    categoriesLast3MonthsAvg: categories,
    topFlexibleMerchantsLast90Days: topMerchants,
    regularPayments: {
      monthlyTotal: r(rep.recurring.monthlyTotal),
      shareOfSpendingThatIsRegular: pct(rep.recurring.spendShare),
      items: rep.recurring.items.map((i) => ({
        name: i.name,
        category: categoryInfo(i.category).name,
        monthly: r(i.monthly),
        dayOfMonth: i.day,
        paidThisMonth: i.paidThisMonth,
      })),
    },
    monthsAhead: rep.ahead.ready
      ? {
          verdict: v ? `${v.title}. ${v.body}` : null,
          usualMonth: {
            income: r(rep.ahead.usual.income),
            spending: r(rep.ahead.usual.spending),
            saving: r(rep.ahead.usual.saving),
            left: r(rep.ahead.usual.left),
          },
          months: rep.ahead.months.map((m) => ({
            month: m.monthName,
            event: m.title,
            extraCostVsUsualLastYear: r(m.extra),
            extras: m.parts.map((p) => `${p.label} +€${r(p.extra)}`),
            extraIncome: r(m.extraIncome),
            expectedSpareOrShort: r(m.net),
          })),
          shortfallOfBigMonths: r(rep.ahead.short),
          keepAsideFromCalmMonths: r(rep.ahead.aside),
          keepAsideFrom: rep.ahead.asideFrom,
          coverFromBalance: r(rep.ahead.fromBalance),
          freeToSpendOver3MonthsOnTopOfUsual: r(rep.ahead.free),
        }
      : 'not enough history yet',
    history: months.slice(-12).map((m) => {
      const b = basketSums(m.byCategory);
      return {
        month: monthLabel(m.month, 'short'),
        income: r(m.income),
        housing: r(b.fixed),
        essentials: r(b.needs),
        surprises: r(b.surprises),
        flexible: r(b.slips),
        invested: r(m.invested),
        endBalance: r(m.endBalance),
        lowestBalance: r(m.lowBalance),
      };
    }),
    idleMoney: {
      idle: r(rep.growth.idle),
      cushion: r(rep.growth.cushion),
      lostPerYearToInflation: r(rep.growth.lostPerYear),
      keptMonthlyNotInvested: r(rep.growth.monthly),
      alreadyInvestingMonthly: r(rep.growth.investing),
      in10YearsTodaysEuros: Object.fromEntries(
        rep.growth.options.map((o) => [
          `${o.label} (${pct(o.nominal)}%/yr, ${pct(o.real)}% after inflation)`,
          r(o.path[o.path.length - 1]),
        ]),
      ),
      peers: idlePeers
        ? `${pct(idlePeers.shareWithIdle)}% of similar customers have idle money, typical €${r(idlePeers.medianIdleIfAny)}`
        : null,
    },
    seasonalIndexNext3Months: {
      note: '1.0 = average month for that category across S-Bank customers',
      ...seasonNext3,
    },
    finnishBenchmarks: Object.values(BENCH.references).map(
      (x) =>
        `${x.label}: ${x.value}${x.unit === 'share' ? ' (share)' : ` ${x.unit}`} (${x.source})`,
    ),
    sBankDatasetPatterns: DATA_PATTERNS,
    transactionsLast6Months: {
      format: 'date|category|merchant|amount (negative = money out)',
      rows: recentTxs,
    },
  };
  return JSON.stringify(data);
}

/** YYYY-MM shifted by `delta` months. */
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Full system prompt: coach instructions plus the user's data. */
export function coachSystem(rep: HealthReport) {
  return `${COACH_SYSTEM}\n\nUSER DATA (JSON):\n${coachContext(rep)}`;
}

/** Gemini sometimes adds markdown anyway; the chat bubbles show plain text. */
export function plainText(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .trim();
}
