<script lang="ts">
	import { playMedia } from '$lib/stores/player';
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

	/** Compact Bandcamp bar: album-scoped track embed (no buy/share/tracklist). */
	function bandcampEmbed(t: { embed_id: string | null; album_id?: string | null }) {
		if (t.album_id) {
			return `https://bandcamp.com/EmbeddedPlayer/album=${t.album_id}/size=small/bgcol=333333/linkcol=0f91ff/track=${t.embed_id}/transparent=true/`;
		}
		return `https://bandcamp.com/EmbeddedPlayer/track=${t.embed_id}/size=large/tracklist=false/artwork=small/transparent=true/`;
	}

	function playReplay() {
		if (!broadcast.replay_url) return;
		playMedia({
			url: broadcast.replay_url,
			title: `${show.title} — ${fmtDate(broadcast.date)}`,
			artist: show.dj_name ?? null,
			art: replayArtFromUrl(broadcast.replay_url)
		});
	}
</script>

<svelte:head>
	<title>{show.title} — {fmtDate(broadcast.date)} — Version Radio</title>
</svelte:head>

<a class="back" href={`/shows/${show.id}`}>← {show.title}</a>

<h1 class="page-title">{show.title}</h1>
<p class="meta">
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
			<button class="replay-btn" onclick={playReplay}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" /></svg>
				Replay
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
							height="42"
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

<style>
	.back {
		display: inline-block;
		color: var(--vr-accent-strong);
		text-decoration: none;
		font-size: 0.9rem;
		margin-bottom: 0.75rem;
	}

	.back:hover {
		text-decoration: underline;
	}

	.page-title {
		font-size: 1.6rem;
		margin: 0 0 0.35rem;
	}

	.meta {
		color: var(--vr-muted);
		margin: 0 0 1.5rem;
		font-size: 0.95rem;
	}

	.card {
		border: 1px solid var(--vr-border);
		border-radius: 14px;
		background: var(--vr-surface);
		padding: 1.25rem 1.5rem;
	}

	.card h2 {
		font-size: 1.1rem;
		margin: 1.25rem 0 1rem;
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
		border-bottom: 1px solid var(--vr-border);
		font-size: 0.95rem;
	}

	.tracklist li:last-child {
		border-bottom: none;
	}

	.num {
		color: var(--vr-muted);
		font-size: 0.8rem;
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
		color: var(--vr-accent-strong);
		text-decoration: none;
		font-size: 0.9rem;
	}

	.url-fallback:hover {
		text-decoration: underline;
	}

	.embed-row {
		padding: 0.85rem 0;
	}

	.bc-embed {
		width: 100%;
		max-width: 700px;
		height: 42px;
		border: 0;
		border-radius: 6px;
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
		margin-top: 0;
		padding-top: 0;
		border-top: none;
	}

	.replay-art {
		width: 40px;
		height: 40px;
		border-radius: 8px;
		object-fit: cover;
		border: 1px solid var(--vr-border);
	}

	.replay-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border: 1px solid var(--vr-accent);
		background: none;
		color: var(--vr-accent-strong);
		border-radius: 999px;
		padding: 0.35rem 0.9rem;
		font-size: 0.85rem;
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
		background: color-mix(in srgb, var(--vr-accent) 12%, transparent);
	}
</style>
