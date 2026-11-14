// Orava's chat answers. Prototype: no AI backend yet, so this is a small keyword matcher that
// answers from the same HealthReport the screen shows. Swap `answer()` for a real API call later;
// the chat UI only needs a question in and a string out.

import type { HealthReport } from './health';

const eur = (n: number) => `€${Math.round(Math.abs(n)).toLocaleString('en-GB')}`;

export const SUGGESTIONS = [
  'What can I spend this week?',
  'Why is my score like this?',
  'Where does my money go?',
];

export function answer(q: string, r: HealthReport): string {
  const t = q.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  const part = (key: string) => r.split.find((p) => p.key === key);
  const stat = (key: string) => r.stats.find((x) => x.key === key);

  if (has('safe', 'spend this', 'week', 'afford', 'budget', 'left')) {
    const safe = stat('safe');
    return r.safe.left < 0
      ? `You’re ${eur(r.safe.left)} over what’s safe this month. Let’s keep the next few days quiet.`
      : `About ${safe?.value} is safe to spend ${safe?.sub === 'this week' ? 'this week' : 'for the rest of the month'}. After bills and your ${Math.round(r.safe.goalRate * 100)}% savings goal, that’s roughly ${eur(r.safe.perDayAfter)} a day.`;
  }
  if (has('score', 'why', 'mood', 'health', 'how am i', 'doing')) {
    return `${r.orava.message} Your score is ${r.orava.score}/100. ${r.orava.reasons.join(' ')}`;
  }
  if (has('slip', 'everyday', 'extra', 'restaurant', 'coffee', 'eating', 'fun')) {
    const s = stat('slips');
    return `Everyday extras are ${s?.value} this month, ${s?.sub}. That’s “${s?.tag.text.toLowerCase()}”.`;
  }
  if (has('kept', 'keep', 'save', 'saving', 'saved', 'stash')) {
    const s = part('saved');
    return `You’re keeping ${stat('kept')?.value} of your income, about ${eur(s?.amount ?? 0)} so far this month. A healthy habit is 10–20%.`;
  }
  if (has('bill', 'rent', 'utilit')) {
    return `Bills come to ${eur(part('bills')?.amount ?? 0)} this month (${Math.round((part('bills')?.share ?? 0) * 100)}% of income).`;
  }
  if (has('income', 'earn', 'salary')) {
    return `${eur(r.income)} came in this month and ${eur(r.spending)} went out.`;
  }
  if (has('where', 'go', 'split', 'chart', 'money')) {
    return (
      r.split.map((p) => `${p.label} ${eur(p.amount)}`).join(', ') +
      '. The chart above shows the split.'
    );
  }
  return 'I can help with how much is safe to spend, your score, savings, bills and everyday extras. Try one of those!';
}
