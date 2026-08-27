# Handover — 2026-08-27

## Session outcome

Two working days of player work, admin moderation, auth/email wiring, chat identity, and prod/dev repairs. All builds pass (`npm run check` 0 errors; chat worker `tsc --noEmit` clean). Multiple prod deploys live at `https://version-radio.pages.dev` (+ `radio.version.nz`).

## Player (StreamPlayer.svelte, live in prod)
- Mini bar: art, track, "On air" link, ▴ maximise toggle (far-left, stays bottom-left), play (SVG icons — triangle/pause, white on accent), Back-to-live.
- Max sheet: full-height slide-up below the header, square-cropped art (`object-fit: cover`, aspect 1), badges, on-air link, Up next, autoplay toggle, share + heart icons (no-ops, wiring deferred), big play. Grid layout pins controls to the **bottom row** (▾ collapse bottom-left, controls bottom-right) — safe-area aware.
- CSS-transition choreography: mini bar slides down (900ms) → sheet rises after 200ms; on close sheet sinks 800ms → bar rises 650ms. Auto-collapses on navigation (`page.url.pathname` effect in component). Esc closes.
- `streamPlaying` store syncs player state to the home card big-play (play/pause icon + toggle). Autoplay store (`vr-autoplay`) persisted; badge moved into the sheet.

## Auth & email (prod live)
- Admin seeded in `version-radio-db`: `admin@version.nz` (role `admin`), signed in via magic link — session verified in D1.
- Google OAuth (DJs) live: `GOOGLE_ID`/`GOOGLE_SECRET` set, button on `/login`.
- Magic links via **Resend**: `email.ts` fallback chain = CF Email binding → Resend (`RESEND_API_KEY`, `RESEND_FROM=Version Radio <noreply@radio.version.nz>`) → console. Domain `radio.version.nz` verified. `BETTER_AUTH_URL` + `AUTH_SECRET` set.
- `.dev.vars.example` updated (resend/chat secrets documented).

## Admin moderation (studio, admin-only section)
- Admin sees all shows (scope plan: `getAllShows` for admin) — `studio/+page.server.ts`, `api/shows` GET.
- Migration `0005_user_active.sql` (applied local + remote): `user.active` flag. Deactivated users: `sendMagicLink` silently declines; hooks sign out any live session (`auth.api.signOut`).
- Studio admin panel: user list (role select, activate/deactivate), chat moderation (history, delete msg, purge by name or account), chat-proxied through `/api/admin/*` with `CHAT_ADMIN_TOKEN` (shared with chat worker).

## Chat (workers/chat-worker, deployed)
- `CHAT_ADMIN_TOKEN`-gated endpoints: `DELETE /api/messages/:id`, `POST /api/messages/purge {name|userId}` → broadcast `deleted`/`purged` frames (client applies them).
- **Authenticated chat identity** (was roadmap item — now done): app issues HMAC-SHA256 tokens (`/api/chat/identity`, 10-min TTL, `CHAT_IDENTITY_SECRET` shared with worker); verified on WS upgrade; messages stamped `user_id` (DO migration v2).
- **Sequential anonymous handles**: `Listener N` per room via `chat_meta` counter (DO migration v3), delivered to client as `{type:'name'}` frame.
- Chat page: signed-out users get an editable handle (persisted only when set — `vr-chat-handle`), anonymous==fresh `Listener N` each visit; signed-in uses account name.

## Local dev gotcha (fixed this session)
- `window` usage in the client component's `onDestroy` throws on SSR → **all routes 500** + HMR WS "bad response". Guarded with `typeof window !== 'undefined'`. Don't reintroduce browser globals in teardown callbacks.
- `platformProxy` is NOT valid in this Kit version — do not add to `vite.config.ts`; README line about it is stale (still to correct).

## Remaining roadmap / next steps
1. **Turnstile prod keys** (widget for `version-radio.pages.dev,radio.version.nz` + `TURNSTILE_SECRET`/`TURNSTILE_HOSTNAMES`/`PUBLIC_TURNSTILE_SITE_KEY` on Pages AND chat worker; currently test keys only).
2. **Staging** (`dev.radio.version.nz`): Pages project + `version-radio-db-staging` + migrations + secrets (repeat Google/Resend/chat secrets + `BETTER_AUTH_URL`) — not created yet.
3. **Share & heart** icons: wire (Web Share/clipboard; favourites localStorage).
4. **Email Service migration**: code already supports CF Email binding (`EMAIL`/`EMAIL_FROM`) ahead of Resend.
5. **Chat spoof resistance**: names remain client-set for anonymous users (by design); considers rate-limit by uid later.
6. README platformProxy note correction; commit the working tree (ever-growing uncommitted changeset).

## Commands
```sh
npm run check                  # svelte-check
npm run pages:deploy           # prod
cd workers/chat-worker && npx wrangler deploy   # chat worker
npx wrangler d1 migrations apply version-radio-db --remote
```
