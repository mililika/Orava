// Orava's chat answers. Prototype: no AI backend yet, so this is a small keyword matcher that
// answers from the same HealthReport the screen shows. Swap `answer()` for a real API call later;
// the chat UI only needs a question in and a string out.

import { categoryInfo } from '../data/categories';
import { aheadVerdict, round10 } from './ahead';
import type { HealthReport } from './health';

const eur = (n: number) => `€${Math.round(Math.abs(n)).toLocaleString('en-GB')}`;

export const SUGGESTIONS = [
  'How much can I spend on presents?',
  'What can I cut next month to save?',
  'How is this month going?',
  'What can I spend this week?',
  'Why is my score like this?',
  'What’s coming up?',
  'Is my money working?',
];

export function answer(q: string, r: HealthReport): string {
  const t = q.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  const part = (key: string) => r.split.find((p) => p.key === key);
  const pillar = (key: string) => r.score?.pillars.find((p) => p.key === key);

  if (
    has(
      'coming',
      'ahead',
      'next months',
      'year',
      'christmas',
      'summer',
      'holiday',
      'vacation',
      'present',
      'black friday',
      'plan',
    )
  ) {
    const a = r.ahead;
    if (!a.ready)
      return 'After a few months with S-Bank, I can tell you what the months ahead leave you.';
    const v = aheadVerdict(a);
    const big = a.months
      .filter((m) => m.parts.length)
      .map(
        (m) =>
          `${m.title} in ${m.monthName} cost ${eur(round10(m.extra))} more than usual last year (${m.parts
            .map((p) => `${p.label} +${eur(round10(p.extra))}`)
            .join(', ')}).`,
      );
    return `${v.title}. ${v.body}${big.length ? ` ${big.join(' ')}` : ''} A usual month leaves you about ${eur(round10(a.usual.left))}.`;
  }
  if (has('regular', 'recurring', 'subscription', 'every month')) {
    return `${r.recurring.items.length} regular payments, ${eur(r.recurring.monthlyTotal)} a month: ${r.recurring.items
      .slice(0, 5)
      .map((i) => `${i.name} ${eur(i.monthly)}`)
      .join(', ')}${r.recurring.items.length > 5 ? '…' : ''}.`;
  }
  if (has('surprise', 'washing', 'broken', 'repair', 'dentist', 'irregular')) {
    const p = r.split.find((x) => x.key === 'surprises');
    return `Health and home costs average ${eur(p?.amount ?? 0)} a month. They come unevenly, so keep about ${eur((p?.amount ?? 0) * 3)} ready: three months’ worth covers most surprise bills.`;
  }
  if (has('this month', 'pace', 'usual', 'watch', 'overspend')) {
    const w = r.pace.watch;
    const tile = r.stats.find((x) => x.key === 'month');
    return `${tile ? `${tile.label}: ${tile.value} (${tile.sub}).` : ''} So far you spend ${eur(r.pace.dailySoFar)} a day.${w ? ` The category most over its usual is ${categoryInfo(w.category).name.toLowerCase()}: ${eur(w.spent)} against a usual ${eur(w.usual)}.` : ''}`;
  }
  if (has('safe', 'spend this', 'week', 'afford', 'budget', 'left') && !has('left over')) {
    const days = Math.min(7, r.safe.daysLeft);
    const weekSafe = (Math.max(0, r.safe.left) * days) / Math.max(1, r.safe.daysLeft);
    return r.safe.left < 0
      ? `You’re ${eur(r.safe.left)} over what’s safe this month. Let’s keep the next few days quiet.`
      : `About ${eur(weekSafe)} is safe to spend ${r.safe.daysLeft > 7 ? 'this week' : 'for the rest of the month'}. After regular payments and your ${Math.round(r.safe.goalRate * 100)}% savings goal, that’s roughly ${eur(r.safe.perDayAfter)} a day.`;
  }
  if (has('score', 'why', 'mood', 'health', 'how am i', 'doing')) {
    return `${r.orava.message} Your score is ${r.score.score}/100. ${r.orava.reasons.join(' ')}`;
  }
  if (has('idle', 'invest', 'interest', 'lying', 'grow', 'work')) {
    const g = r.growth;
    const inv = g.options.find((o) => o.key === 'invested')!;
    const acc = g.options.find((o) => o.key === 'account')!;
    const end = (o: typeof inv) => o.path[o.path.length - 1];
    return g.idle > 0 || g.monthly > 0
      ? `${g.idle > 0 ? `${eur(g.idle)} has sat untouched above your 2-month cushion, losing about ${eur(g.lostPerYear)} a year to inflation. ` : ''}In 10 years (today’s euros) it${g.monthly > 0 ? ` plus ${eur(g.monthly)} a month` : ''} would be ${eur(end(acc))} on the account or about ${eur(end(inv))} invested, if markets do what they did since 2000. Not advice: investments can fall.`
      : 'Nothing is lying idle: your balance stays within a 2-month cushion.';
  }
  if (
    has(
      'slip',
      'flexible',
      'discretionary',
      'everyday',
      'extra',
      'restaurant',
      'coffee',
      'eating',
      'fun',
    )
  ) {
    const p = pillar('slips');
    return p
      ? `Flexible spending takes ${p.shown} of your income over the last 3 months (${eur(r.score.perMonth.slips)} a month). Under 20% gives you room to save.`
      : 'I only see part of your money here, so I can’t judge flexible spending yet.';
  }
  if (has('left over', 'kept', 'keep', 'save', 'saving', 'saved', 'stash', 'buffer', 'piggy')) {
    const k = pillar('kept');
    const b = pillar('buffer');
    return k && b
      ? `${k.shown} of your income is left over (investing counts), and your savings buffer covers ${b.shown} of spending. A healthy habit is 10–20% left over and a 2-month savings buffer.`
      : 'I only see part of your money here, so I can’t judge savings yet.';
  }
  if (has('bill', 'rent', 'utilit')) {
    return `Housing (rent and utilities) comes to ${eur(part('bills')?.amount ?? 0)} in an average month (${Math.round((part('bills')?.share ?? 0) * 100)}% of income).`;
  }
  if (has('income', 'earn', 'salary')) {
    return `${eur(r.income)} came in this month and ${eur(r.spending)} went out.`;
  }
  if (has('where', 'go', 'split', 'chart', 'money')) {
    return (
      r.split.map((p) => `${p.label} ${eur(p.amount)}`).join(', ') +
      '. That’s an average month; try the what-if above to see changes.'
    );
  }
  return 'I can help with how much is safe to spend, your score, regular payments, surprises and the months ahead. Try one of those!';
}
