# Handover — 2026-08-26

## Session outcome

Implemented **replay links** for show recordings (AzuraCast on-demand), **CSV tracklist import**, a **dual-engine player**, and prepared a **staging (dev) environment**. All changes build clean (`npm run check` 0 errors, `npm run build` passes).

### D1 migrations (applied both environments)
- `0004_replay.sql` — adds `broadcast.replay_url`.
- **Local:** applied (`--local`) ✅ · **Prod/dev Pages DB:** applied (`--remote`) ✅.
- Staging DB (`version-radio-db-staging`): **not created yet** (needs `wrangler d1 create`, then migrations).

### Features shipped (code complete, uncommitted)
- Replay link per broadcast: DJ pastes a 24-hex track id or on-demand download URL in the tracklist editor (`TracklistEditor.svelte` → "Replay link" row). Server (`api/shows/[id]/broadcasts/[broadcastId]/replay/+server.ts`) validates and canonicalizes to `https://stream.version.nz/api/station/1/ondemand/download/{id}`; art auto-derived via `…/api/station/version_radio/art/{id}`.
- Show page shows ▶ Replay rows with recording art for broadcasts that have a link.
- Player is dual-mode: recordings play in the bottom bar (`playback` store, `StreamPlayer.svelte`); "Back to live" restores HLS; quality selector only for live.
- CSV import in tracklist editor (`src/lib/csv.ts`): quoted fields, header mapping (title/artist/album) or positional, tab-delimited; appends to grid, saves via existing PUT.
- Staging: `pages:deploy:dev` script; README documents envs (local / dev / prod) + full staging setup.

### Verified against live AzuraCast
- `GET /api/station/1/ondemand` → recordings (8 items; playlist/`length` null; art absolute).
- Download URL serves `audio/x-m4a`, supports Range/206 (seeking works).

## Tomorrow / next steps
1. **Manual staging setup** (README → "Staging (dev) deployment", steps 1–5): create `version-radio-staging` Pages project, `version-radio-db-staging` D1, `CNAME dev → version-radio-staging.pages.dev` at registrar DNS (associate custom domain in dashboard FIRST), staging secrets (fresh `AUTH_SECRET`, Turnstile hostname `dev.radio.version.nz`, `BETTER_AUTH_URL=https://dev.radio.version.nz/api/auth` or `AUTH_TRUST_HOST=true`), OAuth callbacks.
2. **Deploy prod** when happy: `npx wrangler d1 migrations apply version-radio-db --remote` (already applied) → chat worker → `npm run pages:deploy`.
3. **Optional polish (discussed, not implemented):**
   - Gate the ▶ Replay row on the show page to past broadcasts only (`b.date < today`) — currently the row appears on future broadcasts if a DJ attaches a link early.
   - Staging chat worker duplicate (currently staging shares prod chat rooms).

## Known caveats
- On-demand recordings are inherently downloadable (AzuraCast issue #7958) — no DRM; accepted by design.
- Replay save errors now surface server text/status (fixed generic message).
- Working tree has uncommitted pre-existing changes (shows/schedule/home/layout pages, `src/lib/api/`, chat-adjacent files) — commit or review before tomorrow's work.

## Commands
```sh
npm run check          # svelte-check
npm run pages:deploy   # prod deploy
npm run pages:deploy:dev  # staging deploy
npx wrangler d1 migrations apply version-radio-db --remote            # prod migrations
npx wrangler d1 migrations apply version-radio-db-staging --remote   # staging (once created)
```
