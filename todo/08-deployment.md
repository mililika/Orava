# 08 · Deployment

**Goal:** the app live on the internet: web on Vercel, API on Google Cloud Run, Postgres on a
managed provider, deploys running from GitHub.

**Depends on:** 01–07. Everything before this section works locally without any cloud account.

**Needs the owner** for every step that creates an account, enters billing details or handles
secrets. An agent can prepare config files and commands, but shouldn't create cloud resources
without the owner saying so for that step.

## Decisions

- **Region:** Cloud Run in `europe-north1` (Finland), close to the Supabase project's region.
- **Database:** the existing Supabase project (section 03). Nothing to create or migrate here.
- **Database access:** only the Cloud Run service gets `DATABASE_URL` (Supabase session pooler
  string). Never put it or any Supabase key in Vercel's env vars. In the Supabase dashboard,
  consider turning the Data API off entirely, since nothing uses it (the schema already locks it
  out). Supabase network restrictions (IP allowlisting) are optional: Cloud Run has no fixed
  outbound IP without a NAT setup.
- **Secrets** (`DATABASE_URL`, `GEMINI_API_KEY`) live in Google Secret Manager and are mounted into
  Cloud Run as env vars. Never in the image, the repo or GitHub Actions logs.
- **One origin for the browser:** `vercel.json` rewrites `/api/:path*` to the Cloud Run URL. The web
  build uses `EXPO_PUBLIC_API_URL=""` (same origin), so cookies are first-party.
  **Verify SSE streaming works through the rewrite** (Vercel's external rewrites have timeouts and
  may buffer). If it doesn't, the fallback is a custom domain with `app.<domain>` on Vercel and
  `api.<domain>` on Cloud Run (same site, so `SameSite=Lax` cookies still work), and the client
  calls `api.<domain>` directly.
- **CI/CD:** GitHub Actions authenticates to Google Cloud with **Workload Identity Federation**
  (no long-lived JSON key). On push to `main`: build image → push to Artifact Registry → deploy to
  Cloud Run. Vercel deploys the web app itself from its GitHub integration.
- **The public `demo` login is shared.** Everyone who logs in as `demo` sees and changes the same
  data, and shares one AI hourly limit (which also caps what visitors can spend on Gemini).
  To reset it, run in the Supabase SQL Editor:
  `delete from transactions where source = 'user' and user_id = (select id from users where username = 'demo'); update transactions set deleted_at = null where user_id = (select id from users where username = 'demo');` See `09-later.md` for a read-only or
  self-resetting demo.
- **Cost guards:** Cloud Run min instances 0, max instances 2; a Google Cloud budget alert; the
  `AI_DAILY_LIMIT` from section 06; a spending cap or quota on the Gemini key.

## Tasks

### Google Cloud (owner creates the project; agent prepares the commands)

- [ ] New project, billing account linked, **budget alert** (e.g. €10/month at 50/90/100%).
- [ ] Enable APIs: Cloud Run, Artifact Registry, Secret Manager, IAM Credentials (for WIF).
- [ ] Artifact Registry Docker repo in `europe-north1`.
- [ ] Service account for the Cloud Run service with only `secretmanager.secretAccessor` on its
      two secrets.
- [ ] Gemini API key from Google AI Studio, restricted to the Generative Language API, stored in
      Secret Manager as `gemini-api-key`.
- [ ] Write the exact `gcloud` commands into `docs/deploy.md` as they're run, so the setup can be
      rebuilt from scratch.

### Database

- [ ] Store the Supabase session pooler connection string in Secret Manager as `database-url`.
      The tables and data already exist.

### Cloud Run

- [ ] First deploy by hand from the image built in section 02:
      `gcloud run deploy orava-api --image … --region europe-north1 --allow-unauthenticated`
      with `--set-secrets`, `--set-env-vars` (`NODE_ENV=production`, `WEB_ORIGIN=<vercel url>`,
      AI limits), `--min-instances 0 --max-instances 2`, the service account, and the `/api/health`
      path as the startup probe.
- [ ] `curl https://<cloud-run-url>/api/health` returns ok.

### Vercel

- [ ] Import the GitHub repo. **Root Directory `apps/web`**, so Vercel builds and serves only the
      web app; server code is never built or deployed there. Make sure npm workspaces install from
      the repo root (Vercel detects monorepos; check its current docs).
- [ ] Build command: an `apps/web` `build` script that first builds the shared packages (they're
      consumed from `dist/`, see section 01), then exports the web app, e.g.
      `npm run build -w @orava/core -w @orava/contracts && npx expo export --platform web`.
      Output directory `dist`.
- [ ] Ignored Build Step (Vercel project settings): skip the deploy when a commit didn't touch the
      web app, e.g. `git diff --quiet HEAD^ HEAD -- . ../../packages ../../package-lock.json`
      (exit code 0 = skip). Check Vercel's current docs for the exact semantics.
- [ ] `apps/web/vercel.json`: the `/api/:path*` rewrite to Cloud Run.
- [ ] Env var `EXPO_PUBLIC_API_URL` = empty, for Production and Preview.
- [ ] Preview deployments: decide whether PR previews talk to the production API (simple) or a
      separate staging service (safer). Default: production API, since previews only read and
      write the data of whoever is logged in.
- [ ] Set `WEB_ORIGIN` on Cloud Run to the production Vercel URL (plus the custom domain if any).

### GitHub Actions deploy (`.github/workflows/deploy.yml`)

- [ ] Workload Identity Federation pool and provider, limited to this repository's `main` branch;
      a deploy service account with Artifact Registry writer, Cloud Run admin and
      service-account-user on the runtime account.
- [ ] Trigger only for server changes: `on.push.branches: [main]` with
      `paths: ['apps/server/**', 'packages/**', 'package-lock.json',
      '.github/workflows/deploy.yml']`, plus `workflow_dispatch` for manual redeploys. A commit
      that only touches `apps/web` deploys the web app on Vercel and leaves Cloud Run alone.
- [ ] On push to `main` after CI passes: build and push the image tagged with the commit SHA, deploy
      the new revision.
- [ ] Keep the last few image tags so a rollback is `gcloud run services update-traffic` to an
      older revision. Document it in `docs/deploy.md`.

## Acceptance criteria

- The Vercel URL opens the app, and logging in as `demo` works.
- Adding a transaction persists across reloads.
- The Ask Orava chat streams in production (word by word, not all at once at the end).
- The session cookie is `HttpOnly`, `Secure`, first-party (check in browser dev tools).
- A push to `main` deploys both web and API without manual steps.
- The budget alert exists, and `docs/deploy.md` describes how to recreate everything.

## Notes

<!-- Anything that turned out different from this plan. -->
