# Orava – a money coach for S-mobiili

Junction 2026, S-Bank challenge "Personal Economic Trainer".
Orava is a squirrel that lives on the S-mobiili home screen and shows, through its mood,
how your money is doing this month.

This repo is a clickable prototype with three screens:

- **Home**: account balance, money in/out this month, transactions by day, and a
  "New transaction" button.
- **New transaction**: expense or income, amount, category grid, optional description.
- **Money health**: Orava's verdict and score, four key numbers (kept this month, fixed
  costs, everyday extras vs. usual, safety buffer) and a "where your money goes" chart.

Orava floats over Home: drag it anywhere (it snaps to the nearest side), tap it to open
Money health. It greets you on sign-in and speaks up when a new transaction changes its mood.
On the sign-in screen, "Continue with demo data" skips the database.

## Run it

You need **Node.js** (LTS, from nodejs.org) and **git**. That's all.

```bash
git clone https://github.com/mililika/Orava.git
cd Orava
npm run setup        # first time only, installs everything
```

Every command below runs from the repo root. Stop any of them with **Ctrl+C**.

| Command                | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `npm run web`          | Opens the app in your browser. Fastest while coding.        |
| `npm run phone`        | Shows a QR code to open the app on your phone (see below).  |
| `npm run phone:tunnel` | Same, for Wi-Fi where the phone can't see your laptop.      |
| `npm run ios`          | iPhone Simulator. Mac with Xcode only; use it for the demo. |
| `npm run android`      | Android Emulator. Needs Android Studio.                     |

While the app is running, the terminal also takes keys: **`w`** browser, **`i`** iPhone
Simulator, **`r`** reload. Saving a file reloads the app automatically.

### On your phone

1. Install **Expo Go** from the App Store or Google Play.
2. Connect the phone to the **same Wi-Fi** as your laptop.
3. Run `npm run phone`. A QR code appears in the terminal.
4. **iPhone:** scan it with the normal Camera app and tap the "Open in Expo Go" banner.
   **Android:** open Expo Go and tap "Scan QR code".
5. The first load takes 10–30 seconds. After that, saving a file updates the phone too.

If the phone says it can't connect, the Wi-Fi is probably blocking devices from seeing each
other (common at events and offices). Stop with Ctrl+C and run `npm run phone:tunnel`
instead; the first time, it asks to install a small tunnel package: answer yes.

If Expo Go says the project needs a different SDK version, update Expo Go from the store.

## Editor

Any editor works. VS Code and Cursor will offer the recommended extensions
(ESLint, Prettier, Expo Tools) when you open the repo, and format on save.

```bash
npm run lint          # ESLint
npm run format        # Prettier, rewrites files
npm run typecheck     # TypeScript check
```

## Where things are

```
mobile/
  App.tsx                       app entry, phone-sized frame on web
  src/
    orava/
      logic.ts                  ← Orava's mood: MonthSnapshot in, OravaState out
      health.ts                 ← Money health numbers + spending breakdown (pure)
      scenarios.ts              ← instant reactions to one new transaction (pure)
      types.ts                  the contract between data and Orava
      Mascot.tsx                the squirrel in 4 moods (SVG + animations)
      moods.ts                  mood names and colors
    data/
      demoAccount.ts            fake September transactions + snapshot builder
      categories.ts             category names, icons, tints
    screens/
      MainScreen.tsx            tabs, added transactions, floating Orava
      HomeScreen.tsx            balance + transaction list
      AddTransactionScreen.tsx  new expense / income
      HealthScreen.tsx          Money health
      LoginScreen.tsx           sign-in (Supabase) or demo data
    components/                 floating Orava, speech bubble, chart, list, header, nav
    theme.ts                    S-mobiili colors, euro formatting
```

### How data flows

```
transactions ──buildSnapshot()──▶ MonthSnapshot ──evaluateOrava()──▶ OravaState ──▶ FloatingOrava / HealthScreen
 (demoAccount.ts)                   (types.ts)       (logic.ts)          (types.ts)
```

- **Want smarter moods or metrics?** Edit only `src/orava/logic.ts` or `src/orava/health.ts`. It's a pure function with no UI
  or network, so it can be unit tested or moved to a backend later without touching screens.
- **Want real data?** Replace `src/data/demoAccount.ts` with calls to the backend. As long as
  you still produce `Transaction[]` and a `MonthSnapshot`, nothing else changes.
- **Want a new screen or card?** Add it under `src/components/` and use the colors in `theme.ts`.

### Current mood rules (first match wins)

The squirrel has the four moods of the design: happy, okay, worried, alert.

| Mood    | When                                                              |
| ------- | ----------------------------------------------------------------- |
| Alert   | Balance below zero, or spending more than income this month       |
| Worried | Saving rate under 5%, or everyday slips more than 15% above usual |
| Happy   | Saving rate 20% or more                                           |
| Okay    | Everything else                                                   |

### Instant reactions (hardcoded for now, `src/orava/scenarios.ts`)

When you add a transaction, Orava may react to it right away (later this becomes an AI call):

| Scenario        | Trigger                                             | Orava                                |
| --------------- | --------------------------------------------------- | ------------------------------------ |
| Big restaurant  | one Restaurants payment ≥ 5% of monthly income      | worried, offers a gentle limit       |
| Unusual payment | any other non-fixed payment ≥ 20% of monthly income | alert, "Was this you?" / freeze card |
| Coffee streak   | 3rd coffee within 7 days                            | worried, shows the monthly pace      |
| Extra income    | income that is not salary                           | happy, suggests saving a quarter     |

Try it in the demo: add three Coffee payments, a €260 Restaurants payment, or €800 Lifestyle.

"Everyday slips" = restaurants, fast food, lifestyle, entertainment, travel.

## Data

The real challenge data (3.6M transactions, 5,100 customers, Oct 2024 – Sep 2026) lives in a
Postgres `transactions` table, run in Docker on the data owner's machine. The prototype
does not use it yet; the demo numbers in `demoAccount.ts` are shaped like the dataset's
average customer.

## Ask Orava

Ask Orava in Money health uses Gemini for generated replies. It can use the current screen's
bounded monthly health summary and the historical Junction data tools. The Expo chat lives in
`mobile/`; its FastAPI/DuckDB service and GCP key setup are documented in [`analyst/`](analyst/README.md).
The Gemini key and CSVs stay on the server. This local demo has no authentication, so keep the
API bound to localhost.
