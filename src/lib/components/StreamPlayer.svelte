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
	let loading = $state(false);
	let expanded = $state(false);
	let currentTime = $state(0);
	let duration = $state(NaN);

	const livePayload = $derived($live);
	const media = $derived($playback.kind === 'media' ? $playback : null);
	const mediaMode = $derived(media !== null);
	const autoplayOn = $derived($autoplay);

	const artSource = $derived(media?.art ?? livePayload?.nowPlaying?.art ?? livePayload?.onAir?.djImage ?? '');
	const isLive = $derived(!mediaMode && livePayload?.live.isLive === true);
	const showLink = $derived(livePayload?.trackShow ?? livePayload?.onAir ?? null);

	const stationSticker = $derived(mediaMode ? 'Archive' : isLive ? 'Live now' : 'Replay');

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

	let prevKey = 'live';

	$effect(() => {
		const p = $playback;
		const key = p.kind === 'media' ? `media:${p.url}` : 'live';
		if (key === prevKey) return;
		prevKey = key;
		currentTime = 0;
		duration = NaN;
		if (!audioEl) return;
		if (p.kind === 'media') {
			stopLive();
			audioEl.src = p.url;
			loading = true;
			audioEl.play().catch(() => {});
		} else {
			stopMedia();
			initLiveEngine();
			loading = true;
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
				loading = true;
				await audioEl.play().catch(() => {});
			} else {
				audioEl.pause();
			}
			return;
		}
		await initLiveEngine();
		if (audioEl.paused) {
			loading = true;
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
			audioEl.addEventListener('playing', () => (loading = false));
			audioEl.addEventListener('canplay', () => (loading = false));
			audioEl.addEventListener('waiting', () => (loading = true));
			audioEl.addEventListener('stalled', () => (loading = true));
			audioEl.addEventListener('loadstart', () => (loading = true));
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

	// ---- Player actions: follow (show) + episode bookmark + native share ----

	const user = $derived(page.data.user);

	/** Show context for save/share: archive episode first, then on-air show. */
	const shareContext = $derived(
		media?.href
			? { href: media.href, id: media?.show?.id ?? null, title: (media?.show?.title ?? media.title).replace(' — ', ' · ') }
			: showLink
				? { href: `/shows/${showLink.id}`, id: showLink.id, title: showLink.title }
				: { href: location.href, id: null, title: 'Version Radio' }
	);

	const showId = $derived(media?.show?.id ?? showLink?.id ?? null);
	const broadcastId = $derived(mediaMode ? (media?.broadcastId ?? null) : null);

	let followed = $state(false);
	let episodeSaved = $state(false);
	let loginHint = $state(false);
	let hintKind = $state<'follow' | 'save'>('follow');
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		followed = false;
		episodeSaved = false;
		loginHint = false;
		if (!user) return;
		let cancelled = false;
		if (showId) {
			fetch(`/api/shows/${showId}/follow`)
				.then((r) => (r.status === 401 ? null : r.json() as Promise<{ following: boolean }>))
				.then((d) => {
					if (!cancelled && d) followed = d.following;
				})
				.catch(() => {});
		}
		if (broadcastId) {
			fetch(`/api/shows/${showId}/broadcasts/${broadcastId}/saved`)
				.then((r) => (r.status === 401 ? null : r.json() as Promise<{ saved: boolean }>))
				.then((d) => {
					if (!cancelled && d) episodeSaved = d.saved;
				})
				.catch(() => {});
		}
		return () => {
			cancelled = true;
		};
	});

	async function togglePlayerFollow() {
		if (!showId) return;
		if (!user) {
			hintKind = 'follow';
			loginHint = true;
			return;
		}
		loginHint = false;
		const prev = followed;
		followed = !followed;
		const res = await fetch(`/api/shows/${showId}/follow`, { method: 'POST' });
		if (res.status === 401) {
			followed = prev;
			hintKind = 'follow';
			loginHint = true;
			return;
		}
		if (!res.ok) followed = prev;
	}

	async function togglePlayerEpisodeSaved() {
		if (!showId || !broadcastId) return;
		if (!user) {
			hintKind = 'save';
			loginHint = true;
			return;
		}
		loginHint = false;
		const prev = episodeSaved;
		episodeSaved = !episodeSaved;
		const res = await fetch(`/api/shows/${showId}/broadcasts/${broadcastId}/saved`, {
			method: 'POST'
		});
		if (res.status === 401) {
			episodeSaved = prev;
			hintKind = 'save';
			loginHint = true;
			return;
		}
		if (!res.ok) episodeSaved = prev;
	}

	async function shareTrack() {
		const { href, title } = shareContext;
		const url = new URL(href, location.origin).href;
		if (navigator.share) {
			try {
				await navigator.share({ title: `${title} — Version Radio`, url });
			} catch {
				// cancelled — no-op
			}
			return;
		}
		try {
			await navigator.clipboard.writeText(url);
		} catch {
			return;
		}
		copied = true;
		if (copyTimer) clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = false), 1600);
	}

	onDestroy(() => {
		if (copyTimer) clearTimeout(copyTimer);
	});
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
				<div class="sheet-station mono">
					<span class="sticker" class:green={isLive} class:dark={!isLive && !mediaMode}>
						{#if isLive}
							<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
								<path d="M2 12h2.5M4.5 8a5.5 5.5 0 0 1 0 8M8 9a3.5 3.5 0 0 1 0 6M19.5 12H22M15 8a5.5 5.5 0 0 1 0 8M12 9a3.5 3.5 0 0 1 0 6" stroke="currentColor" stroke-width="1.6" fill="none"/>
							</svg>
						{/if}
						{stationSticker}
					</span>
					<span class="station-name">
						{#if mediaMode}
							Recording · {fmtClock(currentTime)} / {Number.isFinite(duration) ? fmtClock(duration) : '--:--'}
						{/if}
					</span>
				</div>
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
					{#if media?.show}
						<a class="showlink mono" href={`/shows/${media.show.id}`}>{media.show.title} →</a>
					{/if}
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
					{#if !mediaMode && !playing}
						<button class="live-btn" onclick={requestPlay}>Listen live</button>
					{/if}
					{#if !mediaMode}
						<button
							class="autoplay-switch"
							role="switch"
							aria-checked={autoplayOn}
							onclick={() => ($autoplay = !$autoplay)}
							title="Autoplay: {autoplayOn ? 'on — starts the stream when you open the site' : 'off — press play to listen'}"
							type="button"
						>
							<span class="switch-label mono">Autoplay</span>
							<span class="switch-track" class:on={autoplayOn} aria-hidden="true">
								<span class="switch-knob"></span>
							</span>
						</button>
					{/if}
					{#if showId && !broadcastId}
						<button
							class="icon-btn"
							class:active={followed}
							onclick={togglePlayerFollow}
							aria-pressed={followed}
							aria-label={followed ? 'Unfollow show' : 'Follow show'}
							title={followed ? 'Unfollow show' : 'Follow show'}
						>
							<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
								<path
									d="M12 3a6 6 0 0 1 6 6v3l1.6 2.6a.6.6 0 0 1-.5.9H4.9a.6.6 0 0 1-.5-.9L6 12V9a6 6 0 0 1 6-6zM10 17.5a2 2 0 0 0 4 0"
									fill={followed ? 'currentColor' : 'none'}
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</button>
					{/if}
					{#if broadcastId}
						<button
							class="icon-btn"
							class:active={episodeSaved}
							onclick={togglePlayerEpisodeSaved}
							aria-pressed={episodeSaved}
							aria-label={episodeSaved ? 'Remove bookmark' : 'Bookmark broadcast'}
							title={episodeSaved ? 'Remove bookmark' : 'Bookmark broadcast'}
						>
							<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
								<path
									d="M6 4.5v15l6-4.5 6 4.5v-15a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"
									fill={episodeSaved ? 'currentColor' : 'none'}
									stroke="currentColor"
									stroke-width="1.8"
									stroke-linejoin="round"
								/>
							</svg>
						</button>
					{/if}
					<button class="icon-btn" onclick={shareTrack} aria-label="Share" title="Share">
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
						{#if loading}
							<svg class="trace" viewBox="0 0 24 24" aria-hidden="true">
								<path
									class="trace-path"
									pathLength="100"
									d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linejoin="round"
								/>
							</svg>
						{:else if playing}
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0zM15 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0z" fill="currentColor" /></svg>
						{:else}
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" /></svg>
						{/if}
					</button>
				</div>
			</div>
			{#if loginHint || copied}
				<div class="sheet-note">
					{#if loginHint}
						<span class="mono">
							{hintKind === 'follow' ? 'Sign in to follow shows' : 'Sign in to save broadcasts'} — <a class="note-link" href="/login">Sign in</a>
						</span>
					{:else}
						<span class="mono note-copied">Copied</span>
					{/if}
				</div>
			{/if}
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
		<span class="bar-sticker mono" class:green={isLive} class:dark={!isLive && !mediaMode}>
			{stationSticker}
		</span>
		<div class="bar-meta">
			{#if artSource}
				<img class="art" src={artSource} alt="" width="28" height="28" loading="lazy" />
			{:else}
				<span class="eq" class:playing={playing} aria-hidden="true">
					<i></i><i></i><i></i><i></i>
				</span>
			{/if}
			<div class="meta">
				<span class="track mono" class:muted={!media && !livePayload?.nowPlaying?.title}>{trackText()}</span>
				{#if !mediaMode}
					{#if showLink}
						<a class="showlink mono" href={`/shows/${showLink.id}`}>On air: {showLink.title}</a>
					{:else if livePayload?.next}
						<span class="showlink mono">Up next: {livePayload.next.title}</span>
					{:else if livePayload?.live?.streamerName}
						<span class="showlink mono">{livePayload.live.streamerName}</span>
					{/if}
				{:else}
					<span class="showlink mono">Archive</span>
				{/if}
			</div>
		</div>

		<div class="controls">
			{#if mediaMode}
				<button class="live-btn" onclick={requestPlay}>Back to live</button>
			{/if}
			<button class="play" onclick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
				{#if loading}
					<svg class="trace" viewBox="0 0 24 24" aria-hidden="true">
						<path
							class="trace-path"
							pathLength="100"
							d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linejoin="round"
						/>
					</svg>
				{:else if playing}
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
		pointer-events: none;
	}

	.player-bar {
		pointer-events: auto;
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		gap: 0;
		height: 64px;
		background: var(--vr-surface);
		border-top: 1px solid var(--vr-line);
		transform: translateY(0);
		transition: transform 900ms cubic-bezier(0.33, 1, 0.68, 1);
		transition-delay: 400ms;
	}

	.player-bar.out {
		transform: translateY(100%);
		transition-delay: 0ms;
	}

	.bar-sticker {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 1rem;
		font-family: var(--vr-font-mono);
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #000;
		background: var(--vr-green);
		white-space: nowrap;
	}

	.bar-sticker.dark {
		background: #000;
		color: #fff;
		border-right: 1px solid #fff;
	}

	.bar-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
		flex: 1;
		padding: 0 1rem;
	}

	.art {
		width: 28px;
		height: 28px;
		object-fit: cover;
		border: 1px solid var(--vr-line-muted);
		flex-shrink: 0;
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		line-height: 1.2;
		min-width: 0;
	}

	.track {
		font-size: 0.72rem;
		color: var(--vr-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 36rem;
	}

	.track.big {
		font-size: 1.35rem;
		font-family: var(--vr-font-headline);
		text-transform: uppercase;
		line-height: 1.15;
		font-weight: 400;
		white-space: normal;
		max-width: 44rem;
	}

	.track.muted {
		color: var(--vr-muted);
	}

	.showlink {
		font-size: 0.72rem;
		color: var(--vr-green);
		text-decoration: none;
		max-width: 24rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sheet .showlink {
		color: var(--vr-muted);
	}

	.showlink:hover {
		text-decoration: underline;
	}

	.eq {
		display: inline-flex;
		align-items: flex-end;
		gap: 2px;
		height: 16px;
		width: 16px;
	}

	.eq i {
		width: 3px;
		background: var(--vr-muted);
		height: 4px;
	}

	.eq.playing i {
		background: var(--vr-green);
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
			height: 14px;
		}
	}

	.eq.big {
		width: 44px;
		height: 44px;
		gap: 4px;
	}

	.eq.big i {
		width: 6px;
		background: var(--vr-faint);
	}

	.eq.big.playing i {
		background: var(--vr-green);
	}

	.controls {
		display: flex;
		align-items: stretch;
		gap: 0;
	}

	.chev {
		width: 38px;
		border: none;
		border-right: 1px solid var(--vr-line-muted);
		background: transparent;
		color: var(--vr-muted);
		font-size: 0.9rem;
		cursor: pointer;
	}

	.chev:hover {
		background: var(--vr-text);
		color: var(--vr-black);
	}

	.sheet .chev {
		width: 40px;
		height: 40px;
		border: 1px solid var(--vr-line);
		display: grid;
		place-items: center;
	}

	.icon-btn {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border: 1px solid var(--vr-line);
		background: transparent;
		color: var(--vr-muted);
		cursor: pointer;
	}

	.icon-btn:hover {
		background: var(--vr-text);
		color: var(--vr-black);
	}

	.icon-btn.active {
		border-color: var(--vr-line);
		color: var(--vr-text);
	}

	.sheet-note {
		border-top: 1px solid var(--vr-line-muted);
		padding: 0.6rem 0 0;
		margin-top: 0.15rem;
	}

	.sheet-note .mono {
		font-size: 0.78rem;
		color: var(--vr-muted);
	}

	.note-link {
		color: var(--vr-text);
		text-decoration: underline;
		font-weight: 600;
	}

	.note-copied {
		color: var(--vr-green);
	}

	.autoplay-switch {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		border: none;
		background: transparent;
		color: var(--vr-muted);
		padding: 0.35rem 0;
		cursor: pointer;
	}

	.switch-label {
		font-size: 0.72rem;
		color: var(--vr-faint);
	}

	.switch-track {
		position: relative;
		display: inline-block;
		width: 34px;
		height: 18px;
		flex-shrink: 0;
		border: 1px solid var(--vr-line-muted);
		background: transparent;
		transition: background-color 150ms, border-color 150ms;
	}

	.switch-track .switch-knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 12px;
		height: 12px;
		background: var(--vr-faint);
		transition: transform 150ms, background-color 150ms;
	}

	.switch-track.on {
		border-color: var(--vr-line);
		background: var(--vr-text);
	}

	.switch-track.on .switch-knob {
		transform: translateX(16px);
		background: var(--vr-black);
	}

	.autoplay-switch:hover .switch-track {
		border-color: var(--vr-line);
	}

	.autoplay-switch:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--vr-bg), 0 0 0 3px var(--vr-line);
	}

	.live-btn {
		border: none;
		border-left: 1px solid var(--vr-line-muted);
		background: transparent;
		color: var(--vr-muted);
		font-family: var(--vr-font-mono);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0 1rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.live-btn:hover {
		background: var(--vr-text);
		color: var(--vr-black);
	}

	.play {
		display: grid;
		place-items: center;
		width: 64px;
		border: none;
		border-left: 1px solid var(--vr-line);
		background: transparent;
		color: var(--vr-text);
		cursor: pointer;
		transition: background-color 150ms, color 150ms;
	}

	.play:hover {
		background: var(--vr-text);
		color: var(--vr-black);
	}

	.play svg {
		width: 22px;
		height: 22px;
		display: block;
		margin-left: 1px;
	}

	.play svg.trace .trace-path {
		stroke-dasharray: 34 66;
		animation: trace-loop 1.8s linear infinite;
	}

	.play.big svg.trace .trace-path {
		animation-duration: 1.6s;
	}

	@keyframes trace-loop {
		from {
			stroke-dashoffset: 0;
		}
		to {
			stroke-dashoffset: 100;
		}
	}

	.play.big {
		width: 52px;
		height: 52px;
		border: 1px solid #fff;
		background: #fff;
		color: #000;
	}

	.play.big:hover {
		background: #000;
		color: #fff;
	}

	.play.big svg {
		width: 24px;
		height: 24px;
	}

	.sheet {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		overflow: hidden;
		background: var(--vr-bg);
		border-top: 1px solid var(--vr-line);
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
		display: block;
		border: 1px solid var(--vr-line);
	}

	.sheet-body {
		background: var(--vr-surface);
		border-top: 1px solid var(--vr-line);
		padding: 1.25rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 1.25rem;
	}

	.sheet-info {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		min-width: 0;
		flex: 1;
	}

	.sheet-station {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sheet-station .sticker {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.sheet-station .sticker.green {
		background: var(--vr-green);
		color: #000;
	}

	.sheet-station .sticker.dark {
		background: #000;
		color: #fff;
		border: 1px solid #fff;
	}

	.station-name {
		color: var(--vr-faint);
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

	@media (max-width: 720px) {
		.bar-sticker {
			padding: 0 0.7rem;
		}

		.bar-meta {
			padding: 0 0.7rem;
			overflow: hidden;
		}

		.art {
			display: none;
		}

		.live-btn {
			display: none;
		}
	}
</style>
