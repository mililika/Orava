# Orava: post-hackathon plan

The plan for turning the Junction 2026 prototype into a small production web app. Each section
is a separate file and is written so an agent (or a person) can pick it up and finish it without
reading the rest of the plan first. Read this file first, then the section you are working on.

## Where we are (Nov 2026)

- `mobile/` is an Expo app (SDK 58, React Native 0.88, React 19.3, TypeScript 6) that runs on web
  through react-native-web. `npx expo export --platform web` already produces a ~770 KB static
  site, so no code changes are needed to host the frontend.
- `mobile/src/orava/` is the domain engine: mostly pure functions from transactions to the Money
  health report (score, moods, safe to spend, recurring payments, months ahead, idle money).
- AI (Gemini) is called **from the browser** with a bundled key (`EXPO_PUBLIC_GEMINI_API_KEY`).
  The client builds the whole system prompt, and the per-user rate limit is counted on the device.
- Login was Supabase RPC with **plain-text passwords** sent on every request. The old Supabase
  project and the Google Cloud project were deleted, so the old keys are dead and nothing that
  leaked needs rotating. Until section 04, login and AI don't work; only "Continue with demo data"
  does (it's generated in the client).
- **The database is ready.** A new Supabase project holds the tables and data, created once by
  the owner with SQL files that aren't kept in the repo. Agents only connect to it; the schema is
  in section 03.
- Transactions you add or delete only live in memory and are lost on logout.
- The hackathon's SQL files, data scripts and analysis docs (`db/`, `docs/`) were never committed
  and have been **removed from the repo** (archived outside it). Nothing in the new setup uses
  them. The only thing left from that analysis is `mobile/src/data/benchmarks.json`
  (aggregate statistics: score anchors, peer shares, seasonality). The app needs it, so it stays
  as **static data**. It can no longer be regenerated, and doesn't need to be.
- `mobile/rate-limits.json` was never committed, so `main` didn't typecheck. It's restored as a
  placeholder (`{ "demo": 200 }`) and deleted for good in section 06.
- No tests and no CI. `tsc --noEmit` and `expo lint` pass.

## Target

```
                 browser
                    │
        ┌───────────▼───────────┐
        │ Vercel                │  static Expo web build (apps/web)
        │  /api/* ── rewrite ───┼──────────────┐
        └───────────────────────┘              │
                                   ┌───────────▼───────────┐
                                   │ Cloud Run             │  Docker image (apps/server)
                                   │ NestJS API: auth,     │  Gemini key and DB credentials
                                   │ transactions, AI      │  live only here
                                   └───────────┬───────────┘
                                               │
                                   ┌───────────▼───────────┐
                                   │ Supabase Postgres     │  users, transactions
                                   │ + Supabase Auth       │  passwords and sessions
                                   └───────────────────────┘
```

**The browser only ever talks to `/api`.** It never connects to Postgres, never calls Gemini, and
never holds a database URL, database key or AI key. The server is the only thing with database
credentials, and Postgres is never exposed to the client in any form (no Supabase-style
client-side database access, no public REST layer over tables).

Request and response shapes are **zod schemas in `packages/contracts`**, shared by both sides: the
server validates with them, and the web app gets its TypeScript types from the same schemas.

```
packages/contracts  (zod schemas + inferred types)
      ▲                         ▲
      │ validates requests      │ types requests and
      │                         │ responses
apps/server (NestJS)       apps/web (Expo)
      │
      └── packages/core (Money health engine; the web app uses it too)
```

Locally, the server (`npm run dev:server`) connects to the same Supabase database, and the web app
runs with `npm run web` as before. There's no local database.

## Decisions (change them here, before starting, if you disagree)

| Topic | Decision | Why |
|---|---|---|
| Platforms | **Web only.** Keep Expo and react-native-web. No EAS, no store builds. | The app already works on web, and a native app isn't needed. |
| Tests | **None for now.** No automated tests; verify by typecheck and by running the app (see rules below). | The owner's call: tests would mostly be noise at this stage. |
| Package manager | **npm** (workspaces, one root `package-lock.json`). Not pnpm or yarn. | Already used; works with Expo's Metro and Docker without extra config. |
| Repo | npm workspaces monorepo: `apps/web` (the current `mobile/`), `apps/server`, `packages/core`, `packages/contracts` | The server needs the same health engine as the client to build AI context, and both sides share the API contracts. |
| Client ↔ data | **The web app talks only to our API for data.** The one exception is sign-in: the web app uses the Supabase client with the public **publishable key** for Supabase Auth only (`src/lib/auth.ts`). No database URL, secret key, AI key or data queries in the web app; no direct database access from the browser in any form. Supabase's Data API is locked out in the schema (RLS on, API roles revoked). Checked in CI (section 07). | One place to enforce auth, validation and limits; secrets stay on the server. |
| Server | Node (current LTS) + TypeScript + **NestJS** (Express adapter) | Structured modules, dependency injection, guards and pipes. A well-known framework to learn. |
| Contracts | **zod** schemas in `packages/contracts` (`@orava/contracts`) for every request and response body, query and SSE event. The server validates with them through a zod validation pipe; the web app uses the inferred types (and parses responses with them in dev). Env vars are also validated with zod. | One definition per shape: a change on one side is a type error on the other. |
| Database | **Supabase Postgres** (plus Supabase Auth for login, see Auth; no Data API). Already set up by the owner (schema in section 03; the SQL files aren't in the repo); the same database serves local development and production. Tables: **`users`** (linked to Supabase Auth by `auth_user_id`) and **`transactions`** (per user). Nothing else. Plural, snake_case names. The server uses **Drizzle ORM** as a typed query builder only; no migrations tool. | Done once by the owner, so implementation agents don't touch the database. |
| Auth | **Supabase Auth** (email + password). The browser signs in with supabase-js; our API verifies the access token (`Authorization: Bearer`) against the project's public signing keys and maps it to `users` by `auth_user_id`. We never handle passwords, hashes or sessions ourselves. | The owner doesn't want to run authentication; Supabase already hosts the database. (A first version with our own bcrypt/session auth was replaced, see section 04 notes.) |
| Users | **Five demo users from the challenge data**, one per Money health level; each one is a Supabase Auth user (email + password set by the owner in the dashboard). `demo_critical`, `demo_tight`, `demo_steady`, `demo_solid`, `demo_thriving`; `demo_solid` is the public login. Any further user is created by the owner in Supabase Auth and linked in `users` (steps in section 04), never written in the repo. No public sign-up (turned off in Supabase Auth), no guest or "Continue with demo data" mode. | Shows every Money health state with realistic synthetic data; no anonymous AI usage. |
| Data | Loaded once into Supabase: 5 hand-picked customers of the synthetic S-Bank Junction 2026 challenge data (one per Money health level; 7 were loaded, renamed and cut to 5 in section 04), 2,406 transactions, Oct 2024 – Sep 2026. The generated `demoAccount.ts` is deleted once login works (sections 04–05). | Synthetic data from the challenge organisers. |
| AI | Gemini is called **only from the server**. The server builds the prompt from the DB, not from the client. Overview cache and usage limits are kept **in server memory** (no tables). | Fixes the key leak and stops the API from becoming an open Gemini relay. In-memory is enough at 1–2 Cloud Run instances. |
| Hosting | **Vercel** (web) + **Google Cloud Run** (server, region `europe-north1`) + **Supabase** Postgres. Vercel rewrites `/api/*` to Cloud Run so the browser sees one origin. | Standard "frontend on a CDN, API in a container" setup, with no CORS between the app and its API. |

## Open questions for the owner

1. **Domain:** is there a custom domain? Not required, since the Vercel rewrite works without one.
2. **Sign-up later?** If yes, see `09-later.md`.

## Order

Do the sections in order. Each one ends with the app working end to end, so it can be merged on
its own. **Sections 01–07 need no cloud hosting**: everything runs locally. The only outside
things needed before section 08 are a free Gemini API key from Google AI Studio (section 06; the
app works without it, just with offline answers) and the existing GitHub repo (section 07).
Deployment comes last.

| # | File | Result |
|---|---|---|
| 01 | [01-repo-and-core.md](01-repo-and-core.md) | Monorepo, shared `@orava/core` and `@orava/contracts` packages, repo cleanup |
| 02 | [02-server.md](02-server.md) | NestJS server skeleton, zod pipe, config, Dockerfile |
| 03 | [03-database.md](03-database.md) | Connect the server to the ready Supabase database; Drizzle schema and repositories |
| 04 | [04-auth.md](04-auth.md) | Login with Supabase Auth; the API verifies its tokens; demo mode removed |
| 05 | [05-transactions.md](05-transactions.md) | Transactions API; added and deleted transactions persist |
| 06 | [06-ai.md](06-ai.md) | Overview and chat on the server, rate limits, client switched over |
| 07 | [07-ci.md](07-ci.md) | GitHub Actions: format, lint, typecheck, build, leak guards |
| 08 | [08-deployment.md](08-deployment.md) | Cloud Run, Vercel, CI deploys (database already exists) |
| 09 | [09-later.md](09-later.md) | Nice-to-haves, not scheduled |

## Rules for whoever implements a section

- **Read before writing.** Read the files a section names before changing them. The comments in
  this codebase are thorough, so keep that density and tone in new code.
- **Contracts first.** A new or changed endpoint starts with its zod schemas in
  `packages/contracts`. Never declare a request or response type by hand in the server or the web
  app; import it from `@orava/contracts`.
- **The web app only talks to `/api` for data.** Never add a database client, a database URL or a
  third-party API key to `apps/web`. The only exception is Supabase Auth sign-in in
  `src/lib/auth.ts`, with the publishable key.
- **Don't trust memory for library APIs.** Expo, NestJS, zod, Drizzle and the Gemini API all change.
  Check the current docs for the installed version before using an API. For Expo, follow
  `apps/web/AGENTS.md` (was `mobile/AGENTS.md`).
- **Install packages correctly.** Use `npx expo install` for anything in the web app. Use
  `npm install -w <workspace>` for the others. Don't take versions from this plan: install the
  current ones and commit the lockfile. Versions are **exact** (no `^` or `~`; the root `.npmrc`
  has `save-exact=true`), so nothing updates unless someone changes a version on purpose.
- **Keep the engine pure.** `packages/core` never imports React, React Native, Node-only modules,
  network or storage.
- **Never commit secrets.** `.env` files are gitignored. Every new env var goes into the matching
  `.env.example` with a comment.
- **Don't change the database.** The schema and data are done (section 03). No migrations, seed
  scripts or new tables; if something truly needs a change, ask the owner and write it as a new
  SQL file for them to run.
- **Don't write automated tests for now.** No unit, integration or e2e tests, no test runner
  (Vitest, Jest, supertest, …), no `test` script, no test files. This is a deliberate decision by
  the owner: most tests would be noise at this stage. Throwaway scripts for a one-off check are
  fine, but don't commit them.
- **Verify before marking a task done.** Run `npm run lint` and `npm run typecheck`, then actually
  run the thing you built against the section's acceptance criteria (start the server, call the
  endpoint with curl, click through the web app).
- **Report progress here.** Tick the checkboxes in the section file, note anything that differs
  from the plan under "Notes" at the end of that file, and add a line to the progress log below.
- **Branches:** `post-hackathon-improvements` is the integration branch for this whole plan. Do
  each section on its own branch made from it (e.g. `phi/01-repo-and-core`) and open the PR back
  into `post-hackathon-improvements`. It's merged into `main` when the owner decides.

## Progress log

<!-- One line per finished section or notable change: date, section, what changed, PR link. -->

- 2026-11-20 · 01 · npm workspaces monorepo (`apps/web`, `packages/core`, `packages/contracts`), engine moved to `@orava/core`, contracts skeleton, README and comments cleaned up. Done on `post-hackathon-improvements` (no PR).
- 2026-11-20 · 02 · NestJS 12 server skeleton in `apps/server`: zod validation pipe, env config, pino logging, error filter, `GET /api/health`, Dockerfile. On `post-hackathon-improvements` (no PR).
- 2026-11-20 · 03 · Drizzle 0.45 + postgres.js against Supabase: `schema.ts`, `DbModule`, users and transactions repositories, DB check in health. On `post-hackathon-improvements` (no PR).
- 2026-11-21 · 04 · First built with our own auth (bcrypt, sessions table, httpOnly cookie, Origin check, login throttling); replaced the same day by **Supabase Auth**: supabase-js sign-in in the web app, the API verifies access tokens (JWKS) and links users by `auth_user_id`. `GET /api/account` pulled forward from 05. On `post-hackathon-improvements` (no PR).
- 2026-11-24 · 05 · `POST /api/transactions` and `DELETE /api/transactions/:id` (soft delete, 500 added per user, server-chosen date and type); the web app saves adds and deletes through the API with optimistic updates and undo on failure. On `post-hackathon-improvements` (no PR).
- 2026-11-24 · 06 · AI moved to the server: `AiModule` (Gemini over REST, 3.8 Flash with 3.5 Flash Lite fallback on 429/503), cached month overviews, chat streamed as SSE, per-user hourly and global daily limits; the web app calls `/api/ai/*` and holds no key or prompt. On `post-hackathon-improvements` (no PR).
