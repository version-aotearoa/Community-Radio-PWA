# Handover — 2026-08-29 session 2 (archive time & seek)

## Session outcome

Second session on the same day. Topic (explicitly scoped by the user): **live-streamed archives — time & seek in the max player + lock screen**. Refinement and debugging under way; two prod deploys made; the agreed-seek fix is the **next step, NOT YET IMPLEMENTED** (see "Agreed plan" below). Repo still uncommitted from `dedc893`/`3d2eae1`.

## Key domain facts (settled with the user — treat as spec)

- **Live-streamed archives are played live by AzuraCast — they are NOT on-demand.** The player gate is `isArchive` (any source ≠ live.m3u8). On-demand (`ondemand/download/<id>` files) are a *separate* category and already work.
- **On-demand duration: we already have it** (exact `mvhd` m4a / ID3 `TLEN` mp3 probe via `/api/replay-info/<trackId>`).
- **Live-streamed archives have no real duration** → use the **estimate we already store**: `broadcast.duration_minutes` (scheduled length). No new probing/APIs. AzuraCast's `/api/station/.../ondemand` list does NOT expose a length field, so estimates are the source for streams.
- Symptom being fixed: seeking past the stream's live point kills playback; the sheet previously gated time/seek behind `mediaMode` and showed nothing for streamed archives.

## Shipped & live (prod version-radio.pages.dev, uncommitted/undeployed as a commit)

- `79107f8`-era work + this session's edits (working tree vs `3d2eae1`):
  - `/api/replay-info/[trackId]`: added **ID3v2 `TLEN`** frame parser → mp3 exact duration (verified live: detunedradio `16b89ee6…` → 7648s ≈ 2:07:28). m4a `mvhd` unchanged; measured-slice stays last resort.
  - `MediaSource.durationMinutes?` + all 3 `playMedia` callers pass `duration_minutes` (home query also selects it) → player seeds `estDuration*60` on switch.
  - `isArchive` gate = `mediaMode` (any non-live.m3u8).
  - Max-player station line: elapsed clock **unconditional** (`Recording · {elapsed}` prefix + `/ ≈{est}` inside `isArchive`) — placeholder visible pre-play, ticks in any mode.
  - `streamPlaying` now flips on the audio `playing` event (post-buffering) instead of `play` — loading trace stays visible across load ("playing event" fix; `play` fires before buffering).
- Deploys: `798a51e8` (TLEN/est/clock) → `62493e5a` (playing-event). `npm run check` clean.
- Debug instrumentation (`[vr]` logs, `window.__vrplayer()`, `audio:*` spies) still shipping — keep until seek work verified.

## Agreed plan — NEXT STEP (user-approved, not yet coded)

1. Window-clamped seek in `seekBy` (and shared for Media Session ±30 + new `seekto` scrubber):
   `livePoint` = finite `duration` → `audioEl.seekable.end(0)` (stream window) → `estDuration`; target = `clamp(cur + Δ, 0, livePoint)`. If only the estimate is available (no real window): **refuse** (no-op + brief "Seek unavailable") — never seek past the live point (this is what kills the stream).
2. Clock: elapsed always + `/ ≈` scheduled estimate for streams (real length when known). Media Session `setPositionState` `duration = total, position = min(cur, duration)`; iOS keeps native ±10 (OS behavior).
3. Fail-safe: `audio:error` during archive playback → log `code/message`, clear loading + `streamPlaying`, re-base element (+ log code/message in the existing audio:`error` spy).
4. Verify: `npm run check` → deploy → iPhone private window (replay stream: ticks + ≈, rewind OK, forward clamps, no death; lock screen ±10 + progress; lock screen positionState); spot-check on-demand files unchanged. Chrome desktop: m3u8 replays still native-path only (unsupported in Chrome) — optional later: hls.js engine for media mode.

## Other findings (parked)

- Dead replays: `02a431429cdce0605e1bc7ab` (detunedradio 29-07) and `4eb84f213933a1f552481edc` (July '26) return `text/html` (AzuraCast pruned/gone). REPLAY buttons for those are inert; optional follow-up: HEAD-validate replay_url and disable.
- On-demand files all serve `206` + `content-range` (Range OK) — server-side seekable.
- Version `2026-08-29` session-1 handover (redesign etc.) remains valid for everything else.

## Commands (unchanged)

```sh
npm run check                       # svelte-check
npm run pages:dev                   # :8788 production-build preview
npm run dev -- --host 0.0.0.0       # :5173 LAN (phone testing)
npm run pages:deploy                # staging (default)
npx wrangler d1 execute version-radio-db --local|--remote --file migrations/00XX_*.sql
```

## Notes

- New global skill created (out of session 2's process takeaway): `~/.config/opencode/skills/instruction-adherence/SKILL.md` — user instruction is the spec; reiterations are corrections; no scope expansion, no tangential investigation, one question max. Restart opencode to pick it up.
- Repo: commit pending; keep `dedc893`-based tree until the seek plan lands for a single clean commit.
