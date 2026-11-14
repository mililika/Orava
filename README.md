# Orava – a money coach for S-mobiili

Junction 2026, S-Bank challenge "Personal Economic Trainer".
Orava is a squirrel that lives on the S-mobiili home screen and shows, through its mood,
how your money is doing this month.

This repo is a clickable prototype: one S-mobiili-style home screen with Orava on it.
The demo buttons add transactions, and Orava's mood, score and message update live.

## Run it

You need **Node.js** (LTS, from nodejs.org) and **git**. That's all.

```bash
git clone https://github.com/mililika/Orava.git
cd Orava/mobile
npm install
npx expo start
```

Then, in the terminal that opens:

- press **`w`** to open it in your browser (fastest while coding), or
- scan the **QR code** with your phone: iPhone camera app, or the **Expo Go** app on Android.
  Install Expo Go from the App Store / Google Play first. Phone and laptop must be on the
  same Wi-Fi; if that doesn't work, run `npx expo start --tunnel`.
- press **`i`** for the iPhone Simulator (Mac with Xcode only) or **`a`** for the Android
  Emulator (Android Studio only). Neither is required.

Saving a file reloads the app automatically.

## Editor

Any editor works. VS Code and Cursor will offer the recommended extensions
(ESLint, Prettier, Expo Tools) when you open the repo, and format on save.

```bash
npm run lint          # ESLint
npm run format        # Prettier, rewrites files
npx tsc --noEmit      # TypeScript check
```

## Where things are

```
mobile/
  App.tsx                     app entry, phone-sized frame on web
  src/
    orava/
      logic.ts                ← Orava's brain: MonthSnapshot in, OravaState out
      types.ts                the contract between data and Orava
      Mascot.tsx              the squirrel in 5 moods (SVG + animations)
      moods.ts                mood names and colors
    data/demoAccount.ts       fake September transactions + snapshot builder
    screens/HomeScreen.tsx    the one screen; wires data → logic → UI
    components/               header, bottom bar, bonus, Orava card, accounts, transactions
    theme.ts                  S-mobiili colors, euro formatting
```

### How data flows

```
transactions ──buildSnapshot()──▶ MonthSnapshot ──evaluateOrava()──▶ OravaState ──▶ OravaCard
 (demoAccount.ts)                   (types.ts)       (logic.ts)          (types.ts)
```

- **Want smarter moods?** Edit only `src/orava/logic.ts`. It's a pure function with no UI
  or network, so it can be unit tested or moved to a backend later without touching screens.
- **Want real data?** Replace `src/data/demoAccount.ts` with calls to the backend. As long as
  you still produce `Transaction[]` and a `MonthSnapshot`, nothing else changes.
- **Want a new screen or card?** Add it under `src/components/` and use the colors in `theme.ts`.

### Current mood rules (first match wins)

| Mood     | When                                                              |
| -------- | ----------------------------------------------------------------- |
| Alarmed  | Balance below zero, or spending more than income this month       |
| Worried  | Saving rate under 5%, or everyday slips more than 40% above usual |
| Curious  | Everyday slips 15–40% above usual                                 |
| Thriving | Saving rate 20% or more                                           |
| Content  | Everything else                                                   |

"Everyday slips" = restaurants, fast food, lifestyle, entertainment, travel.

## Data

The real challenge data (3.6M transactions, 5,100 customers, Oct 2024 – Sep 2026) lives in a
Postgres `transactions` table, run in Docker on the data owner's machine. The prototype
does not use it yet; the demo numbers in `demoAccount.ts` are shaped like the dataset's
average customer.
