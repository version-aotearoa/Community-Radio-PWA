<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { playback, playerRequest, requestPlay } from '$lib/stores/player';
	import { live, startLivePolling } from '$lib/stores/live';

	const STREAM_URL = 'https://stream.version.nz/hls/version_radio/live.m3u8';
	const QUALITY_NAMES: Record<number, string> = {
		52800: 'Lo-fi',
		105600: 'Mid-fi',
		211200: 'Hi-fi',
		352000: 'High'
	};

	let audioEl: HTMLAudioElement | undefined = $state();
	let hls: import('hls.js').default | null = null;
	let HlsCtor: typeof import('hls.js').default | null = null;
	let nativeHls = $state(false);
	let playing = $state(false);
	let levels = $state<{ bitrate: number }[]>([]);
	let quality = $state(-1); // -1 = auto
	let volume = $state(0.9);

	let prevKind: 'live' | 'media' = 'live';

	const livePayload = $derived($live);
	const media = $derived($playback.kind === 'media' ? $playback : null);
	const mediaMode = $derived(media !== null);

	$effect(() => {
		// React to a requestPlay() signal from anywhere in the app.
		$playerRequest.n;
		if (!mediaMode) togglePlay();
	});

	$effect(() => {
		const p = $playback;
		if (p.kind === prevKind) return;
		prevKind = p.kind;
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

	$effect(() => {
		if (audioEl) audioEl.volume = volume;
	});

	function variantName(bitrate: number) {
		return QUALITY_NAMES[bitrate] ?? `${Math.round(bitrate / 1000)} kbps`;
	}

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
		hls?.on(Ctor.Events.MANIFEST_PARSED, () => {
			levels = hls!.levels.map((l) => ({ bitrate: l.bitrate }));
		});

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

	function setQuality(level: number) {
		quality = level;
		if (hls) hls.currentLevel = level;
	}

	onMount(() => {
		startLivePolling();
		if (audioEl) {
			audioEl.addEventListener('play', () => (playing = true));
			audioEl.addEventListener('pause', () => (playing = false));
		}
	});

	onDestroy(() => {
		hls?.destroy();
		audioEl?.pause();
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
</script>

<audio bind:this={audioEl} preload="none"></audio>

<div class="player-bar">
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
			<span class="station">
				Version Radio
				{#if mediaMode}
					<em class="badge replay">Recording</em>
				{:else if livePayload}
					{#if livePayload.live.isLive}
						<em class="badge live" title={livePayload.live.streamerName ?? 'Live'}>● LIVE{livePayload.live.streamerName ? ` · ${livePayload.live.streamerName}` : ''}</em>
					{:else}
						<em class="badge replay">Replay</em>
					{/if}
				{/if}
			</span>
			{#if media}
				<span class="track">
					{media.title}{#if media.artist} — {media.artist}{/if}
				</span>
			{:else if livePayload?.nowPlaying?.title}
				<span class="track">
					{livePayload.nowPlaying.title}{#if livePayload.nowPlaying.artist} — {livePayload.nowPlaying.artist}{/if}
				</span>
			{:else if playing}
				<span class="track muted">Now playing</span>
			{:else}
				<span class="track muted">Paused</span>
			{/if}
			{#if !mediaMode}
				{#if livePayload?.trackShow}
					<a class="showlink" href={`/shows/${livePayload.trackShow.id}`}>On air: {livePayload.trackShow.title}</a>
				{:else if livePayload?.onAir}
					<a class="showlink" href={`/shows/${livePayload.onAir.id}`}>On air: {livePayload.onAir.title}</a>
				{:else if livePayload?.next}
					<span class="track muted">Up next: {livePayload.next.title} · {fmtDt(livePayload.next.date)} {fmtTime(livePayload.next.startMinutes)}</span>
				{/if}
			{/if}
		</div>
	</div>

	<div class="controls">
		{#if mediaMode}
			<button class="live-btn" onclick={requestPlay}>Back to live</button>
		{:else}
			<select
				class="quality"
				aria-label="Stream quality"
				bind:value={quality}
				onchange={() => setQuality(quality)}
			>
				<option value="-1">Auto</option>
				{#each levels as lvl, i (i)}
					<option value={i}>{variantName(lvl.bitrate)}</option>
				{/each}
			</select>
			<label class="vol" title="Volume">
				<input type="range" min="0" max="1" step="0.05" bind:value={volume} />
			</label>
		{/if}
		<button class="play" onclick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
			{playing ? '❚❚' : '▶'}
		</button>
	</div>
</div>

<style>
	.player-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.6rem 1.25rem;
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

	.badge {
		font-style: normal;
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

	.quality {
		background: var(--vr-surface);
		color: var(--vr-text);
		border: 1px solid var(--vr-border);
		border-radius: 8px;
		padding: 0.3rem 0.5rem;
		font-size: 0.85rem;
	}

	.vol input {
		width: 80px;
		accent-color: var(--vr-accent);
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
		color: #0b0b11;
		font-size: 0.95rem;
		cursor: pointer;
	}
</style>
