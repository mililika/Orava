# Orava: "Why Orava feels this way" + what-if: spec

Status: Part A implemented and verified locally, savings goal (§12) implemented. Part B not started.
Not committed or pushed. Written 2026-11-14 for Junction 2026, S-Bank "Personal Economic Trainer".

**Changes since the first draft (user corrections, now implemented):**
- A last-transaction date does not prove coverage. Months are compared only when the data's coverage is
  known (§4.2).
- Every month in a comparison uses one shared day range, shown to the user (§4.2).
- Unknown money in is shown separately and never counted as income (§4.1).
Deadline: final submission Sun 15.11.2026 10:00 (Helsinki).

## 1. Why we are building this

The home page shows Orava's mood and a 0–100 score, but not what the user can learn or do about it.
After this screen the user should be able to say:

> "I understand what my situation comes from, and I know one change I could try."

Concretely, the user should understand three things:

1. why Orava reacts the way it does,
2. what in their own money affects the situation the most,
3. what they can influence themselves.

Judging criteria (each 20 %): financial-literacy impact, originality of AI integration, clarity of the
mobile UX, feasibility, potential to integrate into S-mobiili. Part A covers literacy, UX, feasibility and
S-mobiili fit. Part B adds the AI integration.

## 2. Product rules (non-negotiable)

- **Numbers come from the transaction data**, never from a language model. Every result shows its assumptions.
- **No blame, no promises.** Never "you should", never "safe to spend", never a claim that money will be enough.
- **What-if is an illustration on the current month**, not a forecast of next month.
  Euros and assumptions are the main result. Mood and score are secondary.
- **What-if only touches flexible spending** in this version. Reducing essentials (groceries, transport,
  housing, bills, health) is out of scope for v1.
- **A reduction can never exceed what was spent** in that category in the current period.
- **Same-length periods only.** Comparisons use the same day range in each month (see §4.2).
- **No comparison history → no comparison claim.** Show the largest flexible category and say plainly that
  there is no earlier data to compare with. Never say spending is "at the usual level" in that case.
- **The insight is called a reason for the mood only if it matches the mood rule** that fired (see §4.4).
- **Mood names stay consistent** with `MOODS` in `src/orava/moods.ts`: Thriving, Content, Curious, Worried,
  Alarmed. Curious is never described as worried or concerned.
- **UI language: English.**

## 3. User flow (Part A)

1. Home → Orava card → "Tap Orava to see why" opens a **separate screen** with a back arrow. User decision.
2. The screen shows, top to bottom:
   1. **"Why Orava is {Mood}"**: the reasons that `evaluateOrava` actually used (`state.reasons`), in plain words.
   2. **Three baskets** (bar + amounts for the current period).
   3. **Top insight** (§4.3), with a causal link to the mood only when §4.4 allows it.
   4. **What-if**: category chips (flexible categories with spend > 0), amount chips −€25 / −€50 / −€100.
      Chips larger than the category's current spend are disabled.
   5. **Result** (after a chip is chosen):
      - Main line: "If {Sep 1–30} had €50 less on Restaurants, you'd have kept €329 instead of €279."
        If the month is negative: "…you'd be €X over instead of €Y."
      - Assumptions line: "Illustration on this month's transactions ({date range}). Income and other spending
        unchanged. Not a forecast."
      - Secondary line, small, only when the mood would differ: "Orava would be Content instead of Curious."
        User decision. The mascot on the screen does not change: it keeps showing the real month.

Text sketch:

```
← Why Orava is Curious
  Everyday slips are 18% above your usual (Jun–Aug, days 1–30).

  Regular essentials   €1,249  ▓▓▓▓▓▓
  Unexpected necess.   €317    ▓▓
  Everyday spending    €1,635  ▓▓▓▓▓▓▓   essentials €950 · flexible €685
  Other outflows       €0

  Biggest rise you control
  Restaurants €295, +€120 vs your average of 3 full months (days 1–30)
  This is part of why Orava is Curious.

  Try a change   [Restaurants] [Lifestyle] [Entertainment]
                 [−€25] [−€50] [−€100]
  If Sep 1–30 had €50 less on Restaurants, you'd have kept €329 instead of €279.
  Illustration on this month's transactions. Not a forecast.
  Orava would be Content instead of Curious.
```

(The numbers in the sketch are illustrative. Real values come from the demo data.)

## 4. Data rules

### 4.1 Baskets: official brief → dataset categories

The brief (PDF p. 2) names three baskets: 🏠 Regular essentials, 🔧 Unexpected necessities,
☕ Everyday spending. It does not define them further. Mapping (our call):

| Basket | Categories | What-if in v1 |
|---|---|---|
| Regular essentials | Housing, Utilities | no |
| Unexpected necessities | Health, Home & Tech | no |
| Everyday spending: essentials | Groceries, Transportation | no (out of scope v1) |
| Everyday spending: flexible | Restaurants, Lifestyle, Entertainment, Travel (+ Fast Food if it exists) | **yes** |
| Income (not a basket) | Salary, Other Income | — |
| **Other outflows / Other money in** | any category not listed above | no, but **shown and counted** |

Notes:
- "Flexible" is exactly the existing `everydaySlips` basket in `logic.ts`. This keeps the insight and
  the mood rule on the same basis.
- **Unknown categories are never dropped.** Today `buildSnapshot()` ignores unmapped categories, so
  spending is understated and the saving rate overstated. Fix:
  - Unmapped outflows go to `otherOut` and count as money out. This is the cautious choice: it never
    improves the saving rate.
  - Unmapped inflows go to `otherIn`. They are shown with their names ("may be a transfer between your own
    accounts") and are **never** counted as income or in the saving rate.
  - Refunds (positive amounts in a spending category) reduce that category's spending.
- The full category list of the real dataset could not be verified (CSV not available locally, DB is a
  teammate's Supabase). Categories seen in earlier analysis: Housing, Utilities, Health, Home & Tech,
  Groceries, Transportation, Restaurants, Lifestyle, Entertainment, Travel, Salary, Other Income. The README
  mentions "fast food", which is missing from `BASKET`. Verify against the real data (see §8).

### 4.2 Comparison periods

- **Coverage must be known.** `Account.coverage` = the verified first and last day the data fully covers.
  - Demo: exactly 1 Jun – 30 Sep 2026.
  - Real data: `null` for now (`REAL_DATA_COVERAGE` in `src/lib/api.ts`). The README says
    "Oct 2024 – Sep 2026", but the exact days are not verified.
  - With `null`: no comparison and no "usual" wording. The period label says "transactions available so
    far", and the mood skips the flexible-vs-usual rules.
- **Current period:** the month of `coverage.end`, from day 1 (or `coverage.start`) to `coverage.end`.
- **Comparison months:** up to 3 months right before the current one that are **fully** inside the coverage.
  If the current month itself starts mid-month, there is no comparison.
- **One shared day range:** days 1–L, where L = min(covered days of the current month, length of every
  comparison month). The same L is used for the current month and all comparison months, and it is shown
  ("vs. days 1–30 of Jun–Aug").
- **Reliable history** = at least 1 comparison month. Otherwise, there is no comparison (§4.3 fallback).
- **The mood uses exactly the same comparison** (`snapshot.flexibleComparison`), so the reason and the
  screen always agree. The old fixed €581 baseline is gone.

### 4.3 Top insight

- **With history:** the flexible category with the largest euro rise vs its own same-length average
  (category vs that category, not vs the whole basket).
  - If no flexible category rose: show the largest flexible category with its own comparison. Say the
    change is a decrease or no change; do not invent a rise.
- **Without history:** show the largest flexible category by amount and add
  "No earlier months to compare with yet." No "usual" wording.
- **No flexible spending at all:** the insight section says so; the what-if is hidden.

### 4.4 When the insight may be called a reason for the mood

The mood comes from `evaluateOrava`. Link the insight to the mood ("This is part of why Orava is {Mood}")
**only if all of these hold**:

- the mood rule that fired was based on everyday slips vs baseline:
  - Curious (`slipRatio ≥ 1.15`), or
  - Worried because `slipRatio > 1.4`,
- history exists (§4.2),
- the insight category actually rose.

In every other case, show the insight under a neutral heading ("Where your flexible money went") with no
causal wording. Examples: Alarmed because of a negative balance, Worried because of a low saving rate,
Content, Thriving.
Implementation hint: let `evaluateOrava` return which rule fired, e.g. `trigger: 'balance' | 'overspend' |
'lowSaving' | 'slipsHigh' | 'slipsUp' | 'saving' | 'ok'`, instead of parsing reason text.

### 4.5 What-if calculation

`illustrate(current, { category, reduceBy })`:
- Rejects a non-flexible category or `reduceBy > current category spend`.
- Builds the snapshot with that category reduced, then calls `evaluateOrava`.
- Returns `keptBefore`, `keptAfter`, `delta` (= `reduceBy`), `moodBefore`, `moodAfter` and the assumptions
  text.

## 5. Demo mode (Part A)

- The login screen gets a secondary button: **"Try demo (sample data)"**. Real login stays as it is and is
  never bypassed.
- The demo account uses **synthetic data only** (`src/data/demoAccount.ts`). Add 3 earlier synthetic
  months (Jun–Aug 2026) so the comparison works.
- `Account` gets `isDemo: boolean`. In demo mode, show a visible label "Demo · sample data" on Home and on
  the new screen. Replace the footer "Data from the S-Bank Junction 2026 dataset" with a demo notice.
- Works fully without Supabase or network.
- Target demo state (the builder tunes the synthetic numbers and verifies them):
  - the app opens Curious,
  - the top insight is Restaurants with a real rise,
  - −€50 on Restaurants changes the secondary line to a different mood.

## 6. Part A: done when

- [ ] Pure functions (`insight.ts`, plus the `buildSnapshot` and baseline changes) are checked by a small
      script. Cases:
  - rise found
  - no history → no comparison wording
  - no rise
  - unknown category counted in `otherOut`
  - chip larger than spend rejected
  - partial first month excluded
  - same-length day range
  - causal link shown only for the slip triggers
- [ ] `npm run lint` and `npm run typecheck` pass.
- [ ] Demo mode works with the network off, in the browser at phone width and in Expo Go.
- [ ] Every result shows its assumptions line. No blame or "safe to spend" wording anywhere.
- [ ] Mood names match `MOODS` everywhere.
- [ ] A real-data login still works (if the DB is up) and shows the same screen.

## 7. Part B: optional AI add-on

Starts only when **both** are true:
1. **The work split with Hamza is agreed.** If he has a chat/RAG endpoint that can take a question and
   return text, reuse it instead of building our own.
2. **API key, credits and permission to use them are confirmed.** No paid service is bought or assumed.

Flow:
- Question box "Ask Orava about this".
- Call 1: the model maps the question to `{category, reduceBy}` or "not supported".
- `illustrate()` computes the result.
- Call 2: the model explains the result in ≤2 sentences, using only the numbers it was given.
- The numbers on screen always come from `illustrate()`.
- Unsupported questions get a friendly line plus the chips. Example: cutting essentials ("v1 only tries
  changes to flexible spending").
- The key lives server-side, e.g. as a Supabase Edge Function secret, **never** in an `EXPO_PUBLIC_*`
  variable.
- Any error or timeout falls back to Part A without breaking the screen.

Done when:
- [ ] 3 prepared questions work: a restaurant cut, a lifestyle cut, an essentials cut (politely declined).
- [ ] No number in the model's text differs from the computed result.
- [ ] Network off → Part A still works.

## 8. Risks and blockers

| Risk | Blocks | Mitigation |
|---|---|---|
| Real DB (teammate's Supabase) down at demo time; `db/auth.sql` not in repo | real-data path | demo mode (§5) |
| Real category names unknown (e.g. Fast Food) | correct baskets | §4.1 unknowns shown and counted; check category names once with the DB owner |
| `my_transactions` may not return earlier months | comparison on real data | §4.3 no-history fallback; check how many months the RPC returns |
| Hamza's availability / overlap | Part B | Part A first; B only after agreement |
| API key / credits / permission | Part B | no B without explicit OK |
| Time (video + deck also due) | everything | build A as the shippable unit; B is optional |

## 9. Out of scope (v1)

Reducing essentials, multi-month forecasts, safe-to-spend, chat history, a new bottom-nav tab, population
comparison, Expo Router migration. The app currently switches screens with state. The new screen follows
that pattern to keep the change small. AGENTS.md prefers Expo Router; migrating is a separate decision.

## 10. 30-second demo

1. **0–5 s:** "Try demo". Home: Orava is **Curious**. Tap Orava.
2. **5–15 s:** "Why Orava is Curious": everyday slips are above usual (same days, Jun–Aug). The three
   baskets. Top insight: Restaurants +€X vs own average, "part of why Orava is Curious".
3. **15–25 s:** tap −€50: "If Sep 1–30 had €50 less on Restaurants, you'd have kept €… instead of €…",
   plus the assumptions line and "Orava would be Content instead of Curious".
4. **25–30 s:** the −€100 chip is disabled for a small category. Closing line: "It shows what's driving your
   month and one change you can try, without guessing the future."
   With Part B: replace step 3 with a typed question.

## 12. Savings goal (implemented)

- An optional card on the Why screen: "Your savings goal". The user can add one (name optional, amount in
  €), edit it or remove it. Everything works without a goal. There is no onboarding question.
- When a goal exists, the what-if result adds:
  "Spending €50 less would free up €50. If you saved it, that would cover 10% of your €500 “Emergency
  buffer” goal."
  - The percent is computed in `src/orava/goal.ts` (`goalShare`, `goalLine`).
  - It never rounds up to 100% unless the goal is fully covered ("all of"). Under 0.5% it reads
    "less than 1%".
- The goal never changes the balance, the mood, the score or any "progress". Nothing is shown as saved.
- Validation (`parseGoalAmount`):
  - accepted: "500", "500.50", "500,50", "1 000", "€500"
  - rejected with a message: empty, text, 0, negative, more than 2 decimals, over €1,000,000
  - The name is optional, max 40 characters; blank becomes "Savings goal".
- Storage: in-memory React state in `HomeScreen`, like the rest of the app. It survives moving between
  screens and is cleared on sign-out or reload. No new dependency.
- Not done: age or postal-code personalisation. The scoring is unchanged.

## 11. Decisions log

- User: separate screen; insight = biggest rise vs own usual; mood shown as a small secondary line.
- User: v1 what-if only on flexible spending; no 25 % rule; reduction capped at current spend.
- User: demo mode with synthetic data, real login untouched.
- User: same-length periods; no-history fallback without "usual" claims; causal link only when it matches
  the mood rule.
- User: comparison only with known coverage; one shared day range; unknown money in never counted as income.
- User: optional savings goal linked to the what-if, without changing balance, mood or progress.
- Our call: basket mapping in §4.1; flexible = existing `everydaySlips`; unknown categories shown as Other;
  up to 3 comparison months; state-based navigation; mood `basis` field (implemented name for `trigger`);
  a small Travel €38 in the demo, so the disabled chips are visible; checks run with plain Node
  (`npm run check`), no test framework.
- Left to the builder: exact synthetic demo numbers, the test-runner setup (prefer no new dependencies),
  visual styling within `theme.ts`.
