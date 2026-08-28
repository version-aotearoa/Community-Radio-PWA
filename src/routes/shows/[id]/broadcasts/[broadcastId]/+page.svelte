<script lang="ts">
	import { playback, playMedia, requestTogglePlay, streamPlaying } from '$lib/stores/player';
	import { replayArtFromUrl } from '$lib/azuracast';

	let { data } = $props();

	const show = $derived(data.show);
	const broadcast = $derived(data.broadcast);
	const tracks = $derived(data.tracks);

	function fmtDate(dateStr: string) {
		return new Intl.DateTimeFormat('en-NZ', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(`${dateStr}T00:00:00Z`));
	}

	function fmtTime(mins: number) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	function hostOf(url: string) {
		try {
			return new URL(url).hostname;
		} catch {
			return url;
		}
	}

	/** Smallest v2 Bandcamp bar: square artwork, play, title, track link — no buy/share/tracklist. */
	function bandcampEmbed(t: { embed_id: string | null; album_id?: string | null }) {
		if (t.album_id) {
			return `https://bandcamp.com/EmbeddedPlayer/v=2/album=${t.album_id}/size=small/bgcol=141313/linkcol=ffffff/track=${t.embed_id}/transparent=true/`;
		}
		return `https://bandcamp.com/EmbeddedPlayer/v=2/track=${t.embed_id}/size=small/bgcol=141313/linkcol=ffffff/transparent=true/`;
	}

	function toggleReplay() {
		if (!broadcast.replay_url) return;
		if (replayActive()) {
			requestTogglePlay();
			return;
		}
		playMedia({
			url: broadcast.replay_url,
			title: `${show.title} — ${fmtDate(broadcast.date)}`,
			artist: show.dj_name ?? null,
			art: replayArtFromUrl(broadcast.replay_url)
		});
	}

	function replayActive(): boolean {
		const url = broadcast.replay_url;
		if (!url) return false;
		const current = $playback;
		return current.kind === 'media' && current.url === url && $streamPlaying;
	}
</script>

<svelte:head>
	<title>{show.title} — {fmtDate(broadcast.date)} — Version Radio</title>
</svelte:head>

<div class="page">
<a class="back mono" href={`/shows/${show.id}`}>← {show.title}</a>

<h1 class="h-lg">{show.title}</h1>
<p class="meta mono">
	<strong>{fmtDate(broadcast.date)}</strong>
	· {fmtTime(broadcast.start_minutes)}–{fmtTime(
		broadcast.start_minutes + broadcast.duration_minutes
	)}
	{#if show.dj_name}· with {show.dj_name}{/if}
</p>

<section class="card">
	{#if broadcast.replay_url}
		<div class="replay">
			{#if replayArtFromUrl(broadcast.replay_url)}
				<img
					class="replay-art"
					src={replayArtFromUrl(broadcast.replay_url) ?? ''}
					alt=""
					width="40"
					height="40"
					loading="lazy"
				/>
			{/if}
			<button class="replay-btn" class:playing={replayActive()} onclick={toggleReplay}>
				{#if replayActive()}
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0zM15 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0z" fill="currentColor" /></svg>
					Pause
				{:else}
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" /></svg>
					Replay
				{/if}
			</button>
		</div>
	{/if}
	<h2>Tracklist</h2>
	{#if tracks.length}
		<ol class="tracklist">
			{#each tracks as t, i (t.id)}
				{#if t.embed_id}
					<li class="embed-row">
						<iframe
							class="bc-embed"
							src={bandcampEmbed(t)}
							title={`Play ${t.title} on Bandcamp`}
							height="100"
							loading="lazy"
						></iframe>
					</li>
				{:else}
					<li>
						<span class="num">{i + 1}</span>
						{#if t.title}
							<span class="track-title">{t.title}</span>
							{#if t.artist}<span class="artist">{t.artist}</span>{/if}
							{#if t.album}<span class="album">{t.album}</span>{/if}
						{:else if t.url}
							<a class="url-fallback" href={t.url} target="_blank" rel="noopener noreferrer">
								{hostOf(t.url)} ↗
							</a>
						{/if}
					</li>
				{/if}
			{/each}
		</ol>
	{:else}
		<p class="hint">No tracklist for this broadcast.</p>
	{/if}
</section>
</div>

<style>
	.page {
		padding: 2rem;
		max-width: 56rem;
	}

	.back {
		display: inline-block;
		color: var(--vr-muted);
		text-decoration: none;
		font-size: 0.82rem;
		margin-bottom: 1rem;
	}

	.back:hover {
		color: var(--vr-text);
		text-decoration: underline;
	}

	.meta {
		color: var(--vr-muted);
		margin: 0.75rem 0 1.75rem;
	}

	.card {
		border: 1px solid var(--vr-line);
		background: var(--vr-surface);
		padding: 1.25rem 1.5rem;
	}

	.card h2 {
		font-family: var(--vr-font-mono);
		font-size: 0.82rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		margin: 0 0 1rem;
		border-bottom: 1px solid var(--vr-line);
		padding-bottom: 0.6rem;
	}

	.tracklist {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.tracklist li {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		padding: 0.45rem 0;
		border-bottom: 1px solid var(--vr-line-muted);
		font-size: 0.95rem;
	}

	.tracklist li:last-child {
		border-bottom: none;
	}

	.num {
		color: var(--vr-faint);
		font-family: var(--vr-font-mono);
		font-size: 0.78rem;
		width: 1.5rem;
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
	}

	.artist,
	.album {
		color: var(--vr-muted);
		font-size: 0.85rem;
	}

	.url-fallback {
		color: var(--vr-text);
		text-decoration: underline;
		font-size: 0.9rem;
	}

	.embed-row {
		padding: 0.85rem 0;
	}

	.bc-embed {
		width: 100%;
		max-width: 700px;
		height: 100px;
		border: 0;
		display: block;
		margin-top: 0;
	}

	.hint {
		color: var(--vr-muted);
	}

	.replay {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.25rem;
	}

	.replay-art {
		width: 40px;
		height: 40px;
		object-fit: cover;
		border: 1px solid var(--vr-line-muted);
	}

	.replay-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border: 1px solid var(--vr-line);
		background: transparent;
		color: var(--vr-text);
		font-family: var(--vr-font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0.35rem 0.9rem;
		cursor: pointer;
	}

	.replay-btn svg {
		width: 13px;
		height: 13px;
		display: block;
		margin-top: 1px;
		flex-shrink: 0;
	}

	.replay-btn:hover {
		background: var(--vr-text);
		color: var(--vr-black);
	}

	.replay-btn.playing {
		background: var(--vr-text);
		color: var(--vr-black);
	}
</style>
