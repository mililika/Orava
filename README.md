# Orava – a money coach for S-mobiili

Junction 2026, S-Bank challenge "Personal Economic Trainer".
Orava is a squirrel that lives on the S-mobiili home screen and shows, through its mood,
how your money is doing this month.

This repo is a clickable prototype with three screens:

- **Home**: account balance, money in/out this month, transactions by day, and a
  "New transaction" button.
- **New transaction**: expense or income, amount, category grid, optional description.
- **Money health**: Orava's verdict and a 0–100 score (tap ⓘ to see how it's calculated),
  three key numbers (safe to spend, left over, piggy bank), where money goes with a what-if
  (type a planned cost, see the score and a 12-month balance line), regular payments, and coming
  up (what the next months may cost, from the same months last year). Ask Orava is pinned to the bottom.

Orava floats over Home: drag it anywhere (it snaps to the nearest side), tap it to open
Money health. It greets you on sign-in and speaks up when a new transaction changes its mood.
Everything is behind the sign-in screen: there is no built-in or generated data.

## Run it

You need **Node.js** (LTS, from nodejs.org) and **git**. That's all.

```bash
git clone https://github.com/mililika/Orava.git
cd Orava
npm install          # first time only: installs every workspace and builds packages/
```

Every command below runs from the repo root. Stop any of them with **Ctrl+C**.

| Command         | What it does                                                                  |
| --------------- | ----------------------------------------------------------------------------- |
| `npm run web`   | Opens the app in your browser and rebuilds `packages/` when you change them.  |
| `npm start`     | Same, but opens Expo's dev menu first instead of the browser.                 |
| `npm run build` | Builds `packages/core` and `packages/contracts` (`dist/`), then the web app.  |

While the app is running, the terminal also takes keys: **`w`** browser, **`r`** reload.
Saving a file reloads the app automatically, including files in `packages/`.

## Editor

Any editor works. VS Code and Cursor will offer the recommended extensions
(ESLint, Prettier, Expo Tools) when you open the repo, and format on save.

```bash
npm run lint          # ESLint
npm run format        # Prettier, rewrites files
npm run typecheck     # TypeScript check (every workspace)
```

## Where things are

npm workspaces: two apps and two shared packages.

```
apps/
  web/                          the Expo app (web only), @orava/web
    App.tsx                     app entry, phone-sized frame on web
    src/
      orava/
        Mascot.tsx              the squirrel in 4 moods (SVG + animations)
        moods.ts                mood colors (the names come from @orava/core)
        overview.ts             ← Gemini's month overview for the Orava card, cached per month
      data/
        categories.ts           category icons and tints (the names come from @orava/core)
      screens/
        MainScreen.tsx          tabs, added transactions, floating Orava
        HomeScreen.tsx          balance + transaction list
        AddTransactionScreen.tsx  new expense / income
        HealthScreen.tsx        Money health
        LoginScreen.tsx         sign-in
      components/               floating Orava, speech bubble, chart, list, header, nav
      lib/                      API and Gemini calls (move to the server in later sections)
      theme.ts                  S-mobiili colors, euro formatting
  server/                       the NestJS API (coming next)
packages/
  core/                         @orava/core: the Money health engine, pure TypeScript
    src/
      months.ts                 transactions → monthly totals per basket
      baskets.ts                which basket each category belongs to
      score.ts                  ← the 5-pillar Money health score
      logic.ts                  ← Orava's mood and sentence from the score
      health.ts                 ← everything Money health shows (buildHealth, reportForMonth)
      recurring.ts              regular payments detection
      ahead.ts                  coming up: what the next 3 months leave to spend (keep aside / free)
      growth.ts                 idle money (the Idle money tile and the chat)
      chat.ts                   Ask Orava's offline answers
      coach.ts                  ← Gemini coach prompt + the user's data as context
      categories.ts             category names, money in/out, transaction types
      moods.ts                  mood names
      signature.ts              fingerprint of a month's data (overview cache key)
      format.ts                 euro formatting
      types.ts                  Transaction, Account, Mood, OravaState
      benchmarks.json           static aggregate data from the S-Bank dataset analysis
      benchmarks.ts             typed access to benchmarks.json
  contracts/                    @orava/contracts: the API's request/response shapes (zod)
todo/                           the post-hackathon plan
```

Both packages are compiled with `tsup` into `dist/` (ESM + CJS + types); the web app imports
them as `@orava/core` and `@orava/contracts`. `npm install` builds them once, and `npm run web`
keeps them rebuilding while you work.

### How data flows

```
transactions ──monthlyTotals()──▶ MonthTotals[] ──scoreOf()──▶ Score ──evaluateOrava()──▶ OravaState
 (lib/api.ts)                    (months.ts)      (score.ts)            (logic.ts)
                                         └── buildHealth() (health.ts) ──▶ HealthReport ──▶ HealthScreen
                                             (all in packages/core)
```

- **Want smarter moods or metrics?** Edit `packages/core/` only. Every file there is pure (no UI,
  network or storage), and the server will use the same code.
- **Want real data?** Login already loads it through `apps/web/src/lib/api.ts`. Anything that produces
  `Transaction[]` and a balance works.
- **Want a new screen or card?** Add it under `apps/web/src/components/` and use the colors in `theme.ts`.

### Money health score and moods

The score (0–100) adds five pillars, measured over the last 3 months. Each anchor is cited
and checked against the whole dataset (`pillars` in `packages/core/src/benchmarks.json`):

| Pillar                 | Points | Full at          | Zero at | Why                                                                  |
| ---------------------- | ------ | ---------------- | ------- | -------------------------------------------------------------------- |
| Fixed costs            | 30     | ≤ 30% of income  | ≥ 60%   | 30% housing rule; > 40% overburdened (Eurostat); median customer 37% |
| Left over              | 20     | ≥ 20% of income  | ≤ 0%    | Classic savings target; Finns keep ~2–5%                             |
| Discretionary spending | 20     | ≤ 20% of income  | ≥ 30%   | 50/30/20 wants ceiling; median customer 20%                          |
| Piggy bank             | 20     | ≥ 2 months       | 0       | Finnish expert advice: 2 months of expenses                          |
| Never below zero       | 10     | 0 months dipping | 2       | Earliest sign of money stress                                        |

| Mood    | Score  | Share of customer-months |
| ------- | ------ | ------------------------ |
| Happy   | 85–100 | 25%                      |
| Okay    | 60–84  | 37%                      |
| Worried | 35–59  | 32%                      |
| Alert   | 0–34   | 6% (also: balance < 0)   |

Investment deposits count as left over.

**Spending accounts.** When the salary moves on to another bank and no rent is paid here, the
account is scored as a spending account (`variant: 'pocket'`): within what stays (35), never
below zero (25), cushion of 2 months of this account's spending (20), money at work (20, idle
money ≤ 2 months full, ≥ 12 months none). Same 0–100 scale and moods.

**Idle money** (everyone, `packages/core/src/growth.ts`): the lowest balance of the last 3 months above
a 2-month spending cushion. Spending accounts show it as a tile; Ask Orava ("Is my money
working?") gives a 10-year comparison in today's euros: current account 0.37%, savings deposit
2.57% (Bank of Finland), world equities 3.5% after inflation (UBS Yearbook 2025), inflation 2.5%
(Statistics Finland).

### Orava's words come from Gemini (`apps/web/src/orava/overview.ts`, `packages/core/src/coach.ts`)

The Orava card on Home and the Money health hero show Gemini's read of the month: one short
sentence, a "Good" line and a "Watch" line. There are no hardcoded reactions: every time a
transaction is added or removed, Gemini looks at the whole state again (score, tiles, where money
goes, the last 6 months of transactions, peers and Finnish benchmarks). Overviews are cached per
month, so a month is only asked again when its transactions change; the 10 newest months are
kept. Ask Orava (the chat at the bottom of Money health) streams its answers from the same
context. Set `EXPO_PUBLIC_GEMINI_API_KEY` in `apps/web/.env` (see `.env.example`).

"Discretionary spending" = restaurants, fast food, lifestyle, entertainment, travel.
