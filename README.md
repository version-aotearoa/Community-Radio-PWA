# Version Radio — Svelte PWA on Cloudflare

Independent radio PWA: live stream player, DJ tracklist editor, public schedule, and community chat.

See [ROADMAP.md](ROADMAP.md) for planned features (push notifications).

**Environments**

- **local** — `npm run dev` on your machine; local D1 state; `.dev.vars`
- **dev (staging)** — `version-radio-staging` Pages project at `https://dev.versionradio.live` (`version-radio-staging.pages.dev`); separate `version-radio-db-staging` + `chat-worker-staging`; preview before prod
- **prod** — `version-radio` Pages project at `https://versionradio.live` (`version-radio.pages.dev`); `version-radio-db`

## Stack

- **Frontend**: SvelteKit (Runes), SVAR Svelte UI (WillowDark theme), hls.js
- **Platform**: Cloudflare Pages (full-stack) · D1 (SQLite) · Durable Objects (chat) · Better Auth (magic links + social) · Cloudflare Turnstile
- **PWA**: manifest + service worker (offline app shell)

## Architecture

- `src/` — SvelteKit app (Pages). Server routes access Cloudflare bindings via `event.platform.env`.
- `workers/chat-worker/` — separate Worker owning the `ChatRoom` Durable Object (WebSockets + DO SQLite). SvelteKit does not export DO classes (adapter limitation), so the chat worker is deployed independently and the app connects to it via `PUBLIC_CHAT_URL`.
- `migrations/` — D1 migrations (domain + auth tables).
- Live stream: `https://stream.version.nz/hls/version_radio/live.m3u8` (4 audio variants, CORS-enabled).

## Bandcamp playback

Tracklist rows with a Bandcamp link play through the **global player** (the same single `<audio>` element as live/replay), so only one track ever plays — on every browser. (The old EmbeddedPlayer iframes were replaced: a cross-origin embed can't be controlled, and Chrome blocks a second embed's audio.)

**Resolution.** Bandcamp is behind Cloudflare Bot Management, so datacenter egress (our Worker, or a VPS) gets a JS "Client Challenge". We fetch pages through the **Jina reader** (`https://r.jina.ai/<url>` with `x-respond-with: html`, authenticated with `JINA_API_KEY`) and parse the server-rendered `data-tralbum` JSON for:

- a signed `t4.bcbits.com` stream URL (valid ~24h; `stream_expires_at` gates re-resolution),
- title, artist, duration, and art id (`stream_art_id`).

`GET /api/tracks/:id/stream` is D1-cache-first and resolves on miss. Only Bandcamp **track/album page** URLs resolve; `EmbeddedPlayer`/artist URLs return a "re-link with the page URL" error.

**Metadata prefetch (name/artist/art).** Fills rows so names appear before play. It runs **client-side** (each row is its own short request, so a large import can't hit the Worker's 30s ceiling), 2 at a time with a small stagger, and skips rows that already have metadata:

1. **Editor — after “Save tracklist”**: warms D1 so the public page is already enriched.
2. **Public broadcast page — on load**: resolves any rows still missing metadata. The first visitor to a tracklist pays the fetch cost; later views render straight from D1.

Clicking a track still resolves as a fallback (usually instant once prefetched).

**Notes / limits**

- Signed stream URLs expire (~24h); a play after expiry re-resolves.
- Some tracks are preview-only (`capped`) — surfaced as `capped: true`.
- Migration `0022_track_stream.sql` adds the `stream_*` columns.
- `JINA_API_KEY` is a Pages secret (staging + prod) and `.dev.vars` locally.
- Hotlinking Bandcamp streams is a product decision; each row keeps a prominent “Bandcamp ↗” link.

## Local development

```sh
# App (vite dev; D1 emulated via adapter platformProxy)
npm install
npm run dev

# Or production-accurate run
npm run build
npm run pages:dev
```

Chat worker (separate terminal):

```sh
cd workers/chat-worker
npm install
npm run dev          # http://localhost:8790
```

Copy `.dev.vars.example` → `.dev.vars` (app) and `.dev.vars.turnstile.example` values into it. Chat worker reads its own `.dev.vars`.

Local magic links are logged to the console (`[dev-email] To: ...`) instead of sent.

## Deployment

### CI/CD pipeline (recommended)

Deploys are automated via GitHub Actions (see `.github/workflows/`):

- **`pr-checks`** — runs `npm run check` on every PR. Required status check on `main` (bad code can't merge).
- **`Deploy prod`** — runs on merge to `main` (PR-gated): D1 migrations → Pages deploy (`version-radio`) → chat worker.
- **`Deploy staging`** — manual (`workflow_dispatch`, pick a branch): Pages deploy (`version-radio-staging`) → staging chat worker.

Setup (one-time): add GitHub secrets `CLOUDFLARE_API_TOKEN` (Pages:Edit, D1:Edit, Workers Scripts:Edit) and `CLOUDFLARE_ACCOUNT_ID` (`6f00a3bc33382599b284ed7a623807d9`). `main` is branch-protected (`pr-checks`, `enforce_admins`); a human review gate (PR + 1 approval) can be added for major updates by requiring reviews on `main`.

### Manual (local fallback)

Prod (only if the pipeline can't be used — normally CI handles it):

```sh
# 1. Migrations
npx wrangler d1 migrations apply version-radio-db --remote

# 2. Chat worker (independent DO worker)
cd workers/chat-worker && npx wrangler deploy   # prints https://chat-worker.<sub>.workers.dev

# 3. App
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name version-radio --branch main
```

Prod URL: `https://versionradio.live`.

## Staging (dev) deployment

Deploy to staging with `npm run pages:deploy` (local, any branch) **or** the CI `Deploy staging` workflow (pick a branch in GitHub Actions). Both build and upload to the `version-radio-staging` Pages project using `deploy/staging/wrangler.jsonc` for the staging D1 binding. One-time setup:

1. **Pages project** — create `version-radio-staging` (same build output: `.svelte-kit/cloudflare`).
2. **D1** — create a separate database and apply migrations:
   ```sh
   npx wrangler d1 create version-radio-db-staging
   npx wrangler d1 migrations apply version-radio-db-staging --remote -c deploy/staging/wrangler.jsonc
   ```
   Staging starts fresh (no prod data copy).
3. **Custom domain** — Pages dashboard → `version-radio-staging` → Custom domains → Set up a domain → `dev.versionradio.live`, then at your DNS provider add `CNAME dev → version-radio-staging.pages.dev`. Associate in the dashboard first (CNAME-only setup causes a 522).
4. **Secrets (staging project)** — `AUTH_SECRET` (new value, not prod's), `GOOGLE_ID/GOOGLE_SECRET` (reuse prod), `RESEND_API_KEY/RESEND_FROM` (reuse prod), `PUBLIC_CHAT_URL` (staging chat worker URL), `TURNSTILE_SECRET`/`TURNSTILE_HOSTNAMES`/`PUBLIC_TURNSTILE_SITE_KEY` (test keys), `JINA_API_KEY` (Bandcamp playback; see above), `BETTER_AUTH_URL=https://dev.versionradio.live`.
5. **Chat worker** — from `workers/chat-worker`: `npx wrangler deploy --name chat-worker-staging`, then set `CHAT_IDENTITY_SECRET` + `CHAT_ADMIN_TOKEN` (shared values with the staging app).
6. **OAuth** — add `https://dev.versionradio.live/api/auth/callback/*` callback URLs to the GitHub/Google OAuth apps.

Staging URL: `https://dev.versionradio.live` (also reachable via `https://version-radio-staging.pages.dev`).

## Custom domains (all environments)

`versionradio.live` is an apex domain — it requires the zone on Cloudflare (full setup, nameservers moved from the registrar). Subdomains (`dev.versionradio.live`) work without moving the zone: associate the hostname in the Pages dashboard first (CNAME-only setup causes a 522), then add a CNAME at your DNS provider. Check for CAA records at your zone if certificate issuance fails.

## Before going live

- Create real Turnstile widget (account-level) for the production hostname `versionradio.live`; set `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, `TURNSTILE_HOSTNAMES` (add `dev.versionradio.live` too). Test keys are in `.dev.vars` today and on staging. Notes: with the test keys siteverify returns `hostname: "example.com"` (hence staging's `TURNSTILE_HOSTNAMES` includes it) — real keys return the real page hostname, so no `example.com` entry is needed once prod has real keys. The login form sets its `busy` flag synchronously (before the async Turnstile verify) so enabling Turnstile on prod will not cause duplicate magic-link emails.
- Onboard a sending domain for Cloudflare Email Service; add the `EMAIL` binding via the Pages dashboard (config-file `send_email` is rejected for Pages) and set `EMAIL_FROM`. Until then magic links log to the console.
- Set `BETTER_AUTH_URL` (or `baseURL`) once a stable production hostname exists.
- Add GitHub/Google OAuth client IDs as `GITHUB_ID/GITHUB_SECRET/GOOGLE_ID/GOOGLE_SECRET` secrets.
- Set `JINA_API_KEY` on the prod Pages project (Bandcamp stream resolution; see [Bandcamp playback](#bandcamp-playback)).
