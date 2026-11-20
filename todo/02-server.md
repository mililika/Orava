# 02 · Server skeleton (NestJS)

**Goal:** a minimal NestJS API in `apps/server` that runs locally, in Docker, and talks to Postgres
on Supabase (section 03 wires up the queries), with zod validation wired to `@orava/contracts`. No features yet, just the
frame every later section builds on.

**Depends on:** 01.

## Decisions

- **NestJS** with the default **Express** adapter, TypeScript, created with the Nest CLI and then
  trimmed (no sample controller or service). Check the current NestJS docs for the setup steps.
- **Build:** Nest CLI with the **SWC builder** (fast, emits decorator metadata) and type checking
  on. Dev: `nest start --watch`. Prod: `nest build`, then `node dist/main.js`. Shared packages come
  from their compiled `dist/` (see section 01).
- **Validation with zod, not class-validator.** A global `ZodValidationPipe` validates bodies,
  queries and params against the schemas from `@orava/contracts`. Either write the pipe yourself
  (the NestJS docs show the pattern; it's ~20 lines) or use the `nestjs-zod` package, if its
  current version supports the zod major version used in `contracts`. Don't install
  `class-validator` or `class-transformer`.
- **How a route uses a contract** (the pattern every later section follows):

  ```ts
  // packages/contracts/src/auth.ts
  export const LoginRequest = z.object({ username: z.string().min(1).max(64), password: z.string().min(1).max(256) });
  export type LoginRequest = z.infer<typeof LoginRequest>;

  // apps/server/src/auth/auth.controller.ts
  @Post('login')
  login(@Body(new ZodValidationPipe(LoginRequest)) body: LoginRequest): Promise<LoginResponse> { … }
  ```

  Return types are the contract's response types, so the compiler catches a handler that returns
  the wrong shape. Optionally also parse responses with the response schema in dev to catch
  mistakes at runtime.
- **Config:** `@nestjs/config` with a `validate` function that parses `process.env` with a zod
  schema (`src/config/env.ts`). The app refuses to start if a var is missing or invalid. Services
  read typed config through a small `AppConfig` provider, never `process.env` directly.
- **Logging:** `nestjs-pino` (JSON in prod, pretty in dev). Never log passwords, session tokens,
  cookies or prompt contents (configure redaction).
- **Errors:** a global exception filter that turns every error into the `ApiErrorBody` shape from
  `@orava/contracts`: zod errors → 400 `validation_failed` with the issues in `details`,
  `HttpException`s → their status and code, anything else → 500 `internal` without a stack trace.
- **API prefix:** `app.setGlobalPrefix('api')`. Everything lives under `/api`.

## Module layout

```
apps/server/src/
  main.ts                 bootstrap: prefix, cookie-parser, CORS, helmet, pipes, filter, shutdown hooks
  app.module.ts
  config/                 env schema (zod), AppConfig provider
  common/                 ZodValidationPipe, exception filter, decorators
  health/                 GET /api/health
  db/                     section 03: DbModule (Drizzle provider), schema, repositories
  auth/                   section 04
  transactions/           section 05
  ai/                     section 06
```

## Tasks

- [x] Scaffold `apps/server` (`@orava/server`) with the Nest CLI, trim the samples, switch to the SWC
      builder, add `@orava/contracts` and `@orava/core` as workspace dependencies.
- [x] `src/config/env.ts`: zod schema for `PORT` (default 8080), `NODE_ENV`, `DATABASE_URL`,
      `WEB_ORIGIN` (comma-separated allowed browser origins; `http://localhost:8081` in dev,
      required in production), `LOG_LEVEL`. List them in `apps/server/.env.example` (no comments;
      `PORT` left out, since it defaults to 8080 and Cloud Run sets it). Later sections
      add their own vars to the same schema.
- [x] `ZodValidationPipe` and the global exception filter in `src/common/`.
- [x] `HealthModule`: `GET /api/health` → `{ ok: true }`, and checks the DB with `select 1`
      (returns 503 if the DB is down; the DB check is added in section 03). Its response schema
      lives in `contracts/common.ts`, like every other response.
- [x] `main.ts`: global prefix `api`; `cookie-parser`; `helmet`; CORS for `WEB_ORIGIN` with
      `credentials: true`; JSON body limit (e.g. 64 KB); `enableShutdownHooks()` so the DB pool
      closes on SIGTERM (Cloud Run sends it); listen on `0.0.0.0:$PORT`.
- [x] `apps/server/Dockerfile`: multi-stage, with the repo root as build context. Stage 1: `npm ci`
      for the server workspace and its deps, build `packages/*` and the server. Stage 2: slim Node
      image with only `dist/` outputs and production dependencies (`npm ci --omit=dev` for the
      server workspace). Run as a non-root user and listen on `$PORT`. Add a root `.dockerignore`
      (node_modules, .git, apps/web, .env*, todo).
- [x] Root scripts: `dev:server` (package watchers + `nest start --watch`), `docker:server`
      (build the image and run it with `--env-file apps/server/.env -p 8080:8080`).
- [x] Root README: a "Run it locally" section: put `DATABASE_URL` in `apps/server/.env`, start the
      server, start the web app.

## Acceptance criteria

- `npm run dev:server` starts cleanly; `curl localhost:8080/api/health` returns `{ "ok": true }`.
- `npm run docker:server` runs the server in Docker, and the same curl works.
- The image runs as non-root and contains no `.env` files or TypeScript sources
  (`docker run --rm <image> ls -la` to check).
- Starting the server without `DATABASE_URL` fails with a clear message naming the missing var.
- A request from `http://localhost:8081` passes CORS; one from another origin doesn't.
- An endpoint with a zod-validated body (add a temporary test one, then remove it) returns 400
  `validation_failed` with field-level `details` for a bad body, in the `ApiErrorBody` shape.
- `npm ls class-validator` finds nothing.

## Notes

<!-- Anything that turned out different from this plan. -->

- NestJS 12 is ESM-only, so `@orava/server` is `"type": "module"` (Nest CLI 12's default) and
  imports use `.js` suffixes. It loads `@orava/contracts`/`@orava/core` through their ESM build.
  The CLI's samples, `@nestjs/observe`, vitest and oxlint were dropped; lint uses the same ESLint
  config as `packages/`.
- Wrote the `ZodValidationPipe` ourselves (`src/common/zod-validation.pipe.ts`); no `nestjs-zod`.
- npm didn't record `@swc/core`'s platform binaries in the lockfile, so the server lists the
  darwin and linux-gnu ones as `optionalDependencies`. Bump them together with `@swc/core`.
- Request logs keep only id, method, path (no query) and status; headers and bodies are never
  logged, and auth/cookie fields are redacted as a second guard.
- `HealthResponse` is in `contracts/common.ts`.
