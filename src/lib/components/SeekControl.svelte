<script lang="ts">
	// Seek control for recordings (finite duration). Dragging uses local state so
	// `timeupdate` can't fight the thumb; the seek commits on release/change.
	let {
		currentTime,
		duration,
		onSeek,
		compact = false
	}: {
		currentTime: number;
		duration: number;
		onSeek: (sec: number) => void;
		compact?: boolean;
	} = $props();

	let scrub = $state<number | null>(null);
	const shown = $derived(scrub ?? currentTime);
	const pct = $derived(duration > 0 ? Math.min(100, Math.max(0, (shown / duration) * 100)) : 0);

	function fmtClock(secs: number): string {
		const s = Number.isFinite(secs) && secs > 0 ? Math.floor(secs) : 0;
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const r = s % 60;
		if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
		return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
	}
</script>

<div class="seek" class:compact>
	<span class="time">{fmtClock(shown)}</span>
	<input
		type="range"
		min="0"
		max={duration}
		step="1"
		value={shown}
		aria-label="Seek"
		aria-valuetext={`${fmtClock(shown)} of ${fmtClock(duration)}`}
		style={`--p:${pct}%`}
		oninput={(e) => (scrub = e.currentTarget.valueAsNumber)}
		onchange={(e) => {
			onSeek(e.currentTarget.valueAsNumber);
			scrub = null;
		}}
	/>
	<span class="time">{fmtClock(duration)}</span>
</div>

<style>
	.seek {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		min-width: 0;
	}

	.time {
		flex-shrink: 0;
		font-family: var(--vr-font-mono);
		font-size: 0.72rem;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		color: var(--vr-muted);
	}

	.compact .time {
		font-size: 0.62rem;
	}

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		flex: 1;
		min-width: 0;
		height: 16px;
		margin: 0;
		background: transparent;
		cursor: pointer;
	}

	.compact input[type='range'] {
		height: 14px;
	}

	/* Track + progress fill (WebKit) */
	input[type='range']::-webkit-slider-runnable-track {
		height: 4px;
		border: 1px solid var(--vr-line-muted);
		background: linear-gradient(
			to right,
			var(--vr-text) 0,
			var(--vr-text) var(--p),
			transparent var(--p),
			transparent 100%
		);
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		margin-top: -5px;
		background: var(--vr-text);
		border: 1px solid var(--vr-text);
	}

	.compact input[type='range']::-webkit-slider-thumb {
		width: 10px;
		height: 10px;
		margin-top: -4px;
	}

	/* Track + progress fill (Firefox) */
	input[type='range']::-moz-range-track {
		height: 4px;
		border: 1px solid var(--vr-line-muted);
		background: transparent;
	}

	input[type='range']::-moz-range-progress {
		height: 4px;
		background: var(--vr-text);
	}

	input[type='range']::-moz-range-thumb {
		width: 12px;
		height: 12px;
		background: var(--vr-text);
		border: 1px solid var(--vr-text);
		border-radius: 0;
	}

	.compact input[type='range']::-moz-range-thumb {
		width: 10px;
		height: 10px;
	}

	input[type='range']:focus-visible {
		outline: 1px solid var(--vr-text);
		outline-offset: 2px;
	}
</style>
