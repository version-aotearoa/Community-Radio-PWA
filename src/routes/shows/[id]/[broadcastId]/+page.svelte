<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import ShowActions from '$lib/components/ShowActions.svelte';
	import { playback, playMedia, requestTogglePlay, streamPlaying } from '$lib/stores/player';
	import { replayArtFromUrl } from '$lib/azuracast';
	import Seo from '$lib/components/Seo.svelte';

	let { data } = $props();

	const show = $derived(data.show);
	const broadcast = $derived(data.broadcast);
	const tracks = $derived(data.tracks);

	// Fresh server data on every visit — the DB is the source of truth
	// (back/forward navigation can otherwise restore a stale load snapshot,
	// e.g. a saved-bookmark that was toggled then left the page).
	onMount(() => {
		// Deferred past the navigation's microtasks: an immediate invalidateAll
		// aborts the in-flight navigation before SvelteKit resets scroll to top.
		setTimeout(() => void invalidateAll(), 0);
	});

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

	/** Legacy size=small compact bar on both branches: square art, play, title, link. */
	function bandcampEmbed(t: { embed_id: string | null; album_id?: string | null }) {
		if (t.album_id) {
			return `https://bandcamp.com/EmbeddedPlayer/album=${t.album_id}/size=small/bgcol=333333/linkcol=0f91ff/track=${t.embed_id}/transparent=true/`;
		}
		return `https://bandcamp.com/EmbeddedPlayer/track=${t.embed_id}/size=small/bgcol=333333/linkcol=0f91ff/transparent=true/`;
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
			artist: show.kind === 'event' ? null : (show.dj_name ?? null),
			art: replayArtFromUrl(broadcast.replay_url),
			show: { id: show.id, title: show.title },
			href: `/shows/${show.id}/${broadcast.id}`,
			broadcastId: broadcast.id
		});
	}

	function replayActive(): boolean {
		const url = broadcast.replay_url;
		if (!url) return false;
		const current = $playback;
		return current.kind === 'media' && current.url === url && $streamPlaying;
	}

	let loginHint = $state<{ show: boolean; kind: 'follow' | 'save' } | null>(null);
</script>

<svelte:head>
	<title>{show.title} — {fmtDate(broadcast.date)} — Version Radio</title>
</svelte:head>

<Seo
	title={`${show.title} — ${fmtDate(broadcast.date)}`}
	description={show.pageContentText || show.description || undefined}
	image={replayArtFromUrl(broadcast.replay_url) ?? show.image}
	url={page.url.pathname}
/>

<div class="page">
	<div class="page-head">
		<a class="back mono" href={`/shows/${show.id}`}>← {show.title}</a>
		{#if data.canEdit}
			<a class="btn-outline" href={`/shows/${show.id}/${broadcast.id}/edit`}>Edit</a>
		{/if}
	</div>

	<h1 class="h-lg">{show.title}</h1>
	<p class="meta mono">
		<strong>{fmtDate(broadcast.date)}</strong>
		· {fmtTime(broadcast.start_minutes)}–{fmtTime(
			broadcast.start_minutes + broadcast.duration_minutes
		)}
		{#if show.dj_name && show.kind !== 'event'}· with {show.dj_name}{/if}
	</p>

<section class="card">
	<div class="replay">
		{#if broadcast.replay_url}
			{#if replayArtFromUrl(broadcast.replay_url)}
				<img
					class="replay-art"
					src={replayArtFromUrl(broadcast.replay_url) ?? ''}
					alt=""
					width="80"
					height="80"
					loading="lazy"
				/>
			{:else}
				<span class="replay-art replay-art-fallback" aria-hidden="true">
					<svg viewBox="0 0 80 70" fill="currentColor" width="36" height="31">
						<path
							fill-rule="evenodd"
							d="M0 0H40V40H50V0H80V45H70V60H55V70H25V60H10V45H0V5ZM10 5H5V40H15V55H30V65H50V55H65V40H75V5H55V45H35V5H15Z"
						/>
					</svg>
				</span>
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
		{/if}
		<ShowActions
			showId={show.id}
			showTitle={`${show.title} — ${fmtDate(broadcast.date)}`}
			followed={data.followed}
			user={data.user}
			episode={{ broadcastId: broadcast.id }}
			episodeSaved={data.savedEpisode}
			compact
			hintExternal
			onHintChange={(h) => (loginHint = h)}
		/>
		{#if loginHint?.show}
			<div class="login-hint hint-row">
				{loginHint.kind === 'follow' ? 'Sign in to follow shows' : 'Sign in to save broadcasts'} — <a class="hint-link" href="/login">Sign in</a>
			</div>
		{/if}
	</div>
	{#if broadcast.description}
		<div class="episode-desc">{@html broadcast.description}</div>
	{/if}
	<h2>Tracklist</h2>
	{#if tracks.length}
		<ol class="tracklist">
			{#each tracks as t, i (t.id)}
				{#if t.embed_id}
					<li class="embed-row">
						<span class="num">{i + 1}</span>
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
						{/if}
						{#if t.artist}
							<span class="artist">{t.artist}</span>
						{/if}
						{#if t.album}
							<span class="album">{t.album}</span>
						{/if}
						{#if t.url}
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

	.page-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.back {
		display: inline-block;
		color: var(--vr-muted);
		text-decoration: none;
		font-size: 0.82rem;
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
		margin-left: 0.5rem;
	}

	.tracklist li.embed-row {
		padding: 0;
		border-bottom: none;
		align-items: center;
	}

	.bc-embed {
		width: 100%;
		max-width: 700px;
		height: 42px;
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
		flex-wrap: wrap;
		margin-bottom: 0.25rem;
	}

	.episode-desc {
		margin: 0 0 1rem;
		color: var(--vr-muted);
		line-height: 1.55;
	}

	.episode-desc :global(p) {
		margin: 0 0 0.5rem;
	}

	.episode-desc :global(p:last-child) {
		margin-bottom: 0;
	}

	.episode-desc :global(a) {
		color: var(--vr-green);
		text-decoration: underline;
	}

	.episode-desc :global(ul),
	.episode-desc :global(ol) {
		margin: 0 0 0.5rem;
		padding-left: 1.25rem;
	}

	.episode-desc :global(h1),
	.episode-desc :global(h2),
	.episode-desc :global(h3),
	.episode-desc :global(h4) {
		color: var(--vr-text);
		margin: 0.75rem 0 0.4rem;
		font-size: 1.1rem;
	}

	.episode-desc :global(code) {
		font-family: var(--vr-font-mono);
		background: var(--vr-surface-high);
		padding: 0.1rem 0.3rem;
	}

	.episode-desc :global(pre) {
		background: var(--vr-surface-high);
		padding: 0.75rem;
		overflow-x: auto;
	}

	.episode-desc :global(blockquote) {
		margin: 0.5rem 0;
		padding-left: 0.75rem;
		border-left: 2px solid var(--vr-line);
	}

	.hint-row {
		flex-basis: 100%;
	}

	.login-hint {
		border: 1px solid var(--vr-line);
		background: var(--vr-surface-low);
		color: var(--vr-muted);
		padding: 0.5rem 0.7rem;
		font-size: 0.85rem;
		max-width: 100%;
	}

	.hint-link {
		color: var(--vr-text);
		text-decoration: underline;
		font-weight: 600;
	}

	.replay-art {
		width: 80px;
		height: 80px;
		object-fit: cover;
		border: 1px solid var(--vr-line-muted);
		flex-shrink: 0;
	}

	.replay-art-fallback {
		display: grid;
		place-items: center;
		background: #000;
		color: var(--vr-text);
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

	@media (max-width: 640px) {
		.card {
			margin-left: -2rem;
			margin-right: -2rem;
		}
	}
</style>
