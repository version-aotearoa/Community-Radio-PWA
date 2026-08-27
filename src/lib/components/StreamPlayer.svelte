<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';

	import {
		autoplay,
		playback,
		playerRequest,
		playerToggle,
		requestPlay,
		streamPlaying
	} from '$lib/stores/player';
	import { live, startLivePolling } from '$lib/stores/live';

	const STREAM_URL = 'https://stream.version.nz/hls/version_radio/live.m3u8';

	let audioEl: HTMLAudioElement | undefined = $state();
	let hls: import('hls.js').default | null = null;
	let HlsCtor: typeof import('hls.js').default | null = null;
	let nativeHls = $state(false);
	let playing = $derived($streamPlaying);
	let expanded = $state(false);
	let currentTime = $state(0);
	let duration = $state(NaN);

	let prevKind: 'live' | 'media' = 'live';

	const livePayload = $derived($live);
	const media = $derived($playback.kind === 'media' ? $playback : null);
	const mediaMode = $derived(media !== null);
	const autoplayOn = $derived($autoplay);

	const artSource = $derived(media?.art ?? livePayload?.nowPlaying?.art ?? livePayload?.onAir?.djImage ?? '');
	const isLive = $derived(!mediaMode && livePayload?.live.isLive === true);
	const showLink = $derived(livePayload?.trackShow ?? livePayload?.onAir ?? null);

	$effect(() => {
		// React to a requestPlay() signal from anywhere in the app (skip the passive n=0 mount run).
		if ($playerRequest.n === 0) return;
		togglePlay();
	});

	$effect(() => {
		// React to a requestTogglePlay() signal (play/pause flip from external buttons).
		if ($playerToggle.n === 0) return;
		togglePlay();
	});

	let lastPath = '';

	$effect(() => {
		// Collapse the max player on navigation (track path changes only —
		// reading `expanded` here would re-trigger and kill the toggle).
		const path = page.url.pathname;
		if (path !== lastPath) {
			lastPath = path;
			expanded = false;
		}
	});

	$effect(() => {
		const p = $playback;
		if (p.kind === prevKind) return;
		prevKind = p.kind;
		currentTime = 0;
		duration = NaN;
		if (!audioEl) return;
		if (p.kind === 'media') {
			stopLive();
			audioEl.src = p.url;
			audioEl.play().catch(() => {});
		} else {
			stopMedia();
			initLiveEngine();
			audioEl.play().catch(() => {});
		}
	});

	function stopLive() {
		hls?.destroy();
		hls = null;
		if (audioEl) {
			audioEl.removeAttribute('src');
			audioEl.load();
		}
	}

	function stopMedia() {
		if (audioEl) {
			audioEl.pause();
			audioEl.removeAttribute('src');
			audioEl.load();
		}
	}

	/** Lazy-load hls.js on first live playback so it isn't in the initial bundle. */
	async function initLiveEngine() {
		if (!audioEl) return;
		if (HlsCtor) {
			if (HlsCtor.isSupported()) {
				if (!hls) {
					hls = new HlsCtor({ enableWorker: true, maxBufferLength: 30 });
					hls.loadSource(STREAM_URL);
					hls.attachMedia(audioEl);
					wireHlsEvents(HlsCtor);
				}
			} else if (!nativeHls && audioEl.canPlayType('application/vnd.apple.mpegurl')) {
				nativeHls = true;
				audioEl.src = STREAM_URL;
			}
			return;
		}

		const mod = await import('hls.js');
		HlsCtor = mod.default;

		if (HlsCtor.isSupported()) {
			hls = new HlsCtor({ enableWorker: true, maxBufferLength: 30 });
			hls.loadSource(STREAM_URL);
			hls.attachMedia(audioEl);
			wireHlsEvents(HlsCtor);
		} else if (audioEl.canPlayType('application/vnd.apple.mpegurl')) {
			// Native HLS (Safari): no per-variant control.
			nativeHls = true;
			audioEl.src = STREAM_URL;
		}
	}

	function wireHlsEvents(Ctor: typeof import('hls.js').default) {
		hls?.on(Ctor.Events.ERROR, (_evt, data) => {
			if (!data.fatal) return;
			if (data.type === Ctor.ErrorTypes.NETWORK_ERROR) {
				hls?.startLoad();
			} else if (data.type === Ctor.ErrorTypes.MEDIA_ERROR) {
				hls?.recoverMediaError();
			} else {
				setTimeout(() => hls?.startLoad(), 3000);
			}
		});
	}

	async function togglePlay() {
		if (!audioEl) return;
		if (mediaMode) {
			if (audioEl.paused) {
				await audioEl.play().catch(() => {});
			} else {
				audioEl.pause();
			}
			return;
		}
		await initLiveEngine();
		if (audioEl.paused) {
			await audioEl.play().catch(() => {});
		} else {
			audioEl.pause();
		}
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && expanded) expanded = false;
	}

	onMount(() => {
		startLivePolling();
		if (audioEl) {
			audioEl.addEventListener('play', () => streamPlaying.set(true));
			audioEl.addEventListener('pause', () => streamPlaying.set(false));
			audioEl.addEventListener('timeupdate', () => (currentTime = audioEl?.currentTime ?? 0));
			audioEl.addEventListener('loadedmetadata', () => (duration = audioEl?.duration ?? NaN));
			audioEl.addEventListener('durationchange', () => (duration = audioEl?.duration ?? NaN));
		}
		window.addEventListener('keydown', onKey);
		if ($autoplay && !mediaMode) togglePlay();
	});

	onDestroy(() => {
		hls?.destroy();
		audioEl?.pause();
		if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
	});

	function fmtTime(mins: number) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	function fmtDt(dateStr: string) {
		return new Intl.DateTimeFormat('en-NZ', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		}).format(new Date(`${dateStr}T00:00:00Z`));
	}

	function fmtClock(secs: number) {
		if (!Number.isFinite(secs) || secs < 0) return '--:--';
		const s = Math.floor(secs);
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const r = s % 60;
		if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
		return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
	}

	function trackText() {
		if (media) return `${media.title}${media.artist ? ` — ${media.artist}` : ''}`;
		if (livePayload?.nowPlaying?.title) {
			return `${livePayload.nowPlaying.title}${livePayload.nowPlaying.artist ? ` — ${livePayload.nowPlaying.artist}` : ''}`;
		}
		return playing ? 'Now playing' : 'Paused';
	}

	// Wired up later — see handover.
	function shareTrack() {}
	function toggleFavourite() {}
</script>

<audio bind:this={audioEl} preload="none"></audio>

<div class="dock">
	<section
		id="player-sheet"
		class="sheet"
		class:open={expanded}
		aria-label="Player details"
	>
		<div class="strip">
				{#if artSource}
					<img class="strip-img" src={artSource} alt="" loading="lazy" />
				{:else}
					<span class="eq big" class:playing={playing} aria-hidden="true">
						<i></i><i></i><i></i><i></i>
					</span>
				{/if}
			</div>
			<div class="sheet-body">
				<div class="sheet-info">
					<span class="station">
						{#if mediaMode}
							<span class="track playtime">{fmtClock(currentTime)} / {Number.isFinite(duration) ? fmtClock(duration) : '--:--'}</span>
							<em class="badge replay">Recording</em>
						{:else}
							Version Radio
							{#if livePayload}
								{#if isLive}
									<em class="badge live" title={livePayload.live.streamerName ?? 'Live'}>● LIVE{livePayload.live.streamerName ? ` · ${livePayload.live.streamerName}` : ''}</em>
								{:else}
									<em class="badge replay">Replay</em>
								{/if}
							{/if}
						{/if}
					</span>
					<span class="track big">{trackText()}</span>
					{#if !mediaMode}
						{#if showLink}
							<a class="showlink" href={`/shows/${showLink.id}`}>On air: {showLink.title}</a>
						{:else if livePayload?.next}
							<span class="track muted">
								Up next: {livePayload.next.title} · {fmtDt(livePayload.next.date)} {fmtTime(livePayload.next.startMinutes)}
							</span>
						{/if}
					{:else}
						<span class="track muted">From the show archive</span>
					{/if}
				</div>
				<div class="sheet-controls">
					<button
						class="chev"
						onclick={() => (expanded = false)}
						aria-label="Collapse player"
						title="Minimise"
					>
						▾
					</button>
					<div class="sheet-controls-right">
					{#if !mediaMode}
						<button
							class="badge autoplay"
							class:off={!autoplayOn}
							onclick={() => ($autoplay = !$autoplay)}
							title="Autoplay: {autoplayOn ? 'on — starts the stream when you open the site' : 'off — press play to listen'}"
							aria-pressed={autoplayOn}
						>
							Autoplay{#if !autoplayOn} off{/if}
						</button>
					{/if}
					<button class="icon-btn" onclick={toggleFavourite} title="Favourite (coming soon)" aria-label="Favourite">
						<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
							<path
								d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
					<button class="icon-btn" onclick={shareTrack} title="Share (coming soon)" aria-label="Share">
						<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
							<path
								d="M12 3v12M8 7l4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
					{#if mediaMode}
						<button class="live-btn" onclick={requestPlay}>Back to live</button>
					{/if}
					<button class="play big" onclick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
						{#if playing}
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0zM15 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0z" fill="currentColor" /></svg>
						{:else}
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" /></svg>
						{/if}
					</button>
					</div>
				</div>
			</div>
		</section>

	<div class="player-bar" class:out={expanded}>
		<button
			class="chev"
			onclick={() => (expanded = !expanded)}
			aria-controls="player-sheet"
			aria-expanded={expanded}
			aria-label={expanded ? 'Minimise player' : 'Maximise player'}
			title={expanded ? 'Minimise' : 'Maximise'}
		>
			{expanded ? '▾' : '▴'}
		</button>
		<div class="brand">
			{#if media?.art ?? livePayload?.nowPlaying?.art}
				<img
					class="art"
					src={media?.art ?? livePayload?.nowPlaying?.art ?? ''}
					alt=""
					width="32"
					height="32"
					loading="lazy"
				/>
			{:else}
				<span class="eq" class:playing={playing} aria-hidden="true">
					<i></i><i></i><i></i><i></i>
				</span>
			{/if}
			<div class="meta">
				<span class="track" class:muted={!media && !livePayload?.nowPlaying?.title}>{trackText()}</span>
				{#if !mediaMode && showLink}
					<a class="showlink" href={`/shows/${showLink.id}`}>On air: {showLink.title}</a>
				{/if}
			</div>
		</div>

		<div class="controls">
			{#if mediaMode}
				<button class="live-btn" onclick={requestPlay}>Back to live</button>
			{/if}
			<button class="play" onclick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
				{#if playing}
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0zM15 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0z" fill="currentColor" /></svg>
				{:else}
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" /></svg>
				{/if}
			</button>
		</div>
	</div>
</div>

<style>
	.dock {
		position: fixed;
		left: 0;
		right: 0;
		top: 57px;
		bottom: 0;
		z-index: 30;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}

	.dock {
		pointer-events: none;
	}

	.player-bar {
		pointer-events: auto;
		transform: translateY(0);
		transition: transform 900ms cubic-bezier(0.33, 1, 0.68, 1);
		transition-delay: 400ms;
	}

	.player-bar.out {
		transform: translateY(100%);
		transition-delay: 0ms;
	}

	.sheet {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		overflow: hidden;
		background: var(--vr-surface);
		border-top: 1px solid var(--vr-border);
		pointer-events: none;
		transform: translateY(100%);
		transition: transform 800ms cubic-bezier(0.33, 1, 0.68, 1);
	}

	.sheet.open {
		transform: translateY(0);
		pointer-events: auto;
		transition-duration: 550ms;
		transition-delay: 200ms;
	}

	.strip {
		min-height: 0;
		display: grid;
		place-items: center;
		padding: 1.25rem;
	}

	.strip-img {
		aspect-ratio: 1;
		width: 100%;
		max-width: min(100%, 64vh);
		max-height: 100%;
		object-fit: cover;
		border-radius: 8px;
		display: block;
	}

	.eq.big {
		width: 40px;
		height: 40px;
	}

	.eq.big i {
		width: 5px;
	}

	.sheet-body {
		background: var(--vr-surface-raised);
		border-top: 1px solid var(--vr-border);
		padding: 1rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 1rem;
	}

	.sheet-info {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 0;
		flex: 1;
	}

	.sheet-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.sheet-controls-right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.player-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.6rem 1.25rem calc(0.6rem + env(safe-area-inset-bottom));
		background: color-mix(in srgb, var(--vr-surface-raised) 92%, transparent);
		backdrop-filter: blur(10px);
		border-top: 1px solid var(--vr-border);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.art {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		object-fit: cover;
		border: 1px solid var(--vr-border);
		flex-shrink: 0;
	}

	.meta {
		display: flex;
		flex-direction: column;
		line-height: 1.25;
		min-width: 0;
	}

	.station {
		font-weight: 700;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.playtime {
		font-variant-numeric: tabular-nums;
	}

	.badge {
		font-style: normal;
		font-family: inherit;
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.badge.live {
		background: rgba(255, 77, 109, 0.15);
		border: 1px solid rgba(255, 77, 109, 0.5);
		color: #ff8098;
		animation: pulse 2s ease-in-out infinite;
	}

	.badge.replay {
		background: var(--vr-surface-raised);
		border: 1px solid var(--vr-border);
		color: var(--vr-muted);
	}

	.badge.autoplay {
		background: rgba(16, 185, 129, 0.12);
		border: 1px solid rgba(16, 185, 129, 0.45);
		color: #6ee7b7;
		cursor: pointer;
	}

	.badge.autoplay.off {
		background: var(--vr-surface-raised);
		border-color: var(--vr-border);
		color: var(--vr-muted);
	}

	.badge.autoplay:hover {
		border-color: currentColor;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.55;
		}
	}

	.track {
		font-size: 0.85rem;
		color: var(--vr-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 36rem;
	}

	.track.big {
		font-size: 1.05rem;
		font-weight: 600;
		white-space: normal;
		max-width: 44rem;
	}

	.track.muted {
		color: var(--vr-muted);
	}

	.showlink {
		font-size: 0.78rem;
		color: var(--vr-accent-strong);
		text-decoration: none;
		max-width: 24rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.showlink:hover {
		text-decoration: underline;
	}

	.eq {
		display: inline-flex;
		align-items: flex-end;
		gap: 2px;
		height: 18px;
		width: 18px;
	}

	.eq i {
		width: 3px;
		border-radius: 2px;
		background: var(--vr-muted);
		height: 4px;
	}

	.eq.playing i {
		background: var(--vr-accent-strong);
		animation: eq 0.9s ease-in-out infinite;
	}

	.eq.playing i:nth-child(2) {
		animation-delay: 0.15s;
	}

	.eq.playing i:nth-child(3) {
		animation-delay: 0.3s;
	}

	.eq.playing i:nth-child(4) {
		animation-delay: 0.45s;
	}

	@keyframes eq {
		0%,
		100% {
			height: 4px;
		}
		50% {
			height: 16px;
		}
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.chev {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 8px;
		border: 1px solid var(--vr-border);
		background: var(--vr-surface);
		color: var(--vr-muted);
		font-size: 0.9rem;
		cursor: pointer;
	}

	.chev:hover {
		color: var(--vr-text);
		border-color: var(--vr-accent);
	}

	.icon-btn {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: 1px solid var(--vr-border);
		background: var(--vr-surface);
		color: var(--vr-muted);
		cursor: pointer;
	}

	.icon-btn:hover {
		color: var(--vr-text);
		border-color: var(--vr-accent);
	}

	.live-btn {
		border: 1px solid var(--vr-border);
		background: var(--vr-surface);
		color: var(--vr-accent-strong);
		border-radius: 8px;
		padding: 0.3rem 0.7rem;
		font-size: 0.8rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.play {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: none;
		background: var(--vr-accent);
		color: #fff;
		cursor: pointer;
	}

	.play svg {
		width: 18px;
		height: 18px;
		display: block;
		margin-left: 1px;
	}

	.play.big {
		width: 52px;
		height: 52px;
	}

	.play.big svg {
		width: 22px;
		height: 22px;
	}
</style>
