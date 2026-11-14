// Checks for Orava's pure money logic (analysis.ts + logic.ts). No test framework needed:
//   npm run check
// Throws (and exits non-zero) on the first failed check.

import { demoAccount, DEMO_ACTIONS, type Transaction } from '../src/data/demoAccount';
import {
  analyzeMonth,
  canReduce,
  illustrate,
  topInsight,
  type Coverage,
  type Tx,
} from '../src/orava/analysis';
import { goalLine, goalShare, parseGoal, parseGoalAmount } from '../src/orava/goal';
import { evaluateOrava } from '../src/orava/logic';

let passed = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok)
    throw new Error(`FAIL: ${name}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
  passed++;
  console.log(`  ok  ${name}`);
}
const near = (a: number, b: number) => Math.abs(a - b) < 0.005;

const demo = demoAccount();
const analyse = (txs: Tx[], balance: number, cov: Coverage | null) => {
  const a = analyzeMonth(txs, balance, cov);
  return { a, state: evaluateOrava(a.snapshot) };
};

console.log('Demo account');
{
  const { a, state } = analyse(demo.txs, demo.balance, demo.coverage);
  check('current month is Sep 2026', a.month === '2026-09', a.month);
  check('period label is exact', a.periodLabel === '1–30 Sep 2026', a.periodLabel);
  check(
    'compares Jun–Aug',
    a.comparison?.months.join() === '2026-06,2026-07,2026-08',
    a.comparison?.months,
  );
  check('same day range 1–30 for all months', a.comparison?.days === 30, a.comparison?.days);
  check(
    'flexible now €558, usual €450',
    near(a.snapshot.flexibleComparison!.current, 558) &&
      near(a.snapshot.flexibleComparison!.usual, 450),
    a.snapshot.flexibleComparison,
  );
  check(
    'income €3480, kept €406',
    near(a.snapshot.income, 3480) && near(state.kept, 406),
    state.kept,
  );
  check(
    'opens Curious from the flexible rule',
    state.mood === 'curious' && state.basis.join() === 'flexibleUp',
    state,
  );
  const ins = topInsight(a, state);
  check(
    'insight: Restaurants €250 vs €130, explains the mood',
    ins.kind === 'rise' &&
      ins.category === 'Restaurants' &&
      near(ins.current, 250) &&
      near(ins.usual, 130) &&
      ins.explainsMood,
    ins,
  );
  const r = illustrate(a, 'Restaurants', 50)!;
  check('−€50 restaurants: kept €406 → €456', near(r.keptBefore, 406) && near(r.keptAfter, 456), r);
  check(
    '−€50 restaurants: Curious → Content',
    r.moodBefore === 'curious' && r.moodAfter === 'content',
    r,
  );
  check('what-if leaves the real snapshot untouched', near(evaluateOrava(a.snapshot).kept, 406));
  check(
    'cannot reduce more than spent (Lifestyle €150 − €200)',
    !canReduce(a, 'Lifestyle', 200) && illustrate(a, 'Lifestyle', 200) === null,
  );
  check('can reduce exactly what was spent', canReduce(a, 'Lifestyle', 150));
  check(
    'small Travel €38: −€25 allowed, −€50 and −€100 off',
    canReduce(a, 'Travel', 25) && !canReduce(a, 'Travel', 50) && !canReduce(a, 'Travel', 100),
  );
  check(
    'essentials cannot be reduced (Groceries)',
    !canReduce(a, 'Groceries', 25) && illustrate(a, 'Groceries', 25) === null,
  );
  check(
    'zero / negative reduction rejected',
    !canReduce(a, 'Restaurants', 0) && !canReduce(a, 'Restaurants', -25),
  );
}

console.log('Demo buttons still move the mood');
{
  const txs = [DEMO_ACTIONS.jacket(), ...demo.txs];
  const { state } = analyse(txs, demo.balance - 120, demo.coverage);
  check(
    'new jacket (+€120 lifestyle) → Worried from the flexible rule',
    state.mood === 'worried' && state.basis.includes('flexibleHigh'),
    state,
  );
}

console.log('Unknown coverage (real data today)');
{
  const { a, state } = analyse(demo.txs, demo.balance, null);
  check('no comparison', a.comparison === null && a.snapshot.flexibleComparison === null);
  check(
    'reason says coverage is unknown',
    /can't confirm/.test(a.noComparisonReason ?? ''),
    a.noComparisonReason,
  );
  check(
    'period label does not claim a full month',
    /available so far/.test(a.periodLabel),
    a.periodLabel,
  );
  check('mood does not use flexible rules (Content, not Curious)', state.mood === 'content', state);
  check(
    'no "usual" claim in reasons',
    !state.reasons.some((r) => /usual/.test(r) && !/No reliable/.test(r)),
    state.reasons,
  );
  const ins = topInsight(a, state);
  check(
    'insight falls back to largest flexible category',
    ins.kind === 'noComparison' && ins.category === 'Restaurants' && near(ins.amount, 250),
    ins,
  );
}

console.log('Coverage edge cases');
{
  const partialJul = analyse(demo.txs, demo.balance, { start: '2026-07-05', end: '2026-09-30' }).a;
  check(
    'partly covered July is not compared (only Aug)',
    partialJul.comparison?.months.join() === '2026-08',
    partialJul.comparison?.months,
  );
  const onlySep = analyse(demo.txs, demo.balance, { start: '2026-09-01', end: '2026-09-30' });
  check(
    'no earlier months → no comparison',
    onlySep.a.comparison === null && /no earlier months/.test(onlySep.a.noComparisonReason ?? ''),
  );
  check('… and no causal claim', topInsight(onlySep.a, onlySep.state).kind === 'noComparison');
  const midSep = analyse(demo.txs, demo.balance, { start: '2026-09-10', end: '2026-09-30' }).a;
  check(
    'data starting mid-month → no comparison',
    midSep.comparison === null,
    midSep.noComparisonReason,
  );
}

console.log('Same day range when months differ in length');
{
  // Current month March (31 days), comparison Jan (31) and Feb (28): all compared on days 1–28.
  const t = (date: string, category: string, amount: number): Tx => ({ date, category, amount });
  const txs: Tx[] = [
    t('2027-01-10', 'Restaurants', -100),
    t('2027-01-30', 'Restaurants', -500), // day 30: outside 1–28, must be ignored
    t('2027-02-10', 'Restaurants', -100),
    t('2027-03-10', 'Restaurants', -150),
    t('2027-03-31', 'Restaurants', -400), // day 31: outside 1–28 for the comparison
    t('2027-03-15', 'Salary', 3000),
  ];
  const { a } = analyse(txs, 1000, { start: '2027-01-01', end: '2027-03-31' });
  check('days = 28 for every month', a.comparison?.days === 28, a.comparison);
  const r = a.comparison?.categories.find((c) => c.category === 'Restaurants');
  check(
    'current 150 and usual 100 on days 1–28 only',
    !!r && near(r.current, 150) && near(r.usual, 100),
    r,
  );
  check('whole-month totals still count day 31', a.flexible[0].amount === 550, a.flexible);

  // Coverage ending on the 20th: every month is compared on days 1–20.
  const short = analyse(txs, 1000, { start: '2027-01-01', end: '2027-03-20' }).a;
  check(
    'coverage ending on day 20 → days 1–20 everywhere',
    short.comparison?.days === 20 && short.periodLabel === '1–20 Mar 2027',
    short.comparison,
  );
}

console.log('Unknown categories and refunds');
{
  const t = (date: string, category: string, amount: number): Transaction => ({
    id: date + category + amount,
    date,
    category,
    amount,
    type: 'x',
    merchant: 'x',
  });
  const base = [t('2026-09-15', 'Salary', 2000), t('2026-09-01', 'Housing', -1000)];
  const plain = analyse(base, 1000, null).state;
  const withIn = analyse([...base, t('2026-09-20', 'Transfer', 500)], 1500, null);
  check(
    'unknown money in → otherIn, not income',
    near(withIn.a.snapshot.otherIn, 500) && near(withIn.a.snapshot.income, 2000),
  );
  check(
    'unknown money in does not improve saving rate',
    near(withIn.state.savingRate, plain.savingRate),
    [withIn.state.savingRate, plain.savingRate],
  );
  check('unknown names are listed', withIn.a.unknownIn.join() === 'Transfer');
  const withOut = analyse([...base, t('2026-09-21', 'Mystery', -100)], 900, null);
  check(
    'unknown money out counted as spending',
    near(withOut.a.snapshot.otherOut, 100) && near(withOut.state.kept, 900),
    withOut.state.kept,
  );
  check('unknown out names are listed', withOut.a.unknownOut.join() === 'Mystery');
  const refund = analyse(
    [...base, t('2026-09-05', 'Restaurants', -80), t('2026-09-06', 'Restaurants', 20)],
    940,
    null,
  ).a;
  check(
    'refund reduces category spending (€80 − €20 = €60)',
    near(refund.snapshot.flexible, 60) && refund.flexible[0].amount === 60,
    refund.flexible,
  );
}

console.log('Insight is called a reason only when the mood came from flexible spending');
{
  const t = (date: string, category: string, amount: number): Tx => ({ date, category, amount });
  const cov: Coverage = { start: '2026-08-01', end: '2026-09-30' };
  // Restaurants up (Aug 100 → Sep 130), but income is tiny, so the mood is Worried for low saving.
  const txs: Tx[] = [
    t('2026-08-10', 'Restaurants', -100),
    t('2026-09-10', 'Restaurants', -130),
    t('2026-09-15', 'Salary', 1000),
    t('2026-09-01', 'Housing', -830),
  ];
  const { a, state } = analyse(txs, 500, cov);
  check(
    'mood is Worried for low saving (ratio 1.3 < 1.4)',
    state.mood === 'worried' && state.basis.join() === 'lowSaving',
    state,
  );
  const ins = topInsight(a, state);
  check(
    'insight shows the rise but does not claim to explain the mood',
    ins.kind === 'rise' && !ins.explainsMood,
    ins,
  );

  const alarmed = analyse(txs, -50, cov);
  const ins2 = topInsight(alarmed.a, alarmed.state);
  check(
    'Alarmed (negative balance): no causal claim',
    alarmed.state.mood === 'alarmed' && ins2.kind === 'rise' && !ins2.explainsMood,
  );

  // No rise: Sep below Aug.
  const down = analyse(
    [
      t('2026-08-10', 'Restaurants', -200),
      t('2026-09-10', 'Restaurants', -50),
      t('2026-09-15', 'Salary', 3000),
    ],
    3000,
    cov,
  );
  const ins3 = topInsight(down.a, down.state);
  check(
    'no rise → "noRise" with own comparison, not a rise',
    ins3.kind === 'noRise' && ins3.category === 'Restaurants',
    ins3,
  );

  const none = analyse([t('2026-09-15', 'Salary', 3000)], 3000, cov);
  check('no flexible spending → "none"', topInsight(none.a, none.state).kind === 'none');
}

console.log('Savings goal');
{
  const ok = (t: string, v: number) => {
    const r = parseGoalAmount(t);
    return r.ok && r.value === v;
  };
  const bad = (t: string) => !parseGoalAmount(t).ok;
  check(
    'valid amounts: 500, 500.50, 500,50, "1 000", €500',
    ok('500', 500) &&
      ok('500.50', 500.5) &&
      ok('500,50', 500.5) &&
      ok('1 000', 1000) &&
      ok('€500', 500),
  );
  check(
    'invalid: empty, text, 0, negative, 3 decimals, 1e3, too big',
    bad('') &&
      bad('abc') &&
      bad('0') &&
      bad('0.00') &&
      bad('-50') &&
      bad('5.123') &&
      bad('1e3') &&
      bad('2000000') &&
      bad('50€x'),
  );
  const g = parseGoal('  Emergency   buffer ', '500');
  check(
    'name trimmed, amount parsed',
    g.ok && g.value.name === 'Emergency buffer' && g.value.amount === 500,
    g,
  );
  const unnamed = parseGoal('', '200');
  check('blank name → "Savings goal"', unnamed.ok && unnamed.value.name === 'Savings goal');
  check('too long name rejected', !parseGoal('x'.repeat(41), '500').ok);
  check('bad amount rejected even with a name', !parseGoal('Trip', 'abc').ok);
  const buffer = { name: 'Emergency buffer', amount: 500 };
  check('€50 of €500 → 10%', goalShare(50, buffer) === 10);
  check(
    'goal line text',
    goalLine(50, buffer) ===
      'Spending €50 less would free up €50. If you saved it, that would cover 10% of your €500 “Emergency buffer” goal.',
    goalLine(50, buffer),
  );
  check('never shows 100% unless fully covered (499 of 500 → 99%)', goalShare(499, buffer) === 99);
  check(
    'fully covered → "all of"',
    /cover all of your €40 “Small” goal/.test(goalLine(50, { name: 'Small', amount: 40 })),
  );
  check(
    'tiny share → "less than 1%"',
    /less than 1%/.test(goalLine(25, { name: 'Flat', amount: 100000 })),
  );
  // The goal is display-only: the what-if numbers do not depend on it.
  const a = analyzeMonth(demo.txs, demo.balance, demo.coverage);
  const r1 = illustrate(a, 'Restaurants', 50)!;
  check(
    'what-if result independent of any goal (kept €456, real kept €406)',
    near(r1.keptAfter, 456) && near(evaluateOrava(a.snapshot).kept, 406),
  );
}

console.log(`\nAll ${passed} checks passed.`);
