<script lang="ts">
	import { Button } from '@svar-ui/svelte-core';
	import { page } from '$app/state';
	import { playback, playMedia, requestTogglePlay, streamPlaying } from '$lib/stores/player';
	import { replayArtFromUrl } from '$lib/azuracast';

	let { data } = $props();

	const show = $derived(data.show);
	const upcoming = $derived(data.upcoming);
	const past = $derived(data.past);

	const backHref = $derived(
		page.url.searchParams.get('from') === 'schedule' ? '/schedule' : '/shows'
	);
	const backLabel = $derived(backHref === '/schedule' ? 'Schedule' : 'Shows');

	const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	function fmtTime(mins: number) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	function fmtDuration(mins: number) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		if (h === 0) return `${m} min`;
		return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
	}

	function fmtDate(dateStr: string) {
		return new Intl.DateTimeFormat('en-NZ', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(`${dateStr}T00:00:00Z`));
	}

	function cycleLabel(show: { interval_weeks: number }) {
		if (show.interval_weeks === 1) return 'Every week';
		return `Every ${show.interval_weeks} weeks`;
	}

	function toggleReplay(b: { replay_url: string | null; date: string }) {
		if (!b.replay_url) return;
		if (replayActive(b.replay_url)) {
			requestTogglePlay();
			return;
		}
		playMedia({
			url: b.replay_url,
			title: `${show.title} — ${fmtDate(b.date)}`,
			artist: show.dj_name ?? null,
			art: replayArtFromUrl(b.replay_url)
		});
	}

	function replayActive(url: string | null): boolean {
		if (!url) return false;
		const current = $playback;
		return current.kind === 'media' && current.url === url && $streamPlaying;
	}
</script>

<svelte:head>
	<title>{show.title} — Version Radio</title>
</svelte:head>

<div class="head">
	<div>
		<p class="eyebrow"><a href={backHref}>← {backLabel}</a></p>
		<h1>{show.title}</h1>
		<p class="subtitle">
			{#if show.dj_image}
				<img class="dj-avatar" src={show.dj_image} alt="" width="24" height="24" loading="lazy" />
			{/if}
			{DAY_NAMES[show.day_of_week]}s · {fmtTime(show.start_minutes)}–{fmtTime(
				show.start_minutes + show.duration_minutes
			)} · {cycleLabel(show)} · {show.dj_name || 'Version Radio'}
		</p>
		{#if show.description}
			<p class="desc">{show.description}</p>
		{/if}
	</div>
	{#if data.canEdit}
		<a href={`/shows/${show.id}/tracklist`} class="edit-link">Edit tracklist</a>
	{/if}
</div>

{#if upcoming.length > 0}
	<section>
		<h2>Upcoming</h2>
		<ul class="broadcasts">
			{#each upcoming as b (b.id)}
				<li class="broadcast" class:today={b.date === data.today}>
					<header>
						<strong>{fmtDate(b.date)}</strong>
						<span>{fmtTime(b.start_minutes)}–{fmtTime(b.start_minutes + b.duration_minutes)}</span>
						{#if data.canEdit}
							<a class="edit-mini" href={`/shows/${show.id}/broadcasts/${b.id}/tracklist`}>Edit</a>
						{/if}
					</header>
					{#if b.replay_url}
						<div class="replay">
							{#if replayArtFromUrl(b.replay_url)}
								<img
									class="replay-art"
									src={replayArtFromUrl(b.replay_url) ?? ''}
									alt=""
									width="40"
									height="40"
									loading="lazy"
								/>
							{/if}
							<button class="replay-btn" class:playing={replayActive(b.replay_url)} onclick={() => toggleReplay(b)}>
								{#if replayActive(b.replay_url)}
									<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0zM15 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0z" fill="currentColor" /></svg>
									Pause
								{:else}
									<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" /></svg>
									Replay
								{/if}
							</button>
							<a class="view-show" href={`/shows/${show.id}/broadcasts/${b.id}`}>View show →</a>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if past.length > 0}
	<section>
		<h2>Past broadcasts</h2>
		<ul class="broadcasts">
			{#each past as b (b.id)}
				<li class="broadcast">
					<header>
						<strong>{fmtDate(b.date)}</strong>
						<span>{fmtTime(b.start_minutes)}–{fmtTime(b.start_minutes + b.duration_minutes)}</span>
						{#if data.canEdit}
							<a class="edit-mini" href={`/shows/${show.id}/broadcasts/${b.id}/tracklist`}>Edit</a>
						{/if}
					</header>
					{#if b.replay_url}
						<div class="replay">
							{#if replayArtFromUrl(b.replay_url)}
								<img
									class="replay-art"
									src={replayArtFromUrl(b.replay_url) ?? ''}
									alt=""
									width="40"
									height="40"
									loading="lazy"
								/>
							{/if}
							<button class="replay-btn" class:playing={replayActive(b.replay_url)} onclick={() => toggleReplay(b)}>
								{#if replayActive(b.replay_url)}
									<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0zM15 5.2a1 1 0 0 1 2 0v13.6a1 1 0 0 1-2 0z" fill="currentColor" /></svg>
									Pause
								{:else}
									<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2a1 1 0 0 0 1.53.85l10.6-6.6a1 1 0 0 0 0-1.7L9.53 4.55A1 1 0 0 0 8 5.4z" fill="currentColor" /></svg>
									Replay
								{/if}
							</button>
							<a class="view-show" href={`/shows/${show.id}/broadcasts/${b.id}`}>View show →</a>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if upcoming.length === 0 && past.length === 0}
	<p class="hint">No scheduled broadcasts yet.</p>
{/if}

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.eyebrow {
		margin: 0 0 0.25rem;
		font-size: 0.85rem;
	}

	.eyebrow a {
		color: var(--vr-accent-strong);
		text-decoration: none;
	}

	h1 {
		margin: 0;
		font-size: 1.8rem;
	}

	.subtitle {
		margin: 0.4rem 0 0;
		color: var(--vr-muted);
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
	}

	.dj-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		object-fit: cover;
		border: 1px solid var(--vr-border);
	}

	.desc {
		margin: 0.75rem 0 0;
		color: var(--vr-muted);
	}

	.edit-link {
		border: 1px solid var(--vr-border);
		border-radius: 8px;
		padding: 0.4rem 0.85rem;
		color: var(--vr-live);
		text-decoration: none;
		font-size: 0.9rem;
		white-space: nowrap;
	}

	h2 {
		font-size: 1.1rem;
		margin: 1.25rem 0 0.75rem;
	}

	.broadcasts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.broadcast {
		border: 1px solid var(--vr-border);
		border-radius: 14px;
		background: var(--vr-surface);
		padding: 1rem 1.25rem;
	}

	.broadcast.today {
		border-color: var(--vr-accent);
		box-shadow: 0 0 0 1px var(--vr-accent);
	}

	.broadcast header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.broadcast header span {
		color: var(--vr-accent-strong);
		font-variant-numeric: tabular-nums;
	}

	.edit-mini {
		margin-left: auto;
		color: var(--vr-live);
		border: 1px solid var(--vr-border);
		border-radius: 8px;
		padding: 0.15rem 0.6rem;
		font-size: 0.8rem;
		text-decoration: none;
		white-space: nowrap;
	}

	.edit-mini:hover {
		border-color: var(--vr-live);
	}

	.hint {
		color: var(--vr-muted);
		font-size: 0.9rem;
		margin: 0;
	}

	.replay {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.85rem;
		padding-top: 0.75rem;
		border-top: 1px dashed var(--vr-border);
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

	.replay-btn.playing {
		background: var(--vr-accent);
		color: #0b0b11;
		font-weight: 600;
	}

	.view-show {
		color: var(--vr-accent-strong);
		font-size: 0.85rem;
		text-decoration: none;
		margin-left: auto;
		white-space: nowrap;
	}

	.view-show:hover {
		text-decoration: underline;
	}
</style>
