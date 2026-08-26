# Version Radio — Svelte PWA on Cloudflare

Independent radio PWA: live stream player, DJ tracklist editor, public schedule, and community chat.

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

## Deployment

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

Production URL: `https://version-radio.pages.dev`.

## Custom domain

Subdomains work without moving the zone: in the Pages dashboard add `radio.version.nz` as a custom domain, then add a CNAME at your DNS provider pointing `radio.version.nz` → `version-radio.pages.dev`. Associate the domain in the dashboard first (CNAME-only setup causes a 522). No nameserver move needed for a subdomain.

## Before going live

- Create real Turnstile widget (account-level) for the production hostname; set `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, `TURNSTILE_HOSTNAMES`. Test keys are in `.dev.vars` today.
- Onboard a sending domain for Cloudflare Email Service; add the `EMAIL` binding via the Pages dashboard (config-file `send_email` is rejected for Pages) and set `EMAIL_FROM`. Until then magic links log to the console.
- Set `BETTER_AUTH_URL` (or `baseURL`) once a stable production hostname exists.
- Add GitHub/Google OAuth client IDs as `GITHUB_ID/GITHUB_SECRET/GOOGLE_ID/GOOGLE_SECRET` secrets.
