<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { playerRequest } from '$lib/stores/player';

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

	$effect(() => {
		// React to a requestPlay() signal from anywhere in the app.
		$playerRequest.n;
		if (audioEl) togglePlay();
	});

	$effect(() => {
		if (audioEl) audioEl.volume = volume;
	});

	function variantName(bitrate: number) {
		return QUALITY_NAMES[bitrate] ?? `${Math.round(bitrate / 1000)} kbps`;
	}

	/** Lazy-load hls.js on first playback so it isn't in the initial bundle. */
	async function ensureEngine() {
		if (HlsCtor || nativeHls || !audioEl) return;
		const mod = await import('hls.js');
		HlsCtor = mod.default;

		if (HlsCtor.isSupported()) {
			hls = new HlsCtor({ enableWorker: true, maxBufferLength: 30 });
			hls.loadSource(STREAM_URL);
			hls.attachMedia(audioEl);

			hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
				levels = hls!.levels.map((l) => ({ bitrate: l.bitrate }));
			});

			hls.on(HlsCtor.Events.ERROR, (_evt, data) => {
				if (!data.fatal) return;
				if (data.type === HlsCtor!.ErrorTypes.NETWORK_ERROR) {
					hls?.startLoad();
				} else if (data.type === HlsCtor!.ErrorTypes.MEDIA_ERROR) {
					hls?.recoverMediaError();
				} else {
					setTimeout(() => hls?.startLoad(), 3000);
				}
			});
		} else if (audioEl.canPlayType('application/vnd.apple.mpegurl')) {
			// Native HLS (Safari): no per-variant control.
			nativeHls = true;
			audioEl.src = STREAM_URL;
		}
	}

	async function togglePlay() {
		if (!audioEl) return;
		await ensureEngine();
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
		if (audioEl) {
			audioEl.addEventListener('play', () => (playing = true));
			audioEl.addEventListener('pause', () => (playing = false));
		}
	});

	onDestroy(() => {
		hls?.destroy();
	});
</script>

<audio bind:this={audioEl} preload="none"></audio>

<div class="player-bar">
	<div class="brand">
		<span class="eq" class:playing={playing} aria-hidden="true">
			<i></i><i></i><i></i><i></i>
		</span>
		<div class="meta">
			<span class="station">Version Radio</span>
			<span class="status">{playing ? 'Now playing' : 'Paused'}</span>
		</div>
	</div>

	<div class="controls">
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

	.meta {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}

	.station {
		font-weight: 700;
	}

	.status {
		font-size: 0.75rem;
		color: var(--vr-muted);
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
