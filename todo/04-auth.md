# 04 · Auth

**Goal:** real login with hashed passwords and server sessions, and the web app's login screen
wired to the server. The "Continue with demo data" mode is removed: you sign in as one of
the users in the database (section 03; `demo` / `demo` is the public login). After this section, the client never sees a password again after submitting it, and no
Supabase code is left.

**Depends on:** 02, 03.

## Decisions

- **Passwords:** bcrypt. The stored hashes (`$2a$12$…`) were made with Postgres's `pgcrypto`
  (`crypt(pw, gen_salt('bf', 12))`); each one contains its own random salt and the cost factor, so
  verifying needs only the hash. Use `bcryptjs` (pure JS, no native build in Docker) or `bcrypt`,
  and check it verifies a `$2a$` hash from the database. The server only **verifies** passwords;
  it never creates users or changes passwords in this plan (the owner does that in SQL).
- **Sessions:** on login, generate 32 random bytes (`crypto.randomBytes`), send them base64url in
  a cookie, store only `sha256(token)` in `sessions.id`. Lifetime 30 days, sliding: extend
  `expires_at` when `last_seen_at` is more than a day old. Logout deletes the row.
- **Cookie:** name `orava_session`, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production.
  In production the browser talks to the API through the Vercel `/api` rewrite (same origin), so
  `SameSite=Lax` is enough. Locally, `localhost:8081` and `localhost:8080` count as the same site,
  so cookies work with `credentials: 'include'` too.
- **CSRF:** `SameSite=Lax` plus an `Origin` check: every non-GET request must have an `Origin`
  header in `WEB_ORIGIN` (or the server's own origin). Reject otherwise with 403.
- **Login throttling:** in-memory, per IP and per username (e.g. 10 failures in 15 minutes →
  429 with `Retry-After`). Good enough while Cloud Run runs 1–2 instances; note it in code.
- **Errors never say which part was wrong:** "Wrong username or password." for both cases, and
  verify against a dummy hash when the user doesn't exist, so response time doesn't reveal it.

## API

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/login` | `{ username, password }` | 200 `{ user }` + cookie · 401 · 429 |
| POST | `/api/auth/logout` | none | 204, cookie cleared |
| GET | `/api/me` | none | 200 `{ user }` · 401 |

`user` is `UserDto = { id, username }`. Nothing else about the user leaves the server.

## Tasks

### Contracts (first)

- [ ] `packages/contracts/src/auth.ts`: `LoginRequest` (username 1–64 chars, trimmed; password
      1–256), `UserDto`, `LoginResponse` / `MeResponse` (`{ user: UserDto }`).

### Server (`AuthModule`)

- [ ] `PasswordService.verify(password, hash)`. Also keep one fixed dummy bcrypt hash (cost 12) to
      verify against when the username doesn't exist (see "Errors" above).
- [ ] `SessionsRepository` on the `sessions` table (section 03's patterns).
- [ ] `SessionsService`: `create(userId)`, `get(token)` (checks expiry, slides it), `delete(token)`.
- [ ] `SessionGuard`, registered **globally** (`APP_GUARD`): reads the `orava_session` cookie,
      loads the session and attaches the user to the request, or throws 401. Routes that don't need
      a session opt out with a `@Public()` decorator (`/api/health`, login). A `@CurrentUser()`
      param decorator gives handlers the user. Secure by default: a new route without a decorator
      requires login.
- [ ] `OriginGuard` (global, after the session guard): non-GET requests must carry an allowed
      `Origin` header, else 403.
- [ ] `AuthController` with the four routes, bodies validated with the contracts schemas through
      the `ZodValidationPipe`, return types from `@orava/contracts`. Set and clear the cookie with
      Express's `res.cookie` (use `@Res({ passthrough: true })` so Nest still sends the return value).
- [ ] Throttling with `@nestjs/throttler`: login, per IP and per username. Its default in-memory storage is fine at 1–2 instances; note that in
      code. Behind Vercel and Cloud Run, the client IP comes from `X-Forwarded-For`, so set Express's
      `trust proxy` accordingly and check what the throttler uses as the key.

### Web app

- [ ] `apps/web/src/lib/api.ts`: replace the Supabase RPC code with a small typed client for our
      API. Base URL from `EXPO_PUBLIC_API_URL` (default `http://localhost:8080` in dev; empty string
      in prod, meaning same origin), `credentials: 'include'` on every request. Request and response
      types come from `@orava/contracts`. Errors are parsed with `ApiErrorBody` into a typed
      `ApiError` (status, code, readable message). In development, also parse successful responses
      with the response schema, so a server/client mismatch shows up immediately.
      This file is the **only** place in the web app that does network requests to our server.
- [ ] `LoginScreen`: "Sign in" calls `/api/auth/login`. **Remove the "Continue with demo data"
      button** and its code path. Until section 05 exists, keep loading the generated `demoAccount()` data in the
      client after a successful login, with a TODO.
- [ ] `App.tsx`: on start, call `/api/me` to restore a session after a page reload; show a
      loading state meanwhile. "Sign out" calls `/api/auth/logout`.
- [ ] Any 401 from the API afterwards returns to the login screen.
- [ ] Remove `EXPO_PUBLIC_SUPABASE_*` from code and `.env.example`; add `EXPO_PUBLIC_API_URL`.

## Acceptance criteria

- Log in as `demo` / `demo`, reload the page: still logged in. Sign out, reload: login screen.
- `select * from sessions` shows hashes, never the cookie value. Login works for `demo` / `demo`
  against the existing `$2a$12$…` hash.
- Wrong password and unknown username give the same message and similar response times.
- 11 bad logins in a row → 429.
- A POST to `/api/auth/logout` with `Origin: https://evil.example` → 403.
- `grep -ri supabase apps packages` finds nothing, and the login screen has no demo button.
- A new controller added without `@Public()` returns 401 without a cookie (secure by default).

## Notes

<!-- Anything that turned out different from this plan. -->
