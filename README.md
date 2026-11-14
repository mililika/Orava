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
