# Version Radio — Svelte PWA on Cloudflare

Independent radio PWA: live stream player, DJ tracklist editor, public schedule, and community chat.

See [ROADMAP.md](ROADMAP.md) for planned features (push notifications).

**Environments**

- **local** — `npm run dev` on your machine; local D1 state; `.dev.vars`
- **dev (staging)** — `version-radio-staging` Pages project at `https://dev.radio.version.nz`; separate `version-radio-db-staging`; preview before prod
- **prod** — `version-radio` Pages project at `https://radio.version.nz` (`version-radio.pages.dev`); `version-radio-db`

## Stack

- **Frontend**: SvelteKit (Runes), SVAR Svelte UI (WillowDark theme), hls.js
- **Platform**: Cloudflare Pages (full-stack) · D1 (SQLite) · Durable Objects (chat) · Better Auth (magic links + social) · Cloudflare Turnstile
- **PWA**: manifest + service worker (offline app shell)

## Architecture

- `src/` — SvelteKit app (Pages). Server routes access Cloudflare bindings via `event.platform.env`.
- `workers/chat-worker/` — separate Worker owning the `ChatRoom` Durable Object (WebSockets + DO SQLite). SvelteKit does not export DO classes (adapter limitation), so the chat worker is deployed independently and the app connects to it via `PUBLIC_CHAT_URL`.
- `migrations/` — D1 migrations (domain + auth tables).
- Live stream: `https://stream.version.nz/hls/version_radio/live.m3u8` (4 audio variants, CORS-enabled).

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

## Deployment (prod)

```sh
# 1. Migrations
npx wrangler d1 migrations apply version-radio-db --remote

# 2. Chat worker (independent DO worker)
cd workers/chat-worker && npx wrangler deploy   # prints https://chat-worker.<sub>.workers.dev

# 3. App
npm run build
npx wrangler pages project create version-radio --production-branch main
npx wrangler pages deploy .svelte-kit/cloudflare --project-name version-radio

# 4. Secrets
printf '%s' "$AUTH_SECRET" | npx wrangler pages secret put AUTH_SECRET --project-name version-radio
printf '%s' "https://chat-worker.<sub>.workers.dev" | npx wrangler pages secret put PUBLIC_CHAT_URL --project-name version-radio
```

Prod URL: `https://radio.version.nz`.

## Staging (dev) deployment

Deploy to staging with `npm run pages:deploy:dev` (builds and uploads to the `version-radio-staging` Pages project). One-time setup:

1. **Pages project** — create `version-radio-staging` (same build output: `.svelte-kit/cloudflare`).
2. **D1** — create a separate database and apply migrations:
   ```sh
   npx wrangler d1 create version-radio-db-staging
   npx wrangler d1 migrations apply version-radio-db-staging --remote
   ```
   Staging starts fresh (no prod data copy).
3. **Custom domain** — Pages dashboard → `version-radio-staging` → Custom domains → Set up a domain → `dev.radio.version.nz`, then at your DNS provider add `CNAME dev → version-radio-staging.pages.dev`. Associate in the dashboard first (CNAME-only setup causes a 522). Registrar-hosted DNS is fine — subdomains don't require the zone on Cloudflare.
4. **Secrets (staging project)** — `AUTH_SECRET` (new value, not prod's), `GITHUB_ID/GITHUB_SECRET`, `GOOGLE_ID/GOOGLE_SECRET`, `EMAIL_FROM`, `PUBLIC_CHAT_URL` (prod chat worker URL for now — chats in staging share prod rooms), `TURNSTILE_SECRET`, `TURNSTILE_HOSTNAMES=dev.radio.version.nz`, `PUBLIC_TURNSTILE_SITE_KEY` (Turnstile widget must allow the `dev.radio.version.nz` hostname), `BETTER_AUTH_URL=https://dev.radio.version.nz/api/auth`.
5. **OAuth** — add `https://dev.radio.version.nz/api/auth/callback/*` callback URLs to the GitHub/Google OAuth apps.

Staging URL: `https://dev.radio.version.nz` (also reachable via `https://version-radio-staging.pages.dev`).

## Custom domains (all environments)

Subdomains work without moving the zone: associate the hostname in the Pages dashboard first (CNAME-only setup causes a 522), then add a CNAME at your DNS provider. No nameserver move is needed for a subdomain — only apex domains (`version.nz`) require the zone on Cloudflare. Check for CAA records at your zone if certificate issuance fails.

## Before going live

- Create real Turnstile widget (account-level) for the production hostname; set `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, `TURNSTILE_HOSTNAMES` (add `dev.radio.version.nz` too). Test keys are in `.dev.vars` today.
- Onboard a sending domain for Cloudflare Email Service; add the `EMAIL` binding via the Pages dashboard (config-file `send_email` is rejected for Pages) and set `EMAIL_FROM`. Until then magic links log to the console.
- Set `BETTER_AUTH_URL` (or `baseURL`) once a stable production hostname exists.
- Add GitHub/Google OAuth client IDs as `GITHUB_ID/GITHUB_SECRET/GOOGLE_ID/GOOGLE_SECRET` secrets.
