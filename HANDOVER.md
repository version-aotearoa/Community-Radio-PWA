# Handover — 2026-08-29 end of day (resume tomorrow)

## NEW (2026-08-30 session) — see "Parked: autoplay/phantom loading" below before continuing player work.

## 2026-08-30 end of session — revisit tomorrow: slug confirmation

- **Pending (user-approved plan, NOT implemented):** tracklist-editor slug rename confirmation, styled like the existing confirmations:
  - Renamed → `goto('/shows/[id]/[slug]/edit?renamed=1', { invalidateAll: true })`; on mount read `page.url.searchParams.get('renamed')` → show green "Episode ID updated." with ~4s auto-clear (Studio `flashFeedback` feel, editor `.replay-msg ok` styling).
  - No-change save → inline "Episode ID saved." (same ~4s auto-clear).
  - Errors keep the red `.replay-msg bad` line.
  - Optional nit to settle: strip `?renamed=1` via `history.replaceState` after reading (otherwise a refresh re-shows the notice).
- **Shipped this session (30 Aug), all in prod `41d495ac` / commit `88026f9`:** episode URL flattening (`/shows/[id]/[broadcastId]` + `/edit` editor; legacy `/shows/[id]/tracklist` route removed; no redirects — site not live), slug rename working via D1 `PRAGMA defer_foreign_keys` (NOT `foreign_keys = OFF` — D1 rejects that), auto-slugs `<show>-<date>`, cycle-week selector (2/4-week shows), overlap warnings, Featured admin tab (flag + oldest-4 fallback), events (kind column, description, paste-URL images, V-on-black fallbacks everywhere), per-episode descriptions, admin show/event editing with diff-based schedule regen + `fromDate` phase anchoring, Beats Reality anchor corrected to week 1 (2026-09-16), `Cache-Control: no-store` in hooks, square archive art via ResizeObserver (Chrome+Safari safe).
- **Protocol reminder:** AGENTS.md (project + global) — never push to GitHub or deploy prod without an explicit instruction; "push prod" ≠ GitHub push. GitHub is PUBLIC.

## State

Clean tree, prod `version-radio.pages.dev` live at **`beece22`** (deploy `ff640ff2`). `npm run check` 0 errors. Critical feature (iOS lock-screen background audio) **restored and verified**; player restored to last-known-good; everything else today is safe.

## What's fixed & live

1. **iOS lock-screen audio death — SOLVED.** The killer was **service worker control of the page**, not media session / player code / stream:
   - Symptom chain (for reference): audio died on lock for live AND on-demand; same code "worked" in first-load tabs, died for SW-controlled (reload) tabs; bare Safari direct m3u8 survived lock; phone unchanged.
   - Fix `f67e446`: `registerServiceWorker()` returns early on iOS (`isIos()` gate in `src/lib/pwa.ts`). Android/desktop keep SW + install prompt. SW must be skipped — a future regressor risks a return of the death.
   - Refresher if it ever comes back: re-run the lock test on a **reload-controlled** tab (first-load tests pass even when broken).
2. **Player restored** (`3c09010`): StreamPlayer.svelte byte-exact `4341318~1` (90c133d) — no media session, no archive time/seek UI, no `/api/stream` proxy, no `/api/replay-info`. `STREAM_URL` = origin direct (`https://stream.version.nz/hls/version_radio/live.m3u8`); hls.js lazy for desktop (CORS-blocked again without proxy — acceptable, must test), native HLS on iOS.
3. **Loading-trace fix ported** (`beece22`): `streamPlaying` flips on the element's `playing` event (post-buffering) instead of `play` — trace stays visible across the load. Pure UI timing; no lock/media-session impact.

## Parked (recoverable from `29d613e`)

- Live-stream-archive time/seek (API clock via nowplaying `duration`/`elapsed`, `reairNow`/`archiveLike`, ±30 + window-clamped seek + "Seek unavailable", media-session gating + `__vrms`, debug strip, TLEN probe, `durationMinutes` plumbing). Non-critical per user; restore via cherry-picking from `29d613e`, and re-verify lock after any media-session re-enable.

## Parked: autoplay / phantom loading spinner (2026-08-30, needs more consideration)

- **Symptom (user-reported):** loading trace spins indefinitely "for no apparent reason"; seen in Safari (desktop + iOS), not Chrome. Safari shows constant network activity (native-HLS live-edge polling, normal).
- **Root cause found:** autoplay ON at page load → `onMount` calls `togglePlay()` without a user gesture → Safari blocks `play()` → engine setup events (`loadstart`/`waiting`/`stalled`) fire **while the element is paused** → `loading=true` never cleared → constant spinner instead of autoplay. (Autoplay is already opt-in default-off via `vr-autoplay` localStorage; prod browser had a persisted `on` from an earlier manual toggle.)
- **Debug instrumentation IN TREE:** `StreamPlayer.svelte` has a temp `setLoading(reason)` + `window.__vrPlayerDebug` event ring (commit `77397eb`, local-only, not deployed). `[vr]` console lines log every transition with paused/readyState/networkState/currentTime. Strip once resolved.
- **Proposed fix bundle (NOT applied — revisit):**
  1. Drop `loadstart` as a set-true (explicit sets in `togglePlay`/switch effect cover it).
  2. Paused-invariant: `waiting`/`stalled` handlers ignore events when `audioEl.paused`.
  3. `stalled` extra gate: ignore when `readyState >= 3` (Safari mid-playback phantom).
  4. ~1.5s watchdog on `waiting`/`stalled` set-true: clear if `currentTime` advanced or `readyState >= 3` (real stalls freeze time/drain buffer).
  5. `visibilitychange` → visible guard: clear when `!paused && readyState >= 3`.
  6. Autoplay hardening: bump key `vr-autoplay` → `vr-autoplay-v2` (force-reset all persisted opt-ins to off — "strictly opt-in"), and only auto-start when `document.visibilityState === 'visible'`.
- **Open decisions:** key bump yes/no; readyState gate yes/no; strip ring after local verify or after a prod cycle.
- **Reconsider autoplay as a feature** (user explicitly flagged): autoplay must be strictly opt-in, legally and in UX — revisit whether it should exist at all, whether the opt-in should persist, and whether load-time auto-start (even with a persisted opt-in) should be dropped entirely in favour of always requiring a user gesture. The phantom-spinner bug is a symptom of the load-time autoplay path.
- **Repro:** LAN dev (`npm run dev -- --host 0.0.0.0`) in Safari, toggle player Autoplay ON, reload page.

## NEXT SESSION — queued: account refresh staleness

- **Symptom:** account page saved/followed lists don't settle after avatar-chip navigation (fix `5e6e9dd` — `onMount invalidateAll()` in `src/routes/account/+page.svelte` — is in prod, user still saw it).
- **Diagnosis (likely, not yet shipped):** `static/sw.js` exempts only `/api/` + `/media/` from its stale-while-revalidate cache, so it **caches SvelteKit `__data.json` data fetches** (`invalidateAll()` → GET `/account/__data.json` → cached stale copy). Old caches (`vr-static-v2`) may also hold stale chunks.
- **Planned fix:** restrict sw.js caching to static assets only (`/_app/` paths, no `__data.json`, no data endpoints), bump `CACHE` to `vr-static-v3` (activate handler already purges old-named caches). Then verify desktop Chrome (SW active): follow/save → avatar navigation → lists settle; Network tab shows `__data.json` served fresh.
- **Open question:** was the observed symptom on desktop Chrome (SW-controlled — fits diagnosis) or iPhone (SW-skipped — then look deeper: race-harden by `invalidateAll()` after each toggle POST, or second revalidation ~800ms post-mount).
- Also on the phone: Settings → Safari → Clear History and Website Data once to purge the wedged old SW.

## Useful context

- Azuracast skill: `~/.config/opencode/skills/azuracast/SKILL.md` — full public API, re-air/AutoDJ semantics, on-demand=VOD note, verified gotchas (2026-08-29).
- AzuraCast domain (verified today): re-airs = station playlist `default` rotating recorded files (each = 1 "song" w/ file duration); nowplaying = only free exact length/position source; on-demand download URLs are Range-capable files (server-side seekable) — the VOD path if the episode player ever returns.
- Admin/D1 notes: remote D1 needs `export CLOUDFLARE_ACCOUNT_ID=6f00a3bc33382599b284ed7a623807d9`; `npx wrangler d1 execute version-radio-db --remote`.

## Commands

```sh
npm run check                       # svelte-check
npm run pages:deploy                # prod
cd workers/chat-worker && npx wrangler deploy   # chat worker
```
