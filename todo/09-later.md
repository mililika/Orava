# 09 · Later

Ideas that came up while planning but aren't needed for a working production web app. Each one is
independent. Move one into its own numbered file when it's picked up.

- **Public sign-up.** `POST /api/auth/register` with username and password; a new user starts with
  a copy of `demo_solid`'s transactions (labelled as sample data in the UI) since there's no bank connection.
  Needs CAPTCHA or stricter throttling, and a way to delete your own account.
- **Password change and account deletion** from the app.
- **PWA.** Web app manifest, icons and a service worker so the site can be added to a phone's home
  screen and feels like an app. Check the Expo docs for SDK 58 on PWA support.
- **Expo Router.** `apps/web/AGENTS.md` asks for it; the app uses a `useState` screen switch.
  Real URLs (`/health`, `/add`) would make the browser back button and deep links work.
- **Vertex AI instead of an API key.** On Cloud Run, call Gemini through Vertex AI with the
  service account's identity, so there's no AI key to store or leak at all.
- **Observability.** Error tracking (e.g. Sentry) for web and server; Cloud Run logs-based
  metrics for AI usage and 5xx rates; an uptime check on `/api/health`.
- **Real "today".** Use the real date instead of the newest transaction date, once the data is live
  rather than a fixed historical dataset.
- **Staging environment.** A second Cloud Run service and database (a second Supabase project) for PR
  previews.
- **Chat history** stored on the server, so a conversation survives a reload.
- **Typed routes, not just typed bodies.** `@orava/contracts` shares the shapes, but paths and
  methods are still strings on both sides. A contract library such as ts-rest or oRPC (both have
  NestJS integrations) would also share the routes and generate the client. Worth it once the API
  grows past a dozen endpoints. It can also generate an OpenAPI spec.
- **Persist AI cache and usage.** If in-memory overview caching and limits aren't enough (more
  instances, cost reporting), add `ai_overviews` / `ai_requests` tables. Needs the owner's OK
  (README rule on keeping the database small).
- **Read-only or self-resetting `demo_solid`.** The public `demo_solid` login is shared by everyone. Either make
  it read-only (no add/delete), or reset its `user` transactions nightly (a Cloud Scheduler job
  calling a protected endpoint that runs the reset SQL from `08-deployment.md`).
- **Separate development database.** A second Supabase project for local development, so testing
  doesn't write to the production data. Create it with the schema from section 03 and whatever data the owner wants.
