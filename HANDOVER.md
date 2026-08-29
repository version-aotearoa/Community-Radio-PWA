# Handover — 2026-08-29 (final)

## Session outcome

Lock-screen (background) audio on iOS was the **critical feature**; the archive time/seek work was explicitly non-critical. The time/seek work is **parked**; the player is **restored** to the pre-archive (last-known-good) state; the actual lock-screen killer turned out to be the **service worker**, now skipped on iOS. Prod (`version-radio.pages.dev`) = commit `f67e446` (plus restore `3c09010`). `npm run check` clean.

## Critical finding: iOS lock-screen audio death = service worker control

- Symptom: background audio dies when the screen locks (live HLS AND plain on-demand archives); the page/player itself is fine; the stream server is healthy (playlists + segments 200); bare Safari playing the same direct m3u8 on the phone survives lock — so it was never the stream, the player code, or the media session.
- Root cause: **SW control of the page** — a service worker only controls a page from the second load onward. First-load tabs (uncontrolled) survived; reload-controlled tabs died on lock. No interception of the (cross-origin) audio fetches — the effect of being SW-controlled on iOS Safari's background-audio handling is what kills it.
- Fix (committed `f67e446`): `registerServiceWorker()` in `src/lib/pwa.ts` returns early on iOS (`isIos()`). Android/desktop keep the SW + install prompt; iOS PWA install (Add to Home Screen) doesn't need it. Removal candidates for future sessions: unregister + one-time cache cleanup on the phone (Settings → Safari → Clear History and Website Data) removes the wedged old SW.
- The same SW/cache explained an earlier confusing symptom: the iPhone briefly serving a **stale bundle from hours ago** (loading bug visible again) — tab/SW caching, not deploys. **Any future "old version" report: check the address bar (`version-radio.pages.dev`, not a `xxxx.` preview hash), clear this tab, verify the bundle, not the deployed commit.**

## Player state NOW (restored — pre-`4341318` at `3c09010`)

- StreamPlayer.svelte byte-exact `4341318~1` (90c133d), i.e. NO media-session code, NO archive time/±30 UI, NO same-origin HLS proxy, NO `/api/replay-info`. `STREAM_URL` = `https://stream.version.nz/hls/version_radio/live.m3u8` (origin direct; hls.js lazy for desktop; native HLS on iOS).
- Why restored: media session + time/seek work (commits `4341318`..`29d613e`) was the suspect at the time; it turned out innocent, and the user directed a clean restore anyway. Lock + player verified working on iOS after the SW skip. Desktop Chrome live: origin direct + hls.js = CORS-blocked XHR again (as it was before `dedc893`) — acceptable; the proxy could be restored later if wanted.

## Parked (recoverable from `29d613e`)

- Live-stream-archive time/seek (API clock via nowplaying exact `duration`/`elapsed`, `reairNow`/`archiveLike`, ±30 seek with real-window clamp + "Seek unavailable" refusal, media-session gating + `__vrms` kill-switch, debug strip, TLEN probe in `/api/replay-info`, `durationMinutes` plumbing). Non-critical per user.
- To restore the feature: pick files/commits from `29d613e`; if media session is re-enabled, re-verify iOS lock behavior (SW skip now masks nothing — the media-session code was tested innocent with SW off, but do one lock test with SW off before shipping lock-screen extras).

## Domain facts (still valid)

- Re-aired recordings (live-streamed playlist, `live.is_live = false` + `nowplaying.duration`) are the "live-streamed archives"; AzuraCast public API: `/api/nowplaying` carries exact `duration` + `elapsed` (+ track id inside `song.art`); on-demand list has NO length field; history/media detail endpoints are auth-gated.
- On-demand replay files (m4a/mp3 via `ondemand/download/<id>`) probe exact length via m4a `mvhd` / ID3v2 `TLEN` (verified: detunedradio → 7648s). Old `29d613e` code only.

## Commands

```sh
npm run check                       # svelte-check
npm run pages:deploy                # prod
cd workers/chat-worker && npx wrangler deploy   # chat worker
npx wrangler d1 migrations apply version-radio-db --remote
```
