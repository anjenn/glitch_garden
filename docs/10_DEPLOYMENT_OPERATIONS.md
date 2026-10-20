# 10 — Deployment and Operations

## Track A: static demo
- Host `mockup/index.html` on any standard static host (Netlify, Cloudflare Pages, Vercel static output, GitHub Pages).
- No runtime server, domain connection, environment variables, or auth required.
- Add a simple HTTPS URL. The app stores the user's world locally in their current browser.
- Do **not** suggest that local worlds synchronize across devices.

## Track B: multiplayer release
- Frontend: static Vite build (`npm run build`).
- Persistence: Supabase hosted Postgres, SQL migrations checked into source control.
- Identity: anonymous sign-in with Supabase Auth (verify feature and provider settings before launch).
- Server-authoritative changes: Supabase Edge Function with protected secret configuration.
- Realtime: subscribe to committed world revision changes and recover via HTTP snapshot.
- Scheduler: managed cron/invocation with an authenticated server-owned token.

## Environment example (names only)
```bash
VITE_APP_MODE=local                 # local | shared
VITE_SUPABASE_URL=                 # public project URL
VITE_SUPABASE_ANON_KEY=            # publishable anon key, protected by RLS
SUPABASE_SERVICE_ROLE_KEY=         # Edge/server ONLY; never in VITE_*
GROWTH_JOB_SECRET=                 # server ONLY
```
`VITE_` values are compiled into the public bundle. Never put privileged secrets behind that prefix.

## Suggested CI steps
1. Install dependencies with locked versions.
2. Run formatter/linter.
3. Run `tsc --noEmit`.
4. Run unit tests.
5. Run browser smoke tests in headless Chromium.
6. Build static assets.
7. Deploy preview environment; run manual acceptance.
8. Apply audited database migrations only with a controlled deployment step.

## Operational alerts
- 5xx error rate > 2% over five minutes.
- Elevated rejected/rate-limited interaction volume.
- Realtime subscription errors or reconnect loops.
- DB write errors, revision conflicts above expected level.
- World size above entity cap, JSON corruption, slow read latency.

## Rollback and recovery
- For frontend errors: redeploy prior static build.
- For backend bugs: enable **read-only** state, stop mutation function, restore a verified world snapshot if needed, and investigate event log.
- Never overwrite world history without an administrative audit.
- Test a backup restoration before the first public shared launch.

## Costs and limits
A static demo can often fit free hosting limits. Shared deployment cost depends on traffic, Realtime connections, database writes, function invocations, and abuse. Do not publish a specific cost without checking the provider's current plan and quotas.
