# 04 · Auth (Supabase Auth)

**Goal:** real login through **Supabase Auth**, and our API accepting only signed-in users. We
don't handle passwords, password hashes, sessions or login throttling ourselves: Supabase Auth
does. Our server only checks the access token on each request and maps it to our `users` row.
There's no "Continue with demo data" mode: you sign in as one of the users in the database
(`demo_solid` is the public login).

**Depends on:** 02, 03.

## Decisions

- **Supabase Auth checks passwords and keeps sessions.** The browser signs in with
  `@supabase/supabase-js` (`signInWithPassword`, email + password) using the project URL and the
  **publishable key**. Both are public by design. The Supabase client is used **only for auth**:
  the publishable key can't read our tables (RLS on, `anon`/`authenticated` privileges revoked;
  see section 03), and all data still goes through our API.
- **Email, not username.** Supabase Auth signs in with an email (or phone). Each demo user gets an
  email in Supabase Auth; our `users.username` stays the display name.
- **Our API gets the access token as `Authorization: Bearer …`** on every request. The server
  verifies it locally with `jose` against the project's public signing keys (JWKS at
  `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`; the project signs with ES256), checking
  `iss = <SUPABASE_URL>/auth/v1`, `aud = authenticated` and `role = authenticated`. No request
  to Supabase per API call.
- **Linking:** `users.auth_user_id` (unique, references `auth.users(id)`) = the token's `sub`.
  A valid token whose user has no linked row gets 401 with code `account_not_linked` ("not set up for Orava").
- **No CSRF check:** the token is sent in a header the page sets, never a cookie, so another site
  can't make the browser send it. CORS still allows only `WEB_ORIGIN`.
- **Rate limits** on sign-in are Supabase Auth's (Authentication → Rate Limits).
- **No public sign-up:** "Allow new users to sign up" is off. Users are created by the owner in
  the Supabase dashboard.

## API

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/me` | none | 200 `{ user }` · 401 |

`user` is `UserDto = { id, username }`. Signing in and out happens in the browser with Supabase
Auth; there are no login or logout routes on our server.

## Owner steps (in Supabase)

Passwords are set by the owner in the dashboard; never in the repo, this plan or the chat.

1. **Authentication → Sign In / Providers → Email:** keep Email enabled. Turn **off** "Allow new
   users to sign up". Check the minimum password length there: the old demo passwords (`demo`, …)
   are too short, so the demo logins get new passwords.
2. **Authentication → Users → Add user → Create new user**, with **Auto Confirm User** ticked, for
   the five demo logins (done 2026-11-23): `demo_critical@demo.de`, `demo_tight@demo.de`,
   `demo_steady@demo.de`, `demo_solid@demo.de`, `demo_thriving@demo.de`. Passwords: your choice;
   `demo_solid` is the public login, so put its password in the root README yourself.
3. **SQL Editor:** rename five users to the five levels, link them to those logins by email, and
   check. One transaction, so it either all happens or nothing does:

   ```sql
   begin;

   alter table users
     add column auth_user_id uuid unique references auth.users (id) on delete set null;

   -- Five levels, worst to best (scores as at the hackathon).
   update users u
      set username = v.new_name
     from (values
       ('demo_bad',     'demo_critical'),  -- Needs attention (18)
       ('demo_headsup', 'demo_tight'),     -- Heads up (54)
       ('demo_young',   'demo_steady'),    -- Steady (61)
       ('demo',         'demo_solid'),     -- Steady (76), the public login
       ('demo_good',    'demo_thriving')   -- Doing great (90)
     ) as v (old_name, new_name)
    where u.username = v.old_name;

   update users u
      set auth_user_id = a.id
     from auth.users a
    where lower(a.email) = u.username || '@demo.de';

   select username, auth_user_id from users order by username;

   commit;
   ```

   The five renamed users should show the UIDs from Authentication → Users (done 2026-11-23).
   `demo_idle` and `demo_spending` are left without a login.
3b. **Remove the two users without a login** (owner's call, 2026-11-23), with their transactions
   (`on delete cascade`: 731 + 194 rows). Permanent:

   ```sql
   begin;

   delete from users where username in ('demo_idle', 'demo_spending');

   -- Expect 5 users and 2406 transactions.
   select (select count(*) from users) as users, (select count(*) from transactions) as transactions;

   commit;
   ```
4. Put `SUPABASE_URL` in `apps/server/.env`, and `EXPO_PUBLIC_SUPABASE_URL` +
   `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `apps/web/.env` (Project Settings → API Keys; the
   publishable key, never a secret key). Remove the old `EXPO_PUBLIC_SUPABASE_ANON_KEY` line.
5. **After login works**, drop what the old self-made auth needed:

   ```sql
   drop table sessions;
   alter table users drop column password_hash;
   ```

## Tasks

### Contracts

- [x] `packages/contracts/src/auth.ts`: `UserDto`, `MeResponse` (`{ user: UserDto }`).

### Server (`AuthModule`)

- [x] `TokenVerifier`: `jose` `createRemoteJWKSet` + `jwtVerify` with issuer, audience,
      algorithms; returns the token's `sub` or nothing.
- [x] `AuthGuard`, registered **globally** (`APP_GUARD`): reads `Authorization: Bearer`, verifies
      it, loads the user by `auth_user_id` and attaches it to the request, or throws 401. Routes
      that don't need it opt out with `@Public()` (`/api/health`). `@CurrentUser()` gives handlers
      the user. Secure by default.
- [x] `UsersRepository.findByAuthUserId`; `schema.ts` has `auth_user_id`, no `password_hash`, no
      `sessions` table.
- [x] `GET /api/me`. `SUPABASE_URL` in the env schema and `.env.example`.

### Web app

- [x] `src/lib/auth.ts`: the only place that uses the Supabase client: `signIn`, `signOut`,
      `accessToken`, `onSignedOut`. Session kept by supabase-js (localStorage), refreshed
      automatically.
- [x] `src/lib/api.ts`: sends the access token as `Authorization: Bearer` on every request; any
      401 signs out and returns to the login screen. Still the only place that calls our server.
- [x] `LoginScreen`: email + password; readable errors (wrong login, rate limited, not set up for
      Orava).
- [x] `App.tsx`: restores the session after a reload (supabase-js keeps it), then loads the
      account; "Sign out" ends the Supabase session.
- [x] `.env.example`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
      `EXPO_PUBLIC_API_URL`.

## Acceptance criteria

- Sign in as `demo_solid@demo.de` (with the password you set), reload: still signed in. Sign out,
  reload: login screen.
- Wrong password → "Wrong email or password."
- `curl /api/me` without a token, or with a made-up one → 401.
- A Supabase user without a linked `users` row → 401, and the login screen says it isn't set up.
- A new controller added without `@Public()` returns 401 without a token (secure by default).
- No password, password hash or session code is left in `apps/server`, and the web app uses the
  Supabase client only in `src/lib/auth.ts`.

## Notes

<!-- Anything that turned out different from this plan. -->

- **History:** this section was first built with our own auth (bcrypt checks against
  `users.password_hash`, a `sessions` table, an httpOnly cookie, an Origin check and in-memory
  login throttling; commit `feac7bd`). On 2026-11-21 the owner decided not to handle
  authentication ourselves, so it was replaced by Supabase Auth.
- **Five demo logins instead of seven (owner, 2026-11-23):** one per level, worst to best:
  `demo_critical` (was `demo_bad`), `demo_tight` (`demo_headsup`), `demo_steady` (`demo_young`),
  `demo_solid` (`demo`, the public login), `demo_thriving` (`demo_good`). Emails are
  `<username>@demo.de`. `demo_idle` and `demo_spending` were deleted with their transactions,
  leaving 5 users and 2,406 transactions.
- **`GET /api/account` was pulled forward from section 05.** `demoAccount()` was already deleted
  in section 01, so after login there was nothing to show. `AccountResponse` (contracts, checked
  equal to core's `Account`) and `AccountController` (`src/transactions/`) are here; section 05
  adds the writes.
- **The project signs tokens with ES256**, so `/.well-known/jwks.json` has its public key and
  tokens are verified locally. If the project ever goes back to the legacy HS256 secret, the JWKS
  is empty and every request would get 401.
- **API responses are `Cache-Control: no-store` and ETags are off**: per-user data shouldn't be
  cached anywhere.
- Server-side mentions of Supabase as the Postgres host stay; the web app uses the Supabase
  client only in `src/lib/auth.ts`.
