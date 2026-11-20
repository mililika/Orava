# 03 · Database access

**The database itself is done.** It's a Supabase project, used purely as a hosted Postgres (no
Supabase Auth, no Data API, no Supabase client SDK). The owner created the tables and loaded the
data once from SQL files in the Supabase SQL Editor. Those files are **not in the repo**; the
schema they created is below and is the reference for this plan.

**Don't change the schema or the data in this plan.** No migrations tool, no seed scripts, no
admin CLI, no new tables, no SQL files in the repo. If a later change really needs one, ask the
owner and give them the SQL to run.

**Goal of this section:** the server connects to that database and reads from it through typed
repositories.

**Depends on:** 02.

## What's in the database

The schema, exactly as created in Supabase:

```sql
create table users (
  id                  uuid primary key default gen_random_uuid(),
  -- Stored lowercased and trimmed, so "Demo " and "demo" are the same login.
  username            text not null unique check (username <> '' and username = lower(btrim(username))),
  -- bcrypt ("$2a$12$…"): the random salt and the cost factor are part of the hash itself, so
  -- there's no separate salt column. The plain-text password is never stored.
  password_hash       text not null,
  -- Balance before the user's first transaction. Current balance = this + sum of the amounts of
  -- transactions that aren't deleted.
  opening_balance_eur numeric(14,2) not null default 0,
  -- Gemini requests per hour for this user; null = the server's default.
  ai_hourly_limit     integer check (ai_hourly_limit >= 0),
  created_at          timestamptz not null default now()
);

create table sessions (
  -- sha256 of the session token (hex). The token itself only lives in the user's cookie.
  id           text primary key,
  user_id      uuid not null references users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_seen_at timestamptz not null default now()
);

create index sessions_user_id_idx on sessions (user_id);

create table transactions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references users (id) on delete cascade,
  date        date not null,
  category    text not null,                 -- a category name the app knows (Groceries, Salary, …)
  type        text not null,                 -- purchase, salary, housing_payment, …
  merchant    text not null,
  amount_eur  numeric(12,2) not null check (amount_eur <> 0),   -- negative = money out
  -- 'seed' = loaded with the original data, 'user' = added in the app.
  source      text not null default 'user' check (source in ('seed', 'user')),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz                    -- soft delete: hidden everywhere once set
);

create index transactions_user_date_idx
  on transactions (user_id, date desc, id desc)
  where deleted_at is null;

-- Supabase exposes tables in `public` through its Data API to the `anon` and `authenticated` roles,
-- and the anon key is meant to be public. This app never uses that API, so: row level security on
-- with no policies (the API sees no rows), and those roles' privileges revoked. Neither affects the
-- server, which connects as the table owner. On plain Postgres (no such roles) only RLS is enabled.
alter table users enable row level security;
alter table sessions enable row level security;
alter table transactions enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on table users, sessions, transactions from anon, authenticated;
    revoke all on sequence transactions_id_seq from anon, authenticated;
  end if;
end $$;
```

- **Balance** = `users.opening_balance_eur` + sum of `amount_eur` of the user's transactions where
  `deleted_at is null`. It's never stored.
- **Logins:** for these 7 demo users the password is the username (`demo_good` / `demo_good`, …);
  only bcrypt hashes are stored. `demo` is the public login. Any other user is created by the owner
  in Supabase with their own password, never written in the repo or this plan.
  Profiles (as scored at the hackathon):

  | User | Profile |
  |---|---|
  | `demo` | Steady (76): fine, but only 2% of income left over |
  | `demo_good` | Doing great (90): 39% of income left over, invests, 10.8-month buffer |
  | `demo_headsup` | Heads up (54): spends more than comes in, rent and bills take 47% of income |
  | `demo_bad` | Needs attention (18): overspends, balance below zero in 2 of the last 3 months |
  | `demo_young` | Steady (61): 24 years old, everyday extras take 40% of income |
  | `demo_idle` | Doing great (91) with €13,749 idle money and no investing |
  | `demo_spending` | Spending account (80): salary moves on to another bank, €7,873 idle |
- **Changing a password** (owner, in the Supabase SQL Editor):
  `update users set password_hash = extensions.crypt('new password', extensions.gen_salt('bf', 12)) where username = '…';`
- With the original data, `demo` has 659 transactions and a balance of **€12,534.33**.

## Decisions

- **Only the server connects to Postgres.** The web app never gets a connection string, a
  Supabase key or a database client library. Don't install `@supabase/supabase-js` anywhere.
- **Connection:** the Supabase connection string from the dashboard (**Connect → Session pooler**,
  user `postgres.<project-ref>`), in `DATABASE_URL`, with TLS. The session pooler works from
  anywhere (IPv4) and behaves like a normal Postgres connection. If the transaction pooler (port
  6543) is ever used instead, prepared statements must be turned off in the driver (e.g.
  `prepare: false` in postgres.js). Check Supabase's current docs for the exact strings.
- **Local development uses the same Supabase database** (there's no local Postgres). Be careful
  with writes: they're real. A second Supabase project for development can be added later.
- **Drizzle ORM as a typed query builder only.** Table definitions in
  `apps/server/src/db/schema.ts` are written to match the schema above exactly (or generated once
  with `drizzle-kit pull` and tidied). Don't use `drizzle-kit generate`, `migrate` or `push`; the
  SQL files are the source of truth.
- Postgres driver: `postgres` (postgres.js) or `pg`, whichever the current Drizzle docs recommend.
  Keep the pool small (e.g. max 5): Supabase's free tier limits connections.
- **Money:** `numeric` comes back as a string; convert to `number` (euros) in the repositories,
  since `@orava/core` works in euros.
- Drizzle maps the snake_case columns to camelCase in TypeScript.

## Tasks

- [x] Add `drizzle-orm` and the driver to `apps/server`. Write `src/db/schema.ts` mirroring the
      schema above (all three tables, all columns, same nullability and defaults).
- [x] `DbModule` (global): a provider that creates one connection pool from `DATABASE_URL` and the
      Drizzle instance, injected with a token (e.g. `@Inject(DB)`). Close the pool in
      `onApplicationShutdown`. Add the `select 1` check to `GET /api/health`.
- [x] `apps/server/.env.example`: `DATABASE_URL=` with a comment on where to find it in Supabase
      (never the real value). The owner puts the real one in `apps/server/.env` (gitignored).
- [x] Injectable repositories that hide Drizzle from controllers and services:
  - `UsersRepository`: `findByUsername` (lowercases the input), `findById`.
  - `TransactionsRepository`: `list(userId)` returning `@orava/core`'s `Transaction[]` (newest
    first, without deleted rows, `id` as a string) and `balanceOf(userId)`.
  - Section 04 adds a `SessionsRepository`; section 05 adds the write side for transactions.
  - Repositories return domain types, never Drizzle row types; controllers map them to
    `@orava/contracts` DTOs.
- [x] Root README: a short "Database" section: it's Supabase Postgres, where the connection string
      goes, and that the schema is documented in `todo/03-database.md`.

## Acceptance criteria

- With `DATABASE_URL` set, `npm run dev:server` → `GET /api/health` returns ok; with a wrong
  `DATABASE_URL` it returns 503.
- A throwaway call (or temporary debug route, removed afterwards) shows `list()` for `demo` returns
  its transactions newest first, and `balanceOf()` matches opening balance + sum (€12,534.33 if
  nothing was added or deleted yet).
- `drizzle-kit pull` against the database (writing to a temporary folder, not committed) produces no tables or columns that `schema.ts` is missing
  (a quick manual comparison is enough).

## Notes

<!-- Anything that turned out different from this plan. -->

- **Drizzle 0.45 (latest stable) + postgres.js**, the driver Drizzle's Supabase guide uses. The 1.0
  line is still an RC. Pool: `max: 5`, `ssl: 'require'`, created in `DbModule`; `Db` and the `DB`
  token live in `src/db/db.ts`.
- **Money as numbers:** the `numeric` columns use Drizzle's `mode: 'number'`, so the euro
  conversion happens in the column mapping rather than by hand in each repository.
  `balanceOf()` sums in Postgres (`numeric`) and converts once, so cents don't pick up float errors.
  It returns `undefined` for an unknown user.
- **Column names are explicit** in `schema.ts` (`passwordHash: text('password_hash')`), not
  Drizzle's `casing` option, so the file reads like the SQL. Constraint and index names match
  Postgres's (checked with `drizzle-kit pull`).
- **`drizzle-kit` isn't a dependency.** Installing it in the workspace failed (tsx's nested esbuild
  clashes with the hoisted platform binary), and it's only needed for the one-off pull check, so
  that ran from a temporary folder outside the repo. The pull matched `schema.ts`.
- **Exception filter (section 02 fix):** 5xx errors used to be sent as 500 whatever their status;
  they now keep it, so health returns 503 (`code: internal`, generic message) when the DB is down.
- **Checked:** health 200 against Supabase, and 503 with an unreachable `DATABASE_URL` (postgres.js
  connects lazily, so the server still starts). `demo`: 659 transactions, newest first, balance
  €12,534.33. The pool closes on SIGTERM.
